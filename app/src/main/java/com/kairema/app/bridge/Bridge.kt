package com.kairema.app.bridge

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.kairema.app.data.SecureKeys
import com.kairema.app.service.KeepAliveService
import com.kairema.app.share.Share
import com.kairema.app.terminal.Shell
import com.kairema.app.terminal.TermuxRunner
import okhttp3.Call
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import okhttp3.Response
import org.json.JSONArray
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit

/**
 * Мост между интерфейсом (JS) и нативным кодом.
 * Интерфейс передаёт только id провайдера, сам ключ читается здесь из Keystore.
 * Поддерживаются OpenAI-совместимые API и Anthropic.
 */
class Bridge(private val ctx: Context, private val web: WebView) {

    private val http = OkHttpClient.Builder()
        .connectTimeout(20, TimeUnit.SECONDS)
        .readTimeout(120, TimeUnit.SECONDS)
        .build()
    private val pool = Executors.newCachedThreadPool()
    private val calls = ConcurrentHashMap<String, Call>()
    private val sh = Shell(ctx)
    private val tm = TermuxRunner(ctx)
    private val sx = Share(ctx)

    /** Копия текста в буфер обмена Android. */
    @JavascriptInterface
    fun copyText(text: String): Boolean = sx.copy(text)

    /** «Поделиться» текстом: системный список приложений (Telegram и др.). */
    @JavascriptInterface
    fun shareText(title: String, text: String) = sx.text(title, text)

    /** «Поделиться» файлом (.md, .html, .csv и т.д.). */
    @JavascriptInterface
    fun shareFile(name: String, mime: String, content: String): Boolean = sx.file(name, mime, content)

    /** Сохранение файла в «Загрузки» (Android 10+), иначе false. */
    @JavascriptInterface
    fun saveFile(name: String, mime: String, content: String): Boolean = sx.save(name, mime, content)

    /** PDF: системный диалог печати со строкой «Сохранить как PDF». */
    @JavascriptInterface
    fun printHtml(title: String, html: String) = sx.print(title, html)

    @JavascriptInterface
    fun saveKey(id: String, key: String) = SecureKeys.save(ctx, id, key)

    @JavascriptInterface
    fun deleteKey(id: String) = SecureKeys.delete(ctx, id)

    @JavascriptInterface
    fun hasKey(id: String): Boolean = SecureKeys.load(ctx, id) != null

    @JavascriptInterface
    fun cancel(reqId: String) {
        calls.remove(reqId)?.cancel()
        sh.cancel(reqId)
        tm.cancel(reqId)
    }

    /** Команда в Termux. Результат приходит целиком после завершения, в конце метка кода выхода. */
    @JavascriptInterface
    fun termux(reqId: String, cmd: String, timeoutSec: Int) {
        track(reqId)
        tm.run(reqId, cmd, timeoutSec.toLong(), { push(reqId, it) }, { done(reqId, it) })
    }

    /** Показывает системное окно запроса разрешения для Termux. */
    @JavascriptInterface
    fun termuxRequestPermission() {
        tm.requestPermission()
    }

    /** Проверка Termux: JSON с полями installed и permission. */
    @JavascriptInterface
    fun termuxStatus(): String = tm.status()

    /** Команда в оболочке Android. Вывод идёт кусками, в конце метка кода выхода. */
    @JavascriptInterface
    fun shell(reqId: String, cmd: String, timeoutSec: Int) {
        track(reqId)
        sh.run(reqId, cmd, timeoutSec.toLong(), { push(reqId, it) }, { done(reqId, it) })
    }

    /** Проверка ключа и модели: открываем поток ответа, смотрим код и сразу закрываем. */
    @JavascriptInterface
    fun verify(reqId: String, provider: String) {
        pool.execute {
            try {
                val msgs = JSONArray().put(JSONObject().put("role", "user").put("content", "ping"))
                open(reqId, JSONObject(provider), msgs, 16).use { resp ->
                    if (resp.isSuccessful) done(reqId, null) else done(reqId, errorText(resp))
                }
            } catch (e: Exception) {
                done(reqId, netError(e))
            }
        }
    }

    /** Проверка ключа и список моделей, доступных по нему. Ответ: JSON-массив id одним куском. */
    @JavascriptInterface
    fun models(reqId: String, provider: String) {
        pool.execute {
            try {
                push(reqId, fetchModels(reqId, JSONObject(provider)))
                done(reqId, null)
            } catch (e: Exception) {
                done(reqId, netError(e))
            }
        }
    }

    /** Отправка сообщений провайдеру, ответ приходит в интерфейс кусками. */
    @JavascriptInterface
    fun chat(reqId: String, provider: String, messages: String) {
        track(reqId)
        pool.execute {
            try {
                val p = JSONObject(provider)
                val anthropic = p.getString("url").contains("anthropic.com")
                open(reqId, p, JSONArray(messages), null).use { resp ->
                    if (!resp.isSuccessful) {
                        done(reqId, errorText(resp))
                        return@use
                    }
                    val src = resp.body!!.source()
                    while (true) {
                        val line = src.readUtf8Line() ?: break
                        if (!line.startsWith("data:")) continue
                        val data = line.substring(5).trim()
                        if (data == "[DONE]") break
                        val j = try { JSONObject(data) } catch (_: Exception) { continue }
                        val err = j.optJSONObject("error")
                        if (err != null) {
                            done(reqId, "ошибка: " + err.optString("message"))
                            return@use
                        }
                        var text: String? = null
                        var thought: String? = null
                        if (anthropic) {
                            val delta = if (j.optString("type") == "content_block_delta") j.optJSONObject("delta") else null
                            if (delta != null) {
                                if (delta.optString("type") == "thinking_delta") thought = delta.optString("thinking")
                                else text = delta.optString("text")
                            }
                        } else {
                            val d = j.optJSONArray("choices")?.optJSONObject(0)?.optJSONObject("delta")
                            if (d != null) {
                                if (!d.isNull("content")) text = d.optString("content")
                                val r = if (!d.isNull("reasoning_content")) d.optString("reasoning_content")
                                else if (!d.isNull("reasoning")) d.optString("reasoning") else null
                                if (!r.isNullOrEmpty()) thought = r
                            }
                        }
                        // Размышления модели идут отдельно: в начале куска символ \u0001.
                        if (!thought.isNullOrEmpty()) push(reqId, "\u0001" + thought)
                        if (!text.isNullOrEmpty()) push(reqId, text)
                    }
                    done(reqId, null)
                }
            } catch (e: Exception) {
                done(reqId, netError(e))
            }
        }
    }

    /** Создание изображения. OpenRouter: chat/completions с modalities, остальные: /images/generations. Ответ: JSON {mime, b64}. */
    @JavascriptInterface
    fun image(reqId: String, provider: String, prompt: String) {
        track(reqId)
        pool.execute {
            try {
                val p = JSONObject(provider)
                val key = SecureKeys.load(ctx, p.getString("id"))
                    ?: throw IllegalStateException("ключ не найден на устройстве")
                val base = normBase(p.getString("url"))
                if (base.contains("anthropic.com")) {
                    done(reqId, "Anthropic не создаёт изображения")
                    return@execute
                }
                val openRouter = base.contains("openrouter.ai")
                val body = JSONObject().put("model", p.getString("model"))
                val endpoint: String
                if (openRouter) {
                    endpoint = "$base/chat/completions"
                    body.put("messages", JSONArray().put(JSONObject().put("role", "user").put("content", prompt)))
                    body.put("modalities", JSONArray().put("image").put("text"))
                } else {
                    endpoint = "$base/images/generations"
                    body.put("prompt", prompt).put("n", 1).put("size", "1024x1024")
                }
                val call = http.newCall(
                    Request.Builder().url(endpoint)
                        .header("Authorization", "Bearer $key")
                        .post(body.toString().toRequestBody("application/json".toMediaType()))
                        .build()
                )
                calls[reqId] = call
                call.execute().use { resp ->
                    if (!resp.isSuccessful) {
                        done(reqId, errorText(resp))
                        return@use
                    }
                    val j = JSONObject(resp.body!!.string())
                    var mime = "image/png"
                    var b64: String? = null
                    if (openRouter) {
                        val u = j.optJSONArray("choices")?.optJSONObject(0)?.optJSONObject("message")
                            ?.optJSONArray("images")?.optJSONObject(0)?.optJSONObject("image_url")?.optString("url")
                        if (u != null && u.startsWith("data:") && u.contains(",")) {
                            mime = u.substring(5, u.indexOf(';'))
                            b64 = u.substring(u.indexOf(',') + 1)
                        }
                    } else {
                        val d0 = j.optJSONArray("data")?.optJSONObject(0)
                        val inline = d0?.optString("b64_json").orEmpty()
                        if (inline.isNotEmpty()) {
                            b64 = inline
                        } else {
                            val u = d0?.optString("url").orEmpty()
                            if (u.startsWith("http")) {
                                http.newCall(Request.Builder().url(u).build()).execute().use { r ->
                                    if (r.isSuccessful) {
                                        mime = r.header("Content-Type") ?: "image/png"
                                        b64 = android.util.Base64.encodeToString(r.body!!.bytes(), android.util.Base64.NO_WRAP)
                                    }
                                }
                            }
                        }
                    }
                    if (b64.isNullOrEmpty()) {
                        done(reqId, "провайдер не вернул изображение: проверьте, что выбранная модель умеет рисовать")
                        return@use
                    }
                    push(reqId, JSONObject().put("mime", mime).put("b64", b64).toString())
                    done(reqId, null)
                }
            } catch (e: Exception) {
                done(reqId, netError(e))
            }
        }
    }

    @JavascriptInterface
    fun saveImage(name: String, mime: String, b64: String): Boolean = sx.saveBytes(name, mime, b64)

    @JavascriptInterface
    fun shareImage(name: String, mime: String, b64: String): Boolean = sx.fileBytes(name, mime, b64)

    /** Поиск в интернете: Tavily, Brave Search или Serper. Ответ приходит одним куском JSON. */
    @JavascriptInterface
    fun search(reqId: String, provider: String, query: String) {
        track(reqId)
        pool.execute {
            try {
                val p = JSONObject(provider)
                val key = SecureKeys.load(ctx, p.getString("id"))
                    ?: throw IllegalStateException("ключ не найден на устройстве")
                val url = p.getString("url").trim()
                val call = http.newCall(buildSearchRequest(url, key, query))
                calls[reqId] = call
                call.execute().use { resp ->
                    if (!resp.isSuccessful) {
                        done(reqId, errorText(resp))
                        return@use
                    }
                    push(reqId, parseSearch(url, resp.body!!.string()))
                    done(reqId, null)
                }
            } catch (e: Exception) {
                done(reqId, netError(e))
            }
        }
    }

    // Ключ уходит только на настоящие адреса поддерживаемых провайдеров, а не на введённый URL.
    private fun buildSearchRequest(url: String, key: String, query: String): Request {
        val json = "application/json".toMediaType()
        return when {
            url.contains("tavily.com") -> Request.Builder()
                .url("https://api.tavily.com/search")
                .header("Authorization", "Bearer $key")
                .post(
                    JSONObject().put("query", query).put("max_results", 5).put("search_depth", "basic")
                        .toString().toRequestBody(json)
                )
                .build()
            url.contains("brave.com") -> Request.Builder()
                .url(
                    "https://api.search.brave.com/res/v1/web/search".toHttpUrl().newBuilder()
                        .addQueryParameter("q", query)
                        .addQueryParameter("count", "5")
                        .build()
                )
                .header("X-Subscription-Token", key)
                .header("Accept", "application/json")
                .build()
            url.contains("serper.dev") -> Request.Builder()
                .url("https://google.serper.dev/search")
                .header("X-API-KEY", key)
                .post(JSONObject().put("q", query).put("num", 5).toString().toRequestBody(json))
                .build()
            else -> throw IllegalStateException("поддерживаются Tavily, Brave Search и Serper")
        }
    }

    private fun parseSearch(url: String, raw: String): String {
        val out = JSONArray()
        val j = JSONObject(raw)
        fun add(title: String, link: String, snippet: String) {
            if (link.isNotEmpty()) {
                out.put(
                    JSONObject()
                        .put("title", title.ifEmpty { link })
                        .put("url", link)
                        .put("snippet", snippet.take(500))
                )
            }
        }
        val items: JSONArray? = when {
            url.contains("tavily.com") -> j.optJSONArray("results")
            url.contains("brave.com") -> j.optJSONObject("web")?.optJSONArray("results")
            else -> j.optJSONArray("organic")
        }
        if (items != null) {
            for (i in 0 until items.length()) {
                val r = items.getJSONObject(i)
                when {
                    url.contains("tavily.com") -> add(r.optString("title"), r.optString("url"), r.optString("content"))
                    url.contains("brave.com") -> add(r.optString("title"), r.optString("url"), r.optString("description"))
                    else -> add(r.optString("title"), r.optString("link"), r.optString("snippet"))
                }
            }
        }
        return out.toString()
    }

    // Адрес openrouter.ai без пути дополняем до настоящего адреса API.
    private fun normBase(url: String): String {
        val b = url.trim().trimEnd('/')
        val rest = b.substringAfter("://")
        return if (rest.substringBefore('/') == "openrouter.ai" && !rest.contains('/')) "$b/api/v1" else b
    }

    private fun fetchModels(reqId: String, p: JSONObject): String {
        val key = SecureKeys.load(ctx, p.getString("id"))
            ?: throw IllegalStateException("ключ не найден на устройстве")
        val base = normBase(p.getString("url"))
        val anthropic = base.contains("anthropic.com")
        if (base.contains("openrouter.ai")) {
            // Список моделей у OpenRouter открыт без ключа, поэтому ключ проверяем отдельным запросом.
            val kc = http.newCall(
                Request.Builder().url("$base/key").header("Authorization", "Bearer $key").build()
            )
            calls[reqId] = kc
            kc.execute().use { r ->
                if (r.code == 401 || r.code == 403) throw IllegalStateException(errorText(r))
            }
        }
        val rb = Request.Builder()
        val endpoint: String
        if (anthropic) {
            val b = if (base.contains("/v1")) base else "$base/v1"
            endpoint = b.removeSuffix("/messages").trimEnd('/') + "/models?limit=1000"
            rb.header("x-api-key", key).header("anthropic-version", "2023-06-01")
        } else {
            endpoint = base.removeSuffix("/chat/completions").trimEnd('/') + "/models"
            rb.header("Authorization", "Bearer $key")
        }
        val call = http.newCall(rb.url(endpoint).build())
        calls[reqId] = call
        return call.execute().use { resp ->
            if (!resp.isSuccessful) throw IllegalStateException(errorText(resp))
            val arr = JSONObject(resp.body!!.string()).optJSONArray("data")
                ?: throw IllegalStateException("провайдер не вернул список моделей")
            val out = JSONArray()
            for (i in 0 until arr.length()) {
                val o = arr.optJSONObject(i) ?: continue
                val id = o.optString("id")
                if (id.isEmpty() || id == "null") continue
                val item = JSONObject().put("id", id)
                val name = o.optString("name")
                if (name.isNotEmpty() && name != "null" && name != id) item.put("name", name)
                val pr = o.optJSONObject("pricing")
                if (pr != null) {
                    // Бесплатная модель: цена запроса и ответа равна нулю (так у OpenRouter).
                    val free = id.endsWith(":free") ||
                        (pr.optString("prompt").toDoubleOrNull() == 0.0 && pr.optString("completion").toDoubleOrNull() == 0.0)
                    item.put("free", free)
                }
                out.put(item)
            }
            out.toString()
        }
    }

    private fun open(reqId: String, p: JSONObject, msgs: JSONArray, maxTokens: Int?): Response {
        val key = SecureKeys.load(ctx, p.getString("id"))
            ?: throw IllegalStateException("ключ не найден на устройстве")
        var base = normBase(p.getString("url"))
        val anthropic = base.contains("anthropic.com")
        // Системная инструкция: у Anthropic отдельное поле, у остальных первое сообщение с ролью system.
        val sys = p.optString("system")
        val all = JSONArray()
        if (!anthropic && sys.isNotEmpty()) all.put(JSONObject().put("role", "system").put("content", sys))
        for (i in 0 until msgs.length()) all.put(msgs.get(i))
        val body = JSONObject()
            .put("model", p.getString("model"))
            .put("messages", all)
            .put("stream", true)
        val rb = Request.Builder()
        val endpoint: String
        if (anthropic) {
            if (!base.contains("/v1")) base += "/v1"
            endpoint = if (base.endsWith("/messages")) base else "$base/messages"
            body.put("max_tokens", maxTokens ?: 4096)
            if (sys.isNotEmpty()) body.put("system", sys)
            rb.header("x-api-key", key).header("anthropic-version", "2023-06-01")
        } else {
            endpoint = if (base.endsWith("/chat/completions")) base else "$base/chat/completions"
            rb.header("Authorization", "Bearer $key")
        }
        // Режимы Thinking и Instant: think > 0 думать, think < 0 отвечать быстро, 0 как есть.
        val think = p.optInt("think", 0)
        if (anthropic && think > 0) {
            body.put("thinking", JSONObject().put("type", "enabled").put("budget_tokens", 4000))
            body.put("max_tokens", 16000)
        } else if (!anthropic && base.contains("openrouter.ai")) {
            if (think > 0) body.put("reasoning", JSONObject().put("effort", "medium"))
            else if (think < 0) body.put("reasoning", JSONObject().put("enabled", false))
        }
        val call = http.newCall(
            rb.url(endpoint)
                .post(body.toString().toRequestBody("application/json".toMediaType()))
                .build()
        )
        calls[reqId] = call
        return call.execute()
    }

    private fun errorText(r: Response): String {
        val raw = try { r.body?.string().orEmpty() } catch (_: Exception) { "" }
        val msg = try { JSONObject(raw).optJSONObject("error")?.optString("message") } catch (_: Exception) { null }
        val tail = (msg ?: raw).replace(Regex("\\s+"), " ").take(160)
        return when (r.code) {
            401, 403 -> "ключ отклонён (${r.code})"
            404 -> "адрес или модель не найдены (404)"
            429 -> "лимит запросов или нет баланса (429)"
            else -> "ошибка ${r.code}" + if (tail.isNotEmpty()) ": $tail" else ""
        }
    }

    private fun netError(e: Exception): String = when (e) {
        is java.net.UnknownHostException -> "нет соединения или неверный адрес"
        is java.net.SocketTimeoutException -> "время ожидания истекло"
        is IllegalArgumentException -> "неверный API URL"
        else -> e.message ?: "ошибка сети"
    }

    private fun js(code: String) {
        web.post { web.evaluateJavascript(code, null) }
    }

    private fun push(id: String, text: String) =
        js("KairemaNative.chunk(${JSONObject.quote(id)},${JSONObject.quote(text)})")

    /** Долгие задачи держат службу переднего плана, пока не вызван done. */
    private val tracked = ConcurrentHashMap.newKeySet<String>()

    private fun track(id: String) {
        if (tracked.add(id)) KeepAliveService.begin(ctx)
    }

    private fun done(id: String, err: String?) {
        if (tracked.remove(id)) KeepAliveService.end(ctx)
        calls.remove(id)
        js("KairemaNative.done(${JSONObject.quote(id)},${if (err == null) "null" else JSONObject.quote(err)})")
    }
}
