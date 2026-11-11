plugins {
    id("com.android.application") version "8.5.2"
    id("org.jetbrains.kotlin.android") version "2.0.20"
}

android {
    namespace = "com.kairema.app"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.kairema.app"
        minSdk = 26
        targetSdk = 34
        versionCode = 9
        versionName = "0.5.0"
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
}
