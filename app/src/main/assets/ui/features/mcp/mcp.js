/* ===== MCP-КЛИЕНТ (Mcp) =====
   Подключает внешние MCP-серверы (Model Context Protocol, транспорт Streamable HTTP: JSON-RPC через POST) и отдаёт их инструменты агенту.
   Агент видит их как mcp__<сервер>__<инструмент>. Запросы идут через нативный мост Web.http (Bridge.httpReq), поэтому CORS не мешает.
   Токен сервера (необязательный) хранится в Keystore под id «mcp-<id>» и уходит заголовком Authorization: Bearer; в localStorage его нет.
   Список серверов лежит в kairema.mcp.v1 и входит в резервную копию (токены в копию не попадают: после восстановления введите заново).
   Поддержано: initialize, notifications/initialized, tools/list (с постраничной выдачей), tools/call; ответы JSON и SSE; сессия Mcp-Session-Id
   с одной повторной инициализацией при 404. Не поддержано: stdio-серверы (нужен процесс), ресурсы, подсказки, сэмплинг, серверные уведомления.
   Права: вызов инструмента спрашивает владельца (по серверу, «до конца чата»), в режиме «Только чтение» разрешены только инструменты
   с аннотацией readOnlyHint. Подключение: Coder.register(Mcp.provider). Окно: Mcp.panel() (кнопка в настройках агента).
   Убрать модуль: удалить папку и строки в index.html (в coder.js вызов защищён typeof). Тест: docs/tests/agent043.test.py */
const Mcp=(()=>{
 const KS='kairema.mcp.v1',PV='2025-03-26';
 let list=[];try{const v=JSON.parse(localStorage.getItem(KS)||'[]');if(Array.isArray(v))list=v.filter(x=>x&&x.id&&x.url)}catch(e){}
 const save=()=>{try{localStorage.setItem(KS,JSON.stringify(list))}catch(e){}};
 const sess=new Map(),map=new Map();let rid=0;
 const slug=s=>String(s||'').replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'')||'x';
 /* Ответ сервера: обычный JSON или поток SSE (события data:), берём сообщение с нужным id. */
 const parseRpc=(body,ctype,id)=>{
  const b=String(body||'');let msgs=[];
  if(/event-stream/i.test(ctype||'')||/^\s*(event|data|id|retry):/.test(b)){
   b.split(/\r?\n\r?\n/).forEach(ev=>{const d=ev.split(/\r?\n/).filter(l=>/^data:/.test(l)).map(l=>l.replace(/^data: ?/,'')).join('\n');if(d.trim()){try{msgs.push(JSON.parse(d))}catch(e){}}})}
  else{try{const v=JSON.parse(b);msgs=Array.isArray(v)?v:[v]}catch(e){throw new Error('ответ сервера не разобран')}}
  const m=msgs.find(x=>x&&x.id===id)||msgs.find(x=>x&&(x.result!==undefined||x.error));
  if(!m)throw new Error('в ответе сервера нет результата');
  return m};
 const rpc=async(sv,method,params,notif)=>{
  const body={jsonrpc:'2.0',method};if(params!==undefined)body.params=params;if(!notif)body.id=++rid;
  const h={'Content-Type':'application/json','Accept':'application/json, text/event-stream'};
  const st=sess.get(sv.id);if(st&&st.sid)h['Mcp-Session-Id']=st.sid;if(st&&st.pv)h['MCP-Protocol-Version']=st.pv;
  const r=await Web.http({url:sv.url,method:'POST',headers:h,body:JSON.stringify(body),keyId:sv.tok?'mcp-'+sv.id:'',max:800000});
  if(r.session&&st)st.sid=r.session;
  if(notif)return null;
  if(r.status<200||r.status>=300){const b=String(r.body||'').replace(/\s+/g,' ').slice(0,160);throw new Error('HTTP '+r.status+(r.status===401||r.status===403?' (проверьте токен)':'')+(b?': '+b:''))}
  const m=parseRpc(r.body,r.ctype,body.id);
  if(m.error)throw new Error((m.error.message||'ошибка сервера')+(m.error.code!==undefined?' ('+m.error.code+')':''));
  return m.result};
 const connect=async sv=>{
  const st={sid:'',pv:'',tools:[],err:'',ok:0,name:''};sess.set(sv.id,st);
  try{
   const ini=await rpc(sv,'initialize',{protocolVersion:PV,capabilities:{},clientInfo:{name:'Kairema',version:typeof APP_VERSION!=='undefined'?APP_VERSION:'0'}});
   st.pv=(ini&&ini.protocolVersion)||PV;st.name=(ini&&ini.serverInfo&&ini.serverInfo.name)||'';
   try{await rpc(sv,'notifications/initialized',undefined,1)}catch(e){}
   let cur,all=[];
   for(let i=0;i<6;i++){const r=await rpc(sv,'tools/list',cur?{cursor:cur}:{});all=all.concat((r&&r.tools)||[]);cur=r&&r.nextCursor;if(!cur)break}
   st.tools=all.filter(t=>t&&t.name).slice(0,100);st.ok=1;
  }catch(e){st.err=e.message;st.ok=0}
  rebuild();return st};
 const rebuild=()=>{
  map.clear();
  list.filter(s=>s.on!==0).forEach(sv=>{const st=sess.get(sv.id);if(!st||!st.ok)return;
   st.tools.forEach(t=>{const sp=slug(sv.name);let nm='mcp__'+sp+'__'+slug(t.name);if(nm.length>64)nm=nm.slice(0,64);let k=2,b=nm;while(map.has(nm)){nm=b.slice(0,61)+'_'+(k++)}map.set(nm,{sv,t})})})};
 const withTimeout=(p,ms)=>Promise.race([p,new Promise((_,rej)=>setTimeout(()=>rej(new Error('сервер не ответил за '+ms/1000+' с')),ms))]);
 /* Подключает включённые серверы, к которым ещё не подключились. Возвращает список ошибок [{name,msg}]. */
 const ready=async()=>{
  const errs=[];
  await Promise.all(list.filter(s=>s.on!==0).map(async sv=>{
   let st=sess.get(sv.id);
   if(!st||!st.ok){try{st=await withTimeout(connect(sv),25000)}catch(e){st=sess.get(sv.id)||{};st.err=e.message;st.ok=0}}
   if(!st.ok)errs.push({name:sv.name,msg:st.err||'нет ответа'})}));
  rebuild();return errs};
 const fmt=r=>{
  if(!r)return'';
  const parts=(r.content||[]).map(c=>c.type==='text'?c.text:c.type==='image'?'[изображение '+(c.mimeType||'')+', '+Math.round(String(c.data||'').length*0.75/1024)+' КБ]':c.type==='resource'&&c.resource?(c.resource.text!==undefined?c.resource.text:'[ресурс '+c.resource.uri+']'):c.type==='resource_link'?'[ссылка '+(c.uri||'')+']':JSON.stringify(c));
  let t=parts.join('\n');if(!t&&r.structuredContent!==undefined)t=JSON.stringify(r.structuredContent);
  return t.length>12000?t.slice(0,4200)+'\n…[пропущено '+(t.length-12000)+' знаков]…\n'+t.slice(-7800):t};
 const call=async(n,a)=>{
  const e=map.get(n);if(!e)throw new Error('инструмент MCP не найден: '+n);
  const go=()=>rpc(e.sv,'tools/call',{name:e.t.name,arguments:a||{}});
  let r;
  try{r=await go()}catch(x){
   if(/HTTP 404/.test(x.message)){await connect(e.sv);r=await go()}else throw x}
  const t=fmt(r);
  if(r&&r.isError)throw new Error(t||'сервер вернул ошибку');
  return t||'(пустой ответ)'};
 const provider={
  has:n=>map.has(n),
  defs:()=>[...map.entries()].map(([name,{sv,t}])=>{const sc=t.inputSchema&&typeof t.inputSchema==='object'?Object.assign({},t.inputSchema):{};if(sc.type!=='object')sc.type='object';if(!sc.properties)sc.properties={};return{name,description:'['+sv.name+'] '+String(t.description||t.title||t.name).slice(0,800),parameters:sc}}),
  call,
  meta:n=>{const e=map.get(n);return e?{server:e.sv.name,ro:!!(e.t.annotations&&e.t.annotations.readOnlyHint)}:null},
  ready};
 const newId=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,5);
 const urlOk=u=>/^https?:\/\/[^\s\/@]+/i.test(String(u||'').trim());
 /* ---- Окно серверов ---- */
 function panel(){
  const s=sheet('<h2></h2><p class="sub" style="margin:6px 0 10px"></p><div class="mcl" data-l></div><button class="btn ghost" data-add style="width:100%;margin-top:8px"></button><button class="btn" data-ok style="width:100%;margin-top:8px"></button>');
  $('h2',s).textContent=L('MCP-серверы');
  $('.sub',s).textContent=L('Внешние инструменты для агента (GitHub, базы данных, браузер и другое). Нужен MCP-сервер с HTTP-адресом (Streamable HTTP). Серверы с запуском командой (stdio) не поддерживаются.');
  const box=$('[data-l]',s);
  const draw=()=>{box.innerHTML='';
   if(!list.length){const e=document.createElement('div');e.className='cdi2';e.textContent=L('Серверов пока нет');box.append(e)}
   list.forEach(sv=>{const st=sess.get(sv.id);
    const r=el('<div class="mcr"><div class="mct"><b></b><small></small></div><div class="mcb"><button class="cdg" data-t></button><button class="cdg" data-c></button><button class="cdg" data-d></button></div></div>');
    $('b',r).textContent=sv.name;$('small',r).textContent=sv.url+' · '+(sv.on===0?L('выключен'):st?(st.ok?'✓ '+st.tools.length+' '+L('инструм.'):'✗ '+st.err):L('не проверен'));
    const bt=$('[data-t]',r);bt.textContent=sv.on===0?L('Включить'):L('Выключить');bt.onclick=()=>{sv.on=sv.on===0?1:0;save();rebuild();draw()};
    const bc=$('[data-c]',r);bc.textContent=L('Проверить');bc.onclick=async()=>{bc.textContent='…';await connect(sv);draw();const x=sess.get(sv.id);if(x&&x.ok&&x.tools.length)toast(x.tools.slice(0,8).map(t=>t.name).join(', ')+(x.tools.length>8?'…':''))};
    const bd=$('[data-d]',r);bd.textContent=L('Удалить');bd.onclick=()=>ask(L('Удалить сервер?'),sv.name,L('Удалить'),()=>{list=list.filter(x=>x!==sv);sess.delete(sv.id);try{Native.deleteKey('mcp-'+sv.id)}catch(e){}save();rebuild();draw()});
    box.append(r)})};
  draw();
  $('[data-add]',s).textContent=L('Добавить сервер');$('[data-add]',s).onclick=()=>{
   const f=sheet('<h2></h2><label class="cdl"></label><input class="cdi" data-n autocomplete="off"><label class="cdl"></label><input class="cdi" data-u autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="https://…/mcp"><label class="cdl"></label><input class="cdi" data-k type="password" autocomplete="off"><div class="cdi2" data-w></div><div class="two" style="margin-top:12px"><button class="btn ghost" data-x></button><button class="btn" data-s></button></div>');
   $('h2',f).textContent=L('Новый MCP-сервер');const ls=$$('.cdl',f);ls[0].textContent=L('Название (латиницей, например github)');ls[1].textContent=L('Адрес сервера');ls[2].textContent=L('Токен (необязательно, хранится в защищённом хранилище)');
   $('[data-x]',f).textContent=L('Отмена');$('[data-s]',f).textContent=L('Добавить');$('[data-x]',f).onclick=()=>f.close();
   const wr=$('[data-w]',f);$('[data-u]',f).oninput=e=>{wr.textContent=/^http:\/\//i.test(e.target.value.trim())&&!/^http:\/\/(localhost|127\.|192\.168\.|10\.)/i.test(e.target.value.trim())?L('Адрес без шифрования (http): токен и данные пойдут открытым текстом.'):''};
   $('[data-s]',f).onclick=()=>{const nm=$('[data-n]',f).value.trim(),u=$('[data-u]',f).value.trim(),k=$('[data-k]',f).value.trim();
    if(!nm||!/^[A-Za-z0-9_ -]{1,24}$/.test(nm)){toast(L('Название: латиница, цифры, до 24 знаков'));return}
    if(!urlOk(u)){toast(L('Нужен адрес вида https://…'));return}
    if(list.some(x=>slug(x.name)===slug(nm))){toast(L('Сервер с таким названием уже есть'));return}
    const sv={id:newId(),name:nm,url:u,on:1,tok:k?1:0};if(k){try{Native.saveKey('mcp-'+sv.id,k)}catch(e){}}
    list.push(sv);save();f.close();draw();const bc=$$('[data-c]',box).pop();if(bc)bc.click()}};
  $('[data-ok]',s).textContent=L('Готово');$('[data-ok]',s).onclick=()=>s.close()}
 i18nAdd({"MCP-серверы":"MCP servers","Внешние инструменты для агента (GitHub, базы данных, браузер и другое). Нужен MCP-сервер с HTTP-адресом (Streamable HTTP). Серверы с запуском командой (stdio) не поддерживаются.":"External tools for the agent (GitHub, databases, a browser and more). Needs an MCP server with an HTTP address (Streamable HTTP). Servers started by a command (stdio) are not supported.","Серверов пока нет":"No servers yet","выключен":"off","инструм.":"tools","не проверен":"not checked","Включить":"Enable","Выключить":"Disable","Проверить":"Check","Удалить":"Delete","Удалить сервер?":"Delete the server?","Добавить сервер":"Add a server","Новый MCP-сервер":"New MCP server","Название (латиницей, например github)":"Name (Latin letters, e.g. github)","Адрес сервера":"Server address","Токен (необязательно, хранится в защищённом хранилище)":"Token (optional, kept in secure storage)","Отмена":"Cancel","Добавить":"Add","Адрес без шифрования (http): токен и данные пойдут открытым текстом.":"Unencrypted address (http): the token and data go in clear text.","Название: латиница, цифры, до 24 знаков":"Name: Latin letters and digits, up to 24 characters","Нужен адрес вида https://…":"An address like https://… is needed","Сервер с таким названием уже есть":"A server with this name already exists","Готово":"Done"});
 if(typeof Coder!=='undefined')Coder.register(provider);
 return{panel,provider,count:()=>list.filter(s=>s.on!==0).length,list:()=>list.slice(),ready,connect,parseRpc,_reset(){sess.clear();map.clear();list=[];save()}}})();
