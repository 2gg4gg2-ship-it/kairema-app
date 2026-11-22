package com.kairema.app.data

import android.content.ContentValues
import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import org.json.JSONArray
import org.json.JSONObject

/**
 * Хранилище чатов на устройстве (SQLite, файл kairema.db).
 * Одна строка = один чат; сообщения лежат в поле msgs как JSON. Записывается только изменившийся чат,
 * а не вся история, и лимит localStorage (около 5 МБ) больше не действует.
 */
class ChatDb(ctx: Context) : SQLiteOpenHelper(ctx.applicationContext, "kairema.db", null, 1) {

    init {
        setWriteAheadLoggingEnabled(true)
    }

    override fun onCreate(db: SQLiteDatabase) {
        db.execSQL(
            "CREATE TABLE chats(id TEXT PRIMARY KEY, title TEXT NOT NULL, named INTEGER NOT NULL, " +
                "pinned INTEGER NOT NULL, ts INTEGER NOT NULL, msgs TEXT NOT NULL)"
        )
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {}

    /** Все чаты, новые первыми. */
    fun all(): String {
        val out = JSONArray()
        readableDatabase.rawQuery("SELECT id,title,named,pinned,ts,msgs FROM chats ORDER BY ts DESC", null).use { c ->
            while (c.moveToNext()) {
                val msgs = try { JSONArray(c.getString(5)) } catch (_: Exception) { JSONArray() }
                out.put(
                    JSONObject().put("id", c.getString(0)).put("title", c.getString(1))
                        .put("named", c.getInt(2)).put("pinned", c.getInt(3)).put("ts", c.getLong(4))
                        .put("msgs", msgs)
                )
            }
        }
        return out.toString()
    }

    fun count(): Int =
        readableDatabase.rawQuery("SELECT COUNT(*) FROM chats", null).use { if (it.moveToFirst()) it.getInt(0) else 0 }

    /** Добавить или заменить один чат. json: {id,title,named,pinned,ts,msgs:[...]}. */
    fun put(json: String): Boolean = try {
        val o = JSONObject(json)
        val v = ContentValues().apply {
            put("id", o.getString("id"))
            put("title", o.optString("title"))
            put("named", o.optInt("named"))
            put("pinned", o.optInt("pinned"))
            put("ts", o.optLong("ts"))
            put("msgs", (o.optJSONArray("msgs") ?: JSONArray()).toString())
        }
        writableDatabase.insertWithOnConflict("chats", null, v, SQLiteDatabase.CONFLICT_REPLACE) != -1L
    } catch (_: Exception) {
        false
    }

    /** Сообщения чата (нужны, чтобы удалить файлы вместе с чатом). */
    fun msgsOf(id: String): String? =
        readableDatabase.rawQuery("SELECT msgs FROM chats WHERE id=?", arrayOf(id)).use {
            if (it.moveToFirst()) it.getString(0) else null
        }

    fun delete(id: String) {
        writableDatabase.delete("chats", "id=?", arrayOf(id))
    }

    fun clear() {
        writableDatabase.delete("chats", null, null)
    }
}
