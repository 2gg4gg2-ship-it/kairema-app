package com.kairema.app.update

import java.net.URI

/** Правила обновления без Android: какой репозиторий и какой адрес APK разрешены. Проверяются тестами. */
object UpdateRules {
    private val REPO = Regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$")

    /** «владелец/репозиторий»; части из одних точек («..») не допускаются, чтобы не выйти из пути API. */
    fun repoOk(repo: String): Boolean = REPO.matches(repo) && repo.split('/').none { p -> p.all { it == '.' } }

    /** Скачивать можно только по https с github.com из релизов этого репозитория. */
    fun urlOk(repo: String, url: String): Boolean {
        if (!repoOk(repo)) return false
        val u = try { URI(url) } catch (_: Exception) { return false }
        val path = u.path ?: return false
        return u.scheme == "https" && u.host == "github.com" && u.userInfo == null && u.port == -1 &&
            path.startsWith("/$repo/releases/download/") && !path.contains("..")
    }
}
