package com.kairema.app.update

import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.provider.Settings
import com.kairema.app.share.ShareFiles
import okhttp3.Call
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONObject
import java.io.File

/**
 * Обновление из приложения: берёт последний релиз с GitHub (releases/latest), скачивает APK и открывает системную установку.
 * Android сам проверяет, что подпись нового APK совпадает с установленным приложением, поэтому чужой APK поверх не встанет.
 * Скачивать разрешено только с github.com из релизов указанного репозитория.
 */
object Updater {
    const val FILE = "kairema-update.apk"

    /** JSON: {tag, name, body, page, url, size}; {none:true}, если релизов ещё нет. */
    fun latest(http: OkHttpClient, repo: String): String {
        require(UpdateRules.repoOk(repo)) { "неверный репозиторий" }
        val req = Request.Builder()
            .url("https://api.github.com/repos/$repo/releases/latest")
            .header("Accept", "application/vnd.github+json")
            .header("User-Agent", "Kairema")
            .build()
        http.newCall(req).execute().use { r ->
            if (r.code == 404) return JSONObject().put("none", true).toString()
            if (!r.isSuccessful) throw IllegalStateException("GitHub ответил ${r.code}")
            val o = JSONObject(r.body?.string() ?: "{}")
            val assets = o.optJSONArray("assets")
            var apk: JSONObject? = null
            if (assets != null) for (i in 0 until assets.length()) {
                val a = assets.optJSONObject(i) ?: continue
                if (a.optString("name").endsWith(".apk", true)) { apk = a; break }
            }
            return JSONObject()
                .put("tag", o.optString("tag_name"))
                .put("name", o.optString("name"))
                .put("body", o.optString("body").take(1500))
                .put("page", o.optString("html_url"))
                .put("url", apk?.optString("browser_download_url") ?: "")
                .put("size", apk?.optLong("size") ?: 0L)
                .toString()
        }
    }

    /** Скачать APK в cache/share. progress(скачано, всего). */
    fun download(http: OkHttpClient, repo: String, url: String, dest: File, onCall: (Call) -> Unit, progress: (Long, Long) -> Unit) {
        require(UpdateRules.repoOk(repo)) { "неверный репозиторий" }
        require(UpdateRules.urlOk(repo, url)) { "адрес обновления не из релизов репозитория" }
        dest.parentFile?.mkdirs()
        val call = http.newCall(Request.Builder().url(url).header("User-Agent", "Kairema").build())
        onCall(call)
        call.execute().use { r ->
            if (!r.isSuccessful) throw IllegalStateException("загрузка: GitHub ответил ${r.code}")
            val body = r.body ?: throw IllegalStateException("пустой ответ")
            val total = body.contentLength()
            val tmp = File(dest.parentFile, dest.name + ".part")
            var done = 0L
            var lastPush = 0L
            body.byteStream().use { ins ->
                tmp.outputStream().use { out ->
                    val buf = ByteArray(64 * 1024)
                    while (true) {
                        val n = ins.read(buf)
                        if (n < 0) break
                        out.write(buf, 0, n)
                        done += n
                        val now = System.currentTimeMillis()
                        if (now - lastPush > 150) { lastPush = now; progress(done, total) }
                    }
                }
            }
            progress(done, total)
            if (done < 100_000) throw IllegalStateException("файл слишком маленький для APK")
            if (dest.exists()) dest.delete()
            if (!tmp.renameTo(dest)) throw IllegalStateException("не удалось сохранить файл")
        }
    }

    /** Открыть установщик. "ok" — установщик открыт; "perm" — нужно разрешить установку из этого приложения (открыты настройки). */
    fun install(ctx: Context, file: File): String {
        if (Build.VERSION.SDK_INT >= 26 && !ctx.packageManager.canRequestPackageInstalls()) {
            ctx.startActivity(
                Intent(Settings.ACTION_MANAGE_UNKNOWN_APP_SOURCES, Uri.parse("package:" + ctx.packageName))
                    .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            )
            return "perm"
        }
        val uri = Uri.parse("content://" + ShareFiles.AUTHORITY + "/" + Uri.encode(file.name))
        val i = Intent(Intent.ACTION_VIEW)
            .setDataAndType(uri, "application/vnd.android.package-archive")
            .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION or Intent.FLAG_ACTIVITY_NEW_TASK)
        ctx.startActivity(i)
        return "ok"
    }
}
