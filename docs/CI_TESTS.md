# Как запускать тесты в сборке GitHub Actions

Файлы `.github/` в архив `kairema.zip` класть нельзя (см. `docs/CLAUDE_GUIDE.md`), поэтому этот шаг владелец добавляет вручную один раз.

1. Откройте на GitHub файл `.github/workflows/build.yml` и нажмите карандаш (Edit).
2. Перед шагом сборки APK (перед `./gradlew assembleDebug` или похожим) вставьте шаги ниже. Отступы должны совпадать с соседними шагами.

```yaml
      - name: Тесты интерфейса
        run: |
          pip install playwright
          playwright install --with-deps chromium
          python3 -I docs/tests/smoke028.test.py /tmp/shots
          python3 -I docs/tests/term027.test.py
          python3 -I docs/tests/help027.test.py /tmp/shots
          python3 -I docs/tests/ui026.test.py
```

3. Нажмите Commit. Если тест упадёт, сборка остановится, а в логе будет строка `FAIL ...` с названием проверки.

Тесты запускаются на браузере Chromium без телефона: они проверяют интерфейс, но не Kotlin и не работу на Android.
