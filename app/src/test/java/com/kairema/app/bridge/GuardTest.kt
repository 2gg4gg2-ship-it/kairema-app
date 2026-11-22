package com.kairema.app.bridge

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class GuardTest {
    @Test fun tokenIsLongHexAndStable() {
        assertEquals(48, Guard.token.length)
        assertTrue(Guard.token.all { it in '0'..'9' || it in 'a'..'f' })
        assertEquals(Guard.token, Guard.token)
    }

    @Test fun acceptsOnlyExactToken() {
        assertTrue(Guard.ok(Guard.token))
        assertFalse(Guard.ok(null))
        assertFalse(Guard.ok(""))
        assertFalse(Guard.ok(Guard.token.dropLast(1)))
        assertFalse(Guard.ok(Guard.token + "0"))
        assertFalse(Guard.ok(Guard.token.uppercase()))
        assertFalse(Guard.ok(" " + Guard.token))
        // тот же размер, но другое содержимое
        assertFalse(Guard.ok("0".repeat(Guard.token.length).let { if (it == Guard.token) "1".repeat(it.length) else it }))
    }

    @Test fun scriptCarriesTokenToMainFrameOnly() {
        val s = Guard.script()
        assertTrue(s.contains(Guard.token))
        assertTrue(s.startsWith("window.KairemaNative&&KairemaNative.tok&&KairemaNative.tok('"))
        assertFalse(s.contains("\""))   // токен не должен ломать строку JS
    }
}
