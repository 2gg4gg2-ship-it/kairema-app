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
import android.widget.FrameLayout

/**
 * Системные панели, клавиатура и тема телефона.
 *
 * Раньше отступы под статус-бар и клавиатуру угадывал JavaScript (таймеры, «запомненная высота»),
 * отсюда задержки, лишнее место и перекрытие часов. Теперь всё считает Kotlin и применяет сам:
 * WebView лежит в контейнере (root), и его отступы сверху и снизу равны настоящим размерам системных панелей
 * и клавиатуры. Когда клавиатура открывается или закрывается, система присылает новые размеры,
 * контейнер сжимается ровно на высоту клавиатуры, поле ввода поднимается и опускается вместе с ней.
 * Интерфейсу уходит только признак «клавиатура открыта»: Sys.insets(0, 0, высотаКлавиатурыDp).
 * Интерфейс в ответ вызывает bars(тёмная), чтобы значки статус-бара были видны на любом фоне.
 * В JS доступен как KairemaSysBridge.
 */
class SystemBridge(
    private val act: Activity,
    private val web: WebView,
    private val root: FrameLayout
) {

    private var padTop = 0 // статус-бар и вырез, px
    private var navPx = 0 // панель навигации, px
    private var imePx = 0 // клавиатура по данным WindowInsets, px
    private var framePx = 0 // клавиатура по размеру видимой области (запасной способ), px

    /** Включить режим «на весь экран» и подписаться на размеры панелей. */
    @Suppress("DEPRECATION")
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
            w.decorView.systemUiVisibility = View.SYSTEM_UI_FLAG_LAYOUT_STABLE or
                View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN or
                View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
        }
        root.setOnApplyWindowInsetsListener { _, ins ->
            if (Build.VERSION.SDK_INT >= 30) {
                val bars = ins.getInsets(WindowInsets.Type.systemBars() or WindowInsets.Type.displayCutout())
                val ime = ins.getInsets(WindowInsets.Type.ime())
                padTop = bars.top
                navPx = bars.bottom
                imePx = ime.bottom
                applyPadding()
                WindowInsets.CONSUMED
            } else {
                padTop = ins.systemWindowInsetTop
                navPx = ins.stableInsetBottom
                imePx = Math.max(0, ins.systemWindowInsetBottom - ins.stableInsetBottom)
                applyPadding()
                ins.consumeSystemWindowInsets()
            }
        }
        // Запасной способ: если на прошивке WindowInsets не доходят, клавиатуру видно по тому,
        // насколько поднялся низ видимой области окна.
        val decor = w.decorView
        decor.viewTreeObserver.addOnGlobalLayoutListener(ViewTreeObserver.OnGlobalLayoutListener {
            val r = Rect()
            decor.getWindowVisibleDisplayFrame(r)
            val h = decor.height
            val diff = if (h > 0) h - r.bottom else 0
            val k = if (diff > h * 0.15) diff else 0
            if (k != framePx) {
                framePx = k
                applyPadding()
            }
        })
        root.requestApplyInsets()
    }

    private fun isNight(): Boolean =
        (act.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    /** Сдвинуть контейнер WebView: сверху под статус-бар, снизу под панель навигации или клавиатуру (что выше). */
    private fun applyPadding() {
        val bottom = Math.max(navPx, Math.max(imePx, framePx))
        if (root.paddingTop != padTop || root.paddingBottom != bottom) {
            root.setPadding(0, padTop, 0, bottom)
        }
        push()
    }

    /** Передать интерфейсу признак клавиатуры и тему (после загрузки страницы и при изменениях). */
    fun push() {
        val d = web.resources.displayMetrics.density
        val kbDp = Math.round(Math.max(imePx, framePx) / d)
        val js = "window.Sys&&(Sys.insets(0,0,$kbDp),Sys.system(${isNight()}))"
        web.post { web.evaluateJavascript(js, null) }
    }

    @JavascriptInterface
    fun dark(): Boolean = isNight()

    /** Цвет фона и значки статус-бара: светлые на тёмном фоне, тёмные на светлом. */
    @JavascriptInterface
    fun bars(darkTheme: Boolean) {
        act.runOnUiThread {
            val bg = Color.parseColor(if (darkTheme) "#0B0B0C" else "#FAFAFA")
            web.setBackgroundColor(bg)
            root.setBackgroundColor(bg)
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
