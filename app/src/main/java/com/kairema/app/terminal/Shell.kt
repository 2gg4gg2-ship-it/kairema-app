package com.kairema.app.terminal

import android.content.Context
import java.io.File
import java.io.InputStreamReader
import java.util.concurrent.ConcurrentHashMap
import java.util.concurrent.Executors
import java.util.concurrent.TimeUnit
import java.util.concurrent.atomic.AtomicBoolean

/**
 * Настоящая оболочка Android (/system/bin/sh) для терминала.
 * Команда выполняется в рабочей папке приложения (files/work). Вывод идёт кусками,
 * в конце отправляется метка кода выхода: перевод строки, символ \u0001 и "exit:КОД".
 * Программы из папки данных запускать нельзя (правило Android 10+), доступны системные команды.
 */
class Shell(private val ctx: Context) {

    private val pool = Executors.newCachedThreadPool()
    private val procs = ConcurrentHashMap<String, Process>()

    fun run(
        id: String,
        cmd: String,
        timeoutSec: Long,
        emit: (String) -> Unit,
        finish: (String?) -> Unit
    ) {
        pool.execute {
            try {
                val dir = File(ctx.filesDir, "work")
                dir.mkdirs()
                val pb = ProcessBuilder("/system/bin/sh", "-c", cmd)
                    .directory(dir)
                    .redirectErrorStream(true)
                val env = pb.environment()
                env["HOME"] = dir.absolutePath
                env["TMPDIR"] = ctx.cacheDir.absolutePath
                env["TERM"] = "dumb"
                env["KAIREMA_LIB"] = ctx.applicationInfo.nativeLibraryDir
                val p = pb.start()
                procs[id] = p
                val timedOut = AtomicBoolean(false)
                pool.execute {
                    try {
                        if (!p.waitFor(timeoutSec, TimeUnit.SECONDS)) {
                            timedOut.set(true)
                            p.destroyForcibly()
                        }
                    } catch (e: InterruptedException) {
                        // игнорируем
                    }
                }
                val reader = InputStreamReader(p.inputStream, Charsets.UTF_8)
                val buf = CharArray(2048)
                var total = 0
                var cut = false
                while (true) {
                    val n = reader.read(buf)
                    if (n < 0) break
                    total += n
                    emit(String(buf, 0, n))
                    if (total > MAX_OUT) {
                        cut = true
                        p.destroyForcibly()
                        break
                    }
                }
                val code = p.waitFor()
                procs.remove(id)
                if (cut) emit("\n[вывод обрезан: слишком много текста]")
                if (timedOut.get()) emit("\n[остановлено: время вышло, $timeoutSec с]")
                emit("\n\u0001exit:$code")
                finish(null)
            } catch (e: Exception) {
                procs.remove(id)
                finish(e.message ?: "не удалось запустить команду")
            }
        }
    }

    fun cancel(id: String) {
        procs.remove(id)?.destroyForcibly()
    }

    private companion object {
        const val MAX_OUT = 200_000
    }
}
