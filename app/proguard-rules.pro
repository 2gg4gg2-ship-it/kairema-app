# Весь код приложения остаётся как есть: WebView вызывает методы моста по именам (@JavascriptInterface),
# манифест и ContentProvider ссылаются на классы по именам. Сокращаются только библиотеки и ресурсы.
-keep class com.kairema.app.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-keepattributes *Annotation*,Signature,InnerClasses,EnclosingMethod,SourceFile,LineNumberTable

# okhttp/okio: необязательные платформы, которых на Android нет
-dontwarn okhttp3.internal.platform.**
-dontwarn org.bouncycastle.**
-dontwarn org.conscrypt.**
-dontwarn org.openjsse.**
