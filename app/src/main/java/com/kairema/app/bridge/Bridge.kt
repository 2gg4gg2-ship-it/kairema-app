package com.kairema.app.bridge

import android.content.Context
import android.webkit.JavascriptInterface
import android.webkit.WebView
import com.kairema.app.data.SecureKeys
import okhttp3.Call
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

    @JavascriptInterface
    fun saveKey(id: String, key: String) = SecureKeys.save(ctx, id, key)

    @JavascriptInterface
    fun deleteKey(id: String) = SecureKeys.delete(ctx, id)

    @JavascriptInterface
    fun hasKey(id: String): Boolean = SecureKeys.load(ctx, id) != null

    @JavascriptInterface
    fun cancel(reqId: String) {
        calls.remove(reqId)?.cancel()
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

    /** Отправка сообщений провайдеру, ответ приходит в интерфейс кусками. */
    @JavascriptInterface
    fun chat(reqId: String, provider: String, messages: String) {
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
                        val text: String? = if (anthropic) {
                            if (j.optString("type") == "content_block_delta") {
                                j.optJSONObject("delta")?.optString("text")
                            } else null
                        } else {
                            val d = j.optJSONArray("choices")?.optJSONObject(0)?.optJSONObject("delta")
                            if (d == null || d.isNull("content")) null else d.optString("content")
                        }
                        if (!text.isNullOrEmpty()) push(reqId, text)
                    }
                    done(reqId, null)
                }
            } catch (e: Exception) {
                done(reqId, netError(e))
            }
        }
    }

    private fun open(reqId: String, p: JSONObject, msgs: JSONArray, maxTokens: Int?): Response {
        val key = SecureKeys.load(ctx, p.getString("id"))
            ?: throw IllegalStateException("ключ не найден на устройстве")
        var base = p.getString("url").trim().trimEnd('/')
        val anthropic = base.contains("anthropic.com")
        val body = JSONObject()
            .put("model", p.getString("model"))
            .put("messages", msgs)
            .put("stream", true)
        val rb = Request.Builder()
        val endpoint: String
        if (anthropic) {
            if (!base.contains("/v1")) base += "/v1"
            endpoint = if (base.endsWith("/messages")) base else "$base/messages"
            body.put("max_tokens", maxTokens ?: 4096)
            rb.header("x-api-key", key).header("anthropic-version", "2023-06-01")
        } else {
            endpoint = if (base.endsWith("/chat/completions")) base else "$base/chat/completions"
            rb.header("Authorization", "Bearer $key")
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

    private fun done(id: String, err: String?) {
        calls.remove(id)
        js("KairemaNative.done(${JSONObject.quote(id)},${if (err == null) "null" else JSONObject.quote(err)})")
    }
}
