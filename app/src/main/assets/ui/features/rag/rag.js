/* ===== ПОИСК ПО БОЛЬШИМ ФАЙЛАМ (локальный RAG) =====
   Большой текстовый файл (или текст PDF) больше RAGMIN знаков не вставляется в запрос целиком. Приложение режет его на куски
   (по абзацам, около 1200 знаков), сохраняет на телефоне (IndexedDB kairema-rag), а в сообщении оставляет короткую заметку.
   К каждому вопросу в чате подбираются самые подходящие куски (алгоритм BM25 по словам с грубым отсечением окончаний) и добавляются
   в системный запрос блоком «Фрагменты файла». Так файл в 500 тысяч знаков не сжигает токены в каждом запросе.
   Ничего не уходит с устройства, кроме выбранных кусков, которые идут модели как обычный текст запроса.
   Ограничения: поиск по словам, не по смыслу (если в вопросе нет слов из нужного места, кусок может не найтись); таблицы и
   картинки в PDF не индексируются. API: Rag.big(t), Rag.part(name,text), Rag.wrap(parts), Rag.chunk(t), Rag.rank(chunks,q),
   Rag.sysx(msgs), Rag.on(), Rag.stats(), Rag.clear(). Включается в Настройках («Поиск по большим файлам»).
   Убрать модуль: удалить папку и строку в index.html (в core/messages.js вызовы защищены typeof). Тест: docs/tests/rag037.test.py */
const Rag=(()=>{
 const RAGMIN=30000,MAXDOC=4000000,CH=1200,TOPK=6,BUDGET=9000,DB='kairema-rag',KO='kragoff';
 const api={RAGMIN,CH,TOPK};
 const mem=new Map();            /* id → {id,name,n,chunks:[…],at} */
 let loading=new Set(),idb=null;
 const on=()=>{try{return localStorage.getItem(KO)!=='1'}catch(e){return true}};
 api.on=on;
 api.big=t=>on()&&typeof t==='string'&&t.length>RAGMIN;
 /* --- IndexedDB (если недоступна, документы живут только до перезапуска) --- */
 const open=()=>new Promise(res=>{
  if(idb)return res(idb);
  try{const r=indexedDB.open(DB,1);r.onupgradeneeded=()=>r.result.createObjectStore('docs',{keyPath:'id'});r.onsuccess=()=>{idb=r.result;res(idb)};r.onerror=()=>res(null)}catch(e){res(null)}});
 const tx=async(mode,fn)=>{const d=await open();if(!d)return null;return new Promise(res=>{try{const t=d.transaction('docs',mode),s=t.objectStore('docs'),r=fn(s);t.oncomplete=()=>res(r&&r.result!==undefined?r.result:true);t.onerror=()=>res(null);t.onabort=()=>res(null)}catch(e){res(null)}})};
 const put=d=>tx('readwrite',s=>s.put(d));
 const getDoc=async id=>{const d=await open();if(!d)return null;return new Promise(res=>{try{const r=d.transaction('docs').objectStore('docs').get(id);r.onsuccess=()=>res(r.result||null);r.onerror=()=>res(null)}catch(e){res(null)}})};
 const all=async()=>{const d=await open();if(!d)return[];return new Promise(res=>{try{const r=d.transaction('docs').objectStore('docs').getAll();r.onsuccess=()=>res(r.result||[]);r.onerror=()=>res([])}catch(e){res([])}})};
 /* --- нарезка: по абзацам, куски около CH знаков, без пересечений --- */
 api.chunk=t=>{
  const out=[];let cur='';
  const push=()=>{if(cur.trim())out.push(cur);cur=''};
  const paras=String(t).split(/(?<=\n)\s*\n/);
  for(let p of paras){
   while(p.length>CH*1.6){      /* очень длинный абзац: режем по предложениям или жёстко */
    let k=p.lastIndexOf('. ',CH);if(k<CH*.5)k=p.lastIndexOf(' ',CH);if(k<CH*.4)k=CH;
    const head=p.slice(0,k+1);p=p.slice(k+1);
    if(cur&&(cur.length+head.length>CH*1.3))push();cur+=head;if(cur.length>=CH)push()}
   if(cur&&cur.length+p.length>CH*1.3)push();
   cur+=p;if(cur.length>=CH)push()}
  push();return out};
 /* --- слова: нижний регистр, буквы и цифры, грубое отсечение окончаний (у длинных слов берём первые 6 букв) --- */
 const STOP=new Set('и в во не что он на я с со как а то все она так его но да ты к у же вы за бы по только ее мне было вот от меня еще нет о из ему теперь когда даже ну вдруг ли если уже или ни быть был него до вас нибудь опять уж вам ведь там потом себя ничего ей может они тут где есть надо ней для мы тебя их чем была сам чтоб без будто чего раз тоже себе под будет ж тогда кто этот того потому этого какой совсем ним здесь этом один почти мой тем чтобы нее сейчас были куда зачем всех никогда можно при наконец два об другой хоть после над больше тот через эти нас про всего них какая много разве три эту моя впрочем хорошо свою этой перед иногда лучше чуть том нельзя такой им более всегда конечно всю между the a an of to in is it and or for on with as at by be this that are was from'.split(' '));
 const stem=w=>w.length>6?w.slice(0,6):w;
 const words=t=>{const o=[];String(t).toLowerCase().replace(/ё/g,'е').replace(/[\p{L}\p{N}_]+/gu,m=>{if(m.length>1&&!STOP.has(m))o.push(stem(m))});return o};
 /* --- BM25: возвращает номера кусков по убыванию подходящести (только те, где нашлось хоть одно слово вопроса) --- */
 api.rank=(chunks,q,k)=>{
  const qs=[...new Set(words(q))];if(!qs.length||!chunks.length)return[];
  const N=chunks.length,tf=[],df=new Map();let tot=0;
  chunks.forEach(c=>{const m=new Map(),w=words(c);w.forEach(x=>m.set(x,(m.get(x)||0)+1));tf.push({m,l:w.length});tot+=w.length;m.forEach((_,x)=>df.set(x,(df.get(x)||0)+1))});
  const avg=tot/N||1,k1=1.5,b=.75;
  const sc=tf.map((d,i)=>{let s=0;qs.forEach(x=>{const f=d.m.get(x);if(!f)return;const n=df.get(x),idf=Math.log(1+(N-n+.5)/(n+.5));s+=idf*f*(k1+1)/(f+k1*(1-b+b*d.l/avg))});return[i,s]});
  return sc.filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,k||TOPK).map(x=>x[0])};
 /* --- добавить документ: вернуть часть сообщения (короткая заметка вместо всего текста) --- */
 const rid=()=>'d'+Date.now().toString(36)+Math.random().toString(36).slice(2,7);
 api.part=async(name,text)=>{
  let t=String(text);let cut=0;if(t.length>MAXDOC){t=t.slice(0,MAXDOC);cut=1}
  const chunks=api.chunk(t),d={id:rid(),name:String(name||'file'),n:t.length,chunks,at:Date.now(),chat:(typeof Chx!=='undefined'&&Chx.cur?Chx.cur.id:'')};
  mem.set(d.id,d);await put(d);
  try{toast(L('Файл разбит на части')+': '+chunks.length+'. '+L('В запрос идут только нужные'))}catch(e){}
  const head=t.slice(0,500).replace(/\s+$/,'');
  return{k:'text',name:d.name,rag:d.id,text:'[Большой файл: '+d.n+' знаков'+(cut?' (взяты первые '+MAXDOC+')':'')+', разбит на '+chunks.length+' частей. Целиком он не передаётся: к каждому вопросу приложение добавляет самые подходящие части отдельным блоком «Фрагменты файла». Если нужного места среди них нет, скажи, какие слова или раздел искать, и попроси пользователя уточнить.]\nНачало файла:\n'+head+(t.length>500?'\n[…]':'')}};
 /* Заменить в списке частей большие текстовые на заметки */
 api.wrap=async parts=>{const o=[];for(const p of parts){o.push(p&&p.k==='text'&&!p.rag&&api.big(p.text)?await api.part(p.name,p.text):p)}return o};
 /* --- подбор кусков к вопросу: вызывается из sysExtra(msgs) --- */
 const ids=ms=>{const s=[];(ms||[]).forEach(m=>(m&&m.parts||[]).forEach(p=>{if(p&&p.rag&&!s.includes(p.rag))s.push(p.rag)}));return s};
 const load=id=>{
  if(mem.has(id)||loading.has(id))return;loading.add(id);
  getDoc(id).then(d=>{if(d)mem.set(id,d)}).finally(()=>loading.delete(id))};
 api.preload=ms=>ids(ms).forEach(load);
 const question=ms=>{
  const u=(ms||[]).filter(m=>m&&m.r==='u');if(!u.length)return'';
  const q=x=>String(x.q||x.t||'').replace(/\s+/g,' ').slice(0,1500);
  let t=q(u[u.length-1]);
  if(words(t).length<4&&u.length>1)t=q(u[u.length-2])+' '+t;   /* короткий вопрос вроде «а дальше?» — берём и предыдущий */
  return t};
 api.pick=(d,q)=>{
  const top=api.rank(d.chunks,q,TOPK);let use=top.slice();
  if(!use.includes(0)&&d.chunks.length&&use.length<TOPK)use.unshift(0);    /* начало файла для ориентира */
  if(!top.length)use=d.chunks.slice(0,3).map((_,i)=>i);                      /* вопрос без слов из файла: начало */
  use.sort((a,b)=>a-b);
  let size=0;const res=[];for(const i of use){if(size+d.chunks[i].length>BUDGET&&res.length)break;size+=d.chunks[i].length;res.push(i)}
  return res};
 api.sysx=ms=>{
  if(!on())return'';
  const list=ids(ms);if(!list.length)return'';
  const q=question(ms);let s='';
  list.forEach(id=>{
   const d=mem.get(id);
   if(!d){load(id);s+='\n\n[Файл недоступен: ещё загружается или не найден на этом устройстве. Если ответ зависит от файла, попроси пользователя прислать его снова.]';return}
   const use=api.pick(d,q);
   s+='\n\n--- Фрагменты файла «'+d.name+'» (подобраны по вопросу, это НЕ весь файл: '+use.length+' из '+d.chunks.length+' частей; номер части в скобках) ---\n'+use.map(i=>'['+(i+1)+'/'+d.chunks.length+'] '+d.chunks[i]).join('\n\n')+'\n--- конец фрагментов ---'});
  return s?'\n\nThe user attached large file(s). Only the fragments below were selected for the latest question; use them, cite the part number, and say plainly when the answer is not in the fragments.'+s:''};
 (window.SYSX=window.SYSX||[]).push(ms=>api.sysx(ms));
 /* --- хранилище: сколько занято, очистить --- */
 api.stats=async()=>{const a=await all();return{n:a.length,chars:a.reduce((x,d)=>x+(d.n||0),0)}};
 api.clear=async()=>{mem.clear();const d=await open();if(d)await tx('readwrite',s=>s.clear())};
 const MB=c=>(c*1.1/1048576).toFixed(1);
 if(typeof i18nAdd==='function')i18nAdd({"Файл разбит на части":"File split into parts","В запрос идут только нужные":"Only relevant parts are sent","Поиск по большим файлам":"Search in large files","Большие файлы режутся на части, в запрос идут только подходящие. Экономит токены":"Large files are split into parts and only relevant ones are sent. Saves tokens","Сохранённые большие файлы":"Stored large files","Очистить":"Clear","Файлов":"Files","Удалить сохранённые большие файлы?":"Delete stored large files?","Чаты останутся, но модель больше не увидит эти файлы.":"Chats stay, but the model will no longer see these files.","Удалить":"Delete","Готово":"Done"});
 if(typeof Hooks!=='undefined'){
  Hooks.on('chat:rendered',()=>api.preload(typeof S!=='undefined'?S.apiMsgs:[]));
  Hooks.on('settings:rendered',v=>{
   const ab=$('[data-go="about"]',v);if(!ab||$('[data-rag]',v))return;
   const r=el('<button class="sr" data-rag><span class="si c">'+ic('tpl')+'</span><span class="m"><b></b><small></small></span><span class="sw"></span></button>');
   $('b',r).textContent=L('Поиск по большим файлам');
   $('small',r).textContent=L('Большие файлы режутся на части, в запрос идут только подходящие. Экономит токены');
   const sw=$('.sw',r),d=()=>sw.classList.toggle('on',on());d();
   r.onclick=()=>{try{localStorage.setItem(KO,on()?'1':'0')}catch(e){}d()};
   ab.insertAdjacentElement('beforebegin',r);
   api.stats().then(s=>{
    if(!s.n||$('[data-ragc]',v))return;
    const c=el('<button class="sr" data-ragc><span class="si c">'+ic('trash')+'</span><span class="m"><b></b><small></small></span></button>');
    $('b',c).textContent=L('Сохранённые большие файлы');$('small',c).textContent=L('Файлов')+': '+s.n+' · ≈ '+MB(s.chars)+' MB · '+L('Очистить');
    c.onclick=()=>ask(L('Удалить сохранённые большие файлы?'),L('Чаты останутся, но модель больше не увидит эти файлы.'),L('Удалить'),async()=>{await api.clear();c.remove();toast(L('Готово'))});
    r.insertAdjacentElement('afterend',c)})})}
 return api})();
