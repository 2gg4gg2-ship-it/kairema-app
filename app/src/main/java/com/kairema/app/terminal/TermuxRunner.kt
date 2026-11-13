package com.kairema.app.terminal

import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Build
import android.os.Bundle
import org.json.JSONObject
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.ScheduledFuture
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicInteger

private class TermuxJob(
    val emit: (String) -> Unit,
    val finish: (String?) -> Unit,
    var timer: ScheduledFuture<*>?
)

/**
 * Запуск команд в Termux (если он установлен). Kairema отправляет команду, Termux выполняет её
 * в фоне и возвращает результат. Нужны: разрешение RUN_COMMAND для Kairema и allow-external-apps=true в Termux.
 * Результат приходит целиком после завершения команды (не по ходу выполнения).
 */
class TermuxRunner(private val ctx: Context) {

    /** Состояние для проверки в интерфейсе: JSON {"installed":bool,"permission":bool}. */
    fun status(): String {
        val installed = isInstalled()
        val perm = ctx.checkSelfPermission(PERM) == PackageManager.PERMISSION_GRANTED
        return JSONObject().put("installed", installed).put("permission", perm).toString()
    }

    private fun isInstalled(): Boolean = try {
        ctx.packageManager.getPackageInfo(TERMUX, 0)
        true
    } catch (e: PackageManager.NameNotFoundException) {
        false
    }

    fun run(
        id: String,
        cmd: String,
        timeoutSec: Long,
        emit: (String) -> Unit,
        finish: (String?) -> Unit
    ) {
        if (!isInstalled()) {
            finish("Termux не установлен")
            return
        }
        if (ctx.checkSelfPermission(PERM) != PackageManager.PERMISSION_GRANTED) {
            finish(NO_PERM)
            return
        }
        val timer = scheduler.schedule(Runnable {
            val j = jobs.remove(id)
            if (j != null) {
                j.finish("Termux не ответил за $timeoutSec с. Проверьте allow-external-apps=true в Termux и перезапустите Termux")
            }
        }, timeoutSec, TimeUnit.SECONDS)
        jobs[id] = TermuxJob(emit, finish, timer)
        try {
            val back = Intent(ctx, TermuxResultReceiver::class.java).putExtra(EXTRA_ID, id)
            var flags = PendingIntent.FLAG_ONE_SHOT
            if (Build.VERSION.SDK_INT >= 31) flags = flags or PendingIntent.FLAG_MUTABLE
            val pi = PendingIntent.getBroadcast(ctx, counter.incrementAndGet(), back, flags)
            val script = "export PATH=\"$BIN:\$PATH\"\n$cmd\n"
            val intent = Intent()
                .setClassName(TERMUX, "com.termux.app.RunCommandService")
                .setAction("com.termux.RUN_COMMAND")
                .putExtra("com.termux.RUN_COMMAND_PATH", "$BIN/bash")
                .putExtra("com.termux.RUN_COMMAND_STDIN", script)
                .putExtra("com.termux.RUN_COMMAND_WORKDIR", HOME)
                .putExtra("com.termux.RUN_COMMAND_BACKGROUND", true)
                .putExtra("com.termux.RUN_COMMAND_COMMAND_LABEL", "Kairema")
                .putExtra("com.termux.RUN_COMMAND_PENDING_INTENT", pi)
            ctx.startService(intent)
        } catch (e: SecurityException) {
            fail(id, NO_PERM)
        } catch (e: Exception) {
            fail(id, e.message ?: "не удалось отправить команду в Termux")
        }
    }

    /** Отмена со стороны интерфейса: ждать результат больше не будем (сама команда в Termux может дойти до конца). */
    fun cancel(id: String) {
        val j = jobs.remove(id) ?: return
        j.timer?.cancel(false)
        j.emit("\n[остановлено в Kairema; в Termux команда может ещё работать]\n\u0001exit:137")
        j.finish(null)
    }

    private fun fail(id: String, msg: String) {
        val j = jobs.remove(id) ?: return
        j.timer?.cancel(false)
        j.finish(msg)
    }

    companion object {
        private const val TERMUX = "com.termux"
        private const val PERM = "com.termux.permission.RUN_COMMAND"
        private const val HOME = "/data/data/com.termux/files/home"
        private const val BIN = "/data/data/com.termux/files/usr/bin"
        private const val NO_PERM =
            "Нет разрешения: Настройки Android, Приложения, Kairema, Разрешения, Дополнительные разрешения, «Run commands in Termux environment»"
        const val EXTRA_ID = "kairema_req_id"

        private val jobs = ConcurrentHashMap<String, TermuxJob>()
        private val counter = AtomicInteger(5000)
        private val scheduler = Executors.newSingleThreadScheduledExecutor()

        /** Результат от Termux, вызывается из TermuxResultReceiver. */
        fun deliver(id: String, result: Bundle?) {
            val j = jobs.remove(id) ?: return
            j.timer?.cancel(false)
            if (result == null) {
                j.finish("Termux вернул пустой ответ")
                return
            }
            // err равен -1 (Activity.RESULT_OK), если внутренних ошибок Termux не было.
            val err = result.getInt("err", -1)
            if (err != -1) {
                val msg = result.getString("errmsg", "") ?: ""
                j.finish("Ошибка Termux: " + msg.take(300))
                return
            }
            val out = result.getString("stdout", "") ?: ""
            val serr = result.getString("stderr", "") ?: ""
            val code = result.getInt("exitCode", -1)
            if (out.isNotEmpty()) j.emit(out)
            if (serr.isNotEmpty()) j.emit((if (out.isNotEmpty() && !out.endsWith("\n")) "\n" else "") + serr)
            j.emit("\n\u0001exit:$code")
            j.finish(null)
        }
    }
}
