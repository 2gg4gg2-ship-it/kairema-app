/* ===== ГОЛОСОВОЙ ВВОД =====
   Нативное распознавание речи Android (Kotlin: com.kairema.app.voice.VoiceBridge, интерфейс KairemaVoiceBridge).
   Кнопка микрофона в поле ввода: нажали, говорите, слова появляются в поле сразу; нажали ещё раз, чтобы остановить.
   Разрешение на микрофон запрашивается при первом нажатии. В браузере используется Web Speech API, если он есть.
   Убрать модуль: удалить папку features/voice и строку в index.html (микрофон вернётся к браузерному варианту). */
i18nAdd({"Голосовой ввод недоступен: установите приложение Google или включите службу распознавания речи":"Voice input is unavailable: install the Google app or enable a speech recognition service","Разрешите микрофон: Настройки Android, Приложения, Kairema, Разрешения":"Allow the microphone: Android Settings, Apps, Kairema, Permissions","Не расслышал, попробуйте ещё раз":"Didn't catch that, try again","Ошибка голосового ввода":"Voice input error","Слушаю…":"Listening…"});
const Voice=(()=>{
 const B=window.KairemaVoiceBridge;let cur=null;
 const lang=()=>LANG==='en'?'en-US':'ru-RU';
 const cm=()=>cur&&cur.mic.closest('.cmp');const fin=()=>{if(cur){cur.mic.classList.remove('rec');const c=cm();if(c)c.classList.remove('listening');cur=null}};
 const put=t=>{if(!cur)return;cur.ta.value=cur.base+(cur.base&&t?' ':'')+t;cur.grow();cur.ta.scrollTop=cur.ta.scrollHeight};
 return{
  native:!!B,
  /* Событие из Kotlin: start, partial, result, noperm, silence, error, end */
  ev(type,text){
   if(type==='start'){}
   else if(type==='partial'||type==='result')put(text);
   else if(type==='noperm')toast('Разрешите микрофон: Настройки Android, Приложения, Kairema, Разрешения');
   else if(type==='silence')toast('Не расслышал, попробуйте ещё раз');
   else if(type==='error')toast(text==='unavailable'?'Голосовой ввод недоступен: установите приложение Google или включите службу распознавания речи':'Ошибка голосового ввода');
   if(type==='end'||type==='noperm'||type==='error')fin()},
  toggle(mic,ta,grow){
   if(cur){try{B.stop()}catch(e){}return}
   cur={mic,ta,grow,base:ta.value.trim()};mic.classList.add('rec');{const c=cm();if(c)c.classList.add('listening')}
   try{B.start(lang())}catch(e){fin();toast('Ошибка голосового ввода')}}}})();
