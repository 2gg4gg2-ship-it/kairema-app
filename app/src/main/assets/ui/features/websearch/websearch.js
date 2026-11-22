/* ===== ПОИСК В ИНТЕРНЕТЕ: модель сама решает, нужен ли поиск, и составляет запросы =====
   Раньше в поисковик уходил сырой текст вопроса: «а в Москве?» искалось дословно и находило мусор.
   Теперь перед поиском короткий запрос к выбранной модели (без размышлений, до 15 секунд): ей дают последние сообщения, она отвечает JSON
   {"search":true|false,"queries":["…"]}. Запросы самодостаточные (местоимения и уточнения раскрыты из беседы), 1–3 штуки на языке,
   на котором лучше искать. Если модель не ответила или вернула не JSON, ищем по тексту вопроса, как раньше. Работает с любой моделью:
   инструменты (tool calling) не нужны. Вызывается из core/messages.js (respond), там же запасной путь на случай удаления модуля.
   Тест: docs/tests/websearch.test.js. Убрать модуль: удалить папку и строку в index.html. */
const WebSearch=(()=>{
 i18nAdd({"Думаю, что искать…":"Deciding what to search…","Ищу в интернете…":"Searching the web…"});
 const SYS="You turn a conversation into web search queries. Reply with ONE JSON object and nothing else: {\"search\":true,\"queries\":[\"...\"]}. "
  +"Set search to false when the web is not needed: greetings, chat, writing or fixing code, maths, translation, opinions, questions about the attached files, or questions about the assistant or this app. "
  +"Otherwise write 1 to 3 short queries (3 to 8 words each) that make sense on their own: resolve follow-ups and pronouns from the conversation (\"and in Moscow?\" after a weather question becomes \"weather Moscow today\"), keep exact names, versions and numbers, "
  +"add the current year for \"latest\" or \"now\", use English for technical or global topics and the user's language for local ones. Do not include private details, and never put the name of this app in a query.";
 const clip=(s,n)=>String(s||'').replace(/\s+/g,' ').trim().slice(0,n);
 const hist=(msgs,last)=>{
  const a=(msgs||[]).filter(x=>x&&x.t&&!x.err),i=a.lastIndexOf(last);
  const h=a.slice(Math.max(0,i-3),i<0?a.length:i+1).map(x=>({role:x.r==='u'?'user':'assistant',content:clip(x.r==='u'?(x.q||x.t):x.t,x.r==='u'?600:400)}));
  while(h.length&&h[0].role!=='user')h.shift();
  return h};
 async function plan(pv,msgs,last){
  try{
   const h=hist(msgs,last);if(!h.length)return null;
   let out='';
   const pr=Native.run('chat',[JSON.stringify({id:pv.id,url:pv.url,model:pv.model,system:SYS+' Today is '+new Date().toISOString().slice(0,10)+'.',think:0}),JSON.stringify(h)],t=>{const c=t.charCodeAt(0);if(c===1||c===2)return;out+=t});
   const to=setTimeout(()=>{try{Native.cancel(pr.id)}catch(e){}},15000);
   try{await pr}finally{clearTimeout(to)}
   const m=out.match(/\{[\s\S]*\}/);if(!m)return null;
   const j=JSON.parse(m[0]);
   const qs=(Array.isArray(j.queries)?j.queries:[]).map(x=>clip(x,200)).filter(Boolean).slice(0,3);
   return{search:j.search!==false&&qs.length>0,queries:qs}}
  catch(e){return null}}
 /* {src, serr, qs, skip}: skip=true, если модель решила, что поиск не нужен */
 async function find(pv,sp,msgs,last,bd){
  const raw=clip(last.q||last.t,300);
  bd.textContent=L('Думаю, что искать…');
  const p=last.deep?null:await plan(pv,msgs,last);
  if(p&&!p.search)return{src:[],serr:'',qs:[],skip:true};
  const qs=p&&p.queries.length?p.queries:[raw];
  bd.textContent=L('Ищу в интернете…')+(p?' '+qs.join(' · '):'');
  const seen=new Set(),src=[];let serr='';
  for(const q of qs){
   try{
    let r='';await Native.run('search',[JSON.stringify({id:sp.id,url:sp.url}),q.slice(0,300)],t=>{r+=t});
    for(const s of JSON.parse(r||'[]')){const k=String(s.url||'').replace(/[#?].*$/,'');if(!seen.has(k)){seen.add(k);src.push(s)}}}
   catch(e){serr=e.message}}
  if(src.length)serr='';
  return{src:src.slice(0,8),serr,qs:p?qs:[]}}
 return{plan,find}})();
