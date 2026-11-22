/* ===== ПАМЯТЬ: извлечение фактов самой моделью =====
   После ответа (событие chat:answer) в фоне уходит один короткий запрос тому же провайдеру: «что из сообщения пользователя стоит
   запомнить». Модель возвращает JSON-операции add/update/delete над списком фактов. Запрос идёт только если включено «Умное
   извлечение» и сообщение похоже на рассказ о себе (есть «я/мне/мой/запомни…»), чтобы не тратить токены зря.
   Безопасность: секреты (ключи, пароли, номера карт) отбрасываются; удаление работает только если пользователь сам попросил «забудь…»;
   за один раз не больше 3 операций; всё найденное помечено «авто», видно в чате маркой «🧠» с кнопкой «Отменить».
   Также: Mem.ai.scan() — разовый разбор старых чатов. Токены этих запросов в «Расходы» не входят. */
i18nAdd({"Запомнено":"Remembered","Обновлено":"Updated","Забыто":"Forgotten","Отменить":"Undo","Что изменилось в памяти":"What changed in memory","Отменено":"Undone","Нечего разбирать: нет подходящих сообщений":"Nothing to scan: no suitable messages","Нужен подключённый провайдер ИИ":"A connected AI provider is required","Ничего нового не найдено":"Nothing new found","Новых фактов":"New facts","Закрыть":"Close","Подождите, идёт другой разбор":"Wait, another scan is running"});
Mem.ai=(()=>{
 const FP=/(?:^|[^а-яa-z])(я|мне|меня|мой|моя|моё|мое|мои|моих|у меня|мы|нам|наш|наша|our|my|i|i'm|im|i've|me|запомни|remember|forget|забудь)(?![а-яa-z])/i;
 const FORGET=/(забудь|удали из памяти|не помни|стереть из памяти|forget)/i;
 let busy=0,lastKey='';
 const SYS="You maintain a long-term memory about the USER for a chat assistant. You get the user's latest message (and sometimes a short assistant reply for context) and the facts already stored (with ids). Decide what durable facts about the user themself should be stored: identity (name, age, city), work or study, preferences and communication style, interests, family/friends/pets, goals and projects, devices and tech, habits, constraints. Rules: store only stable facts the user stated about themself; not questions, not one-off tasks, not facts about the world, not guesses. Never store passwords, API keys, tokens, payment data, or medical diagnoses. Write each fact as one short neutral sentence in the user's language (e.g. 'Зовут Алексей', 'Живёт в Киеве', 'Любит короткие ответы с примерами'). Do not repeat a stored fact. If new information corrects or extends a stored fact, use op update with its id. Use op delete only if the user explicitly asks to forget something. Output ONLY JSON, no prose: {\"ops\":[{\"op\":\"add\",\"t\":\"...\",\"c\":\"identity|work|prefs|interests|people|goals|tech|other\"},{\"op\":\"update\",\"id\":\"...\",\"t\":\"...\"},{\"op\":\"delete\",\"id\":\"...\"}]}. At most 3 ops. If nothing is worth storing output {\"ops\":[]}.";
 const parse=s=>{const a=String(s||'').indexOf('{'),b=String(s||'').lastIndexOf('}');if(a<0||b<=a)return[];try{const j=JSON.parse(s.slice(a,b+1));return Array.isArray(j.ops)?j.ops:[]}catch(e){return[]}};
 const callAi=async(pv,content)=>{
  let buf='';
  const pr=Native.run('chat',[JSON.stringify({id:pv.id,url:pv.url,model:pv.model,system:SYS,think:0}),JSON.stringify([{role:'user',content}])],t=>{const c=t.charCodeAt(0);if(c===1||c===2)return;buf+=t});
  const to=setTimeout(()=>Native.cancel(pr.id),45000);
  try{await pr}finally{clearTimeout(to)}
  return buf};
 const existing=q=>{
  const f=Mem.pick(q).slice(0,40);
  return f.length?f.map(x=>'['+x[2]+'] '+x[0]).join('\n'):'(none)'};
 /* Применяет операции. opts.noDel: не удалять. Возвращает список изменений для отчёта. */
 function apply(ops,o){
  o=o||{};const ch=[];
  ops.slice(0,o.max||3).forEach(op=>{
   if(!op||typeof op!=='object')return;
   if(op.op==='add'&&typeof op.t==='string'){
    const r=Mem.add(op.t,{a:1,c:op.c,src:o.src||''});
    if(r&&r.k==='add')ch.push({k:'add',id:r.x[2],t:r.x[0]});
    else if(r&&r.k==='upd')ch.push({k:'upd',id:r.x[2],t:r.x[0],old:r.old})}
   else if(op.op==='update'&&typeof op.t==='string'&&op.id){
    const r=Mem.update(String(op.id),op.t);
    if(r)ch.push({k:'upd',id:r.x[2],t:r.x[0],old:r.old})}
   else if(op.op==='delete'&&op.id&&!o.noDel){
    const x=Mem.remove(String(op.id));
    if(x)ch.push({k:'del',id:x[2],t:x[0],x})}});
  return ch}
 function undo(ch){
  ch.slice().reverse().forEach(c=>{
   if(c.k==='add')Mem.remove(c.id);
   else if(c.k==='upd')Mem.update(c.id,c.old);
   else if(c.k==='del'&&c.x){S.memos.push(c.x);Hooks.run('memory:changed')}})}
 /* Метка под ответом */
 function chip(d,ch){
  const row=d&&$('.msg-act',d);if(!row||!ch.length)return;
  $('.mem-new',row)?.remove();
  const b=el('<button class="mem-new"></button>');
  b.textContent='🧠 '+ch.length;b.title=L('Что изменилось в памяти');
  b.onclick=()=>{
   const s=sheet('<h2 style="margin-bottom:12px"></h2><div class="mn-l"></div><div class="two" style="margin-top:16px"><button class="btn ghost" data-c></button><button class="btn danger" data-u></button></div>');
   $('h2',s).textContent=L('Что изменилось в памяти');
   const l=$('.mn-l',s);
   ch.forEach(c=>{const r=el('<div class="mn-r"><b></b><span></span></div>');$('b',r).textContent=L(c.k==='add'?'Запомнено':c.k==='upd'?'Обновлено':'Забыто');$('span',r).textContent=c.t;l.append(r)});
   $('[data-c]',s).textContent=L('Закрыть');$('[data-u]',s).textContent=L('Отменить');
   $('[data-c]',s).onclick=s.close;
   $('[data-u]',s).onclick=()=>{undo(ch);b.remove();s.close();toast(L('Отменено'))}};
  row.append(b)}
 /* После ответа */
 async function after(m){
  try{
   if(busy||!S.mem||S.smart===false||!Native.on)return;
   const pv=actProv();if(!pv)return;
   const i=S.apiMsgs.indexOf(m);if(i<0)return;
   let u=null;for(let k=i-1;k>=0;k--)if(S.apiMsgs[k].r==='u'){u=S.apiMsgs[k];break}
   if(!u)return;
   const txt=String(u.q||u.t||'').trim();
   if(txt.length<12||u.deep||!FP.test(txt))return;
   const key=txt+'|'+i;if(key===lastKey)return;lastKey=key;
   busy=1;
   const d=$$('.msg.a').pop();
   const content='Stored facts:\n'+existing(txt)+'\n\nUser message:\n'+txt.slice(0,1500)+'\n\nAssistant reply (for context):\n'+String(m.t||'').slice(0,400);
   const raw=await callAi(pv,content);
   const ops=parse(raw).filter(op=>op&&(op.op!=='delete'||FORGET.test(txt)));
   const ch=apply(ops,{src:(Chx.cur&&Chx.cur.title)?'Чат «'+Chx.cur.title+'»':''});
   if(ch.length){chip(d&&d.isConnected?d:$$('.msg.a').pop(),ch);Hooks.run('memory:auto',ch)}
  }catch(e){}finally{busy=0}}
 Hooks.on('chat:answer',m=>{setTimeout(()=>after(m),1200)});
 /* Разовый разбор старых чатов: до 3 запросов по ~25 сообщений. cb(текст) показывает ход. */
 async function scan(cb){
  const pv=actProv();if(!pv||!Native.on)return{err:L('Нужен подключённый провайдер ИИ')};
  if(busy)return{err:L('Подождите, идёт другой разбор')};
  const msgs=[];
  [...(Chx.list||[])].sort((a,b)=>b.ts-a.ts).forEach(c=>c.msgs.forEach(m=>{if(m.r==='u'&&m.t){const t=String(m.q||m.t).trim();if(t.length>=12&&FP.test(t))msgs.push(t.slice(0,300))}}));
  const take=msgs.slice(0,75);
  if(!take.length)return{err:L('Нечего разбирать: нет подходящих сообщений')};
  busy=1;let added=0;
  try{
   for(let b=0;b<take.length;b+=25){
    if(cb)cb((Math.floor(b/25)+1)+'/'+Math.ceil(take.length/25));
    const part=take.slice(b,b+25);
    const content='Stored facts:\n'+existing(part.join(' '))+'\n\nUser messages from past chats (extract up to 6 durable facts in total; never delete):\n'+part.map((t,i)=>(i+1)+'. '+t).join('\n');
    const raw=await callAi(pv,content);
    const ch=apply(parse(raw),{noDel:1,max:6,src:'История чатов'});
    added+=ch.filter(c=>c.k==='add').length}
  }catch(e){return{err:e.message}}finally{busy=0}
  return{added}}
 return{after,scan,apply,undo,parse,FP,busy:()=>busy}})();
