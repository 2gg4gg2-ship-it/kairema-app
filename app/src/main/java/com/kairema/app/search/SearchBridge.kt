package com.kairema.app.search

import android.content.Context
import android.webkit.JavascriptInterface

/**
 * Мост JS <-> индекс поиска (в JS это KairemaSearch). Все методы короткие и безопасные:
 * при любой ошибке возвращают пустой результат, интерфейс тогда ищет сам (запасной режим в JS).
 */
class SearchBridge(ctx: Context) {

    private val ix = SearchIndex(ctx)

    /** "fts5", "like" или пустая строка, если база не открылась. */
    @JavascriptInterface
    fun mode(): String = try { ix.mode() } catch (_: Exception) { "" }

    @JavascriptInterface
    fun sigs(): String = try { ix.sigs() } catch (_: Exception) { "{}" }

    @JavascriptInterface
    fun put(json: String, fresh: Boolean): Boolean = try { ix.put(json, fresh) } catch (_: Exception) { false }

    @JavascriptInterface
    fun remove(id: String) {
        try {
            ix.remove(id)
        } catch (_: Exception) {
        }
    }

    @JavascriptInterface
    fun clear() {
        try {
            ix.clear()
        } catch (_: Exception) {
        }
    }

    @JavascriptInterface
    fun find(q: String, kind: String, limit: Int): String = try { ix.find(q, kind, limit) } catch (_: Exception) { "[]" }
}
