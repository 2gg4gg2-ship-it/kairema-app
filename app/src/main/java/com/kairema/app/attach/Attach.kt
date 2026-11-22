package com.kairema.app.attach

import android.app.Activity
import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Matrix
import android.graphics.pdf.PdfRenderer
import android.net.Uri
import android.os.ParcelFileDescriptor
import android.provider.OpenableColumns
import android.util.Base64
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.kairema.app.bridge.Guard
import org.json.JSONObject
import java.io.ByteArrayOutputStream
import java.io.File
import java.util.concurrent.Executors

/**
 * Выбор фото и файлов без файлового выбора WebView.
 *
 * Системный выбор WebView у части телефонов тихо ничего не возвращает (фото «не прикрепляется»). Здесь выбор делает сам
 * Android (Activity), а Kotlin читает файл, уменьшает фото (до 1568 px по длинной стороне, с учётом поворота из EXIF,
 * HEIC тоже читается) и отдаёт интерфейсу готовые байты кусками. PDF копируется во временную папку, чтобы потом
 * отрисовать его страницы картинками (для моделей со зрением, если у PDF нет текста).
 *
 * Ответ в интерфейс идёт тем же способом, что и ответы моделей: KairemaNative.chunk(id, текст) и KairemaNative.done(id, ошибка).
 * Каждый кусок: JSON {n:имя, m:тип, k:ключ, i:номер, c:сколько_кусков, d:base64} или {n:имя, err:причина}.
 * Методы моста первым аргументом требуют токен приложения (Guard).
 */
class Attach(private val act: Activity, private val web: WebView) {

    private val pool = Executors.newSingleThreadExecutor()
    private var pendingId: String? = null

    /** Показать системный выбор: kind = image (фото) или file (любой файл). Результат придёт в onResult. */
    @Suppress("DEPRECATION")
    @JavascriptInterface
    fun attachPick(t: String, reqId: String, kind: String) {
        if (!Guard.ok(t)) {
            finish(reqId, "отказано: запрос не из приложения")
            return
        }
        act.runOnUiThread {
            try {
                pendingId?.let { finish(it, null) }
                pendingId = reqId
                val i = Intent(Intent.ACTION_GET_CONTENT)
                i.addCategory(Intent.CATEGORY_OPENABLE)
                i.type = if (kind == "image") "image/*" else "*/*"
                i.putExtra(Intent.EXTRA_ALLOW_MULTIPLE, true)
                act.startActivityForResult(i, REQ)
            } catch (e: Exception) {
                pendingId = null
                finish(reqId, "не удалось открыть выбор файлов")
            }
        }
    }

    /** Вызывается из MainActivity.onActivityResult. */
    fun onResult(resultCode: Int, data: Intent?) {
        val id = pendingId ?: return
        pendingId = null
        if (resultCode != Activity.RESULT_OK || data == null) {
            finish(id, null)
            return
        }
        val uris = ArrayList<Uri>()
        val clip = data.clipData
        if (clip != null) {
            for (k in 0 until minOf(clip.itemCount, MAX_FILES)) clip.getItemAt(k).uri?.let { uris.add(it) }
        } else {
            data.data?.let { uris.add(it) }
        }
        pool.execute {
            cleanCache()
            for (u in uris) {
                try {
                    one(id, u)
                } catch (e: Throwable) {
                    send(id, JSONObject().put("n", nameOf(u)).put("err", "не удалось прочитать файл"))
                }
            }
            finish(id, null)
        }
    }

    private fun nameOf(u: Uri): String {
        var n = "file"
        try {
            act.contentResolver.query(u, arrayOf(OpenableColumns.DISPLAY_NAME), null, null, null)?.use { c ->
                if (c.moveToFirst()) {
                    val k = c.getColumnIndex(OpenableColumns.DISPLAY_NAME)
                    if (k >= 0) c.getString(k)?.let { n = it }
                }
            }
        } catch (_: Exception) {
        }
        return n
    }

    private fun sizeOf(u: Uri): Long {
        var s = -1L
        try {
            act.contentResolver.query(u, arrayOf(OpenableColumns.SIZE), null, null, null)?.use { c ->
                if (c.moveToFirst()) {
                    val k = c.getColumnIndex(OpenableColumns.SIZE)
                    if (k >= 0 && !c.isNull(k)) s = c.getLong(k)
                }
            }
        } catch (_: Exception) {
        }
        return s
    }

    private fun one(id: String, u: Uri) {
        val name = nameOf(u)
        val mime = act.contentResolver.getType(u) ?: ""
        val isImg = mime.startsWith("image/") || IMG_EXT.containsMatchIn(name)
        if (isImg) {
            val jpg = decodeImage(u)
            if (jpg == null) {
                send(id, JSONObject().put("n", name).put("err", "формат фото не читается, выберите JPEG или PNG"))
                return
            }
            val base = if (name.contains('.')) name.substringBeforeLast('.') else name
            sendBytes(id, "$base.jpg", "image/jpeg", "", jpg)
            return
        }
        val size = sizeOf(u)
        if (size > MAX_BYTES) {
            send(id, JSONObject().put("n", name).put("err", "файл больше 20 МБ"))
            return
        }
        val bytes = readLimited(u) ?: run {
            send(id, JSONObject().put("n", name).put("err", "файл больше 20 МБ"))
            return
        }
        val pdf = mime == "application/pdf" || name.endsWith(".pdf", ignoreCase = true)
        var key = ""
        if (pdf) {
            key = java.lang.Long.toHexString(System.nanoTime()) + java.lang.Long.toHexString(bytes.size.toLong())
            try {
                File(cacheDirPdf(), "$key.pdf").writeBytes(bytes)
            } catch (_: Exception) {
                key = ""
            }
        }
        sendBytes(id, name, if (pdf) "application/pdf" else mime, key, bytes)
    }

    private fun readLimited(u: Uri): ByteArray? {
        act.contentResolver.openInputStream(u)?.use { ins ->
            val out = ByteArrayOutputStream()
            val buf = ByteArray(64 * 1024)
            var total = 0L
            while (true) {
                val n = ins.read(buf)
                if (n < 0) break
                total += n
                if (total > MAX_BYTES) return null
                out.write(buf, 0, n)
            }
            return out.toByteArray()
        }
        return ByteArray(0)
    }

    /** Фото: уменьшить до 1568 px, повернуть по EXIF, залить белым фоном (у PNG прозрачность), сжать в JPEG. */
    private fun decodeImage(u: Uri): ByteArray? {
        val cr = act.contentResolver
        val bounds = BitmapFactory.Options()
        bounds.inJustDecodeBounds = true
        cr.openInputStream(u)?.use { BitmapFactory.decodeStream(it, null, bounds) }
        if (bounds.outWidth <= 0 || bounds.outHeight <= 0) return null
        var sample = 1
        val big = maxOf(bounds.outWidth, bounds.outHeight)
        while (big / (sample * 2) >= TARGET) sample *= 2
        val o = BitmapFactory.Options()
        o.inSampleSize = sample
        val src = cr.openInputStream(u)?.use { BitmapFactory.decodeStream(it, null, o) } ?: return null
        var deg = 0
        try {
            cr.openInputStream(u)?.use { ins ->
                val ex = android.media.ExifInterface(ins)
                deg = when (ex.getAttributeInt(android.media.ExifInterface.TAG_ORIENTATION, 1)) {
                    android.media.ExifInterface.ORIENTATION_ROTATE_90 -> 90
                    android.media.ExifInterface.ORIENTATION_ROTATE_180 -> 180
                    android.media.ExifInterface.ORIENTATION_ROTATE_270 -> 270
                    else -> 0
                }
            }
        } catch (_: Exception) {
        }
        val k = minOf(1f, TARGET.toFloat() / maxOf(src.width, src.height))
        val m = Matrix()
        m.postScale(k, k)
        if (deg != 0) m.postRotate(deg.toFloat())
        val w0 = src.width * k
        val h0 = src.height * k
        val rot = deg == 90 || deg == 270
        val ow = Math.max(1, Math.round(if (rot) h0 else w0))
        val oh = Math.max(1, Math.round(if (rot) w0 else h0))
        // Поворот идёт вокруг левого верхнего угла, поэтому сдвигаем картинку обратно в кадр.
        when (deg) {
            90 -> m.postTranslate(h0, 0f)
            180 -> m.postTranslate(w0, h0)
            270 -> m.postTranslate(0f, w0)
        }
        val out = Bitmap.createBitmap(ow, oh, Bitmap.Config.ARGB_8888)
        val cv = Canvas(out)
        cv.drawColor(Color.WHITE)
        cv.drawBitmap(src, m, null)
        src.recycle()
        val bos = ByteArrayOutputStream()
        out.compress(Bitmap.CompressFormat.JPEG, 85, bos)
        out.recycle()
        return bos.toByteArray()
    }

    private fun sendBytes(id: String, name: String, mime: String, key: String, bytes: ByteArray) {
        val total = Math.max(1, (bytes.size + PIECE - 1) / PIECE)
        val k = key.ifEmpty { "f" + java.lang.Long.toHexString(System.nanoTime()) }
        for (i in 0 until total) {
            val from = i * PIECE
            val to = Math.min(bytes.size, from + PIECE)
            val b64 = Base64.encodeToString(bytes, from, to - from, Base64.NO_WRAP)
            send(
                id,
                JSONObject().put("n", name).put("m", mime).put("k", k)
                    .put("i", i).put("c", total).put("d", b64).put("pk", key)
            )
        }
    }

    // ---------- PDF: страницы картинками ----------

    /** Отрисовать первые страницы PDF (файл сохранён при выборе под ключом key). Каждая страница: JSON {i, n, d:base64 JPEG}. */
    @JavascriptInterface
    fun pdfPages(t: String, reqId: String, key: String, maxPages: String) {
        if (!Guard.ok(t)) {
            finish(reqId, "отказано: запрос не из приложения")
            return
        }
        pool.execute {
            var pfd: ParcelFileDescriptor? = null
            var r: PdfRenderer? = null
            try {
                if (!key.matches(Regex("[0-9a-f]{2,40}"))) throw IllegalArgumentException("ключ")
                val f = File(cacheDirPdf(), "$key.pdf")
                if (!f.exists()) throw IllegalStateException("файл больше не доступен, выберите его снова")
                val fd0 = ParcelFileDescriptor.open(f, ParcelFileDescriptor.MODE_READ_ONLY)
                pfd = fd0
                val rd = PdfRenderer(fd0)
                r = rd
                val n = rd.pageCount
                val lim = Math.min(n, Math.max(1, maxPages.toIntOrNull() ?: 4))
                for (i in 0 until lim) {
                    val p = rd.openPage(i)
                    try {
                        val w = PAGE_W
                        val h = Math.max(1, Math.round(w.toFloat() * p.height / Math.max(1, p.width)))
                        val bmp = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
                        bmp.eraseColor(Color.WHITE)
                        p.render(bmp, null, null, PdfRenderer.Page.RENDER_MODE_FOR_DISPLAY)
                        val bos = ByteArrayOutputStream()
                        bmp.compress(Bitmap.CompressFormat.JPEG, 78, bos)
                        bmp.recycle()
                        send(reqId, JSONObject().put("i", i).put("n", n).put("d", Base64.encodeToString(bos.toByteArray(), Base64.NO_WRAP)))
                    } finally {
                        p.close()
                    }
                }
                finish(reqId, null)
            } catch (e: SecurityException) {
                finish(reqId, "PDF защищён паролем")
            } catch (e: Exception) {
                finish(reqId, e.message ?: "не удалось открыть PDF")
            } finally {
                try { r?.close() } catch (_: Exception) {}
                try { pfd?.close() } catch (_: Exception) {}
            }
        }
    }

    private fun cacheDirPdf(): File {
        val d = File(act.cacheDir, "attach")
        if (!d.exists()) d.mkdirs()
        return d
    }

    /** Старые копии PDF (старше суток) удаляем. */
    private fun cleanCache() {
        try {
            val lim = System.currentTimeMillis() - 24L * 3600 * 1000
            cacheDirPdf().listFiles()?.forEach { if (it.lastModified() < lim) it.delete() }
        } catch (_: Exception) {
        }
    }

    // ---------- связь с интерфейсом ----------

    private fun send(id: String, o: JSONObject) {
        web.post { web.evaluateJavascript("KairemaNative.chunk(${JSONObject.quote(id)},${JSONObject.quote(o.toString())})", null) }
    }

    private fun finish(id: String, err: String?) {
        web.post {
            web.evaluateJavascript(
                "KairemaNative.done(${JSONObject.quote(id)},${if (err == null) "null" else JSONObject.quote(err)})", null
            )
        }
    }

    companion object {
        const val REQ = 7201
        private const val MAX_FILES = 8
        private const val MAX_BYTES = 20L * 1024 * 1024
        private const val TARGET = 1568
        private const val PIECE = 192 * 1024 // сырых байт в одном куске (base64 примерно 256 КБ)
        private const val PAGE_W = 1000
        private val IMG_EXT = Regex("\\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$", RegexOption.IGNORE_CASE)
    }
}
