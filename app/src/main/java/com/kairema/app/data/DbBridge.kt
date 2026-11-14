package com.kairema.app.data

import android.content.Context
import android.util.Base64
import android.webkit.JavascriptInterface
import org.json.JSONArray
import java.io.File
import java.util.UUID

/**
 * Мост JS <-> хранилище (в JS это KairemaDb): чаты в SQLite, картинки и вложения файлами в filesDir/media.
 * В чате остаётся только имя файла; содержимое подгружается при показе.
 */
class DbBridge(ctx: Context) {

    private val db = ChatDb(ctx)
    private val dir = File(ctx.filesDir, "media").also { it.mkdirs() }

    @JavascriptInterface
    fun loadAll(): String = try { db.all() } catch (_: Exception) { "[]" }

    @JavascriptInterface
    fun count(): Int = try { db.count() } catch (_: Exception) { 0 }

    @JavascriptInterface
    fun put(json: String): Boolean = db.put(json)

    /** Удаляет чат и его файлы. */
    @JavascriptInterface
    fun remove(id: String) {
        try {
            db.msgsOf(id)?.let { raw ->
                Regex("\"path\"\\s*:\\s*\"([A-Za-z0-9._-]+)\"").findAll(raw).forEach { m ->
                    fileOf(m.groupValues[1])?.delete()
                }
            }
            db.delete(id)
        } catch (_: Exception) {
        }
    }

    @JavascriptInterface
    fun clear() {
        try {
            db.clear()
            dir.listFiles()?.forEach { it.delete() }
        } catch (_: Exception) {
        }
    }

    /** Сохраняет файл из base64, возвращает его имя (или пустую строку при ошибке). */
    @JavascriptInterface
    fun saveFile(b64: String, ext: String): String = try {
        val e = ext.lowercase().filter { it.isLetterOrDigit() }.take(5).ifEmpty { "bin" }
        val name = UUID.randomUUID().toString().replace("-", "") + "." + e
        File(dir, name).writeBytes(Base64.decode(b64, Base64.DEFAULT))
        name
    } catch (_: Exception) {
        ""
    }

    /** Содержимое файла в base64 (пустая строка, если файла нет). */
    @JavascriptInterface
    fun loadFile(name: String): String = try {
        val f = fileOf(name)
        if (f != null && f.exists()) Base64.encodeToString(f.readBytes(), Base64.NO_WRAP) else ""
    } catch (_: Exception) {
        ""
    }

    /** Файл только внутри нашей папки: имя без путей. */
    private fun fileOf(name: String): File? {
        if (!Regex("[A-Za-z0-9._-]+").matches(name) || name.startsWith(".")) return null
        return File(dir, name)
    }
}
