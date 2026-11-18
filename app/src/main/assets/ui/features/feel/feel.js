/* ===== ВИБРО И ЗВУКИ =====
   Вибро (Android: Bridge.haptic, запасной вариант navigator.vibrate): короткий «тик» на отправку и переключатели,
   мягкий двойной импульс, когда ИИ закончил ответ, резкий на ошибку. Звуки рисуются прямо в приложении (Web Audio, файлов нет):
   тихий щелчок при отправке, две ноты вверх по окончании ответа, две вниз при ошибке.
   Настройки: Настройки → «Вибро» (выкл / лёгкая / обычная) и «Звуки» (выкл / тихие / обычные), хранятся в localStorage kairema.feel.v1.
   API: Feel.tick(), Feel.done(), Feel.error(), Feel.send(). Убрать модуль: удалить папку и строку в index.html (везде вызовы защищены typeof). */
const Feel=(()=>{
 const K='kairema.feel.v1';
 let st={h:1,s:1};try{const o=JSON.parse(localStorage.getItem(K)||'null');if(o&&typeof o==='object')st={h:[0,1,2].includes(o.h)?o.h:1,s:[0,1,2].includes(o.s)?o.s:1}}catch(e){}
 const save=()=>{try{localStorage.setItem(K,JSON.stringify(st))}catch(e){}};
 const api={st};
 /* Рисунки вибро: [пауза, импульс, пауза, импульс…] в мс и сила 0..255 для каждого шага. Сила умножается на уровень (лёгкая 0.55, обычная 1). */
 const PAT={tick:[[0,9],[70]],send:[[0,12],[90]],done:[[0,16,70,22],[0,110,0,190]],error:[[0,40,60,40],[0,220,0,220]]};
 const buzz=name=>{
  if(!st.h)return;
  const p=PAT[name];if(!p)return;
  const k=st.h===1?.55:1;
  const amps=p[1].length>1?p[1].map(a=>Math.round(a*k)):[Math.round(p[1][0]*k)];
  try{
   if(typeof KairemaBridge!=='undefined'&&KairemaBridge.haptic){KairemaBridge.haptic(name,st.h);return}
   if(navigator.vibrate)navigator.vibrate(p[0].filter((x,i)=>i%2===1||x>0))}catch(e){}};
 /* Звуки */
 let ac=null,master=null;
 const ctx=()=>{
  if(ac)return ac;
  try{const C=window.AudioContext||window.webkitAudioContext;if(!C)return null;ac=new C();master=ac.createGain();master.connect(ac.destination)}catch(e){ac=null}
  return ac};
 const wake=()=>{const a=ctx();if(a&&a.state==='suspended'){try{a.resume()}catch(e){}}};
 ['pointerdown','touchstart','keydown'].forEach(ev=>document.addEventListener(ev,wake,{passive:true,capture:true}));
 const note=(f,t0,dur,vol,type)=>{
  const a=ac;if(!a)return;
  const o=a.createOscillator(),g=a.createGain();o.type=type||'sine';o.frequency.value=f;
  const t=a.currentTime+t0;
  g.gain.setValueAtTime(0.0001,t);g.gain.exponentialRampToValueAtTime(vol,t+0.012);g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
  o.connect(g);g.connect(master);o.start(t);o.stop(t+dur+0.03)};
 const SND={
  send:v=>note(880,0,.07,.05*v),
  done:v=>{note(659.25,0,.16,.11*v);note(880,.11,.26,.11*v)},
  error:v=>{note(293.66,0,.2,.1*v,'triangle');note(220,.14,.3,.1*v,'triangle')}};
 const play=name=>{
  if(!st.s)return;
  const a=ctx();if(!a)return;
  if(a.state==='suspended'){try{a.resume()}catch(e){}}
  master.gain.value=st.s===1?.55:1;
  try{SND[name](1)}catch(e){}};
 /* Чтобы две вибрации подряд не слипались */
 let last=0;
 const once=(name,gap)=>{const n=Date.now();if(n-last<(gap||60))return false;last=n;buzz(name);return true};
 api.tick=()=>once('tick',60);
 api.send=()=>{once('send',60);play('send')};
 api.done=()=>{last=0;once('done',0);play('done')};
 api.error=()=>{last=0;once('error',0);play('error')};
 /* Нажатия: только отправка, переключатели и сегменты — не каждая кнопка, чтобы не раздражало */
 document.addEventListener('click',e=>{
  const t=e.target&&e.target.closest?e.target:null;if(!t)return;
  if(t.closest('.send')){
   /* Отправка — только если в поле есть текст (когда идёт ответ, эта же кнопка «Стоп») */
   const ta=document.querySelector('.cmp textarea');
   if(!window.GEN&&ta&&ta.value.trim())api.send();
   else api.tick();return}
  const sr=t.closest('.sr,.set,[data-t]');
  if(sr&&sr.querySelector('.sw')){api.tick();return}
  if(t.closest('.segc button,.seg button'))api.tick()},true);
 /* Конец ответа и ошибка */
 if(typeof Hooks!=='undefined')Hooks.on('chat:answer',()=>api.done());
 if(typeof Log!=='undefined'&&Log.add){const o=Log.add;Log.add=function(s){try{if(s==='chat')api.error()}catch(e){}return o.apply(this,arguments)}}
 /* Настройки */
 const N=['Выкл','Лёгкая','Обычная'],M=['Выкл','Тихие','Обычные'];
 const row=(attr,title,names,key,onPick)=>{
  const r=el('<button class="sr" '+attr+'><span class="si c">'+ic('tpl')+'</span><span class="m"><b></b><small></small></span></button>');
  $('b',r).textContent=L(title);
  const upd=()=>{$('small',r).textContent=L(names[st[key]])};upd();
  r.onclick=()=>{st[key]=(st[key]+1)%3;save();upd();onPick()};
  return r};
 if(typeof Hooks!=='undefined')Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-feel]',v))return;
  const a=row('data-feel','Вибро',N,'h',()=>{last=0;if(st.h)buzz('done')});
  const b=row('data-feels','Звуки',M,'s',()=>{if(st.s)play('done')});
  ab.insertAdjacentElement('beforebegin',a);ab.insertAdjacentElement('beforebegin',b)});
 if(typeof i18nAdd==='function')i18nAdd({"Вибро":"Haptics","Звуки":"Sounds","Выкл":"Off","Лёгкая":"Light","Обычная":"Normal","Тихие":"Quiet","Обычные":"Normal"});
 return api})();
