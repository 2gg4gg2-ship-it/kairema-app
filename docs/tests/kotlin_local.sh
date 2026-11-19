#!/bin/sh
# Локальный запуск тестов Kotlin без Android SDK и Maven: нужен только Gradle (в его папке lib лежат компилятор Kotlin и JUnit).
# Проверяются файлы без Android: Guard.kt, Texts.kt, UpdateRules.kt. Весь Bridge.kt так не собрать (нужен android.jar).
# Запуск из корня репозитория:  sh docs/tests/kotlin_local.sh /путь/к/gradle/lib
L="${1:-/opt/gradle-8.14.3/lib}"
APP=app/src/main/java/com/kairema/app
OUT=$(mktemp -d)
CP=$(ls "$L"/kotlin-compiler-embeddable-*.jar "$L"/kotlin-stdlib-*.jar "$L"/kotlin-script-runtime-*.jar "$L"/kotlin-reflect-*.jar "$L"/kotlinx-coroutines-core-jvm-*.jar "$L"/trove4j*.jar "$L"/annotations-*.jar "$L"/kotlin-daemon-embeddable-*.jar | tr '\n' ':')
STD=$(ls "$L"/kotlin-stdlib-*.jar | head -1)
LIBS="$STD:$(ls "$L"/junit-4.13.2.jar):$(ls "$L"/hamcrest-core-1.3.jar)"
java -cp "$CP" org.jetbrains.kotlin.cli.jvm.K2JVMCompiler -no-stdlib -no-reflect -cp "$LIBS" -d "$OUT" \
  $APP/bridge/Guard.kt $APP/bridge/Texts.kt $APP/update/UpdateRules.kt app/src/test/java || exit 1
java -cp "$OUT:$LIBS" org.junit.runner.JUnitCore com.kairema.app.bridge.GuardTest com.kairema.app.bridge.TextsTest com.kairema.app.update.UpdateRulesTest
