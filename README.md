# Kairema

Android-приложение: ИИ-чат с вашим провайдером (BYOK), терминал и настройки.
Интерфейс написан на HTML/CSS/JS и работает внутри WebView, нативная часть на Kotlin.

## Структура

```
.github/workflows/build.yml   сборка debug APK и распаковка обновлений
settings.gradle.kts           настройки Gradle
app/
  build.gradle.kts            зависимости, версия, applicationId
  src/main/
    AndroidManifest.xml       разрешения и экран входа
    assets/ui/                интерфейс (WebView)
      index.html              разметка
      styles.css              стили и дизайн-токены
      app.js                  логика экранов
    java/com/kairema/app/
      MainActivity.kt         окно, WebView, кнопка «Назад», выбор файлов
      bridge/Bridge.kt        мост JS <-> Kotlin (провайдеры, чат)
      data/SecureKeys.kt      API-ключи в Android Keystore
```

## Правила

- API-ключи живут только в Keystore, в интерфейс не передаются.
- Один слой, одна папка: интерфейс в `assets/ui`, нативный код в `java`.
- Новые возможности добавляются новыми файлами в нужной папке, без смешивания.

## Как обновлять

Загрузите `kairema.zip` в корень репозитория. Сборка сама распакует его в папки
выше, удалит zip и соберёт APK (раздел Actions → Artifacts).

Текущая версия: 0.2.2
