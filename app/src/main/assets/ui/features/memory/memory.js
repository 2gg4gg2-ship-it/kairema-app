/* ===== ПАМЯТЬ: хранение фактов на устройстве, подключение к синхронизации и к запросам ИИ =====
   Экран «Память» живёт в core/app.js и сообщает об изменениях событием Hooks.run('memory:changed').
   Убрать модуль: удалить папку features/memory и его строку в index.html (факты тогда не сохраняются). */
const Mem=(()=>{
 const KEY='kairema.memory.v1';
 let prev={};
 const nid=()=>'m'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
 const sig=x=>({t:String(x[0]),src:String(x[1]||'')});
 const toItem=x=>({id:x[2],t:String(x[0]),src:String(x[1]||''),ts:x[3]||0});
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify({v:1,mem:!!S.mem,auto:!!S.auto,items:S.memos.map(toItem)}))}catch(e){}};
 const snap=()=>{prev={};S.memos.forEach(x=>{prev[x[2]]=sig(x)})};
 /* Выдаёт id и время изменения, возвращает что изменилось и что удалено. */
 function norm(){
  const now=Date.now(),touched=[],seen={};
  S.memos.forEach(x=>{
   if(!x[2]){x[2]=nid();x[3]=now;touched.push(x[2])}
   else{const p=prev[x[2]],c=sig(x);if(p&&(p.t!==c.t||p.src!==c.src)){x[3]=now;touched.push(x[2])}}
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
    S.memos=d.items.filter(i=>i&&i.id&&typeof i.t==='string').map(i=>[i.t,i.src||'',i.id,+i.ts||0]);
    if(typeof d.mem==='boolean')S.mem=d.mem;
    if(typeof d.auto==='boolean')S.auto=d.auto}}catch(e){}
  snap()}
 const adapter={
  ids(){changed();return S.memos.map(x=>({id:x[2],ts:x[3]}))},
  get(id){const x=S.memos.find(y=>y[2]===id);return x?toItem(x):null},
  put(id,d){const e=[String(d.t||''),String(d.src||''),id,+d.ts||0],i=S.memos.findIndex(y=>y[2]===id);if(i>=0)S.memos[i]=e;else S.memos.push(e);prev[id]=sig(e);save()},
  del(id){const i=S.memos.findIndex(y=>y[2]===id);if(i>=0)S.memos.splice(i,1);delete prev[id];save()},
  clear(){S.memos=[];prev={};save()}};
 Hooks.on('app:ready',load);
 Hooks.on('memory:changed',changed);
 Hooks.on('sync:register',Sy=>Sy.register('memory',adapter));
 return{adapter}})();
/* Факты для запроса к ИИ: добавляются к системной инструкции, если память включена. */
function memoryPrompt(){
 if(!S.mem||!S.memos.length)return'';
 return"\n\nFacts the user asked you to remember (use them when relevant; do not mention them unless it helps):\n"+S.memos.slice(-40).map(x=>'- '+String(x[0]).slice(0,300)).join('\n')}
