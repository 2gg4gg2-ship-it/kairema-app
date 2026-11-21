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
 * Команда кладётся в файл и запускается через обёртку assets/terminal/kairema-wrap.sh: текущая папка запоминается
 * между командами (cd работает), подгружаются помощники из kairemarc.sh (ll, la, tree, calc, help).
 * Если обёртку не удалось подготовить, работает старый способ: sh -c команда.
 * Ввод закрыт (/dev/null): команды, ждущие ввода, не зависают до конца времени.
 */
class Shell(private val ctx: Context) {

    private val pool = Executors.newCachedThreadPool()
    private val procs = ConcurrentHashMap<String, Process>()
    private val forced = ConcurrentHashMap<String, () -> Unit>()

    fun run(
        id: String,
        cmd: String,
        timeoutSec: Long,
        emit: (String) -> Unit,
        finish: (String?) -> Unit
    ) {
        pool.execute {
            var script: File? = null
            try {
                val dir = File(ctx.filesDir, "work")
                dir.mkdirs()
                val wrap = File(dir, ".kwrap.sh")
                val rc = File(dir, ".kairemarc")
                val cwd = File(dir, ".kcwd")
                script = File(dir, ".kcmd_" + id + ".sh")
                val useWrap = copyAsset("terminal/kairema-wrap.sh", wrap) &&
                    copyAsset("terminal/kairemarc.sh", rc) &&
                    writeScript(script!!, cmd)
                val args = if (useWrap) {
                    listOf("/system/bin/sh", wrap.absolutePath, dir.absolutePath, script!!.absolutePath, cwd.absolutePath, rc.absolutePath)
                } else {
                    listOf("/system/bin/sh", "-c", cmd)
                }
                val pb = ProcessBuilder(args)
                    .directory(dir)
                    .redirectErrorStream(true)
                    .redirectInput(ProcessBuilder.Redirect.from(File("/dev/null")))
                val env = pb.environment()
                env["HOME"] = dir.absolutePath
                env["TMPDIR"] = ctx.cacheDir.absolutePath
                env["TERM"] = "dumb"
                env["KAIREMA_LIB"] = ctx.applicationInfo.nativeLibraryDir
                val p = pb.start()
                procs[id] = p
                val timedOut = AtomicBoolean(false)
                // Завершение ровно один раз: и после обычного конца, и принудительно, если остановленная команда не отпустила вывод.
                val finished = AtomicBoolean(false)
                val complete: (Int, String) -> Unit = { code, note ->
                    if (finished.compareAndSet(false, true)) {
                        procs.remove(id)
                        forced.remove(id)
                        if (note.isNotEmpty()) emit(note)
                        emit("\n\u0001exit:$code")
                        finish(null)
                    }
                }
                forced[id] = { complete(-1, "\n[остановлено]") }
                pool.execute {
                    try {
                        if (!p.waitFor(timeoutSec, TimeUnit.SECONDS)) {
                            timedOut.set(true)
                            kill(p)
                            // Внучатые процессы (например sleep) могут держать вывод открытым: через 3 секунды завершаем принудительно.
                            Thread.sleep(3000)
                            complete(-1, "\n[остановлено: время вышло, $timeoutSec с]")
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
                    val n = try {
                        reader.read(buf)
                    } catch (e: java.io.IOException) {
                        -1 // поток закрыт при остановке или по времени
                    }
                    if (n < 0 || finished.get()) break
                    total += n
                    emit(String(buf, 0, n))
                    if (total > MAX_OUT) {
                        cut = true
                        kill(p)
                        break
                    }
                }
                val code = if (p.waitFor(3, TimeUnit.SECONDS)) p.exitValue() else -1
                var note = ""
                if (cut) note += "\n[вывод обрезан: слишком много текста]"
                if (timedOut.get()) note += "\n[остановлено: время вышло, $timeoutSec с]"
                complete(code, note)
            } catch (e: Exception) {
                procs.remove(id)
                finish(e.message ?: "не удалось запустить команду")
            } finally {
                script?.delete()
            }
        }
    }

    fun cancel(id: String) {
        procs.remove(id)?.let { kill(it) }
        // Если оболочка убита, а её дочерняя программа держит вывод открытым, не ждём вечно: через 1,5 с завершаем запуск принудительно.
        forced[id]?.let { f ->
            pool.execute {
                try {
                    Thread.sleep(1500)
                } catch (e: InterruptedException) {
                    // игнорируем
                }
                f()
            }
        }
    }

    /** Останавливает оболочку и закрывает чтение, чтобы дочерние программы не держали вывод открытым. */
    private fun kill(p: Process) {
        try {
            p.destroyForcibly()
        } catch (e: Exception) {
            // игнорируем
        }
        try {
            p.inputStream.close()
        } catch (e: Exception) {
            // игнорируем
        }
    }

    private fun copyAsset(name: String, to: File): Boolean {
        return try {
            ctx.assets.open(name).use { i -> to.outputStream().use { o -> i.copyTo(o) } }
            true
        } catch (e: Exception) {
            false
        }
    }

    private fun writeScript(f: File, cmd: String): Boolean {
        return try {
            f.writeText(cmd + "\n", Charsets.UTF_8)
            true
        } catch (e: Exception) {
            false
        }
    }

    private companion object {
        const val MAX_OUT = 200_000
    }
}
