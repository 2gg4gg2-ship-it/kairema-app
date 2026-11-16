/* ===== ЖУРНАЛ ОШИБОК: что сломалось, можно скопировать и прислать разработчику =====
   Ловит ошибки страницы (error, unhandledrejection, console.error) и ошибки ответов ИИ (Log.add('chat', текст)).
   Хранит последние 100 записей в localStorage kairema.log.v1. Ключи API и токены перед записью заменяются на ***.
   Экран «Журнал ошибок»: Настройки, строка над «О приложении». Log.dump() даёт текст для копирования.
   Подключается ПЕРВЫМ после hooks.js, чтобы поймать ошибки загрузки. Убрать: удалить папку features/log и её строки в index.html. */
i18nAdd({"Журнал ошибок":"Error log","Что сломалось: можно скопировать":"What broke: copy and send","Копировать":"Copy","Очистить":"Clear","Журнал пуст: ошибок не было":"The log is empty: no errors","Журнал скопирован":"Log copied","Журнал очищен":"Log cleared","Если приложение ведёт себя странно, нажмите «Копировать» и отправьте текст разработчику. Ключи и пароли в журнал не попадают.":"If the app acts strange, tap Copy and send the text to the developer. Keys and passwords are not logged."});
const Log=(()=>{
 const K='kairema.log.v1',MAX=100;
 let rows=[],t=0;
 const load=()=>{try{const a=JSON.parse(localStorage.getItem(K)||'[]');if(Array.isArray(a))rows=a.slice(-MAX)}catch(e){}};
 const save=()=>{clearTimeout(t);t=setTimeout(()=>{try{localStorage.setItem(K,JSON.stringify(rows))}catch(e){}},400)};
 /* Убрать из текста всё похожее на ключи и токены. */
 const scrub=s=>String(s==null?'':s)
  .replace(/\b(sk|pk|rk)[-_][A-Za-z0-9_-]{12,}/g,'***').replace(/\bsb_(publishable|secret)_[A-Za-z0-9_-]{8,}/g,'***')
  .replace(/\beyJ[A-Za-z0-9_-]{20,}(\.[A-Za-z0-9_-]+)*/g,'***').replace(/\b(tvly|ghp|gho|xox[bp]|AIza|re)[-_][A-Za-z0-9_-]{16,}/g,'***')
  .replace(/(Bearer|Authorization:?|api[-_ ]?key[=: ]+)\s*[A-Za-z0-9._-]{12,}/gi,'$1 ***').replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[a-z]{2,}/gi,'***@***');
 function add(kind,msg,src){
  const m=scrub(msg&&msg.message||msg).slice(0,400);if(!m)return;
  const last=rows[rows.length-1];
  if(last&&last.k===kind&&last.m===m){last.n=(last.n||1)+1;last.t=Date.now()}
  else rows.push({t:Date.now(),k:kind,m,s:scrub(src||'').slice(0,160)});
  if(rows.length>MAX)rows=rows.slice(-MAX);
  save()}
 const fmt=r=>{const d=new Date(r.t),p=n=>String(n).padStart(2,'0');return p(d.getDate())+'.'+p(d.getMonth()+1)+' '+p(d.getHours())+':'+p(d.getMinutes())+':'+p(d.getSeconds())+'  ['+r.k+'] '+r.m+(r.n>1?'  ×'+r.n:'')+(r.s?'  ('+r.s+')':'')};
 const dump=()=>{const v=typeof APP_VERSION!=='undefined'?APP_VERSION:'?';
  return'Kairema '+v+'\n'+scrub(navigator.userAgent)+'\n'+(rows.length?rows.map(fmt).join('\n'):'(пусто)')};
 const clear=()=>{rows=[];try{localStorage.removeItem(K)}catch(e){}};
 load();
 window.addEventListener('error',e=>add('error',e.message||'error',(e.filename||'').split('/').slice(-2).join('/')+':'+(e.lineno||'')));
 window.addEventListener('unhandledrejection',e=>add('promise',e.reason&&e.reason.message||e.reason||'rejected'));
 const ce=console.error;console.error=function(){try{add('console',[].slice.call(arguments).map(a=>a&&a.message||(typeof a==='object'?'[object]':a)).join(' '))}catch(e){}return ce.apply(console,arguments)};
 function screen(){
  return page('log',L('Журнал ошибок'),b=>{
   b.innerHTML='<p class="sub" style="margin:0 2px 14px"></p><div class="two"><button class="btn" data-c></button><button class="btn ghost" data-x></button></div><pre class="lg-box"></pre>';
   $('.sub',b).textContent=L('Если приложение ведёт себя странно, нажмите «Копировать» и отправьте текст разработчику. Ключи и пароли в журнал не попадают.');
   $('[data-c]',b).textContent=L('Копировать');$('[data-x]',b).textContent=L('Очистить');
   const pre=$('.lg-box',b),draw=()=>{pre.textContent=rows.length?rows.slice().reverse().map(fmt).join('\n'):L('Журнал пуст: ошибок не было')};draw();
   $('[data-c]',b).onclick=async()=>{const t=dump();let ok=false;try{if(typeof KairemaBridge!=='undefined'&&KairemaBridge.copyText)ok=KairemaBridge.copyText(t)!==false}catch(e){}if(!ok){try{await navigator.clipboard.writeText(t);ok=true}catch(e){}}toast(L(ok?'Журнал скопирован':'Не удалось скопировать'))};
   $('[data-x]',b).onclick=()=>{clear();draw();toast(L('Журнал очищен'))}})}
 Hooks.on('app:ready',()=>{SCREENS.log=screen});
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-log]',v))return;
  const r=el('<button class="sr" data-log><span class="si c">'+ic('warn')+'</span><span class="m"><b></b><small></small></span>'+ic('chevR')+'</button>');
  $('b',r).textContent=L('Журнал ошибок');$('small',r).textContent=L('Что сломалось: можно скопировать');
  r.onclick=()=>openScreen('log');ab.insertAdjacentElement('beforebegin',r)});
 return{add,dump,clear,rows:()=>rows.slice(),scrub}})();
