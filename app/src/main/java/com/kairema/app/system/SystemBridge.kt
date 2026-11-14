package com.kairema.app.system

import android.app.Activity
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Rect
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import android.view.WindowInsets
import android.view.WindowInsetsController
import android.webkit.JavascriptInterface
import android.webkit.WebView

/**
 * Системные панели и тема телефона.
 * Приложение рисуется на весь экран (под статус-баром); размеры панелей и тема передаются в интерфейс:
 * Sys.insets(верх, низ) и Sys.system(тёмная). Интерфейс в ответ вызывает bars(тёмная), чтобы значки
 * статус-бара были видны на любом фоне. В JS доступен как KairemaSysBridge.
 */
class SystemBridge(private val act: Activity, private val web: WebView) {

    private var top = 0
    private var bottom = 0 // панель навигации
    private var imeInset = 0 // клавиатура по данным WindowInsets
    private var kbLayout = 0 // клавиатура по размеру окна (запасной способ)
    private var kb = 0 // итоговая высота клавиатуры в dp

    /** Включить режим «на весь экран» и подписаться на размеры панелей. */
    fun setup() {
        val w = act.window
        w.statusBarColor = Color.TRANSPARENT
        w.navigationBarColor = Color.TRANSPARENT
        if (Build.VERSION.SDK_INT >= 28) {
            val lp = w.attributes
            lp.layoutInDisplayCutoutMode = android.view.WindowManager.LayoutParams.LAYOUT_IN_DISPLAY_CUTOUT_MODE_SHORT_EDGES
            w.attributes = lp
        }
        if (Build.VERSION.SDK_INT >= 29) w.isNavigationBarContrastEnforced = false
        if (Build.VERSION.SDK_INT >= 30) {
            w.setDecorFitsSystemWindows(false)
        } else {
            @Suppress("DEPRECATION")
            w.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        }
        web.setOnApplyWindowInsetsListener { _, ins ->
            val d = web.resources.displayMetrics.density
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = ins.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                val ime = ins.getInsets(WindowInsets.Type.ime())
                top = Math.round(bars.top / d)
                bottom = Math.round(bars.bottom / d)
                imeInset = Math.round(ime.bottom / d)
            } else {
                @Suppress("DEPRECATION")
                top = Math.round(ins.systemWindowInsetTop / d)
                @Suppress("DEPRECATION")
                bottom = Math.round(ins.stableInsetBottom / d)
                @Suppress("DEPRECATION")
                imeInset = Math.max(0, Math.round((ins.systemWindowInsetBottom - ins.stableInsetBottom) / d))
            }
            recalc()
            ins
        }
        // Запасной способ: в режиме «на весь экран» окно не сжимается, а WindowInsets на некоторых прошивках
        // не доходят до WebView. Высоту клавиатуры тогда видно по тому, насколько поднялся низ видимой области.
        val decor = w.decorView
        decor.viewTreeObserver.addOnGlobalLayoutListener(ViewTreeObserver.OnGlobalLayoutListener {
            val r = Rect()
            decor.getWindowVisibleDisplayFrame(r)
            val h = decor.height
            val diff = if (h > 0) h - r.bottom else 0
            val k = if (diff > h * 0.15) Math.round(diff / web.resources.displayMetrics.density) else 0
            if (k != kbLayout) {
                kbLayout = k
                recalc()
            }
        })
        web.requestApplyInsets()
    }

    private fun isNight(): Boolean =
        (act.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    private fun recalc() {
        val k = Math.max(imeInset, kbLayout)
        if (k != kb) kb = k
        push()
    }

    /** Передать в интерфейс размеры панелей, высоту клавиатуры и тему (после загрузки страницы и при их изменении). */
    fun push() {
        val js = "window.Sys&&(Sys.insets($top,$bottom,$kb),Sys.system(${isNight()}))"
        web.post { web.evaluateJavascript(js, null) }
    }

    @JavascriptInterface
    fun dark(): Boolean = isNight()

    /** Значки статус-бара и панели навигации: светлые на тёмном фоне, тёмные на светлом. */
    @JavascriptInterface
    fun bars(darkTheme: Boolean) {
        act.runOnUiThread {
            val bg = Color.parseColor(if (darkTheme) "#0B0B0C" else "#FAFAFA")
            web.setBackgroundColor(bg)
            if (Build.VERSION.SDK_INT >= 30) {
                val c = act.window.insetsController ?: return@runOnUiThread
                val mask = WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS or
                    WindowInsetsController.APPEARANCE_LIGHT_NAVIGATION_BARS
                c.setSystemBarsAppearance(if (darkTheme) 0 else mask, mask)
            } else {
                @Suppress("DEPRECATION")
                var f = act.window.decorView.systemUiVisibility
                @Suppress("DEPRECATION")
                val light = (if (Build.VERSION.SDK_INT >= 23) View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR else 0) or
                    (if (Build.VERSION.SDK_INT >= 26) View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR else 0)
                f = if (darkTheme) f and light.inv() else f or light
                @Suppress("DEPRECATION")
                act.window.decorView.systemUiVisibility = f
            }
        }
    }
}
