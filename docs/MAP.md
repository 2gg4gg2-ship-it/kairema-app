# Карта репозитория Kairema

Для любого Claude (и человека), который открыл репозиторий и хочет быстро понять, **что где лежит и какие файлы трогать**.
Читай вместе с `docs/CLAUDE_GUIDE.md` (правила работы и доставки) и `docs/NOTES.md` (что в работе).

Как устроена карта:
- Разделы 1–6 написаны вручную, это смысл и «куда идти».
- Раздел 7 между маркерами `AUTO` создаёт скрипт. После правок кода запусти из корня репозитория:
  `python3 docs/tools/make_map.py` (обновить) или `python3 docs/tools/make_map.py --check` (проверить, не устарела ли карта).
  Скрипт читает первый комментарий каждого файла: **пиши в начале нового файла комментарий в одну строку «ЧТО ДЕЛАЕТ»**, он попадёт в индекс.
- Если добавил модуль, мост, событие или экран, который не виден скрипту (например, в Kotlin новый класс-мост), допиши его в раздел 1 или 2 вручную.

## 1. Общая картина (3 слоя)

```
Телефон (Android)
 ├─ Kotlin (app/src/main/java/com/kairema/app)     сеть, ключи, файлы, SQLite, терминал, системные панели
 │    MainActivity.kt открывает WebView и регистрирует «мосты» (addJavascriptInterface)
 ├─ Мосты: JS вызывает Kotlin по имени (KairemaBridge, KairemaDb, KairemaSearch, KairemaSysBridge),
 │         Kotlin отвечает в JS через window.KairemaNative.chunk(id, текст) / done(id, ошибка)
 └─ WebView с интерфейсом (app/src/main/assets/ui)  HTML/CSS/JS, никаких сборщиков
      core/        ядро: app.js (состояние S, чат, экраны), hooks.js (события и переводы), styles.css, config.js (версия)
      features/    модули. Каждый подключается строкой <script> в index.html и сам включается через Hooks.on(...)
```

Главная идея: **ядро почти не меняем, новое пишем модулем в `features/<имя>/`** и подписываемся на события (`Hooks.on('app:ready', …)`, `chat:answer`, `msg:render`, `settings:rendered` и т.д.). Список событий в разделе 7.

Ключи API лежат только в Android Keystore (`data/SecureKeys.kt`), JS их не видит. Сетевые запросы к провайдерам делает Kotlin (`bridge/Bridge.kt`), чтобы работало в фоне и без утечки ключа.

## 2. Что хочешь изменить → какие файлы открыть

| Задача | Открой | Заметки |
|---|---|---|
| Версия, номер сборки | `app/build.gradle.kts`, `core/config.js` (`APP_VERSION`), `README.md` («Текущая версия») | Во всех трёх местах сразу. `versionCode` = в репозитории + 1 |
| Подсказка модели (system prompt), правила ответа | `features/providers/providers.js` (`sysPrompt`) | Сюда же подмешивается память (`memoryPrompt()`) |
| Отправка сообщения, поток ответа, повтор, «Стоп» | `core/messages.js` (`respond`, `composer`, `window.GEN`) | `Native.run('chat', …)` → `Bridge.chat` в Kotlin |
| Показ Markdown, таблицы, код | `features/markdown/md.js`, `md.css` | События `md:code`, `md:table`: на них вешаются кнопки под блоком |
| Кнопки под ответом (копировать, поделиться, другой ответ) | `features/share/share.js`, `features/branch/branch.js` | Обычно через `msg:render` / `chat:answer` |
| Меню «+» в поле ввода, режимы (Думать, Поиск, Изображение, Исследование) | `features/tools/tools.js`, `tools.css` | Что модель умеет: `features/caps/caps.js` |
| Шаблоны промптов, команды «/», роли | `features/roles/roles.js`, `core/settings.js` (`tplPage`), `core/base.js` (`TPLS`) | |
| Память (факты, профиль, извлечение) | `features/memory/*` | Архитектура описана в шапке `memory.js` |
| Расходы, токены, лимит | `features/cost/cost.js` | Цены берутся из данных провайдера и `kairema.prices.v1` |
| Провайдеры и выбор модели | `features/providers/providers.js` (интерфейс), `Bridge.kt` (`verify`, `models`) | |
| Веб-поиск | `bridge/Bridge.kt` (`search`), `search/WebRelevance.kt`, вызовы `Native.run('search')` в `app.js` и `tools.js` | Отбор результатов в Kotlin |
| Поиск по чатам | `features/search/search.js`, `search/SearchIndex.kt`, `SearchBridge.kt` | SQLite FTS5 |
| Хранение чатов, картинки, вложения | `features/chats/chats.js` (`Chx`), `data/ChatDb.kt`, `data/DbBridge.kt` | Чаты в SQLite, медиа файлами в `filesDir/media` |
| Аккаунт, вход, облако | `features/auth/*`, `features/sync/*`, `features/sync/schema.sql`, `docs/AUTH_SETUP.md` | Supabase по REST |
| Синхронизировать новый тип данных | `features/sync/sync.js` (`register`) и свой `Hooks.on('sync:register', …)` | Образцы: `chats.js`, `memory.js` |
| Резервная копия (экспорт/импорт) | `features/backup/backup.js` | Добавляй новые данные сюда тоже |
| Терминал, команды из ответов, агент | `features/terminal/*` (`term-compat.js` разбор ответов любых моделей), `terminal/Shell.kt`, `assets/terminal/*.sh`, `TermuxRunner.kt`, `features/filediff/*` | Опасные команды требуют подтверждения |
| Готовые сервисы (адрес подставляется), встроенный поиск модели, исследование | `features/presets/presets.js`, `features/tools/tools.js` (`webKind`, `webArg`, `research`), `bridge/Bridge.kt` (`web`, `buildSearchRequest`) | Новый сервис: строка в `PRESETS_AI` или `PRESETS_SEARCH` |
| Качество ответов, подсказки слабым моделям, фильтр иероглифов | `features/quality/quality.js` (`qualityPrompt` в `sysPrompt`, `Quality.filter` в `core/messages.js`) | Правила таблиц и языка менять только здесь |
| Журнал ошибок | `features/log/log.js` | Ключи и почты заменяются на *** перед записью |
| Справка (инструкция в приложении) | `features/help/help-data.js` (тексты), `help.js`, `help.css` | Поменял функцию, поправь её раздел справки |
| Файлы из ответов (таблицы, HTML, PDF, CSV) | `features/artifacts/*` | Предпросмотр HTML в `<iframe sandbox="allow-scripts">` |
| «Поделиться», входящее из других приложений | `features/share/*`, `features/inbox/*`, `share/*.kt` | |
| Клавиатура, статус-бар, отступы, тема | `features/system/*`, `system/SystemBridge.kt` | CSS-переменные `--sat --sab --kb`, класс `.kb` |
| Фоновая работа во время ответа | `service/KeepAliveService.kt` | Запускает `Bridge.kt` через `track()/done()` |
| Экран «О приложении», онбординг | `features/about/*`, `core/onboarding.js` (`onboarding`) | Видео-заставка и приветствие: не удалять без просьбы владельца |
| Стили и токены цветов | `core/styles.css` (токены сверху), стили модуля в его `.css` | Только токены, без своих цветов |
| Тексты и перевод на английский | `i18nAdd({...})` в начале файла модуля, `core/app.js` (`EN`, реестр экранов `SCREENS`, `openScreen`) | Каждая новая русская строка получает перевод |
| Разрешения, `<queries>`, активность | `app/src/main/AndroidManifest.xml` | Новые разрешения только если действительно нужны |
| Сборка и распаковка архивов | `.github/workflows/build.yml` | **Не трогать и не класть в zip** |

## 3. Путь одного сообщения (чтобы понять, куда вставлять правки)

1. Пользователь нажимает «Отправить» → `composer()` (`core/messages.js`) вызывает `onSend`. Если ответ уже идёт, та же кнопка работает как «Стоп» (`window.GEN.stop()` → `Native.cancel`).
2. `autoFact()` → `Mem.local()` ловит быстрые факты («меня зовут…», «запомни…»).
3. `respond()` собирает историю: `sysPrompt()` (роль, язык, правила, память) + сообщения; если включён поиск, перед ответом идёт `Native.run('search', …)`.
4. `Native.run('chat', [настройки провайдера, история], onChunk)` → Kotlin `Bridge.chat` стримит ответ обратно. Протокол кусков: обычный текст = ответ, `\u0001…` = рассуждения модели, `\u0002{i,o,c}` = токены и цена, JSON `{mime,b64}` = картинка.
5. `mdLive` не чаще раза за кадр перерисовывает ответ через `features/markdown/md.js`.
6. Конец ответа: `Hooks.run('chat:answer', m, bd)` → `cost.js` (расходы), `branch.js` (кнопка «Другой ответ»), `memory-ai.js` (фоновое извлечение фактов), `share.js`, `ctx.js`, `terminal.js`.
7. `Chx` (`chats.js`) сохраняет чат в SQLite через `KairemaDb`, `sync.js` отправляет изменения в облако, `search.js` обновляет индекс поиска.

## 4. Где что хранится

| Данные | Где | Файл |
|---|---|---|
| Ключи API | Android Keystore | `data/SecureKeys.kt` |
| Чаты | SQLite `kairema.db` (+ копия в localStorage, если мост недоступен) | `ChatDb.kt`, `chats.js` |
| Картинки и вложения | файлы `filesDir/media` | `DbBridge.kt` |
| Индекс поиска | SQLite `kairema_search.db` | `SearchIndex.kt` |
| Провайдеры, профиль, шаблоны, память, расходы, роли, настройки | localStorage, ключи `kairema.*` (список в разделе 7) | модуль-владелец |
| Облако | Supabase, таблица `sync_items` (время записи ставит сервер) | `features/sync/` |
| Резервная копия | один JSON-файл, без API-ключей | `backup.js` |

Если добавляешь новые данные: сделай ключ `kairema.<имя>.v1`, подключи в `sync` (если нужно в облаке) и в `backup.js`, и опиши в `NOTES.md`.

## 5. Как добавить…

- **Новый модуль.** Папка `features/<имя>/` с `<имя>.js` (+ `.css`), первый комментарий «ЧТО ДЕЛАЕТ», строки в `index.html` до `core/app.js`; при загрузке не трогай переменные `app.js` (они ещё не готовы), всё запускай в `Hooks.on('app:ready', …)`. Модуль можно выключить удалением папки и строк в `index.html`: так и проверяй независимость.
- **Новый экран.** `page(имя, заголовок, (b,d)=>{…})`, регистрация `SCREENS.<имя>=…` в `app:ready`, открытие `openScreen('имя')`. Пункт в настройках: событие `settings:rendered`.
- **Новый пункт под ответом.** `Hooks.on('msg:render', …)` или `chat:answer`, добавь кнопку в `.msg-act`.
- **Новый метод в Kotlin.** `@JavascriptInterface fun имя(...)` в своём классе (свой пакет), регистрация в `MainActivity.kt`, вызов из JS `Native.sync/run`. Тяжёлую работу делай в фоне и возвращай через `KairemaNative.chunk/done`.
- **Новый тип данных в облаке.** `Hooks.on('sync:register', Sy=>Sy.register('имя', {ids,get,put,del,clear}))` и `Hooks.run('sync:touch'/'sync:delete', …)` при изменениях.

## 6. Ловушки (из реальных поломок)

- Kotlin не компилируется в среде Claude. После правок перечитай файл целиком: дубли имён локальных переменных (`val pr` уже ломал сборку), совпадение кодов запросов разрешений, `import`, `<queries>` в манифесте.
- `\b` в регулярках JS не работает с кириллицей. Используй `(?:^|[^а-яёa-z])` и `(?![а-я])`.
- Архив доставки: в нём **обязательно** `settings.gradle.kts`, **нельзя** `.github/`. Иначе сборка падает («does not contain a Gradle build») или токену нельзя менять workflows.
- Перед выдачей архива снова скачай репозиторий: другие Claude тоже заливают версии. Свои правки переноси на свежую базу и поднимай версию выше.
- Файлы `file://` в тестовом Chromium теряют localStorage при слишком быстрой перезагрузке: перед `reload` подожди пару секунд.
- Тесты: `docs/tests/*.test.js` (jsdom) и `*.test.py` (Playwright). Что покрыто: вход, меню «+», поиск, синхронизация, терминал, приветствие, интерфейс 0.26. Настоящий Android они не запускают, и честно пиши в отчёте «не проверено на телефоне».

## 7. Автоматический индекс

<!-- AUTO:START -->
### Индекс файлов интерфейса (`app/src/main/assets/ui`)

| Файл | Строк | Что делает (первый комментарий в файле) |
|---|---|---|
| `core/app.js` | 90 | core/app.js: РЕЕСТР ЭКРАНОВ, ПЕРЕВОДЫ, ИНИЦИАЛИЗАЦИЯ. |
| `core/base.js` | 54 | core/base.js: УТИЛИТЫ, ШАБЛОНЫ, СОСТОЯНИЕ, UI-ХЕЛПЕРЫ (page, sheet, меню, формы). |
| `core/config.js` | 8 | НАСТРОЙКИ ПРИЛОЖЕНИЯ ===== APP_VERSION меняем при каждой сборке вместе с app/build.gradle.kts и README.md. |
| `core/hooks.js` | 11 | ЯДРО: события и переводы для подключаемых модулей ===== Модуль не правит core/app.js: он подписывается на события (Hooks.on) и добавляет свои переводы (i18nAdd). |
| `core/messages.js` | 145 | core/messages.js: СООБЩЕНИЯ, МОСТ К ANDROID (Native), ЧАТ. |
| `core/onboarding.js` | 58 | core/onboarding.js: ОНБОРДИНГ и FUTURE API. |
| `core/settings.js` | 131 | core/settings.js: ПРОВАЙДЕРЫ, ПАМЯТЬ, ШАБЛОНЫ, ПРОФИЛЬ, НАСТРОЙКИ, ВКЛАДКИ. |
| `core/styles.css` | 257 | 01. ТОКЕНЫ: цвета, шрифты, easing |
| `features/about/about.css` | 32 | Стили модуля about: экран «О приложении». |
| `features/about/about.js` | 24 | О ПРИЛОЖЕНИИ: логотип, версия, карточки возможностей ===== Модуль подменяет экран 'about' (SCREENS.about) после запуска приложения: core/app.js не правится. |
| `features/artifacts/artifacts.css` | 21 | Стили модуля artifacts: панель под блоком кода и таблицей, предпросмотр страницы. |
| `features/artifacts/artifacts.js` | 86 | ФАЙЛЫ ИЗ ОТВЕТОВ ИИ: таблицы, HTML-страницы, PDF, CSV ===== Модель не умеет создавать файлы сама, поэтому приложение делает их из ответа: - блок ```html → «Предпросмотр», |
| `features/auth/auth-methods.js` | 13 | ЯДРО АККАУНТА: реестр способов входа (модуль auth) ===== Экран «Вход или регистрация» сам ничего не знает о способах: он рисует всё, что добавлено сюда. |
| `features/auth/auth-ui.js` | 111 | АККАУНТ: экраны (модуль auth) ===== Экран «Аккаунт» (вход, профиль), стартовое окно «с аккаунтом / без аккаунта», строка «Аккаунт» в настройках. |
| `features/auth/auth.css` | 15 | Стили модуля auth. |
| `features/auth/auth.js` | 92 | ЯДРО АККАУНТА: сервис входа (Supabase Auth по REST, без интерфейса) ===== Способы: код на почту (основной, он же регистрация), почта и пароль (старые аккаунты, в интерфей |
| `features/auth/method-device.js` | 35 | ВХОД: аккаунты этого телефона (модуль auth, способ «device») ===== Кнопка показывает аккаунты, в которые уже входили на этом телефоне по почте. |
| `features/auth/method-email.js` | 36 | ВХОД: почта и код (модуль auth, способ «email») ===== Один поток для регистрации и входа: ввели почту, получили код, ввели код. |
| `features/backup/backup.js` | 103 | РЕЗЕРВНАЯ КОПИЯ: чаты, память, шаблоны, настройки и список провайдеров одним файлом (JSON) ===== Нужна для автономности: копия делается без облака и аккаунта, восстановит |
| `features/branch/branch.css` | 6 |  |
| `features/branch/branch.js` | 56 | ВЕТВЛЕНИЕ ОТВЕТОВ: «Другой ответ» и переключатель ‹ 1/2 › ===== Под ПОСЛЕДНИМ ответом ИИ появляется кнопка ↻ «Другой ответ»: ответ запрашивается заново, прежний не пропад |
| `features/caps/caps.js` | 64 | ВОЗМОЖНОСТИ МОДЕЛЕЙ: что умеет выбранная модель (авто-определение) ===== Источник 1: данные провайдера (OpenRouter сообщает выходные форматы и параметр reasoning), приход |
| `features/chats/chats.css` | 23 | Стили модуля chats: диалог «Новый чат», кнопка «Удалить все чаты», анимация удаления. |
| `features/chats/chats.js` | 231 | ИСТОРИЯ ЧАТОВ: список и сохранение ===== В приложении (есть KairemaDb) чаты лежат в SQLite на устройстве, картинки и PDF файлами в filesDir/media, в чате хранится только  |
| `features/cost/cost.css` | 10 |  |
| `features/cost/cost.js` | 94 | СЧЁТЧИК ТОКЕНОВ И РАСХОДОВ ===== Под каждым ответом ИИ: сколько токенов ушло и примерная цена. |
| `features/ctx/ctx.css` | 2 |  |
| `features/ctx/ctx.js` | 61 | СЖАТИЕ КОНТЕКСТА ===== Команда «/compact» (список «/» из модуля roles): старая часть чата заменяется кратким пересказом, который уходит модели вместо длинной истории. |
| `features/filediff/filediff.css` | 11 |  |
| `features/filediff/filediff.js` | 150 | ДИФФЫ И ОТКАТ ФАЙЛОВ АГЕНТА ===== Когда команда из чата (кнопка «Выполнить» или агент) явно пишет в файлы (> и >>, tee, sed -i, mv, cp, rm, touch, truncate), модуль до за |
| `features/help/help-data.js` | 146 | СПРАВКА: тексты разделов (только данные, без логики) ===== Каждый раздел: id, e (ключ значка из ICON в help.js), t (название), s (подпись на карточке), lead (что это одно |
| `features/help/help.css` | 66 | Стили модуля help: экран «Справка». Цвета и шрифты только из токенов core/styles.css. |
| `features/help/help.js` | 89 | СПРАВКА: «Что такое Kairema» — полная инструкция простыми словами ===== Экран SCREENS.help. |
| `features/inbox/inbox.js` | 25 | ВХОДЯЩЕЕ «ПОДЕЛИТЬСЯ»: текст, ссылка или текстовый файл из другого приложения → новый чат с этим текстом ===== Kotlin (share/Inbox.kt) принимает ACTION_SEND и ACTION_PROC |
| `features/log/log.css` | 3 | Стили модуля log: экран «Журнал ошибок». |
| `features/log/log.js` | 47 | ЖУРНАЛ ОШИБОК: что сломалось, можно скопировать и прислать разработчику ===== Ловит ошибки страницы (error, unhandledrejection, console.error) и ошибки ответов ИИ (Log.ad |
| `features/markdown/md.css` | 42 | Стили разметки ответов ИИ (модуль markdown). |
| `features/markdown/md.js` | 115 | MARKDOWN → DOM для ответов ИИ ===== Безопасно: всё строится через createElement и textContent, innerHTML не используется. |
| `features/memory/memory-ai.js` | 100 | ПАМЯТЬ: извлечение фактов самой моделью ===== После ответа (событие chat:answer) в фоне уходит один короткий запрос тому же провайдеру: «что из сообщения пользователя сто |
| `features/memory/memory-ui.js` | 115 | ПАМЯТЬ: экран (заменяет старую страницу из core/app.js через SCREENS.memory) ===== Переключатели (память, быстрые правила, умное извлечение), профиль с сохранением, что и |
| `features/memory/memory.css` | 27 | Стили страницы «Память»: более жирный, читаемый текст; ровный список фактов. |
| `features/memory/memory.js` | 180 | ПАМЯТЬ (v2): хранилище фактов, профиль, подбор фактов под вопрос, подсказка для модели ===== Модель данных. |
| `features/presets/presets.css` | 12 | Стили модуля presets: выбор готового сервиса в форме провайдера. |
| `features/presets/presets.js` | 68 | ГОТОВЫЕ СЕРВИСЫ: выбрал в списке, адрес (API URL) подставился сам ===== В форме нового провайдера (чат или поиск) сверху список сервисов. |
| `features/providers/providers.css` | 46 | Стили модуля providers: выбор модели и провайдера (лист снизу). |
| `features/providers/providers.js` | 144 | ПРОВАЙДЕРЫ ИИ: название, адрес, ключ → проверка ключа → выбор модели из списка |
| `features/quality/quality.css` | 3 | Стили модуля quality: значение справа в строке настроек. |
| `features/quality/quality.js` | 61 | КАЧЕСТВО ОТВЕТОВ ДЛЯ ЛЮБЫХ МОДЕЛЕЙ (от самых слабых до лучших) ===== 1) Quality.prompt(): короткие жёсткие правила в системную подсказку: язык ответа, никаких иероглифов, |
| `features/roles/roles.css` | 21 | Команды «/» и плашка роли над полем ввода |
| `features/roles/roles.js` | 148 | РОЛИ И КОМАНДЫ «/» ===== В поле ввода набираете «/» и появляется список команд. |
| `features/scroller/scroller.css` | 7 | Кнопки листания чата: маленькие, над полем ввода справа. |
| `features/scroller/scroller.js` | 21 | КНОПКИ ЛИСТАНИЯ: маленькие «вверх» и «вниз» в чате ===== Появляются, когда есть куда листать. |
| `features/search/search.css` | 15 | ПОИСК ПО ЧАТАМ И КОДУ |
| `features/search/search.js` | 140 | УМНЫЙ ПОИСК ПО ЧАТАМ И КОДУ (необязательный модуль) ===== В приложении (есть KairemaSearch) текст чатов копируется в отдельный индекс SQLite FTS5 (Kotlin: search/SearchIn |
| `features/share/share.css` | 27 | Стили модуля share: кнопки под сообщением, лист «Поделиться», окно «Выделить текст». |
| `features/share/share.js` | 164 | ПОДЕЛИТЬСЯ: копирование, выделение текста, отправка в Telegram и другие приложения ===== Под каждым ответом ИИ ряд кнопок «Копировать» и «Поделиться»; ваше сообщение: заж |
| `features/sync/schema.sql` | 32 |  |
| `features/sync/sync-ui.js` | 26 | СИНХРОНИЗАЦИЯ: интерфейс (модуль sync) ===== Блок состояния на экране «Аккаунт» и вопрос при входе под другим аккаунтом. |
| `features/sync/sync.js` | 109 | СИНХРОНИЗАЦИЯ: облачное хранение данных пользователя (таблица sync_items в Supabase) ===== Каждый модуль данных подключает свой «вид» (kind) событием 'sync:register': Hoo |
| `features/system/system.css` | 7 | КЛАВИАТУРА: класс .kb ставит system.js, когда Kotlin сообщил, что клавиатура открыта ===== Окно сжимается Kotlin плавно, кадр за кадром вместе с клавиатурой системы (Syst |
| `features/system/system.js` | 26 | СИСТЕМА: статус-бар, клавиатура, системная тема ===== Отступы под статус-бар, панель навигации и клавиатуру теперь применяет Kotlin (com.kairema.app.system.SystemBridge): |
| `features/terminal/term-compat.js` | 110 | ТЕРМИНАЛ: совместимость с любыми моделями (от самых слабых до лучших) ===== Слабые модели не всегда оформляют команды правильно: забывают язык у блока, пишут «$ ls» вмест |
| `features/terminal/terminal.css` | 53 | Стили модуля terminal. |
| `features/terminal/terminal.js` | 248 | ТЕРМИНАЛ: настоящая оболочка Android и запуск команд из ответов ИИ ===== Команды выполняет Kotlin (Shell.kt, /system/bin/sh). |
| `features/tools/tools.css` | 76 | Меню «+», метки режимов в поле ввода, размышления, изображения |
| `features/tools/tools.js` | 227 | ФУНКЦИИ ЧАТА: меню «+», режимы ответа, создание изображений, глубокое исследование ===== Кнопка «+» в поле ввода открывает список: вложения (галерея, камера, файлы) и фун |
| `index.html` | 87 |  |

### Индекс файлов Kotlin (`app/src/main/java/com/kairema/app`)

| Файл | Строк | Описание |
|---|---|---|
| `MainActivity.kt` | 236 | Оболочка: показывает интерфейс из assets/index.html. * Следующие шаги добавят сюда мост между кнопками интерфейса и нативным кодом. |
| `bridge/Bridge.kt` | 665 | Мост между интерфейсом (JS) и нативным кодом. |
| `bridge/Guard.kt` | 22 | Защита моста. |
| `data/ChatDb.kt` | 79 | Хранилище чатов на устройстве (SQLite, файл kairema.db). |
| `data/DbBridge.kt` | 77 | Мост JS <-> хранилище (в JS это KairemaDb): чаты в SQLite, картинки и вложения файлами в filesDir/media. |
| `data/SecureKeys.kt` | 66 | API-ключи провайдеров. |
| `search/SearchBridge.kt` | 43 | Мост JS <-> индекс поиска (в JS это KairemaSearch). |
| `search/SearchIndex.kt` | 211 | Локальный индекс для поиска по чатам (файл kairema_search.db, отдельно от kairema.db). |
| `search/WebRelevance.kt` | 57 | Очистка запроса и отбор результатов веб-поиска (вызывается из Bridge.search). |
| `service/KeepAliveService.kt` | 95 | Передний план на время длинных задач: ответ ИИ, создание изображения, глубокое исследование, команды терминала. |
| `share/Inbox.kt` | 76 | Входящее «Поделиться» из других приложений: ACTION_SEND (текст, ссылка, текстовый файл) * и ACTION_PROCESS_TEXT (пункт «Kairema» в меню выделенного текста). |
| `share/Share.kt` | 166 | Копирование, «Поделиться» (Telegram и другие приложения), сохранение в Загрузки и печать в PDF. |
| `share/ShareFiles.kt` | 72 | Отдаёт другим приложениям файлы из временной папки cache/share (только чтение). |
| `system/SystemBridge.kt` | 218 | Системные панели, клавиатура и тема телефона. |
| `terminal/Shell.kt` | 146 | Настоящая оболочка Android (/system/bin/sh) для терминала. |
| `terminal/TermuxResultReceiver.kt` | 14 | Принимает результат команды от Termux и передаёт его в TermuxRunner. |
| `terminal/TermuxRunner.kt` | 154 | Запуск команд в Termux (если он установлен). |

### Мосты (`@JavascriptInterface`): как JS вызывает Kotlin

- `bridge/Bridge.kt`: `setOrientation`, `copyText`, `shareText`, `shareFile`, `saveFile`, `printHtml`, `saveKey`, `deleteKey`, `inboxTake`, `hasKey`, `cancel`, `termux`, `termuxRequestPermission`, `termuxStatus`, `shell`, `verify`, `models`, `chat`, `image`, `saveImage`, `shareImage`, `search`
- `data/DbBridge.kt`: `loadAll`, `count`, `put`, `remove`, `clear`, `saveFile`, `loadFile`
- `search/SearchBridge.kt`: `mode`, `sigs`, `put`, `remove`, `clear`, `find`
- `system/SystemBridge.kt`: `dark`, `bars`

Имена мостов в WebView: `KairemaDb`, `KairemaSearch`, `KairemaSysBridge`

### События Hooks (кто слушает → кто запускает)

| Событие | Слушают (`Hooks.on`) | Запускают (`Hooks.run`) |
|---|---|---|
| `account:rendered` | sync-ui.js | auth-ui.js |
| `app:ready` | about.js, auth-ui.js, backup.js, caps.js, cost.js, filediff.js, help.js, inbox.js, log.js, memory-ui.js, memory.js, roles.js, search.js, sync.js | app.js |
| `auth:forgot` | auth-ui.js | auth.js |
| `chat:answer` | branch.js, cost.js, ctx.js, memory-ai.js, memory-ui.js, share.js, terminal.js | messages.js, tools.js |
| `chat:rendered` | branch.js, roles.js, scroller.js, share.js | messages.js |
| `md:code` | artifacts.js, terminal.js | md.js |
| `md:table` | artifacts.js | md.js |
| `memory:auto` | — | memory-ai.js |
| `memory:changed` | memory.js | backup.js, memory-ai.js, memory-ui.js, settings.js |
| `msg:render` | branch.js, cost.js, ctx.js, share.js, tools.js | messages.js |
| `settings:rendered` | auth-ui.js, backup.js, cost.js, filediff.js, help.js, log.js, quality.js, roles.js | settings.js |
| `sync:delete` | search.js, sync.js | chats.js, memory.js, sync.js |
| `sync:left` | auth-ui.js | sync.js |
| `sync:register` | chats.js, memory.js, sync.js | sync.js |
| `sync:touch` | search.js, sync.js | backup.js, chats.js, memory.js, sync.js |

### Ключи localStorage с префиксом kairema.

- `kairema.accounts.v1`: auth.js
- `kairema.budget.v1`: cost.js
- `kairema.chats.v1`: chats.js
- `kairema.fdiff.v1`: filediff.js
- `kairema.log.v1`: log.js
- `kairema.mcaps.v1`: caps.js
- `kairema.memory.v1`: memory.js
- `kairema.prices.v1`: backup.js, cost.js
- `kairema.profile.v1`: backup.js, messages.js
- `kairema.prov.`: auth-ui.js
- `kairema.providers.v1`: messages.js
- `kairema.roles.chat.v1`: roles.js
- `kairema.roles.v1`: roles.js
- `kairema.sb.v1`: auth.js
- `kairema.session.v1`: auth.js
- `kairema.sync.dirty.v1`: sync.js
- `kairema.sync.meta.v1`: sync.js
- `kairema.templates.v1`: backup.js, onboarding.js
- `kairema.term.backend.v1`: terminal.js
- `kairema.term.caps.v1`: term-compat.js
- `kairema.term.hist.v1`: terminal.js
- `kairema.usage.v1`: backup.js, cost.js
- `kairema.welcome.v1`: auth-ui.js

### Экраны (`SCREENS.<имя>`, открываются через `openScreen`)
`about`, `account`, `api`, `backup`, `cost`, `filediff`, `help`, `log`, `memory`, `onboarding`, `profile`, `providers`, `roles`, `settings`, `templates`, `terminal`
<!-- AUTO:END -->
