package com.kairema.app.voice

import android.Manifest
import android.app.Activity
import android.content.ComponentName
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
            systemDialog("norecog")
            return
        }
        rec?.destroy()
        gen++
        val myGen = gen
        active = true
        var ready = false
        val r = createRecognizer()
        r.setRecognitionListener(object : RecognitionListener {
            override fun onReadyForSpeech(params: Bundle?) {
                ready = true
                send("start", "")
            }
            override fun onBeginningOfSpeech() { ready = true }
            override fun onRmsChanged(rmsdB: Float) {}
            override fun onBufferReceived(buffer: ByteArray?) {}
            override fun onEndOfSpeech() {}
            override fun onEvent(eventType: Int, params: Bundle?) {}

            override fun onPartialResults(partialResults: Bundle?) {
                val t = first(partialResults)
                if (t.isNotEmpty()) send("partial", t)
            }

            override fun onResults(results: Bundle?) {
                if (myGen != gen) return
                send("result", first(results))
                send("end", "")
            }

            override fun onError(error: Int) {
                if (myGen != gen) return
                when (error) {
                    SpeechRecognizer.ERROR_NO_MATCH, SpeechRecognizer.ERROR_SPEECH_TIMEOUT -> {
                        send("silence", "")
                        send("end", "")
                    }
                    SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS -> {
                        send("noperm", "")
                        send("end", "")
                    }
                    // Служба распознавания сломана или не поддерживает язык (частая беда на прошивках без Google):
                    // переходим на системное окно голосового ввода.
                    else -> {
                        gen++
                        rec?.cancel()
                        systemDialog(error.toString())
                    }
                }
            }
        })
        rec = r
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, lang)
            .putExtra(RecognizerIntent.EXTRA_CALLING_PACKAGE, act.packageName)
            .putExtra(RecognizerIntent.EXTRA_MAX_RESULTS, 1)
            .putExtra(RecognizerIntent.EXTRA_PARTIAL_RESULTS, true)
        try {
            r.startListening(i)
        } catch (e: Exception) {
            gen++
            systemDialog("start")
            return
        }
        // Если служба молчит (ни готовности, ни ошибки) 4 секунды, считаем её неработающей.
        ui.postDelayed(Runnable {
            if (active && myGen == gen && !ready) {
                gen++
                rec?.cancel()
                systemDialog("silent")
            }
        }, 4000)
    }

    /** Служба Google, если установлена (на прошивках без своей службы распознавания работает именно она). */
    private fun createRecognizer(): SpeechRecognizer {
        try {
            act.packageManager.getPackageInfo(GOOGLE_APP, 0)
            val cn = ComponentName(GOOGLE_APP, GOOGLE_SERVICE)
            return SpeechRecognizer.createSpeechRecognizer(act, cn)
        } catch (_: Exception) {
        }
        return SpeechRecognizer.createSpeechRecognizer(act)
    }

    /** Системное окно голосового ввода; если его нет, сообщаем об ошибке. */
    private fun systemDialog(reason: String = "") {
        val i = Intent(RecognizerIntent.ACTION_RECOGNIZE_SPEECH)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE_MODEL, RecognizerIntent.LANGUAGE_MODEL_FREE_FORM)
            .putExtra(RecognizerIntent.EXTRA_LANGUAGE, lang)
        active = true
        try {
            @Suppress("DEPRECATION")
            act.startActivityForResult(i, REQ_SPEECH)
            send("start", "")
        } catch (e: Exception) {
            // Причина уходит в интерфейс (в тосте), чтобы по ней было видно, на каком шаге сломалось
            send("error", "unavailable:" + reason)
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
        private const val GOOGLE_APP = "com.google.android.googlequicksearchbox"
        private const val GOOGLE_SERVICE = "com.google.android.voicesearch.serviceapi.GoogleRecognitionService"
    }
}
