/* ===== ШКАЛА КОНТЕКСТА =====
   Тонкая полоска над полем ввода: сколько «окна» модели занято историей чата. Когда занято больше половины, рядом появляется
   подпись «Контекст 62%». Нажатие открывает окно: можно сжать историю (/compact) или начать новый чат.
   Размер окна: 1) провайдер сообщает его в списке моделей (OpenRouter: context_length, Bridge кладёт в поле cl), запоминается в
   localStorage kairema.ctxwin.v1; 2) если не сообщил, оценка по имени модели; 3) иначе 32 000 токенов (в окне это помечено «≈»).
   Занято: оценка по длине текста (знаков / 3), с учётом пересказа после /compact. Это приблизительно, точный счёт знает только провайдер.
   Убрать модуль: удалить папку и строку в index.html (в providers.js поле cl необязательное). */
const CtxBar=(()=>{
 const K='kairema.ctxwin.v1';
 let win={};try{win=JSON.parse(localStorage.getItem(K)||'{}')||{}}catch(e){win={}}
 const save=()=>{try{localStorage.setItem(K,JSON.stringify(win))}catch(e){}};
 const api={};
 /* По имени модели (токены). Порядок важен: первое совпадение. */
 const GUESS=[[/gemini-(1\.5|2|3)|gpt-4\.1|llama-4/i,1000000],[/claude/i,200000],[/gpt-5|o[1-9]\b|o[1-9]-/i,200000],[/gpt-4o|gpt-4-turbo|llama-3\.[1-3]|deepseek|mistral-(large|small|medium)|grok|kimi|glm-4|qwen3|qwen-?2\.5-(72|max|plus)|command-r/i,128000],[/gpt-4(?!\.|o)/i,8192],[/gpt-3\.5/i,16000]];
 api.learn=(pid,list)=>{
  if(!pid||!Array.isArray(list))return;let ch=0;
  list.forEach(m=>{if(m&&typeof m.cl==='number'&&m.cl>0&&win[pid+'|'+m.id]!==m.cl){win[pid+'|'+m.id]=m.cl;ch=1}});
  if(ch)save()};
 api.window=()=>{
  const p=typeof actProv==='function'?actProv():null;if(!p)return{n:32000,g:1};
  const k=p.id+'|'+p.model;if(win[k])return{n:win[k],g:0};
  for(const [re,n] of GUESS)if(re.test(p.model||''))return{n:n,g:0};
  return{n:32000,g:1}};
 api.used=()=>{
  if(typeof S==='undefined'||!S.apiMsgs)return 0;
  const v=typeof Ctx!=='undefined'&&Ctx.view?Ctx.view(S.apiMsgs):S.apiMsgs;
  return Math.round(v.reduce((n,m)=>n+(m&&m.t?m.t.length:0),0)/3)};
 if(typeof Caps!=='undefined'&&Caps.learn){const o=Caps.learn;Caps.learn=function(pid,list){try{api.learn(pid,list)}catch(e){}return o.apply(this,arguments)}}
 const fmt=n=>n>=1e6?(n/1e6).toFixed(1).replace('.0','')+'M':n>=1000?Math.round(n/1000)+'k':String(n);
 let bar=null,tm=0;
 const paint=()=>{
  if(!bar||!bar.isConnected){bar=null;clearInterval(tm);tm=0;return}
  const w=api.window(),u=api.used(),f=Math.min(1,u/w.n),pc=Math.round(f*100);
  $('i',bar).style.width=Math.max(1,pc)+'%';
  bar.classList.toggle('hot',f>=.8);
  const t=$('span',bar);t.textContent=f>=.5?L('Контекст')+' '+pc+'%':'';
  bar.dataset.u=u;bar.dataset.w=w.n;bar.dataset.g=w.g;
  bar.style.display=u>0?'':'none'};
 api.open=()=>{
  const w=api.window(),u=api.used(),pc=Math.min(100,Math.round(u/w.n*100));
  const s=sheet(`<h2></h2><div class="cxs-b"><i></i></div><p class="sub cxs-t" style="margin:10px 0 4px"></p><p class="hint cxs-h" style="margin:0 0 16px"></p><div class="two"><button class="btn ghost" data-c></button><button class="btn" data-n></button></div>`);
  $('h2',s).textContent=L('Заполненность контекста');
  $('.cxs-b i',s).style.width=Math.max(1,pc)+'%';
  $('.cxs-t',s).textContent='≈ '+fmt(u)+' / '+fmt(w.n)+' '+L('токенов')+' · '+pc+'%'+(w.g?' ('+L('размер окна неизвестен, взято 32k')+')':'');
  $('.cxs-h',s).textContent=pc>=80?L('Контекст почти заполнен: модель может начать забывать начало чата или вернуть ошибку. Сожмите историю или начните новый чат.'):L('Чем длиннее чат, тем больше токенов уходит с каждым запросом. Сжатие заменяет старую часть кратким пересказом.');
  $('[data-c]',s).textContent=L('Сжать историю');$('[data-n]',s).textContent=L('Новый чат');
  $('[data-c]',s).onclick=()=>{s.close();const a=typeof Roles!=='undefined'&&Roles.actions?Roles.actions.find(x=>x.cmd==='compact'):null;if(a)a.run();else toast(L('Наберите /compact'))};
  $('[data-n]',s).onclick=()=>{s.close();if(typeof Chx!=='undefined'&&Chx.newChat)Chx.newChat()}};
 Hooks.on('chat:rendered',v=>{
  const cmp=$('.cmp',v);if(!cmp)return;
  const old=$('.cxb',v);if(old)old.remove();
  bar=el('<button type="button" class="cxb" aria-label="Контекст"><em><i></i></em><span></span></button>');
  bar.onclick=api.open;cmp.before(bar);paint();
  clearInterval(tm);tm=setInterval(paint,2000)});
 Hooks.on('chat:answer',()=>setTimeout(paint,80));
 i18nAdd({"Контекст":"Context","Заполненность контекста":"Context usage","токенов":"tokens","размер окна неизвестен, взято 32k":"window size unknown, assumed 32k","Контекст почти заполнен: модель может начать забывать начало чата или вернуть ошибку. Сожмите историю или начните новый чат.":"The context is almost full: the model may forget the start of the chat or return an error. Compress the history or start a new chat.","Чем длиннее чат, тем больше токенов уходит с каждым запросом. Сжатие заменяет старую часть кратким пересказом.":"The longer the chat, the more tokens each request uses. Compression replaces the older part with a short summary.","Сжать историю":"Compress history","Новый чат":"New chat","Наберите /compact":"Type /compact"});
 return api})();
