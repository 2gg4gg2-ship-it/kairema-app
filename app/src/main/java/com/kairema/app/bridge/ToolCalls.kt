package com.kairema.app.bridge

/**
 * Сбор вызовов инструментов из потока ответа модели (без Android и без org.json — проверяется юнит-тестами).
 * OpenAI-совместимые: delta.tool_calls[{index,id,function{name,arguments}}], аргументы приходят кусками.
 * Anthropic: content_block_start (tool_use: id, name) + input_json_delta (partial_json) по индексу блока.
 */
class ToolCalls {
    private class Call(var id: String = "", var name: String = "", val args: StringBuilder = StringBuilder())

    private val calls = LinkedHashMap<Int, Call>()
    private var lastKey = -1

    private fun slot(k: Int) = calls.getOrPut(k) { Call() }.also { lastKey = k }

    /** Кусок tool_calls у OpenAI-совместимых. Если index не пришёл: новый id — новая ячейка, иначе продолжаем последнюю. */
    fun oai(index: Int?, id: String?, name: String?, args: String?) {
        val k = index ?: if (!id.isNullOrEmpty() || lastKey < 0) (if (calls.isEmpty()) 0 else calls.keys.max() + 1) else lastKey
        val c = slot(k)
        if (!id.isNullOrEmpty()) c.id = id
        if (!name.isNullOrEmpty()) c.name = name
        if (!args.isNullOrEmpty()) c.args.append(args)
    }

    /** Anthropic: начало блока tool_use. */
    fun anthStart(index: Int, id: String, name: String) {
        val c = slot(index)
        c.id = id
        c.name = name
    }

    /** Anthropic: кусок аргументов блока. */
    fun anthDelta(index: Int, partial: String) {
        if (partial.isNotEmpty()) slot(index).args.append(partial)
    }

    fun isEmpty() = calls.values.none { it.name.isNotEmpty() }

    /** JSON-массив [{"id":..,"name":..,"args":"<строка JSON>"}]; пустые аргументы заменяются на {}. */
    fun json(): String {
        val sb = StringBuilder("[")
        var first = true
        for (c in calls.values) {
            if (c.name.isEmpty()) continue
            if (!first) sb.append(',')
            first = false
            val a = c.args.toString().trim().ifEmpty { "{}" }
            sb.append("{\"id\":").append(q(c.id.ifEmpty { "call_" + calls.size + "_" + c.name })).append(",\"name\":").append(q(c.name))
                .append(",\"args\":").append(q(a)).append('}')
        }
        return sb.append(']').toString()
    }

    companion object {
        /** Строка в JSON с экранированием. */
        fun q(s: String): String {
            val sb = StringBuilder("\"")
            for (ch in s) when {
                ch == '"' -> sb.append("\\\"")
                ch == '\\' -> sb.append("\\\\")
                ch == '\n' -> sb.append("\\n")
                ch == '\r' -> sb.append("\\r")
                ch == '\t' -> sb.append("\\t")
                ch < ' ' -> sb.append(String.format("\\u%04x", ch.code))
                else -> sb.append(ch)
            }
            return sb.append('"').toString()
        }
    }
}
