package com.kairema.app.voice

import android.Manifest
import android.app.Activity
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.speech.RecognitionListener
import android.speech.RecognizerIntent
import android.speech.SpeechRecognizer
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject

/**
 * Голосовой ввод через системное распознавание речи Android (SpeechRecognizer).
 * В интерфейсе доступен как KairemaVoiceBridge; события возвращаются в JS: Voice.ev(тип, текст).
 * Типы: start, partial, result, noperm, silence, error, end.
 */
class VoiceBridge(private val act: Activity, private val web: WebView) {

    private var rec: SpeechRecognizer? = null
    private var lang = "ru-RU"
    private var waitingPermission = false
    private var active = false
    private var gen = 0
    private val ui = Handler(Looper.getMainLooper())

    @JavascriptInterface
    fun available(): Boolean = SpeechRecognizer.isRecognitionAvailable(act)

    @JavascriptInterface
    fun start(language: String) {
        lang = language
        act.runOnUiThread {
            if (act.checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
                waitingPermission = true
                act.requestPermissions(arrayOf(Manifest.permission.RECORD_AUDIO), REQ_MIC)
            } else {
                begin()
            }
        }
    }

    @JavascriptInterface
    fun stop() {
        act.runOnUiThread {
            rec?.stopListening()
            // Распознаватель иногда не отвечает после stopListening (если речи ещё не было): через 1,5 с обрываем сами.
            val g = gen
            ui.postDelayed(Runnable {
                if (active && g == gen) {
                    rec?.cancel()
                    send("end", "")
                }
            }, 1500)
        }
    }

    /** Вызывается из MainActivity после ответа на запрос разрешения. */
    fun onPermission(requestCode: Int, granted: Boolean) {
        if (requestCode != REQ_MIC || !waitingPermission) return
        waitingPermission = false
        if (granted) begin() else send("noperm", "")
    }

    /** Результат системного окна голосового ввода (запасной путь). */
    fun onResult(resultCode: Int, data: Intent?) {
        if (resultCode == Activity.RESULT_OK) {
            val t = data?.getStringArrayListExtra(RecognizerIntent.EXTRA_RESULTS)?.firstOrNull().orEmpty()
            if (t.isNotEmpty()) send("result", t) else send("silence", "")
        } else {
            send("silence", "")
        }
        send("end", "")
    }

    fun destroy() {
        rec?.destroy()
        rec = null
    }

    private fun begin() {
        if (!SpeechRecognizer.isRecognitionAvailable(act)) {
            // Нет службы распознавания внутри приложения: пробуем системное окно голосового ввода.
            val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
                .putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
            try {
                @Suppress("DEPRECATION")
                act.startActivityForResult(i, REQ_SPEECH)
                send("start", "")
            } catch (e: Exception) {
                send("error", "unavailable")
            }
            return
        }
        rec?.destroy()
        gen++
        active = true
        val r = SpeechRecognizer.createSpeechRecognizer(act)
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) = send("start", "")
            override fun onBeginningOfSpeech() {}
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}

            override fun onPartialResults(partialResults: Bundle?) {
                val t = first(partialResults)
                if (t.isNotEmpty()) send("partial", t)
            }

            override fun onResults(results: Bundle?) {
                send("result", first(results))
                send("end", "")
            }

            override fun onError(error: Int) {
                when (error) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> send("silence", "")
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> send("noperm", "")
                    else -> send("error", error.toString())
                }
                send("end", "")
            }
        })
        rec = r
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        try {
            r.startListening(i)
        } catch (e: Exception) {
            send("error", "start")
            send("end", "")
        }
    }

    private fun first(b: Bundle?): String =
        b?.getStringArrayList(SpeechRecognizer.RESULTS_RECOGNITION)?.firstOrNull() ?: ""

    private fun send(type: String, text: String) {
        if (type == "end") active = false
        val js = "window.Voice&&Voice.ev(" + JSONObject.quote(type) + "," + JSONObject.quote(text) + ")"
        web.post { web.evaluateJavascript(js, null) }
    }

    companion object {
        const val REQ_MIC = 7102
        const val REQ_SPEECH = 7104
    }
}
