package com.kairema.app.bridge

import org.junit.Assert.*
import org.junit.Test

class HttpRulesTest {
    @Test fun urls() {
        assertTrue(HttpRules.allowedUrl("https://example.com/a?b=1"))
        assertTrue(HttpRules.allowedUrl("http://127.0.0.1:8080/mcp"))
        assertFalse(HttpRules.allowedUrl("file:///etc/passwd"))
        assertFalse(HttpRules.allowedUrl("ftp://example.com"))
        assertFalse(HttpRules.allowedUrl("javascript:alert(1)"))
        assertFalse(HttpRules.allowedUrl("https://"))
        assertFalse(HttpRules.allowedUrl("https://user:pw@example.com/"))
        assertFalse(HttpRules.allowedUrl("https:///path"))
    }
    @Test fun methodsAndHeaders() {
        assertTrue(HttpRules.allowedMethod("POST"))
        assertFalse(HttpRules.allowedMethod("PUT"))
        assertTrue(HttpRules.headerOk("Mcp-Session-Id"))
        assertTrue(HttpRules.headerOk("Accept"))
        assertFalse(HttpRules.headerOk("Authorization"))
        assertFalse(HttpRules.headerOk("Cookie"))
        assertFalse(HttpRules.headerOk("Host"))
        assertFalse(HttpRules.headerOk("X Bad"))
        assertFalse(HttpRules.headerOk(""))
    }
    @Test fun keysAndLimits() {
        assertTrue(HttpRules.keyIdOk("mcp-abc123"))
        assertFalse(HttpRules.keyIdOk("groq"))
        assertFalse(HttpRules.keyIdOk("mcp-"))
        assertFalse(HttpRules.keyIdOk("mcp-a b"))
        assertEquals(1000, HttpRules.clampMax(5))
        assertEquals(1_000_000, HttpRules.clampMax(99_000_000))
        assertEquals(400000, HttpRules.clampMax(400000))
    }
}
