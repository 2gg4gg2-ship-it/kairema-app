/* ===== СЖАТИЕ КОНТЕКСТА =====
   Команда «/compact» (список «/» из модуля roles): старая часть чата заменяется кратким пересказом, который уходит модели вместо длинной истории.
   Ничего не удаляется: на экране остаётся весь чат, на сообщении ставится пометка m.x.cx (текст пересказа), её сохраняет chats.js.
   Ctx.view(msgs) возвращает список для запроса: [пересказ, «Понял»] + сообщения после пометки. Вызывается из core/app.js (respond, mkHist, защищено typeof).
   Подсказка «чат длинный» появляется после ответа, когда история больше ~100 000 знаков (около 30 000 токенов). Убрать модуль: удалить папку и строки в index.html. */
const Ctx=(()=>{
 const LIM=100000,KEEP=1;
 i18nAdd({"Сжать контекст":"Compress context","Заменить старую часть чата кратким пересказом для модели":"Replace the older part of the chat with a short summary for the model","Контекст сжат":"Context compressed","Контекст сжат: старая часть чата заменена пересказом":"Context compressed: the older part of the chat is replaced by a summary","Чат длинный. Наберите /compact, чтобы сжать контекст":"The chat is long. Type /compact to compress the context","Пока нечего сжимать":"Nothing to compress yet","Сжимаю контекст…":"Compressing context…","Не удалось сжать":"Could not compress","Дождитесь ответа":"Wait for the answer","Действие":"Action","Готово":"Done","ОК":"OK","Нужно хотя бы два ваших вопроса в чате. Сжимать пока нечего.":"You need at least two of your questions in the chat. Nothing to compress yet.","Старая часть чата заменена коротким пересказом. Модель теперь получает пересказ и последний вопрос с ответом, а не всю историю. На экране весь чат остался как был.":"The older part of the chat is replaced by a short summary. The model now gets the summary and the last question with its answer instead of the whole history. The chat on screen is unchanged.","Пересказ:":"Summary:","Нужен подключённый провайдер ИИ в приложении.":"A connected AI provider in the app is required.","Дождитесь окончания ответа и повторите.":"Wait for the answer to finish and try again."});
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
  /* Окно со статусом: видно, что команда сработала и чем кончилось */
  const win=(title,text,spin)=>{
   const s=sheet('<h2 style="margin-bottom:10px"></h2><p class="sub cx-t" style="margin:0 0 14px"></p><pre class="cx-s" hidden></pre><button class="btn" data-o type="button"></button>');
   $('h2',s).textContent=title;$('.cx-t',s).textContent=text;
   if(spin)$('.cx-t',s).prepend(el('<span class="spin" style="margin-right:8px"></span>'));
   $('[data-o]',s).textContent=L('ОК');$('[data-o]',s).onclick=s.close;return s};
  if(Chx.busy){win(L('Сжать контекст'),L('Дождитесь окончания ответа и повторите.'));return}
  const ms=S.apiMsgs,c=api.cut(ms);
  if(c<0){win(L('Сжать контекст'),L('Нужно хотя бы два ваших вопроса в чате. Сжимать пока нечего.'));return}
  const pv=actProv();if(!pv||!Native.on){win(L('Не удалось сжать'),L('Нужен подключённый провайдер ИИ в приложении.'));return}
  Chx.busy=1;const w=win(L('Сжимаю контекст…'),L('Сжимаю контекст…'),1);$('[data-o]',w).disabled=true;
  try{
   const from=mark(ms)+1,text=transcript(ms,from,c);
   let out='';
   await Native.run('chat',[JSON.stringify({id:pv.id,url:pv.url,model:pv.model,system:SUMMARY_SYS,think:0}),JSON.stringify([{role:'user',content:'Summarize this conversation:\n\n'+text}])],t=>{const k=t.charCodeAt(0);if(k===1||k===2)return;out+=t});
   out=out.trim();
   if(!out)throw new Error('empty');
   const last=ms[c-1];last.x=Object.assign({},last.x,{cx:out.slice(0,8000)});
   Chx.save(Chx.cur);
   const v=$('#v-api');if(v&&typeof apiView==='function'){Chx.busy=0;apiView()}
   $('h2',w).textContent=L('Контекст сжат');$('.cx-t',w).textContent=L('Старая часть чата заменена коротким пересказом. Модель теперь получает пересказ и последний вопрос с ответом, а не всю историю. На экране весь чат остался как был.');
   const pre=$('.cx-s',w);pre.hidden=false;pre.textContent=L('Пересказ:')+'\n'+out.slice(0,700)+(out.length>700?'…':'');$('[data-o]',w).disabled=false}
  catch(e){$('h2',w).textContent=L('Не удалось сжать');$('.cx-t',w).textContent=(e&&e.message&&e.message!=='empty'?e.message:L('Не удалось сжать'));$('[data-o]',w).disabled=false}
  finally{Chx.busy=0}};
 if(typeof Roles!=='undefined'&&Roles.actions)Roles.actions.push({id:'a:compact',cmd:'compact',kind:'action',n:['Сжать контекст','Compress context'],d:['Заменить старую часть чата кратким пересказом для модели','Replace the older part of the chat with a short summary for the model'],run:api.run});
 /* Пометка на экране и подсказка про длинный чат */
 Hooks.on('msg:render',(d,m)=>{if(m&&m.x&&m.x.cx&&!d.querySelector('.cxm')){const n=el('<div class="cxm"></div>');n.textContent='✂ '+L('Контекст сжат');d.append(n)}});
 let hinted=0;
 Hooks.on('chat:answer',()=>{if(!hinted&&api.size(S.apiMsgs)>LIM&&api.cut(S.apiMsgs)>=0){hinted=1;toast(L('Чат длинный. Наберите /compact, чтобы сжать контекст'))}});
 return api})();
