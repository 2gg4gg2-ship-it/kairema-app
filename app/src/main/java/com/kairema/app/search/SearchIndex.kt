package com.kairema.app.search

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * Локальный индекс для поиска по чатам (файл kairema_search.db, отдельно от kairema.db).
 * Это только копия текста для быстрого поиска: чаты в kairema.db не меняются, индекс всегда можно
 * удалить и построить заново. Режим fts5 (SQLite FTS5) выбирается сам; если в прошивке нет FTS5,
 * работает запасной режим like (поиск по подстроке без учёта регистра).
 * Строка индекса: txt = текст, chat = id чата, mi = номер сообщения (-1 для заголовка),
 * kind = t (заголовок), m (сообщение), c (блок кода), lang = язык кода.
 */
class SearchIndex(ctx: Context) : SQLiteOpenHelper(ctx.applicationContext, "kairema_search.db", null, 1) {

    @Volatile
    private var ftsMode: Boolean? = null

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL("CREATE TABLE meta(chat TEXT PRIMARY KEY, title TEXT NOT NULL, ts INTEGER NOT NULL, sig TEXT NOT NULL)")
        try {
            db.execSQL(
                "CREATE VIRTUAL TABLE idx USING fts5(txt, chat UNINDEXED, mi UNINDEXED, kind UNINDEXED, lang UNINDEXED)"
            )
        } catch (_: Exception) {
            db.execSQL(
                "CREATE TABLE idx(id INTEGER PRIMARY KEY, txt TEXT NOT NULL, low TEXT NOT NULL, chat TEXT NOT NULL, " +
                    "mi INTEGER NOT NULL, kind TEXT NOT NULL, lang TEXT NOT NULL)"
            )
            db.execSQL("CREATE INDEX idx_chat ON idx(chat)")
        }
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {}

    private fun isFts(): Boolean {
        ftsMode?.let { return it }
        val r = readableDatabase.rawQuery("SELECT sql FROM sqlite_master WHERE name='idx'", null).use {
            it.moveToFirst() && (it.getString(0) ?: "").contains("fts5", ignoreCase = true)
        }
        ftsMode = r
        return r
    }

    fun mode(): String = if (isFts()) "fts5" else "like"

    /** Подписи уже проиндексированных чатов: {id: sig}. */
    fun sigs(): String {
        val o = JSONObject()
        readableDatabase.rawQuery("SELECT chat,sig FROM meta", null).use { c ->
            while (c.moveToNext()) o.put(c.getString(0), c.getString(1))
        }
        return o.toString()
    }

    /**
     * Записывает один чат: {id,title,ts,sig,docs:[[mi,kind,lang,text],...]}.
     * fresh=true: индекс только что очищен, старые строки чата не ищем (быстрее при полной перестройке).
     */
    fun put(json: String, fresh: Boolean): Boolean {
        return try {
            val o = JSONObject(json)
            val id = o.getString("id")
            val docs = o.optJSONArray("docs") ?: JSONArray()
            val fts = isFts()
            val db = writableDatabase
            db.beginTransaction()
            try {
                if (!fresh) {
                    db.delete("idx", "chat=?", arrayOf(id))
                }
                val m = ContentValues().apply {
                    put("chat", id)
                    put("title", o.optString("title"))
                    put("ts", o.optLong("ts"))
                    put("sig", o.optString("sig"))
                }
                db.insertWithOnConflict("meta", null, m, SQLiteDatabase.CONFLICT_REPLACE)
                for (i in 0 until docs.length()) {
                    val d = docs.getJSONArray(i)
                    val text = d.getString(3)
                    val v = ContentValues()
                    v.put("txt", text)
                    v.put("chat", id)
                    v.put("mi", d.getInt(0))
                    v.put("kind", d.getString(1))
                    v.put("lang", d.optString(2))
                    if (!fts) v.put("low", text.lowercase())
                    db.insert("idx", null, v)
                }
                db.setTransactionSuccessful()
                true
            } finally {
                db.endTransaction()
            }
        } catch (_: Exception) {
            false
        }
    }

    fun remove(id: String) {
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete("idx", "chat=?", arrayOf(id))
            db.delete("meta", "chat=?", arrayOf(id))
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    fun clear() {
        val db = writableDatabase
        db.beginTransaction()
        try {
            db.delete("idx", null, null)
            db.delete("meta", null, null)
            db.setTransactionSuccessful()
        } finally {
            db.endTransaction()
        }
    }

    /** Слова запроса: только буквы и цифры, до 8 штук, в нижнем регистре. */
    private fun tokens(q: String): List<String> {
        val out = ArrayList<String>()
        val sb = StringBuilder()
        for (ch in q.lowercase()) {
            if (ch.isLetterOrDigit()) {
                sb.append(ch)
            } else if (sb.isNotEmpty()) {
                out.add(sb.toString())
                sb.setLength(0)
            }
        }
        if (sb.isNotEmpty()) out.add(sb.toString())
        return out.distinct().take(8)
    }

    /** Кусок текста вокруг первого найденного слова. */
    private fun snippet(text: String, toks: List<String>): String {
        val low = text.lowercase()
        var pos = -1
        for (t in toks) {
            val i = low.indexOf(t)
            if (i >= 0 && (pos < 0 || i < pos)) pos = i
        }
        if (pos < 0) pos = 0
        val s = (pos - 50).coerceIn(0, text.length)
        val e = (pos + 110).coerceIn(s, text.length)
        val body = text.substring(s, e).replace(Regex("\\s+"), " ").trim()
        return (if (s > 0) "…" else "") + body + (if (e < text.length) "…" else "")
    }

    /** Поиск. kind: пусто = всё, иначе t, m или c. Ответ: JSON-массив {chat,title,ts,mi,kind,lang,snip}. */
    fun find(q: String, kind: String, limit: Int): String {
        val toks = tokens(q)
        if (toks.isEmpty()) return "[]"
        val lim = limit.coerceIn(1, 200)
        val titles = HashMap<String, String>()
        val stamps = HashMap<String, Long>()
        readableDatabase.rawQuery("SELECT chat,title,ts FROM meta", null).use { c ->
            while (c.moveToNext()) {
                titles[c.getString(0)] = c.getString(1)
                stamps[c.getString(0)] = c.getLong(2)
            }
        }
        val args = ArrayList<String>()
        val sql: String
        if (isFts()) {
            args.add(toks.joinToString(" ") { "\"$it\"*" })
            var s = "SELECT chat,mi,kind,lang,txt FROM idx WHERE idx MATCH ?"
            if (kind.isNotEmpty()) {
                s += " AND kind=?"
                args.add(kind)
            }
            sql = "$s ORDER BY rank LIMIT $lim"
        } else {
            val sb = StringBuilder("SELECT chat,mi,kind,lang,txt FROM idx WHERE ")
            toks.forEachIndexed { i, t ->
                if (i > 0) sb.append(" AND ")
                sb.append("low LIKE ?")
                args.add("%$t%")
            }
            if (kind.isNotEmpty()) {
                sb.append(" AND kind=?")
                args.add(kind)
            }
            sql = "$sb ORDER BY id DESC LIMIT $lim"
        }
        val out = JSONArray()
        readableDatabase.rawQuery(sql, args.toTypedArray()).use { c ->
            while (c.moveToNext()) {
                val chat = c.getString(0)
                val title = titles[chat] ?: continue
                out.put(
                    JSONObject().put("chat", chat).put("title", title).put("ts", stamps[chat] ?: 0L)
                        .put("mi", c.getInt(1)).put("kind", c.getString(2)).put("lang", c.getString(3) ?: "")
                        .put("snip", snippet(c.getString(4) ?: "", toks))
                )
            }
        }
        return out.toString()
    }
}
