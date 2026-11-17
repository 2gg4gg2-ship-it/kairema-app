# Тесты интерфейса

Тесты загружают `index.html` в jsdom, подменяют мост `window.KairemaBridge` и `fetch`, и проходят сценарии.

Запуск:
```
cd docs/tests
npm i jsdom
UI_DIR=../../app/src/main/assets/ui/ node auth.test.js
UI_DIR=../../app/src/main/assets/ui/ node sync.test.js
UI_DIR=../../app/src/main/assets/ui/ node terminal.test.js
UI_DIR=../../app/src/main/assets/ui/ node search.test.js
UI_DIR=../../app/src/main/assets/ui/ node understand.test.js
UI_DIR=../../app/src/main/assets/ui/ node ui031.test.js
UI_DIR=../../app/src/main/assets/ui/ node welcome.test.js
UI_DIR=../../app/src/main/assets/ui/ node menu.test.js
```
Playwright (Chromium), без jsdom: `python3 -I docs/tests/ui020.test.py` и `python3 -I docs/tests/ui021.test.py` (0.23: роли и «/», сжатие, ветки, диффы и откат).

Тест 0.26.0: `python3 -I docs/tests/ui026.test.py` (Playwright): голос и озвучка удалены, кнопка «Шаблоны», меню «+» плитками (2 в ряд, размеры, режимы, серые пункты), скриншоты в `$SHOTS` (`026_*.png`).

Последняя строка вывода `ERRORS: none` означает успех.

- `auth.test.js`: настройка сервера, вход по коду и паролю, выход, обновление токена.
- `sync.test.js`: два «телефона» с общим поддельным сервером: отправка, получение, удаление, смена аккаунта, ошибки.
- `search.test.js`: поиск по чатам и коду (подсветка, фильтры, переход в чат), повтор ответа без результатов веб-поиска.
- `terminal.test.js`: Termux и оболочка Android, проверка Termux с запросом разрешения, режим агента, остановка на опасной команде.

Как писать новый тест: скопируй один из файлов, подмени нужные методы моста, вызывай функции приложения через `window.eval(...)`
и проверяй DOM. Селекторы выбирай по смыслу (`data-*`, текст), а не по классам оформления: дизайн меняется.

## Тест 0.20.0 (Python, Playwright)
`python3 docs/tests/ui020.test.py` (нужны пакет playwright и Chromium). Проверяет в браузере с подменой мостов: токен моста, возможности модели
(картинки и Think на примере cohere/north-mini-code), клавиатурный класс `.kb`, входящее «Поделиться», резервную копию (сохранение и восстановление).
Настоящий Android и Kotlin он не запускает. Скриншоты кладёт в папку из переменной `SHOTS` (по умолчанию /tmp).

Тест 0.27.0: `python3 -I docs/tests/term027.test.py` (терминал и совместимость моделей, настоящий /bin/sh) и `python3 -I docs/tests/help027.test.py [папка_скриншотов]` (Справка: карточка в Настройках, 14 статей, поиск, «?», тёмная и светлая тема).

Тесты 0.32.0: `node docs/tests/pdf031.test.js` (чтение PDF, файлы в `docs/tests/fixtures`), `python3 -I docs/tests/attach031.test.py` (выбор фото и PDF с подменой моста), `python3 -I docs/tests/preview031.test.py /tmp` (предпросмотр: кнопки −/+, поворот). Kotlin они не запускают.

