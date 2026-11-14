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
```
Последняя строка вывода `ERRORS: none` означает успех.

- `auth.test.js`: настройка сервера, вход по коду и паролю, выход, обновление токена.
- `sync.test.js`: два «телефона» с общим поддельным сервером: отправка, получение, удаление, смена аккаунта, ошибки.
- `search.test.js`: поиск по чатам и коду (подсветка, фильтры, переход в чат), повтор ответа без результатов веб-поиска.
- `terminal.test.js`: Termux и оболочка Android, проверка Termux с запросом разрешения, режим агента, остановка на опасной команде.

Как писать новый тест: скопируй один из файлов, подмени нужные методы моста, вызывай функции приложения через `window.eval(...)`
и проверяй DOM. Селекторы выбирай по смыслу (`data-*`, текст), а не по классам оформления: дизайн меняется.
