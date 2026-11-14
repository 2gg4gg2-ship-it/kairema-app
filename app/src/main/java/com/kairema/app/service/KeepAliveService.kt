package com.kairema.app.service

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import com.kairema.app.MainActivity

/**
 * Передний план на время длинных задач: ответ ИИ, создание изображения, глубокое исследование, команды терминала.
 * Пока задача идёт, Android не останавливает процесс при сворачивании приложения, и ответ не обрывается.
 * Использование: KeepAliveService.begin(ctx) в начале задачи и KeepAliveService.end(ctx) в конце.
 */
class KeepAliveService : Service() {

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val nm = getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
        nm.createNotificationChannel(
            NotificationChannel(CHANNEL, "Фоновая работа", NotificationManager.IMPORTANCE_LOW)
        )
        val open = PendingIntent.getActivity(
            this, 0, Intent(this, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
            PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
        )
        val n = Notification.Builder(this, CHANNEL)
            .setSmallIcon(android.R.drawable.stat_notify_sync)
            .setContentTitle("Kairema работает")
            .setContentText("Выполняется запрос, можно свернуть приложение")
            .setOngoing(true)
            .setContentIntent(open)
            .build()
        if (Build.VERSION.SDK_INT >= 29) {
            startForeground(ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_DATA_SYNC)
        } else {
            startForeground(ID, n)
        }
        return START_NOT_STICKY
    }

    companion object {
        private const val CHANNEL = "kairema_work"
        private const val ID = 4101
        private const val GRACE_MS = 20_000L
        private var active = 0
        private var running = false
        private val handler = Handler(Looper.getMainLooper())
        private var stopper: Runnable? = null

        /** Задача началась. */
        @Synchronized
        fun begin(ctx: Context) {
            active++
            stopper?.let { handler.removeCallbacks(it) }
            stopper = null
            if (!running) {
                try {
                    val i = Intent(ctx.applicationContext, KeepAliveService::class.java)
                    ctx.applicationContext.startForegroundService(i)
                    running = true
                } catch (_: Exception) {
                    // Запуск не разрешён (приложение в фоне): работаем как раньше.
                }
            }
        }

        /** Задача закончилась. Служба останавливается с задержкой, чтобы цепочка запросов (исследование) не мигала. */
        @Synchronized
        fun end(ctx: Context) {
            if (active > 0) active--
            if (active > 0) return
            val app = ctx.applicationContext
            val r = Runnable {
                synchronized(KeepAliveService::class.java) {
                    if (active == 0 && running) {
                        app.stopService(Intent(app, KeepAliveService::class.java))
                        running = false
                    }
                }
            }
            stopper = r
            handler.postDelayed(r, GRACE_MS)
        }
    }
}
