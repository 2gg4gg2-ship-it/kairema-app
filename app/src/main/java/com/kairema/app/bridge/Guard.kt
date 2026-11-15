package com.kairema.app.bridge

import java.security.SecureRandom

/**
 * Защита моста. Android вставляет объекты KairemaBridge во ВСЕ фреймы WebView, в том числе в окно предпросмотра
 * HTML от ИИ (iframe со скриптами). Без защиты скрипт из такого окна мог бы вызвать терминал или ключи.
 *
 * Как работает: при каждой загрузке главной страницы Kotlin присылает ей случайный токен (evaluateJavascript идёт
 * только в главный фрейм, а iframe с песочницей прочитать его не может). Опасные методы моста (терминал, ключи,
 * запросы к провайдерам и поиску) первым аргументом требуют этот токен и без него отказывают.
 */
object Guard {
    val token: String = ByteArray(24).also { SecureRandom().nextBytes(it) }
        .joinToString("") { "%02x".format(it) }

    fun ok(t: String?): Boolean = t != null && t.length == token.length && t == token

    /** JS, который передаёт токен главной странице. */
    fun script(): String = "window.KairemaNative&&KairemaNative.tok&&KairemaNative.tok('$token')"
}
