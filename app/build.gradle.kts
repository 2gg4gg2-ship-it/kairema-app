plugins {
    id("com.android.application") version "8.5.2"
    id("org.jetbrains.kotlin.android") version "2.0.20"
}

// Подпись release-сборки: ключ приходит из переменных окружения (GitHub Secrets, см. docs/RELEASE_SETUP.md).
// Если ключа нет, release подписывается debug-ключом, чтобы сборка не ломалась.
val relStore: String? = System.getenv("KAIREMA_KEYSTORE")
val hasReleaseKey = relStore != null && file(relStore).exists()

android {
    namespace = "com.kairema.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.kairema.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 60
        versionName = "0.40.0"
    }
    // Постоянный ключ подписи ТОЛЬКО для debug-сборок: новые APK ставятся поверх старых.
    signingConfigs {
        getByName("debug") {
            storeFile = file("debug.keystore")
            storePassword = "android"
            keyAlias = "androiddebugkey"
            keyPassword = "android"
        }
    }
    signingConfigs {
        create("release") {
            if (hasReleaseKey) {
                storeFile = file(relStore!!)
                storePassword = System.getenv("KAIREMA_STORE_PASS")
                keyAlias = System.getenv("KAIREMA_KEY_ALIAS") ?: "kairema"
                keyPassword = System.getenv("KAIREMA_KEY_PASS")
            }
        }
    }
    buildTypes {
        release {
            // R8 убирает неиспользуемый код библиотек (okhttp, kotlin) и ресурсы. Код самого приложения не переименовывается
            // (правила в proguard-rules.pro), чтобы не сломать мост JavaScript <-> Kotlin.
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(getDefaultProguardFile("proguard-android-optimize.txt"), "proguard-rules.pro")
            signingConfig = if (hasReleaseKey) signingConfigs.getByName("release") else signingConfigs.getByName("debug")
        }
    }
    lint {
        // Проверки lint не должны ронять сборку APK
        checkReleaseBuilds = false
        abortOnError = false
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

kotlin {
    jvmToolchain(17)
}

dependencies {
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    testImplementation("junit:junit:4.13.2")
}
