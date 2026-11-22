package com.kairema.app.search

import org.json.JSONArray
import org.json.JSONObject

/**
 * Очистка запроса и отбор результатов веб-поиска (вызывается из Bridge.search).
 * Поисковики для вопроса «Что такое X?» возвращают страницы «Что такое ...» про что угодно.
 * Здесь из запроса убираются вопросительные слова, а результаты, в которых нет ни одного значимого слова запроса,
 * отбрасываются. Если ничего не подошло, ИИ отвечает сам и не показывает чужие источники.
 */
object WebRelevance {

    private val stop = setOf(
        "что", "такое", "это", "как", "кто", "где", "когда", "почему", "зачем", "какой", "какая", "какие", "какое",
        "чем", "для", "про", "при", "над", "под", "или", "расскажи", "объясни", "значит", "можно", "есть",
        "the", "what", "is", "are", "who", "how", "why", "where", "when", "does", "about", "with", "and", "for",
        "you", "tell", "me", "explain"
    )

    /** Значимые слова запроса (в нижнем регистре, не короче 3 букв, без вопросительных слов). */
    fun tokens(q: String): List<String> {
        val out = ArrayList<String>()
        val sb = StringBuilder()
        for (ch in q.lowercase()) {
            if (ch.isLetterOrDigit()) {
                sb.append(ch)
            } else if (sb.isNotEmpty()) {
                out.add(sb.toString())
                sb.setLength(0)
            }
        }
        if (sb.isNotEmpty()) out.add(sb.toString())
        return out.filter { it.length >= 3 && it !in stop }.distinct()
    }

    /** Запрос без вопросительных слов; если значимых слов нет, остаётся как был. */
    fun cleanQuery(q: String): String {
        val t = tokens(q)
        return if (t.isEmpty()) q.trim() else t.joinToString(" ")
    }

    /** Оставляет результаты (JSON-массив {title,url,snippet}), где есть хотя бы одно слово запроса. */
    fun filter(resultsJson: String, query: String): String {
        val toks = tokens(query).map { if (it.length > 5) it.substring(0, 5) else it }
        if (toks.isEmpty()) return resultsJson
        val src = JSONArray(resultsJson)
        val out = JSONArray()
        for (i in 0 until src.length()) {
            val r: JSONObject = src.getJSONObject(i)
            val h = (r.optString("title") + " " + r.optString("snippet") + " " + r.optString("url")).lowercase()
            if (toks.any { h.contains(it) }) out.put(r)
        }
        return out.toString()
    }
}
