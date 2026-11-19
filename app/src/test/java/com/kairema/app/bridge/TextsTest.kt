package com.kairema.app.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class TextsTest {
    @Test fun tooLargeByCode() {
        val t = Texts.httpError(413, """{"error":{"message":"Request too large for model `qwen/qwen3.8-27b` ... ITPM"}}""")
        assertTrue(t.startsWith("запрос слишком большой"))
        assertTrue(t.contains("/compact"))
        assertTrue(t.contains("Request too large"))   // подробности провайдера сохранены
    }

    @Test fun tooLargeByTextEvenWithOtherCode() {
        assertTrue(Texts.httpError(400, """{"error":{"message":"maximum context length is 8192 tokens"}}""").startsWith("запрос слишком большой"))
        assertTrue(Texts.httpError(429, """{"error":{"message":"Rate limit reached: Limit 6000 tokens per minute"}}""").startsWith("запрос слишком большой"))
    }

    @Test fun authNotFoundRate() {
        assertTrue(Texts.httpError(401, "").startsWith("ключ отклонён (401)"))
        assertTrue(Texts.httpError(403, "{}").startsWith("ключ отклонён (403)"))
        assertTrue(Texts.httpError(404, "").startsWith("адрес или модель не найдены"))
        assertTrue(Texts.httpError(429, """{"error":{"message":"slow down"}}""").startsWith("лимит запросов"))
    }

    @Test fun otherCodesShowTailAndAreCapped() {
        assertEquals("ошибка 500", Texts.httpError(500, ""))
        assertEquals("ошибка 502: bad gateway", Texts.httpError(502, "bad   gateway"))
        val long = Texts.httpError(500, "x".repeat(1000))
        assertTrue(long.length < 200)
    }

    @Test fun jsonMessageWithEscapedQuotesAndNewlines() {
        val t = Texts.httpError(500, """{"error":{"message":"bad \"thing\"\nhappened"}}""")
        assertEquals("ошибка 500: bad \"thing\" happened", t)
    }

    @Test fun netErrors() {
        assertEquals("нет соединения или неверный адрес", Texts.netError(java.net.UnknownHostException("x")))
        assertTrue(Texts.netError(java.net.SocketTimeoutException()).startsWith("время ожидания истекло"))
        assertEquals("неверный API URL", Texts.netError(IllegalArgumentException("bad")))
        assertEquals("boom", Texts.netError(RuntimeException("boom")))
        assertEquals("ошибка сети", Texts.netError(RuntimeException()))
    }

    @Test fun normBase() {
        assertEquals("https://api.openai.com/v1", Texts.normBase(" https://api.openai.com/v1/ "))
        assertEquals("https://openrouter.ai/api/v1", Texts.normBase("https://openrouter.ai"))
        assertEquals("https://openrouter.ai/api/v1", Texts.normBase("https://openrouter.ai/"))
        assertEquals("https://openrouter.ai/api/v1", Texts.normBase("https://openrouter.ai/api/v1/"))
        assertEquals("http://localhost:11434/v1", Texts.normBase("http://localhost:11434/v1"))
        assertFalse(Texts.normBase("https://openrouter.ai.evil.com").endsWith("/api/v1"))
    }
}
