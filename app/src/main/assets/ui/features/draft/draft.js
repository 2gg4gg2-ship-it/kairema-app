/* ===== ЧЕРНОВИК: недописанное сообщение не пропадает =====
   Раньше текст в поле ввода исчезал, если уйти в настройки или терминал (поле строится заново) или закрыть приложение.
   Теперь текст запоминается на телефоне отдельно для каждого чата (kairema.draft.v1, не больше 30 чатов) и возвращается,
   когда вы снова открываете чат. Сохранение: через четверть секунды после набора, сразу при сворачивании приложения.
   Чистится, когда сообщение отправлено (новое сообщение пользователя). Вложения (фото, файлы) в черновик не входят.
   Убрать модуль: удалить папку и строку в index.html. Тест: docs/tests/draft.test.js */
const Draft=(()=>{
 const KEY='kairema.draft.v1',MAX=30;
 const load=()=>{try{const o=JSON.parse(localStorage.getItem(KEY)||'{}');return o&&typeof o==='object'?o:{}}catch(e){return{}}};
 const save=o=>{try{const k=Object.keys(o);if(k.length>MAX)k.sort((a,b)=>(o[a].t||0)-(o[b].t||0)).slice(0,k.length-MAX).forEach(x=>delete o[x]);localStorage.setItem(KEY,JSON.stringify(o))}catch(e){}};
 const cid=()=>(typeof Chx!=='undefined'&&Chx.cur&&Chx.cur.id)||'_';
 const set=(id,v)=>{const o=load();if(v&&v.trim())o[id]={v,t:Date.now()};else delete o[id];save(o)};
 const get=id=>{const d=load()[id];return d&&d.v?String(d.v):''};
 let cur=null,timer=0,pend=null;
 const flush=()=>{if(timer){clearTimeout(timer);timer=0}if(pend){const p=pend;pend=null;set(p.id,p.v)}};
 function attach(v){
  const c=typeof Chat!=='undefined'?Chat.cmp:null;
  const ta=c&&c.querySelector('textarea');if(!ta)return;
  cur=ta;
  const id=cid(),d=get(id);
  if(d&&!ta.value){if(c.setText)c.setText(d);else{ta.value=d;ta.dispatchEvent(new Event('input',{bubbles:true}))}}
  ta.addEventListener('input',()=>{pend={id,v:ta.value};if(timer)clearTimeout(timer);timer=setTimeout(flush,250)});
  ta.addEventListener('blur',flush)}
 Hooks.on('chat:rendered',attach);
 /* Отправили сообщение: черновик этого чата больше не нужен */
 Hooks.on('msg:render',(d,m)=>{if(m&&m.r==='u'&&d&&d.classList&&d.classList.contains('new')){pend=null;if(timer){clearTimeout(timer);timer=0}set(cid(),'')}});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')flush()});
 window.addEventListener('pagehide',flush);
 return{get,set,flush}})();
