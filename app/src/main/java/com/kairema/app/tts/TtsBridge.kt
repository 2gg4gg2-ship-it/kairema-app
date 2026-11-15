package com.kairema.app.tts

import android.app.Activity
import android.os.Bundle
import android.speech.tts.TextToSpeech
import android.speech.tts.UtteranceProgressListener
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject
import java.util.Locale

/**
 * Озвучка ответов системным синтезатором речи Android (TextToSpeech).
 * В интерфейсе доступен как KairemaTtsBridge; события возвращаются в JS: Tts.ev(тип, id, текст).
 * Типы: end (дочитал), error (текст ошибки: nolang, init, fail).
 * Длинный текст режется на куски по предложениям (у Android лимит около 4000 знаков на одну реплику).
 */
class TtsBridge(private val act: Activity, private val web: WebView) {

    private var tts: TextToSpeech? = null
    private var ready = false
    private var initFailed = false
    private var pending: Triple<String, String, Float>? = null
    private var curId = ""
    private var lastChunk = 0
    private var cancelled = false

    private fun ensure() {
        if (tts != null) return
        tts = TextToSpeech(act.applicationContext) { status ->
            act.runOnUiThread {
                if (status == TextToSpeech.SUCCESS) {
                    ready = true
                    tts?.setOnUtteranceProgressListener(listener)
                    pending?.let { speakNow(it.first, it.second, it.third) }
                } else {
                    initFailed = true
                    send("error", curId, "init")
                }
                pending = null
            }
        }
    }

    private val listener = object : UtteranceProgressListener() {
        override fun onStart(utteranceId: String?) {}

        override fun onDone(utteranceId: String?) {
            val u = utteranceId ?: return
            val parts = u.split("#")
            if (parts.size == 2 && parts[0] == curId && parts[1].toIntOrNull() == lastChunk && !cancelled) {
                send("end", curId, "")
            }
        }

        @Deprecated("Deprecated in Java")
        override fun onError(utteranceId: String?) {
            if (!cancelled) send("error", curId, "fail")
        }
    }

    /** Озвучить текст. id вернётся в событиях; language: ru-RU, uk-UA, en-US; rate: 0.5 до 2. */
    @JavascriptInterface
    fun speak(id: String, text: String, language: String, rate: Float) {
        act.runOnUiThread {
            curId = id
            cancelled = false
            if (initFailed) {
                send("error", id, "init")
                return@runOnUiThread
            }
            ensure()
            if (!ready) pending = Triple(text, language, rate) else speakNow(text, language, rate)
        }
    }

    private fun speakNow(text: String, language: String, rate: Float) {
        val t = tts ?: return
        val loc = Locale.forLanguageTag(language)
        val r = t.setLanguage(loc)
        if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) {
            send("error", curId, "nolang")
            return
        }
        pickVoice(t, loc)
        t.setSpeechRate(rate.coerceIn(0.5f, 2f))
        val chunks = split(text)
        if (chunks.isEmpty()) {
            send("end", curId, "")
            return
        }
        lastChunk = chunks.size - 1
        t.stop()
        chunks.forEachIndexed { i, c ->
            val mode = if (i == 0) TextToSpeech.QUEUE_FLUSH else TextToSpeech.QUEUE_ADD
            t.speak(c, mode, Bundle(), "$curId#$i")
        }
    }

    /**
     * Выбор голоса именно этого языка. Без этого некоторые синтезаторы (особенно китайские прошивки) читают русский или
     * украинский текст голосом по умолчанию, то есть по-английски или по-китайски. Предпочитаем установленный голос
     * нужной страны, который не требует сети.
     */
    private fun pickVoice(t: TextToSpeech, loc: Locale) {
        try {
            val all = t.voices ?: return
            val same = all.filter {
                it.locale.language == loc.language && !(it.features ?: emptySet<String>()).contains("notInstalled")
            }
            if (same.isEmpty()) return
            val best = same.minByOrNull {
                (if (it.locale.country == loc.country) 0 else 2) + (if (it.isNetworkConnectionRequired) 1 else 0)
            } ?: return
            t.setVoice(best)
        } catch (_: Exception) {
        }
    }

    /** Режет текст на куски до 3000 знаков по границам предложений. */
    private fun split(text: String): List<String> {
        val out = ArrayList<String>()
        val sb = StringBuilder()
        for (s in text.split(Regex("(?<=[.!?…\\n])\\s+"))) {
            if (s.isBlank()) continue
            if (sb.length + s.length > 3000 && sb.isNotEmpty()) {
                out.add(sb.toString())
                sb.setLength(0)
            }
            if (s.length > 3000) {
                s.chunked(3000).forEach { out.add(it) }
            } else {
                sb.append(s).append(' ')
            }
        }
        if (sb.isNotBlank()) out.add(sb.toString())
        return out
    }

    @JavascriptInterface
    fun stop() {
        act.runOnUiThread {
            cancelled = true
            pending = null
            tts?.stop()
        }
    }

    fun shutdown() {
        tts?.stop()
        tts?.shutdown()
        tts = null
    }

    private fun send(type: String, id: String, text: String) {
        val js = "window.Tts&&Tts.ev(${JSONObject.quote(type)},${JSONObject.quote(id)},${JSONObject.quote(text)})"
        web.post { web.evaluateJavascript(js, null) }
    }
}
