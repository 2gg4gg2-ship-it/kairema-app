package com.kairema.app.bridge

import org.junit.Assert.*
import org.junit.Test

class ToolCallsTest {
    @Test fun oaiStreamedArguments() {
        val t = ToolCalls()
        t.oai(0, "call_1", "read_file", "")
        t.oai(0, null, null, "{\"path\":")
        t.oai(0, null, null, "\"a.txt\"}")
        assertFalse(t.isEmpty())
        assertEquals("[{\"id\":\"call_1\",\"name\":\"read_file\",\"args\":\"{\\\"path\\\":\\\"a.txt\\\"}\"}]", t.json())
    }

    @Test fun oaiTwoParallelCalls() {
        val t = ToolCalls()
        t.oai(0, "a", "list_dir", "{}")
        t.oai(1, "b", "grep", "{\"q\":\"x\"}")
        val j = t.json()
        assertTrue(j.contains("\"id\":\"a\"") && j.contains("\"id\":\"b\""))
    }

    @Test fun oaiWithoutIndexNewIdMakesNewSlot() {
        val t = ToolCalls()
        t.oai(null, "a", "x", "{\"p\":1")
        t.oai(null, null, null, "}")
        t.oai(null, "b", "y", "{}")
        val j = t.json()
        assertTrue(j.contains("{\\\"p\\\":1}"))
        assertTrue(j.contains("\"name\":\"y\""))
    }

    @Test fun anthropicBlocks() {
        val t = ToolCalls()
        t.anthStart(1, "toolu_1", "run_command")
        t.anthDelta(1, "{\"cmd\":")
        t.anthDelta(1, "\"ls\"}")
        assertEquals("[{\"id\":\"toolu_1\",\"name\":\"run_command\",\"args\":\"{\\\"cmd\\\":\\\"ls\\\"}\"}]", t.json())
    }

    @Test fun emptyArgsBecomeObject() {
        val t = ToolCalls()
        t.anthStart(0, "i", "list_dir")
        assertTrue(t.json().contains("\"args\":\"{}\""))
    }

    @Test fun noCalls() {
        assertTrue(ToolCalls().isEmpty())
        assertEquals("[]", ToolCalls().json())
    }

    @Test fun quoteEscapes() {
        assertEquals("\"a\\nb\\\"c\\\\\\u0001\"", ToolCalls.q("a\nb\"c\\\u0001"))
    }
}
