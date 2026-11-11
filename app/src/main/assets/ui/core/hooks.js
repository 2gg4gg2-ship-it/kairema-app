/* ===== ЯДРО: события и переводы для подключаемых модулей =====
   Модуль не правит core/app.js: он подписывается на события (Hooks.on) и
   добавляет свои переводы (i18nAdd). Убрали модуль, приложение работает без него.
   События: 'app:ready' (приложение запущено), 'settings:rendered' (экран настроек нарисован, аргумент: элемент). */
const Hooks={h:{},on(n,f){(this.h[n]=this.h[n]||[]).push(f)},run(n,...a){(this.h[n]||[]).forEach(f=>{try{f(...a)}catch(e){console.warn('Hook '+n,e)}})}};
const I18N_EXTRA={};
const i18nAdd=d=>Object.assign(I18N_EXTRA,d);
