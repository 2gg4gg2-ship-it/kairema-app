/* ===== ОЗВУЧКА ОТВЕТОВ =====
   Нативный синтезатор речи Android (Kotlin: com.kairema.app.tts.TtsBridge, интерфейс KairemaTtsBridge).
   Под ответом ИИ появляется кнопка «Прослушать»; нажали ещё раз, чтобы остановить.
   В браузере используется speechSynthesis, если он есть.
   Убрать модуль: удалить папку features/tts, строку в index.html и строки с Tts в voice.js и tools.js (они защищены typeof). */
i18nAdd({"Прослушать":"Listen","Остановить":"Stop","Озвучка недоступна: в телефоне нет синтезатора речи":"Speech is unavailable: no text-to-speech engine on this phone","Нет голоса для этого языка: установите его в настройках синтезатора речи":"No voice for this language: install it in the text-to-speech settings","Не удалось озвучить ответ":"Could not read the answer aloud"});
const Tts=(()=>{
 const B=window.KairemaTtsBridge,SS=window.speechSynthesis;
 const api={id:'',btn:null,native:!!B};
 const icons=()=>{P.spk=P.spk||'<path d="M4 10v4h4l5 4V6L8 10zM16 9a4 4 0 010 6M18.5 6.5a8 8 0 010 11"/>';P.stp=P.stp||'<rect x="6" y="6" width="12" height="12" rx="2"/>'};
 const rate=()=>{let r=1;try{r=parseFloat(st.get('ktrate'))||1}catch(e){}return Math.min(2,Math.max(.5,r))};
 /* Текст для чтения: без разметки, кода, ссылок и таблиц */
 api.clean=t=>String(t||'')
  .replace(/```[\s\S]*?```/g,L(' Здесь блок кода. '))
  .replace(/`([^`]*)`/g,'$1')
  .replace(/!\[[^\]]*\]\([^)]*\)/g,'')
  .replace(/\[([^\]]+)\]\([^)]*\)/g,'$1')
  .replace(/https?:\/\/\S+/g,'')
  .replace(/\[\d+\]/g,'')
  .replace(/^\s*\|?[\s:|-]{3,}\|?\s*$/gm,'')
  .replace(/\|/g,', ')
  .replace(/^\s{0,3}#{1,6}\s*/gm,'')
  .replace(/^\s*[-*+]\s+/gm,'')
  .replace(/^\s*>\s?/gm,'')
  .replace(/[*_~]{1,3}/g,'')
  .replace(/\n{2,}/g,'.\n').replace(/[ \t]+/g,' ').trim();
 api.lang=t=>{
  /* Язык по письму и буквам первых 800 знаков: голос должен совпадать с языком ответа (ru, uk, en, zh, ja, ko, ar, de, fr, es ...) */
  const x=String(t||'').slice(0,800),n=re=>(x.match(re)||[]).length;
  const c={ja:n(/[\u3040-\u30ff]/g),ko:n(/[\uac00-\ud7af\u1100-\u11ff]/g),zh:n(/[\u4e00-\u9fff]/g),cy:n(/[\u0400-\u04ff]/g),ar:n(/[\u0600-\u06ff]/g),he:n(/[\u0590-\u05ff]/g),el:n(/[\u0370-\u03ff]/g),th:n(/[\u0e00-\u0e7f]/g),hi:n(/[\u0900-\u097f]/g),la:n(/[A-Za-z\u00c0-\u024f]/g)};
  if(c.ja>0&&c.ja+c.zh>=Math.max(c.cy,c.ko,c.la)/2)return 'ja-JP';
  let best='la',mx=c.la;for(const k of Object.keys(c)){if(k!=='ja'&&c[k]>mx){best=k;mx=c[k]}}
  if(!mx)return LANG==='en'?'en-US':'ru-RU';
  if(best==='cy')return /[іїєґІЇЄҐ]/.test(x)&&!/[ыэъёЫЭЪЁ]/.test(x)?'uk-UA':'ru-RU';
  if(best==='zh')return 'zh-CN';
  if(best==='ko')return 'ko-KR';
  if(best==='ar')return 'ar-SA';
  if(best==='he')return 'he-IL';
  if(best==='el')return 'el-GR';
  if(best==='th')return 'th-TH';
  if(best==='hi')return 'hi-IN';
  if(/[ñ¿¡]/.test(x))return 'es-ES';
  if(/[ßäöüÄÖÜ]/.test(x))return 'de-DE';
  if(/[ãõ]/.test(x))return 'pt-PT';
  if(/[ąęłńśźżćĄĘŁŃŚŹŻĆ]/.test(x))return 'pl-PL';
  if(/[éèêàùçâîôûëïœÉÈÊÀÙÇ]/.test(x))return 'fr-FR';
  if(/[іїєґІЇЄҐ]/.test(x))return 'uk-UA';
  return 'en-US'};
 const mark=on=>{if(api.btn){api.btn.classList.toggle('on',on);api.btn.innerHTML=ic(on?'stp':'spk');api.btn.setAttribute('aria-label',L(on?'Остановить':'Прослушать'))}};
 const end=why=>{const b=api.btn;mark(false);api.btn=null;api.id='';if(b)b._cb=null;const f=api._after;api._after=null;if(f)f(why)};
 api.stop=()=>{
  if(!api.id)return;
  try{if(B)B.stop();else if(SS)SS.cancel()}catch(e){}
  end('stop')};
 /* Событие из Kotlin: end, error */
 api.ev=(type,id,text)=>{
  if(id!==api.id)return;
  if(type==='end')end('end');
  else if(type==='error'){
   toast(text==='nolang'?'Нет голоса для этого языка: установите его в настройках синтезатора речи':text==='init'?'Озвучка недоступна: в телефоне нет синтезатора речи':'Не удалось озвучить ответ');
   end('error')}};
 /* Читать вслух; after(why) вызывается по окончании (why: end, stop, error) */
 api.say=(text,btn,after)=>{
  icons();
  if(api.id){const same=btn&&btn===api.btn;api.stop();if(same)return}
  const t=api.clean(text);if(!t){if(after)after('error');return}
  api.id='t'+Date.now().toString(36);api.btn=btn||null;api._after=after||null;mark(true);
  const lg=api.lang(t);
  try{
   if(B)B.speak(api.id,t,lg,rate());
   else if(SS){const u=new SpeechSynthesisUtterance(t);u.lang=lg;u.rate=rate();const id=api.id;u.onend=()=>api.ev('end',id,'');u.onerror=()=>api.ev('error',id,'x');SS.cancel();SS.speak(u)}
   else{toast('Озвучка недоступна: в телефоне нет синтезатора речи');end('error')}}
  catch(e){toast('Не удалось озвучить ответ');end('error')}};
 /* Кнопка под ответом */
 const addBtn=(d,m)=>{
  if(!m||m.r!=='a'||!m.t||m.err||m.img)return;
  const row=$('.msg-act',d);if(!row||$('[data-tts]',row))return;
  icons();
  const b=el(`<button type="button" data-tts aria-label="${L('Прослушать')}">${ic('spk')}</button>`);
  b.onclick=e=>{e.stopPropagation();api.say(m.t,b)};
  row.append(b)};
 Hooks.on('msg:render',(d,m)=>setTimeout(()=>addBtn(d,m),0));
 Hooks.on('chat:answer',(m,bd)=>{
  const d=bd&&bd.closest&&bd.closest('.msg');
  if(d)setTimeout(()=>addBtn(d,m),0);});
 return api})();
