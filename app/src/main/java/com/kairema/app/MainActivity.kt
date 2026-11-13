package com.kairema.app

import android.annotation.SuppressLint
import android.app.Activity
import android.content.ContentValues
import android.Manifest
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.graphics.Color
import android.net.Uri
import android.os.Bundle
import android.provider.MediaStore
import android.webkit.ValueCallback
import android.webkit.WebChromeClient
import android.webkit.WebResourceRequest
import android.webkit.WebView
import android.webkit.WebViewClient
import com.kairema.app.bridge.Bridge
import com.kairema.app.voice.VoiceBridge

/**
 * Оболочка: показывает интерфейс из assets/index.html.
 * Следующие шаги добавят сюда мост между кнопками интерфейса и нативным кодом.
 */
class MainActivity : Activity() {

    private lateinit var web: WebView
    private var fileCallback: ValueCallback<Array<Uri>>? = null
    private var cameraUri: Uri? = null
    private var voice: VoiceBridge? = null
    private var pendingChooser: WebChromeClient.FileChooserParams? = null
    private var askedMedia = false

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
                cameraUri = null
                // Камера и фото: сначала просим разрешение (оно же появится в настройках Android), потом открываем выбор.
                val need = when {
                    params.isCaptureEnabled && !granted(Manifest.permission.CAMERA) -> arrayOf(Manifest.permission.CAMERA)
                    !params.isCaptureEnabled && !askedMedia && !granted(mediaPermission()) -> {
                        askedMedia = true
                        arrayOf(mediaPermission())
                    }
                    else -> null
                }
                if (need != null) {
                    pendingChooser = params
                    requestPermissions(need, REQ_MEDIA)
                    return true
                }
                return launchChooser(params)
            }
        }

        web.addJavascriptInterface(Bridge(this, web), "KairemaBridge")
        voice = VoiceBridge(this, web).also { web.addJavascriptInterface(it, "KairemaVoiceBridge") }
        setContentView(web)
        web.loadUrl("file:///android_asset/ui/index.html")
    }

    private fun granted(p: String) = checkSelfPermission(p) == PackageManager.PERMISSION_GRANTED

    private fun mediaPermission() =
        if (Build.VERSION.SDK_INT >= 33) Manifest.permission.READ_MEDIA_IMAGES else Manifest.permission.READ_EXTERNAL_STORAGE

    private fun launchChooser(params: WebChromeClient.FileChooserParams): Boolean {
        val camera = if (params.isCaptureEnabled && granted(Manifest.permission.CAMERA)) cameraIntent() else null
        return try {
            startActivityForResult(camera ?: params.createIntent(), REQ_FILE)
            true
        } catch (_: Exception) {
            discardCamera()
            try {
                startActivityForResult(params.createIntent(), REQ_FILE)
                true
            } catch (_: Exception) {
                fileCallback?.onReceiveValue(null)
                fileCallback = null
                false
            }
        }
    }

    override fun onRequestPermissionsResult(requestCode: Int, permissions: Array<out String>, grantResults: IntArray) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults)
        val ok = grantResults.isNotEmpty() && grantResults[0] == PackageManager.PERMISSION_GRANTED
        voice?.onPermission(requestCode, ok)
        if (requestCode == REQ_MEDIA) {
            val p = pendingChooser
            pendingChooser = null
            if (p != null) launchChooser(p)
        }
    }

    override fun onDestroy() {
        voice?.destroy()
        super.onDestroy()
    }

    @Suppress("DEPRECATION", "OVERRIDE_DEPRECATION")
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        if (requestCode == REQ_FILE) {
            val cam = cameraUri
            val result: Array<Uri>? = if (cam != null) {
                if (resultCode == RESULT_OK) {
                    arrayOf(cam)
                } else {
                    discardCamera()
                    null
                }
            } else {
                WebChromeClient.FileChooserParams.parseResult(resultCode, data)
            }
            cameraUri = null
            fileCallback?.onReceiveValue(result)
            fileCallback = null
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    // Камера: снимок сохраняется в галерею и передаётся в интерфейс как файл.
    private fun cameraIntent(): Intent? = try {
        val values = ContentValues().apply {
            put(MediaStore.Images.Media.DISPLAY_NAME, "kairema_" + System.currentTimeMillis() + ".jpg")
            put(MediaStore.Images.Media.MIME_TYPE, "image/jpeg")
        }
        val uri = contentResolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values)
        cameraUri = uri
        if (uri == null) null else Intent(MediaStore.ACTION_IMAGE_CAPTURE).putExtra(MediaStore.EXTRA_OUTPUT, uri)
    } catch (_: Exception) {
        null
    }

    private fun discardCamera() {
        val uri = cameraUri ?: return
        cameraUri = null
        try {
            contentResolver.delete(uri, null, null)
        } catch (_: Exception) {
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
        const val REQ_MEDIA = 7103
        const val BACK_JS = """(function(){
            var a=document.querySelectorAll('.pbg,.sheet-bg,.spg');
            if(!a.length)return false;
            var t=a[a.length-1];
            if(t.close)t.close();else t.remove();
            return true;})()"""
    }
}
