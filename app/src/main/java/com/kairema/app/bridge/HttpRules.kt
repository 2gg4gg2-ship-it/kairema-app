package com.kairema.app.bridge

/**
 * Правила универсального сетевого метода httpReq (для инструмента агента web_fetch и MCP-клиента).
 * Чистая логика без Android: проверяется локально (HttpRulesTest).
 */
object HttpRules {
    /** Только http и https, есть хост, без логина и пароля в адресе. */
    fun allowedUrl(u: String): Boolean {
        val s = u.trim()
        val low = s.lowercase()
        if (!(low.startsWith("https://") || low.startsWith("http://"))) return false
        val rest = s.substring(s.indexOf("://") + 3)
        val host = rest.takeWhile { it != '/' && it != '?' && it != '#' }
        if (host.isEmpty() || host.contains('@') || host.contains(' ')) return false
        return true
    }

    fun allowedMethod(m: String): Boolean = m == "GET" || m == "POST" || m == "DELETE"

    private val blocked = setOf("host", "content-length", "cookie", "authorization", "transfer-encoding", "connection")

    /** Заголовки от интерфейса: простые имена, без служебных и без Authorization (токен подставляется отдельно из Keystore). */
    fun headerOk(name: String): Boolean =
        Regex("^[A-Za-z0-9-]{1,48}$").matches(name) && name.lowercase() !in blocked

    /** Токен можно подставить только для ключей MCP-серверов, чтобы нельзя было отправить на чужой адрес ключ провайдера. */
    fun keyIdOk(id: String): Boolean = Regex("^mcp-[A-Za-z0-9._-]{1,60}$").matches(id)

    fun clampMax(n: Int): Int = n.coerceIn(1000, 1_000_000)
}
