package com.kairema.app.share

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import org.json.JSONObject

/**
 * Входящее «Поделиться» из других приложений: ACTION_SEND (текст, ссылка, текстовый файл)
 * и ACTION_PROCESS_TEXT (пункт «Kairema» в меню выделенного текста).
 * Принятое лежит здесь до тех пор, пока интерфейс не заберёт его через Bridge.inboxTake.
 */
object Inbox {
    private const val MAX_TEXT = 60_000
    private const val MAX_FILE = 200_000

    @Volatile
    private var pending: String? = null

    /** Разобрать Intent. true, если из него получен текст для чата. */
    fun accept(ctx: Context, i: Intent?): Boolean {
        if (i == null) return false
        var text: String? = null
        var subject: String? = null
        when (i.action) {
            Intent.ACTION_SEND -> {
                text = i.getStringExtra(Intent.EXTRA_TEXT)
                subject = i.getStringExtra(Intent.EXTRA_SUBJECT)
                if (text.isNullOrEmpty()) {
                    val uri = streamUri(i)
                    if (uri != null) text = readText(ctx, uri)
                }
            }
            Intent.ACTION_PROCESS_TEXT -> {
                text = i.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)?.toString()
            }
        }
        if (text.isNullOrBlank()) return false
        pending = JSONObject()
            .put("text", text.take(MAX_TEXT))
            .put("subject", subject.orEmpty())
            .toString()
        return true
    }

    fun has(): Boolean = pending != null

    /** Отдать принятое один раз: JSON {text, subject} или пустая строка. */
    fun take(): String {
        val p = pending ?: return ""
        pending = null
        return p
    }

    @Suppress("DEPRECATION")
    private fun streamUri(i: Intent): Uri? =
        if (Build.VERSION.SDK_INT >= 33) i.getParcelableExtra(Intent.EXTRA_STREAM, Uri::class.java)
        else i.getParcelableExtra<Uri>(Intent.EXTRA_STREAM)

    private fun readText(ctx: Context, uri: Uri): String? = try {
        ctx.contentResolver.openInputStream(uri)?.use { s ->
            val buf = ByteArray(MAX_FILE)
            var n = 0
            while (n < buf.size) {
                val r = s.read(buf, n, buf.size - n)
                if (r < 0) break
                n += r
            }
            String(buf, 0, n, Charsets.UTF_8)
        }
    } catch (_: Exception) {
        null
    }
}
