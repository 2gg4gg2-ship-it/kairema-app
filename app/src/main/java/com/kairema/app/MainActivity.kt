package com.kairema.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.Intent
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import com.kairema.app.bridge.Bridge

/**
 * Оболочка: показывает интерфейс из assets/index.html.
 * Следующие шаги добавят сюда мост между кнопками интерфейса и нативным кодом.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val bg = Color.parseColor("#0B0B0C")
        window.statusBarColor = bg
        window.navigationBarColor = bg

        web = WebView(this)
        web.setBackgroundColor(bg)
        with(web.settings) {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
        }

        web.webViewClient = object : WebViewClient() {
            override fun shouldOverrideUrlLoading(view: WebView, request: WebResourceRequest): Boolean {
                val url = request.url
                if (url.scheme == "file") return false
                try {
                    startActivity(Intent(Intent.ACTION_VIEW, url))
                } catch (_: Exception) {
                }
                return true
            }
        }

        web.webChromeClient = object : WebChromeClient() {
            override fun onShowFileChooser(
                view: WebView,
                callback: ValueCallback<Array<Uri>>,
                params: FileChooserParams
            ): Boolean {
                fileCallback?.onReceiveValue(null)
                fileCallback = callback
                return try {
                    startActivityForResult(params.createIntent(), REQ_FILE)
                    true
                } catch (_: Exception) {
                    fileCallback = null
                    false
                }
            }
        }

        web.addJavascriptInterface(Bridge(this, web), "KairemaBridge")
        setContentView(web)
        web.loadUrl("file:///android_asset/ui/index.html")
    }

    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQ_FILE) {
            fileCallback?.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(resultCode, data))
            fileCallback = null
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    // Кнопка «Назад»: сначала закрываем верхнюю шторку, меню или подэкран интерфейса.
    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onBackPressed() {
        web.evaluateJavascript(BACK_JS) { handled ->
            if (handled != "true") finish()
        }
    }

    private companion object {
        const val REQ_FILE = 1
        const val BACK_JS = """(function(){
            var a=document.querySelectorAll('.pbg,.sheet-bg,.spg');
            if(!a.length)return false;
            var t=a[a.length-1];
            if(t.close)t.close();else t.remove();
            return true;})()"""
    }
}
