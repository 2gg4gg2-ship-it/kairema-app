/* ===== СЖАТИЕ КОНТЕКСТА =====
   Команда «/compact» (список «/» из модуля roles): старая часть чата заменяется кратким пересказом, который уходит модели вместо длинной истории.
   Ничего не удаляется: на экране остаётся весь чат, на сообщении ставится пометка m.x.cx (текст пересказа), её сохраняет chats.js.
   Ctx.view(msgs) возвращает список для запроса: [пересказ, «Понял»] + сообщения после пометки. Вызывается из core/app.js (respond, mkHist, защищено typeof).
   Подсказка «чат длинный» появляется после ответа, когда история больше ~100 000 знаков (около 30 000 токенов). Убрать модуль: удалить папку и строки в index.html. */
const Ctx=(()=>{
 const LIM=100000,KEEP=2;
 i18nAdd({"Сжать контекст":"Compress context","Заменить старую часть чата кратким пересказом для модели":"Replace the older part of the chat with a short summary for the model","Контекст сжат":"Context compressed","Контекст сжат: старая часть чата заменена пересказом":"Context compressed: the older part of the chat is replaced by a summary","Чат длинный. Наберите /compact, чтобы сжать контекст":"The chat is long. Type /compact to compress the context","Пока нечего сжимать":"Nothing to compress yet","Сжимаю контекст…":"Compressing context…","Не удалось сжать":"Could not compress","Дождитесь ответа":"Wait for the answer","Действие":"Action"});
 const SUMMARY_SYS='You write compact summaries of chat conversations so that the conversation can continue with less text. Keep: the user goals, decisions made, facts and names, file names, commands, code decisions, open questions. Drop small talk. Write in the language of the conversation. Output only the summary, at most 400 words.';
 const mark=ms=>{for(let i=ms.length-1;i>=0;i--)if(ms[i].x&&ms[i].x.cx)return i;return -1};
 const api={};
 /* Список сообщений для запроса модели */
 api.view=ms=>{
  const i=mark(ms);if(i<0)return ms;
  const head=[{r:'u',t:'[Краткий пересказ предыдущей части этого чата, он заменяет её]\n'+ms[i].x.cx},{r:'a',t:'Понял, продолжаю с учётом пересказа.'}];
  return head.concat(ms.slice(i+1))};
 api.size=ms=>api.view(ms).reduce((n,m)=>n+(m.t?m.t.length:0),0);
 /* Где резать: хвост начинается с вопроса, оставляем последние KEEP вопроса */
 api.cut=ms=>{
  const from=mark(ms)+1,us=[];
  for(let i=from;i<ms.length;i++)if(ms[i].r==='u'&&ms[i].t)us.push(i);
  if(us.length<=KEEP)return -1;
  const c=us[us.length-KEEP];
  return c-from>=2?c:-1};
 const transcript=(ms,from,to)=>{
  let out='';const pi=mark(ms);
  if(pi>=0)out+='[Earlier summary]\n'+ms[pi].x.cx+'\n\n';
  for(let i=from;i<to;i++){const m=ms[i];if(!m.t||m.err)continue;out+=(m.r==='u'?'User: ':'Assistant: ')+String(m.t).slice(0,4000)+'\n\n'}
  return out.length>60000?out.slice(0,20000)+'\n[…]\n'+out.slice(-38000):out};
 api.run=async()=>{
  if(Chx.busy){toast(L('Дождитесь ответа'));return}
  const ms=S.apiMsgs,c=api.cut(ms);
  if(c<0){toast(L('Пока нечего сжимать'));return}
  const pv=actProv();if(!pv||!Native.on){toast(L('Не удалось сжать'));return}
  Chx.busy=1;toast(L('Сжимаю контекст…'));
  try{
   const from=mark(ms)+1,text=transcript(ms,from,c);
   let out='';
   await Native.run('chat',[JSON.stringify({id:pv.id,url:pv.url,model:pv.model,system:SUMMARY_SYS,think:0}),JSON.stringify([{role:'user',content:'Summarize this conversation:\n\n'+text}])],t=>{const k=t.charCodeAt(0);if(k===1||k===2)return;out+=t});
   out=out.trim();
   if(!out)throw new Error('empty');
   const last=ms[c-1];last.x=Object.assign({},last.x,{cx:out.slice(0,8000)});
   Chx.save(Chx.cur);
   const v=$('#v-api');if(v&&typeof apiView==='function'){Chx.busy=0;apiView()}
   toast(L('Контекст сжат: старая часть чата заменена пересказом'))}
  catch(e){toast(L('Не удалось сжать')+(e&&e.message&&e.message!=='empty'?': '+e.message:''))}
  finally{Chx.busy=0}};
 if(typeof Roles!=='undefined'&&Roles.actions)Roles.actions.push({id:'a:compact',cmd:'compact',kind:'action',n:['Сжать контекст','Compress context'],d:['Заменить старую часть чата кратким пересказом для модели','Replace the older part of the chat with a short summary for the model'],run:api.run});
 /* Пометка на экране и подсказка про длинный чат */
 Hooks.on('msg:render',(d,m)=>{if(m&&m.x&&m.x.cx&&!d.querySelector('.cxm')){const n=el('<div class="cxm"></div>');n.textContent='✂ '+L('Контекст сжат');d.append(n)}});
 let hinted=0;
 Hooks.on('chat:answer',()=>{if(!hinted&&api.size(S.apiMsgs)>LIM&&api.cut(S.apiMsgs)>=0){hinted=1;toast(L('Чат длинный. Наберите /compact, чтобы сжать контекст'))}});
 return api})();
