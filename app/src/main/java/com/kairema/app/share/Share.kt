package com.kairema.app.share

import android.app.Activity
import android.content.ClipData
import android.content.ClipboardManager
import android.content.ContentValues
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Environment
import android.print.PrintAttributes
import android.print.PrintManager
import android.provider.MediaStore
import android.webkit.WebView
import android.webkit.WebViewClient
import java.io.File

/**
 * Копирование, «Поделиться» (Telegram и другие приложения), сохранение в Загрузки и печать в PDF.
 * Вызывается из Bridge, интерфейс отдаёт сюда готовый текст.
 */
class Share(private val ctx: Context) {

    // Держим страницу для печати, пока идёт диалог печати, иначе её соберёт сборщик мусора.
    private var printView: WebView? = null

    /** Копия текста в буфер обмена Android. */
    fun copy(text: String): Boolean = try {
        val cm = ctx.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
        cm.setPrimaryClip(ClipData.newPlainText("Kairema", text))
        true
    } catch (_: Exception) {
        false
    }

    /** Отправка текста: системный список приложений (Telegram, почта, заметки и т.д.). */
    fun text(title: String, text: String) {
        val send = Intent(Intent.ACTION_SEND).apply {
            type = "text/plain"
            putExtra(Intent.EXTRA_SUBJECT, title)
            putExtra(Intent.EXTRA_TEXT, text.take(MAX_TEXT))
        }
        launch(Intent.createChooser(send, title))
    }

    /** Отправка файла (например, .md или .html): пишем во временную папку и отдаём через ShareFiles. */
    fun file(name: String, mime: String, content: String): Boolean = try {
        val safe = safeName(name)
        val dir = File(ctx.cacheDir, ShareFiles.DIR)
        dir.mkdirs()
        val old = System.currentTimeMillis() - 24 * 60 * 60 * 1000L
        dir.listFiles()?.forEach { if (it.lastModified() < old) it.delete() }
        File(dir, safe).writeText(content, Charsets.UTF_8)
        val uri = Uri.parse("content://" + ShareFiles.AUTHORITY + "/" + Uri.encode(safe))
        val send = Intent(Intent.ACTION_SEND).apply {
            type = mime
            putExtra(Intent.EXTRA_STREAM, uri)
            clipData = ClipData.newRawUri(safe, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        launch(Intent.createChooser(send, safe))
        true
    } catch (_: Exception) {
        false
    }

    /** Сохранение файла в папку «Загрузки» (Android 10+). На старых версиях вернёт false. */
    fun save(name: String, mime: String, content: String): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
        return try {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, safeName(name))
                put(MediaStore.MediaColumns.MIME_TYPE, mime)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }
            val uri = ctx.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: return false
            val out = ctx.contentResolver.openOutputStream(uri) ?: return false
            out.use { it.write(content.toByteArray(Charsets.UTF_8)) }
            true
        } catch (_: Exception) {
            false
        }
    }

    /** Сохранение двоичного файла (картинка в base64) в «Загрузки». */
    fun saveBytes(name: String, mime: String, b64: String): Boolean {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) return false
        return try {
            val values = ContentValues().apply {
                put(MediaStore.MediaColumns.DISPLAY_NAME, safeName(name))
                put(MediaStore.MediaColumns.MIME_TYPE, mime)
                put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_DOWNLOADS)
            }
            val uri = ctx.contentResolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values)
                ?: return false
            val out = ctx.contentResolver.openOutputStream(uri) ?: return false
            out.use { it.write(android.util.Base64.decode(b64, android.util.Base64.DEFAULT)) }
            true
        } catch (_: Exception) {
            false
        }
    }

    /** Отправка двоичного файла (картинка в base64) другим приложениям. */
    fun fileBytes(name: String, mime: String, b64: String): Boolean = try {
        val safe = safeName(name)
        val dir = File(ctx.cacheDir, ShareFiles.DIR)
        dir.mkdirs()
        File(dir, safe).writeBytes(android.util.Base64.decode(b64, android.util.Base64.DEFAULT))
        val uri = Uri.parse("content://" + ShareFiles.AUTHORITY + "/" + Uri.encode(safe))
        val send = Intent(Intent.ACTION_SEND).apply {
            type = mime
            putExtra(Intent.EXTRA_STREAM, uri)
            clipData = ClipData.newRawUri(safe, uri)
            addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION)
        }
        launch(Intent.createChooser(send, safe))
        true
    } catch (_: Exception) {
        false
    }

    /** PDF: открываем системный диалог печати, в нём «Сохранить как PDF». Скрипты на странице выключены. */
    fun print(title: String, html: String) {
        val act = ctx as? Activity ?: return
        act.runOnUiThread {
            try {
                val wv = WebView(act)
                printView = wv
                wv.settings.javaScriptEnabled = false
                var started = false
                wv.webViewClient = object : WebViewClient() {
                    override fun onPageFinished(view: WebView?, url: String?) {
                        if (started || view == null) return
                        started = true
                        val name = safeName(title)
                        val pm = act.getSystemService(Context.PRINT_SERVICE) as PrintManager
                        pm.print(name, view.createPrintDocumentAdapter(name), PrintAttributes.Builder().build())
                    }
                }
                wv.loadDataWithBaseURL(null, html, "text/html", "UTF-8", null)
            } catch (_: Exception) {
            }
        }
    }

    private fun launch(i: Intent) {
        try {
            if (ctx !is Activity) i.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            ctx.startActivity(i)
        } catch (_: Exception) {
        }
    }

    private fun safeName(n: String): String {
        val s = n.replace(Regex("[^\\p{L}\\p{N}._ -]"), "_").trim().take(80)
        return if (s.isEmpty() || s == "." || s == "..") "kairema.txt" else s
    }

    companion object {
        private const val MAX_TEXT = 300_000
    }
}
