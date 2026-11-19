package com.kairema.app.bridge

/**
 * Чистые функции моста без Android и без сети: тексты ошибок и разбор адреса. Вынесены из Bridge.kt,
 * чтобы их можно было проверить обычными тестами (app/src/test).
 */
object Texts {
    private val SPACES = Regex("\\s+")
    private val MESSAGE = Regex("\"message\"\\s*:\\s*\"((?:[^\"\\\\]|\\\\.)*)\"")

    /** Понятный русский текст по коду ответа и телу (JSON с error.message или просто текст). */
    fun httpError(code: Int, raw: String): String {
        val msg = MESSAGE.find(raw)?.groupValues?.get(1)?.replace("\\\"", "\"")?.replace("\\n", " ")
        val tail = (msg ?: raw).replace(SPACES, " ").trim().take(160)
        val big = code == 413 || tail.contains("too large", true) || tail.contains("tokens per minute", true) ||
            tail.contains("context length", true) || tail.contains("maximum context", true)
        return when {
            big -> "запрос слишком большой для этой модели или лимита провайдера ($code). Начните новый чат или введите /compact, чтобы сжать историю. Подробности: $tail"
            code == 401 || code == 403 -> "ключ отклонён ($code): проверьте ключ и что у него есть доступ к этой модели"
            code == 404 -> "адрес или модель не найдены (404): проверьте название модели и адрес API"
            code == 429 -> "лимит запросов или нет баланса (429): подождите минуту или проверьте баланс"
            else -> "ошибка $code" + if (tail.isNotEmpty()) ": $tail" else ""
        }
    }

    /** Текст по исключению сети. */
    fun netError(e: Exception): String = when (e) {
        is java.net.UnknownHostException -> "нет соединения или неверный адрес"
        is java.net.SocketTimeoutException -> "время ожидания истекло: модель не ответила, повторите или выберите другую"
        is IllegalArgumentException -> "неверный API URL"
        else -> e.message ?: "ошибка сети"
    }

    /** Адрес API без хвостового «/»; для голого openrouter.ai дописывает /api/v1. */
    fun normBase(url: String): String {
        val b = url.trim().trimEnd('/')
        val rest = b.substringAfter("://")
        return if (rest.substringBefore('/') == "openrouter.ai" && !rest.contains('/')) "$b/api/v1" else b
    }
}
