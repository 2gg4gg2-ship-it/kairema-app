package com.kairema.app.system

import android.app.Activity
import android.content.res.Configuration
import android.graphics.Color
import android.graphics.Rect
import android.os.Build
import android.view.View
import android.view.ViewTreeObserver
import android.animation.ValueAnimator
import android.view.WindowInsets
import android.view.WindowInsetsAnimation
import android.view.animation.DecelerateInterpolator
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
    private var padL = 0 // боковые панели и вырез в горизонтальном положении, px
    private var padR = 0
    private var navPx = 0 // панель навигации, px
    private var imePx = 0 // клавиатура по данным WindowInsets, px
    private var framePx = 0 // клавиатура по размеру видимой области (запасной способ), px
    private var animating = false // идёт анимация клавиатуры системы (API 30+): отступ ведёт она, а не слушатель
    private var shownBottom = 0 // нижний отступ, который сейчас выставлен контейнеру, px
    private var anim: ValueAnimator? = null // собственная плавная анимация для Android 8-10
    private val navH: Int // высота нижней панели интерфейса (64dp), px: клавиатура её накрывает, а не поднимает
        get() = Math.round(64f * web.resources.displayMetrics.density)

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
                padL = bars.left
                padR = bars.right
                navPx = bars.bottom
                imePx = ime.bottom
                applyPadding()
                WindowInsets.CONSUMED
            } else {
                padTop = ins.systemWindowInsetTop
                padL = ins.systemWindowInsetLeft
                padR = ins.systemWindowInsetRight
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
        // Android 11+: клавиатура сама сообщает каждый кадр своего движения, нижний отступ едет вместе с ней.
        if (Build.VERSION.SDK_INT >= 30) {
            root.setWindowInsetsAnimationCallback(object :
                WindowInsetsAnimation.Callback(WindowInsetsAnimation.Callback.DISPATCH_MODE_CONTINUE_ON_SUBTREE) {
                // До первой раскладки с новыми размерами: иначе отступ сначала прыгает на конечное значение, а потом едет плавно.
                override fun onPrepare(animation: WindowInsetsAnimation) {
                    if (animation.typeMask and WindowInsets.Type.ime() != 0) animating = true
                }

                override fun onStart(
                    animation: WindowInsetsAnimation,
                    bounds: WindowInsetsAnimation.Bounds
                ): WindowInsetsAnimation.Bounds {
                    if (animation.typeMask and WindowInsets.Type.ime() != 0) animating = true
                    return bounds
                }

                override fun onProgress(
                    insets: WindowInsets,
                    runningAnimations: MutableList<WindowInsetsAnimation>
                ): WindowInsets {
                    if (animating) {
                        val ime = insets.getInsets(WindowInsets.Type.ime()).bottom
                        val nav = insets.getInsets(WindowInsets.Type.systemBars()).bottom
                        setBottom(Math.max(nav, ime - navH))
                    }
                    return insets
                }

                override fun onEnd(animation: WindowInsetsAnimation) {
                    if (animation.typeMask and WindowInsets.Type.ime() != 0) {
                        animating = false
                        applyPadding()
                    }
                }
            })
        }
        root.requestApplyInsets()
    }

    private fun setBottom(px: Int) {
        shownBottom = px
        if (root.paddingTop != padTop || root.paddingBottom != px || root.paddingLeft != padL || root.paddingRight != padR) {
            root.setPadding(padL, padTop, padR, px)
        }
    }

    private fun isNight(): Boolean =
        (act.resources.configuration.uiMode and Configuration.UI_MODE_NIGHT_MASK) == Configuration.UI_MODE_NIGHT_YES

    /** Сдвинуть контейнер WebView: сверху под статус-бар, снизу под панель навигации или клавиатуру (что выше). */
    private fun applyPadding() {
        // Нижняя панель интерфейса (64dp) лежит внутри WebView. Контейнер поднимается только на ту часть клавиатуры,
        // которая выше этой панели: панель остаётся внизу под клавиатурой, а поле ввода едет ровно вместе с ней.
        val bottom = Math.max(navPx, Math.max(imePx, framePx) - navH)
        push()
        if (animating) return // отступ ведёт анимация клавиатуры (onProgress), в конце onEnd вызовет нас снова
        if (Build.VERSION.SDK_INT >= 30) {
            setBottom(bottom)
        } else {
            smooth(bottom)
        }
    }

    /** Android 8-10: система не присылает кадры анимации клавиатуры, поэтому отступ плавно доезжает сам. */
    private fun smooth(target: Int) {
        if (target == shownBottom && anim == null) return
        anim?.cancel()
        val from = shownBottom
        if (from == target || root.height == 0) {
            anim = null
            setBottom(target)
            return
        }
        anim = ValueAnimator.ofInt(from, target).apply {
            duration = 220
            interpolator = DecelerateInterpolator(1.6f)
            addUpdateListener { setBottom(it.animatedValue as Int) }
            addListener(object : android.animation.AnimatorListenerAdapter() {
                override fun onAnimationEnd(a: android.animation.Animator) {
                    anim = null
                }
            })
            start()
        }
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
