/* ===== НАСТРОЙКИ ПРИЛОЖЕНИЯ =====
   APP_VERSION меняем при каждой сборке вместе с app/build.gradle.kts и README.md.
   supabaseUrl и supabaseAnonKey: публичные данные сервера аккаунтов (anon key не секрет).
   Можно вписать сюда или ввести в приложении (Настройки, Аккаунт). */
const APP_VERSION='0.12.2';
const CONFIG={supabaseUrl:'',supabaseAnonKey:''};
i18nAdd({['Версия: '+APP_VERSION]:'Version: '+APP_VERSION});
