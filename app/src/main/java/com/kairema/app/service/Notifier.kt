package com.kairema.app.service

import android.Manifest
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import com.kairema.app.MainActivity

/** Видно ли приложение на экране (MainActivity ставит в onStart и onStop). */
object AppState {
    @Volatile
    var visible = false
}

/**
 * Уведомление «ответ готов»: когда модель закончила, а приложение свёрнуто или телефон заблокирован.
 * Если приложение открыто, уведомление не показывается.
 */
object Notifier {
    private const val CHANNEL = "kairema_done"
    private const val ID = 4102

    fun done(ctx: Context, title: String, text: String) {
        if (AppState.visible) return
        try {
            val app = ctx.applicationContext
            if (Build.VERSION.SDK_INT >= 33 &&
                app.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
            ) return
            val nm = app.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager
            nm.createNotificationChannel(NotificationChannel(CHANNEL, "Ответ готов", NotificationManager.IMPORTANCE_DEFAULT))
            val open = PendingIntent.getActivity(
                app, 1,
                Intent(app, MainActivity::class.java).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_REORDER_TO_FRONT),
                PendingIntent.FLAG_IMMUTABLE or PendingIntent.FLAG_UPDATE_CURRENT
            )
            val n = Notification.Builder(app, CHANNEL)
                .setSmallIcon(android.R.drawable.stat_notify_chat)
                .setContentTitle(title)
                .setContentText(text)
                .setStyle(Notification.BigTextStyle().bigText(text))
                .setAutoCancel(true)
                .setContentIntent(open)
                .build()
            nm.notify(ID, n)
        } catch (_: Exception) {
        }
    }

    /** Приложение открыли: старое уведомление больше не нужно. */
    fun clear(ctx: Context) {
        try {
            (ctx.getSystemService(Context.NOTIFICATION_SERVICE) as NotificationManager).cancel(ID)
        } catch (_: Exception) {
        }
    }
}
