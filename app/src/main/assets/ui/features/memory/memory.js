/* ===== ПАМЯТЬ (v2): хранилище фактов, профиль, подбор фактов под вопрос, подсказка для модели =====
   Модель данных. Факт хранится в S.memos как массив [текст, источник, id, время, meta], где
   meta = {c: категория, p: закреплён 0/1, a: найден автоматически 0/1, u: сколько раз попал в запрос, l: когда последний раз}.
   Старые записи без meta читаются как категория «other». Профиль («что вам важно знать обо мне») хранится отдельно: S.prof.
   Слои, которые видит модель (memoryPrompt): 1) профиль, всегда; 2) закреплённые факты и «личность» (имя, город), всегда;
   3) факты, подходящие к вопросу (поиск по словам с основами и весом редких слов); 4) несколько последних.
   Если фактов не больше 20, модель видит все. Затраты: до ~1800 символов на запрос.
   Хранение: localStorage kairema.memory.v1 (v:2), синхронизация через адаптер 'memory' (в Supabase уходят текст, категория, закрепление,
   авто-метка; счётчики u/l остаются на устройстве). Профиль синхронизируется особым элементом с id '_profile'.
   Извлечение фактов моделью: memory-ai.js. Экран «Память»: memory-ui.js. Убрать модуль: удалить папку и строки в index.html. */
i18nAdd({"Личное":"Identity","Работа и учёба":"Work and study","Предпочтения":"Preferences","Интересы":"Interests","Близкие и питомцы":"People and pets","Цели и проекты":"Goals and projects","Техника":"Tech","Другое":"Other","Факт добавлен в память":"Fact added to memory","Память обновлена":"Memory updated"});
const Mem=(()=>{
 const KEY='kairema.memory.v1',CATS=['identity','work','prefs','interests','people','goals','tech','other'],CAP=300;
 const LAB={identity:'Личное',work:'Работа и учёба',prefs:'Предпочтения',interests:'Интересы',people:'Близкие и питомцы',goals:'Цели и проекты',tech:'Техника',other:'Другое'};
 let prev={},profTs=0;
 const nid=()=>'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 const M=x=>{const m=x[4];if(m&&typeof m==='object')return m;return x[4]={c:'other',p:0,a:0,u:0,l:0}};
 const cat=c=>CATS.includes(c)?c:'other';
 const sig=x=>{const m=M(x);return{t:String(x[0]),src:String(x[1]||''),c:m.c,p:m.p?1:0,a:m.a?1:0}};
 const same=(a,b)=>a.t===b.t&&a.src===b.src&&a.c===b.c&&a.p===b.p&&a.a===b.a;
 const toItem=x=>{const m=M(x);return{id:x[2],t:String(x[0]),src:String(x[1]||''),ts:x[3]||0,c:cat(m.c),p:m.p?1:0,a:m.a?1:0}};
 const fromItem=(i,id)=>[String(i.t||'').slice(0,300),String(i.src||'').slice(0,200),id||i.id||nid(),+i.ts||0,{c:cat(i.c),p:i.p?1:0,a:i.a?1:0,u:0,l:0}];
 let saveT=0;
 const save=()=>{clearTimeout(saveT);saveT=0;try{localStorage.setItem(KEY,JSON.stringify({v:2,mem:!!S.mem,auto:!!S.auto,smart:S.smart!==false,prof:S.prof||'',pts:profTs,items:S.memos.map(x=>Object.assign(toItem(x),{u:M(x).u||0,l:M(x).l||0}))}))}catch(e){}};
 const saveSoon=()=>{if(!saveT)saveT=setTimeout(save,1500)};
 const snap=()=>{prev={};S.memos.forEach(x=>{prev[x[2]]=sig(x)})};
 /* Выдаёт id и время изменения, возвращает что изменилось и что удалено. */
 function norm(){
  const now=Date.now(),touched=[],seen={};
  S.memos.forEach(x=>{
   M(x);
   if(!x[2]){x[2]=nid();x[3]=now;touched.push(x[2])}
   else{const p=prev[x[2]];if(p&&!same(p,sig(x))){x[3]=now;touched.push(x[2])}else if(!p&&!x[3]){x[3]=now}}
   seen[x[2]]=1});
  const removed=Object.keys(prev).filter(id=>!seen[id]);
  snap();return{touched,removed}}
 function changed(){
  const r=norm();save();
  r.touched.forEach(id=>Hooks.run('sync:touch','memory',id));
  r.removed.forEach(id=>Hooks.run('sync:delete','memory',id))}
 function load(){
  try{const d=JSON.parse(localStorage.getItem(KEY)||'null');
   if(d&&Array.isArray(d.items)){
    S.memos=d.items.filter(i=>i&&i.id&&typeof i.t==='string').map(i=>{const e=fromItem(i);e[4].u=+i.u||0;e[4].l=+i.l||0;return e});
    if(typeof d.mem==='boolean')S.mem=d.mem;
    if(typeof d.auto==='boolean')S.auto=d.auto;
    if(typeof d.smart==='boolean')S.smart=d.smart;
    if(typeof d.prof==='string'){S.prof=d.prof;S.profD=S.prof;profTs=+d.pts||0}}}catch(e){}
  if(S.smart===undefined)S.smart=true;
  snap()}
 /* ---- слова для поиска ---- */
 const SW=new Set('и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну ли если уже или ни быть был него до вас там потом себя ей может они тут где есть надо ней для мы тебя их чем была сам без чего раз тоже себе под будет тогда кто этот того потому этого какой ним здесь этом один мой тем чтобы нее сейчас были куда зачем всех при два об другой после над больше тот через эти нас про всего них какая много три эту моя этой перед том такой им более всегда конечно всю между the and for with that this what how you are was has have from your about can does into'.split(' '));
 const stem=w=>w.length>5?w.slice(0,5):w;
 const toks=s=>{const o=[];String(s||'').toLowerCase().replace(/ё/g,'е').split(/[^a-zа-я0-9]+/).forEach(w=>{if(w.length>=3&&!SW.has(w))o.push(stem(w))});return o};
 const tset=s=>new Set(toks(s));
 /* Похожий факт уже есть? Пересечение по основам слов. */
 function dupOf(t,skipId){
  const a=tset(t);if(!a.size)return null;
  for(const x of S.memos){
   if(skipId&&x[2]===skipId)continue;
   const b=tset(x[0]);if(!b.size)continue;
   let n=0;a.forEach(w=>{if(b.has(w))n++});
   const un=a.size+b.size-n,mn=Math.min(a.size,b.size);
   if(String(x[0]).toLowerCase()===String(t).toLowerCase()||n/un>=0.7||(mn>=2&&n/mn>=0.85))return x}
  return null}
 /* Секретное в память не кладём. */
 const SECRET=/(sk-[a-z0-9_-]{12,}|api[_ -]?key|парол|password|passwd|токен|token|секретн|\b(?:\d[ -]?){13,19}\b|cvv|cvc|pin[- ]?код)/i;
 const clean=t=>String(t||'').replace(/\s+/g,' ').replace(/^[\s\-–—•*]+/,'').trim().slice(0,200);
 /* ---- изменения ---- */
 function add(t,o){
  o=o||{};t=clean(t);
  if(t.length<3||SECRET.test(t))return null;
  const d=dupOf(t);
  if(d){
   if(o.a&&!M(d).a){return{k:'dup',x:d}}
   if(t.length>String(d[0]).length&&o.upd!==false){const old=d[0];d[0]=t;d[3]=Date.now();changed();return{k:'upd',x:d,old}}
   return{k:'dup',x:d}}
  const x=[t,String(o.src||''),nid(),Date.now(),{c:cat(o.c||guessCat(t)),p:o.p?1:0,a:o.a?1:0,u:0,l:0}];
  S.memos.push(x);trim();changed();return{k:'add',x}}
 function update(id,t,c){
  const x=S.memos.find(y=>y[2]===id);if(!x)return null;
  t=clean(t);if(t.length<3||SECRET.test(t))return null;
  const old=x[0];x[0]=t;if(c)M(x).c=cat(c);changed();return{k:'upd',x,old}}
 function remove(id){const i=S.memos.findIndex(y=>y[2]===id);if(i<0)return null;const x=S.memos.splice(i,1)[0];changed();return x}
 function setMeta(id,k,v){const x=S.memos.find(y=>y[2]===id);if(!x)return;M(x)[k]=v;changed()}
 /* Не больше CAP: сначала уходят найденные автоматически, незакреплённые и давно не использованные. */
 function trim(){
  while(S.memos.length>CAP){
   let w=-1,ws=1e18;
   S.memos.forEach((x,i)=>{const m=M(x);if(m.p)return;const s=(m.a?0:1e12)+(m.u||0)*1e9+(x[3]||0);if(s<ws){ws=s;w=i}});
   if(w<0)break;S.memos.splice(w,1)}}
 function guessCat(t){
  const s=String(t).toLowerCase();
  if(/зовут|живёт|живет|лет\b|родил|имя|lives|name is|born/.test(s))return'identity';
  if(/работа|учит|студент|профес|компани|должност|работает|works|studies|job|developer|разработ/.test(s))return'work';
  if(/любит|нравит|не любит|предпочит|prefers|likes|dislikes|короткие ответы|отвечай/.test(s))return'prefs';
  if(/жена|муж|сын|дочь|брат|сестр|мама|папа|друг|собак|кот|кошк|wife|husband|son|daughter|dog|cat\b/.test(s))return'people';
  if(/цель|хочет|планирует|проект|готовится|goal|plans|project/.test(s))return'goals';
  if(/телефон|ноутбук|компьютер|android|iphone|windows|linux|язык программ|python|kotlin|phone|laptop/.test(s))return'tech';
  if(/хобби|увлека|играет|смотрит|читает|интерес|hobby|plays|watches|reads/.test(s))return'interests';
  return'other'}
 /* ---- подбор фактов под вопрос ---- */
 const FP_MAX=1800;
 function pick(q){
  const all=S.memos.filter(x=>String(x[0]).trim());
  if(!all.length)return[];
  let sel;
  if(all.length<=20)sel=all.slice();
  else{
   const Q=tset(q),n=all.length,df={};
   const sets=all.map(x=>tset(x[0]));
   sets.forEach(s=>s.forEach(w=>{df[w]=(df[w]||0)+1}));
   const sc=all.map((x,i)=>{let s=0;Q.forEach(w=>{if(sets[i].has(w))s+=Math.log(1+n/(1+(df[w]||0)))});return{x,s}});
   const set=new Set();
   all.filter(x=>M(x).p).forEach(x=>set.add(x));
   all.filter(x=>M(x).c==='identity').slice(0,8).forEach(x=>set.add(x));
   sc.filter(o=>o.s>0).sort((a,b)=>b.s-a.s).slice(0,10).forEach(o=>set.add(o.x));
   all.slice().sort((a,b)=>(b[3]||0)-(a[3]||0)).slice(0,4).forEach(x=>set.add(x));
   sel=all.filter(x=>set.has(x))}
  const out=[];let len=0;
  sel.sort((a,b)=>(M(b).p-M(a).p)||(CATS.indexOf(M(a).c)-CATS.indexOf(M(b).c)));
  for(const x of sel){const l=String(x[0]).length+4;if(len+l>FP_MAX)break;len+=l;out.push(x)}
  return out}
 /* Текущий вопрос: последнее сообщение пользователя и предыдущее. */
 function queryNow(){
  const u=(S.apiMsgs||[]).filter(m=>m&&m.r==='u');
  return u.slice(-2).map(m=>m.q||m.t||'').join(' ')}
 const RULES="Rules: (1) Use a note only when the user's current question needs it, and answer exactly what was asked, nothing more: if the user asks their name, reply with the name only. (2) Never list, recap or hint at notes the user did not ask about, even if they seem related or interesting. (3) Never say that you will remember, note or take something into account (no \"noted\", \"I'll keep that in mind\", \"учту\"), and never mention the memory itself unless the user asks about it. (4) If the user's message contradicts a note, trust the message. (5) Notes about preferences and the profile are standing instructions about style: follow them silently.";
 function prompt(q){
  const prof=String(S.prof||'').trim().slice(0,1200);
  const f=S.mem?pick(q===undefined?queryNow():q):[];
  Mem.used=f.map(x=>x[2]);
  if(!S.mem||(!prof&&!f.length))return'';
  const now=Date.now();f.forEach(x=>{const m=M(x);m.u=(m.u||0)+1;m.l=now});saveSoon();
  return"\n\nBackground notes about the user from the app's memory. They are private context, not a topic of conversation. "+RULES
   +(prof?"\nUser profile, written by the user:\n"+prof:'')
   +(f.length?"\nNotes:\n"+f.map(x=>'- '+(M(x).c!=='other'?'['+M(x).c+'] ':'')+String(x[0]).slice(0,300)).join('\n'):'')}
 /* ---- быстрые правила: без обращения к модели ---- */
 const rx=[
  {r:/(?:^|[.!?\n]\s*)(?:меня зовут|моё имя|мое имя|my name is|i am called)\s+([^.!?\n,]{2,40})/i,f:m=>'Зовут '+m[1].trim(),c:'identity',key:/^Зовут /},
  {r:/(?:^|[^а-яёa-z])я живу\s+((?:в|во|на)\s+[^.!?\n,]{2,40})/i,f:m=>'Живёт '+m[1].trim(),c:'identity',key:/^Живёт /},
  {r:/(?:^|[^а-яёa-z])i live in\s+([^.!?\n,]{2,40})/i,f:m=>'Lives in '+m[1].trim(),c:'identity',key:/^Lives in /},
  {r:/(?:^|[^а-яёa-z])я работаю\s+([^.!?\n]{3,60})/i,f:m=>'Работает '+m[1].trim(),c:'work'},
  {r:/(?:^|[^а-яёa-z])i work\s+((?:as|at|in|for)\s+[^.!?\n]{3,60})/i,f:m=>'Works '+m[1].trim(),c:'work'},
  {r:/(?:^|[^а-яёa-z])(?:мне нравится|я люблю)\s+([^.!?\n]{2,60})/i,f:m=>'Нравится '+m[1].trim(),c:'prefs'},
  {r:/(?:^|[^а-яёa-z])(?:мне не нравится|я не люблю|терпеть не могу)\s+([^.!?\n]{2,60})/i,f:m=>'Не нравится '+m[1].trim(),c:'prefs'},
  {r:/(?:^|[^а-яёa-z])i (?:really )?like\s+([^.!?\n]{2,60})/i,f:m=>'Likes '+m[1].trim(),c:'prefs'}];
 const EXPL=/(?:^|[.!?\n]\s*)(?:запомни|запиши в память|добавь в память|remember(?: that)?)[\s,:-]+(?:что\s+)?([^\n]{3,200})/i;
 function local(t,src){
  if(!S.mem||!t)return;
  let n=0;const s=src?'Чат «'+src+'»':'';
  const e=String(t).match(EXPL);
  if(e){const r=add(e[1],{src:s});if(r&&(r.k==='add'||r.k==='upd'))n++}
  else if(S.auto){
   for(const p of rx){
    const m=String(t).match(p.r);if(!m)continue;
    let txt=p.f(m);if(p.c==='work')txt=txt.split(/\s+(?:и|а|но|and|but)\s+/i)[0];
    if(p.key){const old=S.memos.find(x=>p.key.test(x[0])&&M(x).a);if(old&&old[0]!==clean(txt)){const r=update(old[2],txt);if(r)n++;continue}}
    const r=add(txt,{a:1,c:p.c,src:s});if(r&&r.k==='add')n++}}
  if(n)toast(L('Факт добавлен в память'));
  return n}
 const adapter={
  ids(){changed();const a=S.memos.map(x=>({id:x[2],ts:x[3]}));if(S.prof)a.push({id:'_profile',ts:profTs||1});return a},
  get(id){if(id==='_profile')return S.prof?{id,t:S.prof,src:'',ts:profTs||1}:null;const x=S.memos.find(y=>y[2]===id);return x?toItem(x):null},
  put(id,d){
   if(id==='_profile'){S.prof=String(d.t||'').slice(0,1200);S.profD=S.prof;profTs=+d.ts||Date.now();save();return}
   const old=S.memos.find(y=>y[2]===id),e=fromItem(d,id);
   if(old){e[4].u=M(old).u||0;e[4].l=M(old).l||0}
   const i=S.memos.findIndex(y=>y[2]===id);if(i>=0)S.memos[i]=e;else S.memos.push(e);prev[id]=sig(e);save()},
  del(id){if(id==='_profile'){S.prof='';S.profD='';save();return}const i=S.memos.findIndex(y=>y[2]===id);if(i>=0)S.memos.splice(i,1);delete prev[id];save()},
  clear(){S.memos=[];prev={};S.prof='';S.profD='';profTs=0;save()}};
 function setProfile(t){S.prof=String(t||'').trim().slice(0,1200);S.profD=S.prof;profTs=Date.now();save();Hooks.run('sync:touch','memory','_profile')}
 Hooks.on('app:ready',load);
 Hooks.on('memory:changed',changed);
 Hooks.on('sync:register',Sy=>Sy.register('memory',adapter));
 return{adapter,CATS,LAB,M,cat,toItem,fromItem,add,update,remove,setMeta,dupOf,pick,prompt,local,setProfile,clean,SECRET,tset,used:[],save,
  profTs:()=>profTs,label:c=>L(LAB[cat(c)])}})();
/* Подсказка для ИИ: профиль и подобранные под вопрос факты. Вызывается из sysPrompt(). */
function memoryPrompt(){return Mem.prompt()}
