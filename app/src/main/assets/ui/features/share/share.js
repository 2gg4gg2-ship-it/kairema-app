/* ===== ПОДЕЛИТЬСЯ: копирование, выделение текста, отправка в Telegram и другие приложения =====
   Под каждым ответом ИИ ряд кнопок «Копировать» и «Поделиться»; ваше сообщение: зажмите — меню «Копирование», «Выделение текста», «Изменить».
   В шапке чата кнопка «Поделиться чатом». Нативная часть: com.kairema.app.share (Bridge: copyText, shareText,
   shareFile, saveFile, printHtml). В браузере без Android работает через navigator.share / скачивание файла.
   Убрать модуль: удалить папку features/share и её строки в index.html. Загружается раньше app.js. */
i18nAdd({"Копировать":"Copy","Поделиться":"Share","Скопировано":"Copied","Не удалось скопировать":"Could not copy","Поделиться чатом":"Share chat","Поделиться ответом":"Share reply","Поделиться сообщением":"Share message","Выделить текст":"Select text","Выбрать часть и скопировать":"Pick a part and copy it","Отправить текстом":"Send as text","Telegram и другие приложения":"Telegram and other apps","Отправить файлом":"Send as file","Файл .md с разметкой":"A .md file with formatting","Сохранить в «Загрузки»":"Save to Downloads","Файл .md":"A .md file","Сохранить как PDF":"Save as PDF","Откроется окно печати, выберите «Сохранить как PDF»":"The print dialog opens: choose “Save as PDF”","Копировать всё":"Copy all","Копировать весь чат":"Copy the whole chat","Выделить всё":"Select all","Скопировать выделенное или всё":"Copy the selection or everything","Нечего отправлять":"Nothing to send","Не удалось отправить":"Could not send","Сохранено в «Загрузки»":"Saved to Downloads","Не удалось открыть печать":"Could not open print","Чат Kairema":"Kairema chat","Вы":"You","Копирование":"Copy","Выделение текста":"Select text","Изменить":"Edit","Изменить сообщение":"Edit message","Отправить заново":"Resend","Отмена":"Cancel","Дождитесь ответа":"Wait for the reply","Файл .html — как страница чата":"An .html file that looks like the chat page","Страница чата, откроется в браузере":"A chat page that opens in a browser"});
const Sx={
 bridge(m){const b=window.KairemaBridge;return b&&typeof b[m]==='function'?b:null},
 icons(){
  const I={cpy:'<rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
   shr:'<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 10.5l6.8-4M8.6 13.5l6.8 4"/>',
   sel:'<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
   fil:'<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h6"/>',
   dwn:'<path d="M12 3v12M7 10l5 5 5-5M5 21h14"/>',
   snd:'<path d="M22 2L11 13M22 2l-7 20-4-9-9-4z"/>',
   eye:'<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'};
  for(const k in I)if(!P[k])P[k]=I[k]},
 /* Копирование: нативный буфер обмена Android, затем navigator.clipboard, затем execCommand. */
 async copy(t){
  t=String(t);
  const b=Sx.bridge('copyText');
  if(b){try{if(b.copyText(t))return}catch(e){}}
  if(navigator.clipboard){try{await navigator.clipboard.writeText(t);return}catch(e){}}
  const ta=document.createElement('textarea');ta.value=t;ta.style.cssText='position:fixed;opacity:0;top:0';
  document.body.append(ta);ta.select();let ok=false;
  try{ok=document.execCommand('copy')}catch(e){}
  ta.remove();if(!ok)throw new Error('copy')},
 async copyToast(t,msg){try{await Sx.copy(t);toast(msg||'Скопировано')}catch(e){toast('Не удалось скопировать')}},
 text(title,t){
  if(!String(t||'').trim()){toast('Нечего отправлять');return false}
  const b=Sx.bridge('shareText');
  if(b){try{b.shareText(title,String(t));return true}catch(e){}}
  if(navigator.share){navigator.share({title,text:String(t)}).catch(()=>{});return true}
  Sx.copyToast(t);return false},
 file(name,mime,content){
  if(!String(content||'').trim()){toast('Нечего отправлять');return false}
  const b=Sx.bridge('shareFile');
  if(b){let ok=false;try{ok=!!b.shareFile(name,mime,String(content))}catch(e){}if(!ok)toast('Не удалось отправить');return ok}
  Sx.download(name,mime,content);return true},
 /* Сохранение в «Загрузки»; если Android старый или не вышло, предлагаем отправить файл. */
 save(name,mime,content){
  if(!String(content||'').trim()){toast('Нечего отправлять');return false}
  const b=Sx.bridge('saveFile');
  if(b){let ok=false;try{ok=!!b.saveFile(name,mime,String(content))}catch(e){}
   if(ok){toast('Сохранено в «Загрузки»: '+name);return true}
   return Sx.file(name,mime,content)}
  Sx.download(name,mime,content);return true},
 download(name,mime,content){
  const u=URL.createObjectURL(new Blob([content],{type:mime+';charset=utf-8'}));
  const a=document.createElement('a');a.href=u;a.download=name;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),4000)},
 /* PDF: на Android системное окно печати (там «Сохранить как PDF»), в браузере обычная печать. */
 pdf(title,html){
  const b=Sx.bridge('printHtml');
  if(b){try{b.printHtml(title,html);return}catch(e){toast('Не удалось открыть печать');return}}
  const f=document.createElement('iframe');f.style.cssText='position:fixed;width:0;height:0;border:0';
  document.body.append(f);f.srcdoc=html;
  f.onload=()=>{try{f.contentWindow.focus();f.contentWindow.print()}catch(e){toast('Не удалось открыть печать')}setTimeout(()=>f.remove(),60000)}},
 /* Тема для печати: чисто чёрное на белом или белое на чёрном, как в приложении. */
 dark(){return (document.documentElement.dataset.theme||S.theme)!=='light'},
 /* Готовая страница из HTML-содержимого. chat=true: пузыри как в чате Claude (ваши справа, ответы слева, без подписей). */
 doc(title,body,chat){
  const D=Sx.dark(),bg=D?'#000':'#fff',fg=D?'#fff':'#000',mut=D?'#a8a8a8':'#555',ln=D?'#444':'#bbb',pan=D?'#161616':'#f1f1f1',bub=D?'#262626':'#ececec';
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'
   +'@page{margin:14mm 12mm;background:'+bg+'}*{-webkit-print-color-adjust:exact;print-color-adjust:exact;box-sizing:border-box}'
   +'html,body{margin:0;background:'+bg+';color:'+fg+'}body{font:12pt/1.65 Georgia,"Times New Roman",serif;padding:0 2px;max-width:760px;margin:0 auto}'
   +'h1{font:700 17pt/1.25 Arial,sans-serif;margin:0 0 1em;padding-bottom:.5em;border-bottom:1px solid '+ln+'}h2{font-size:16pt}h3{font-size:13.5pt}h1,h2,h3,h4{line-height:1.25;margin:1.1em 0 .4em}'
   +'p{margin:0 0 .7em}strong,b{font-weight:700}a{color:'+fg+'}del{opacity:.7}mark{background:'+(D?'#555':'#ddd')+';color:'+fg+';border-radius:3px;padding:0 2px}'
   +'table{border-collapse:collapse;width:100%;margin:.6em 0;font:10.5pt/1.4 Arial,sans-serif}th,td{border:1px solid '+ln+';padding:5px 8px;text-align:left;vertical-align:top}th{background:'+pan+'}'
   +'pre{background:'+pan+';border:1px solid '+ln+';border-radius:8px;padding:8px 10px;white-space:pre-wrap;word-break:break-word;font:9.5pt/1.45 Consolas,monospace}code{font-family:Consolas,monospace;font-size:.92em}'
   +'blockquote{margin:0 0 .7em;padding-left:12px;border-left:3px solid '+ln+';color:'+mut+'}img{max-width:100%}hr{border:0;border-top:1px solid '+ln+';margin:1.2em 0}'
   +'.row{display:flex;margin:0 0 1.1em;break-inside:avoid-page}.row.u{justify-content:flex-end}.row.u .t{max-width:82%;background:'+bub+';border-radius:16px 16px 4px 16px;padding:9px 14px;font:11.5pt/1.5 Arial,sans-serif;white-space:pre-wrap;overflow-wrap:anywhere}'
   +'.row.a .t{width:100%;overflow-wrap:anywhere}.row .t>*:last-child{margin-bottom:0}'
   +'</style></head><body>'+body+'</body></html>'},
 /* Копия сообщения без кнопок и служебных панелей, чтобы они не попали в PDF. */
 clean(el){const c=el.cloneNode(true);c.querySelectorAll('.msg-act,.runbar,.runout,.art-bar,.art-tb,.agbar').forEach(x=>x.remove());return c},
 role(m){return m.r==='a'?'Kairema':(LANG==='en'?'You':'Вы')},
 body(m){return (m.r==='u'&&m.q!=null)?String(m.q):String(m.t||'')},
 chatTitle(){return (Chx.cur&&Chx.cur.title)||(LANG==='en'?'Kairema chat':'Чат Kairema')},
 /* Текст чата без подписей «Вы» и «Kairema»: ваши вопросы как цитаты, ответы обычным текстом. */
 chatMd(){
  const ms=(S.apiMsgs||[]).filter(m=>m.t&&!m.err);
  return '# '+Sx.chatTitle()+'\n\n'+ms.map(m=>m.r==='u'?Sx.body(m).split('\n').map(l=>'> '+l).join('\n'):Sx.body(m)).join('\n\n')+'\n'},
 chatHtml(){
  const rows=$$('.msgs .msg').filter(d=>$('.bd',d)&&$('.bd',d).textContent.trim());
  const body='<h1>'+esc(Sx.chatTitle())+'</h1>'+rows.map(d=>{const c=Sx.clean(d),u=d.classList.contains('u');
   return '<div class="row '+(u?'u':'a')+'"><div class="t">'+$('.bd',c).innerHTML+'</div></div>'}).join('');
  return Sx.doc(Sx.chatTitle(),body,1)},
 fname(t,ext){return (String(t||'kairema').replace(/[^\p{L}\p{N}._ -]+/gu,'_').trim().slice(0,50)||'kairema')+ext},
 /* Окно «Выделить текст»: чистый текст, часть можно выделить пальцем и скопировать. */
 selectSheet(text){
  const s=sheet(`<h2>Выделить текст</h2><div class="sx-sel" tabindex="0"></div><div class="two sx-two"><button class="btn ghost" data-a type="button">Выделить всё</button><button class="btn" data-c type="button">Копировать</button></div>`);
  const box=$('.sx-sel',s);box.textContent=text;
  const inBox=()=>{const g=window.getSelection();return g&&g.rangeCount&&!g.isCollapsed&&box.contains(g.anchorNode)?g.toString():''};
  $('[data-a]',s).onclick=()=>{const g=window.getSelection(),r=document.createRange();r.selectNodeContents(box);g.removeAllRanges();g.addRange(r)};
  $('[data-c]',s).onclick=()=>Sx.copyToast(inBox()||text)},
 /* Лист действий: o={title, text (для текста и выделения), md (для файла), name, html() (для PDF), copyLabel} */
 sheet(o){
  Sx.icons();
  const rows=[
   ['sel','Выделить текст','Выбрать часть и скопировать',()=>Sx.selectSheet(o.text)],
   ['cpy',o.copyLabel||'Копировать','',()=>Sx.copyToast(o.text)],
   ['snd','Отправить текстом','Telegram и другие приложения',()=>Sx.text(o.title,o.text)],
   ['fil','Отправить файлом',o.page?'Страница чата, откроется в браузере':'Файл .md с разметкой',()=>o.page?Sx.file(Sx.fname(o.name,'.html'),'text/html',o.html()):Sx.file(Sx.fname(o.name,'.md'),'text/markdown',o.md||o.text)],
   ['dwn','Сохранить в «Загрузки»',o.page?'Файл .html':'Файл .md',()=>o.page?Sx.save(Sx.fname(o.name,'.html'),'text/html',o.html()):Sx.save(Sx.fname(o.name,'.md'),'text/markdown',o.md||o.text)],
   ['fil','Сохранить как PDF','Откроется окно печати, выберите «Сохранить как PDF»',()=>Sx.pdf(o.title,o.html())]];
  const s=sheet(`<h2 class="sx-h"></h2><div class="sx-list"></div>`);
  $('.sx-h',s).textContent=o.title;
  const l=$('.sx-list',s);
  rows.forEach((r,i)=>{
   const b=el(`<button type="button" class="sx-row" style="--i:${i}"><span class="sx-i">${ic(r[0])}</span><span class="sx-t"><b></b><small></small></span></button>`);
   $('b',b).textContent=r[1];const sm=$('small',b);if(r[2])sm.textContent=r[2];else sm.remove();
   b.onclick=()=>{s.close();setTimeout(r[3],120)};l.append(b)})},
 msgSheet(m,d){
  Sx.sheet({title:m.r==='a'?'Поделиться ответом':'Поделиться сообщением',text:Sx.body(m),md:Sx.body(m),name:Sx.chatTitle(),
   html:()=>{const c=Sx.clean(d);return Sx.doc(Sx.chatTitle(),'<div class="row a"><div class="t">'+$('.bd',c).innerHTML+'</div></div>',1)}})},
 chatSheet(){
  const md=Sx.chatMd();
  if(!(S.apiMsgs||[]).some(m=>m.t&&!m.err)){toast('Нечего отправлять');return}
  Sx.sheet({title:'Поделиться чатом',text:md,md,name:Sx.chatTitle(),copyLabel:'Копировать весь чат',html:Sx.chatHtml,page:1})},
 /* Окно «Изменить»: правка своего вопроса, всё после него удаляется и ответ запрашивается заново. */
 editSheet(m){
  if(Chx.busy){toast('Дождитесь ответа');return}
  const s=sheet(`<h2>Изменить сообщение</h2><textarea class="sx-edit" rows="5"></textarea><div class="two sx-two"><button class="btn ghost" data-x type="button">Отмена</button><button class="btn" data-o type="button">Отправить заново</button></div>`);
  const ta=$('.sx-edit',s);ta.value=Sx.body(m);setTimeout(()=>{try{ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}catch(e){}},260);
  $('[data-x]',s).onclick=()=>s.close();
  $('[data-o]',s).onclick=()=>{
   const t=ta.value.trim();if(!t||Chx.busy)return;
   const i=S.apiMsgs.indexOf(m);if(i<0){s.close();return}
   S.apiMsgs.splice(i);Chx.save(Chx.cur);s.close();apiView();setTimeout(()=>Chat.send(t),120)}},
 /* Меню по долгому нажатию на своё сообщение. */
 userMenu(d,m){
  Sx.icons();
  const it=[{i:'cpy',l:'Копирование',f:()=>Sx.copyToast(Sx.body(m))},{i:'sel',l:'Выделение текста',f:()=>Sx.selectSheet(Sx.body(m))}];
  if(!(m.parts&&m.parts.length))it.push({i:'edit',l:'Изменить',f:()=>Sx.editSheet(m)});
  menu(it)},
 press(d,m){
  let tm=0,x=0,y=0;const stop=()=>{clearTimeout(tm);tm=0};
  const go=()=>{tm=0;try{navigator.vibrate&&navigator.vibrate(12)}catch(e){}Sx.userMenu(d,m)};
  d.addEventListener('touchstart',e=>{if(e.target.closest('a'))return;const t=e.touches[0];x=t.clientX;y=t.clientY;stop();d.classList.add('sx-hold');tm=setTimeout(()=>{d.classList.remove('sx-hold');go()},450)},{passive:true});
  d.addEventListener('touchmove',e=>{const t=e.touches[0];if(Math.abs(t.clientX-x)>10||Math.abs(t.clientY-y)>10){stop();d.classList.remove('sx-hold')}},{passive:true});
  ['touchend','touchcancel'].forEach(n=>d.addEventListener(n,()=>{stop();d.classList.remove('sx-hold')},{passive:true}));
  d.addEventListener('contextmenu',e=>{e.preventDefault();stop();d.classList.remove('sx-hold');Sx.userMenu(d,m)})},
 /* Ряд кнопок под ответом ИИ; у вашего сообщения вместо него долгое нажатие. */
 actions(d,m){
  if(!m||!m.t||m.err||d._sx)return;
  d._sx=1;Sx.icons();
  if(m.r==='u'){Sx.press(d,m);return}
  const row=el(`<div class="msg-act"><button type="button" data-c aria-label="Копировать">${ic('cpy')}</button><button type="button" data-s aria-label="Поделиться">${ic('shr')}</button></div>`);
  $('[data-c]',row).onclick=e=>{e.stopPropagation();Sx.copyToast(Sx.body(m))};
  $('[data-s]',row).onclick=e=>{e.stopPropagation();Sx.msgSheet(m,d)};
  d.append(row)}};
Hooks.on('msg:render',(d,m)=>Sx.actions(d,m));
Hooks.on('chat:answer',(m,bd)=>{const d=bd&&bd.closest&&bd.closest('.msg');if(d)Sx.actions(d,m)});
Hooks.on('chat:rendered',v=>{
 Sx.icons();
 const n=$('[data-chn]',v);if(!n||$('[data-chs]',v))return;
 n.insertAdjacentHTML('afterend',`<button class="ib" data-chs aria-label="Поделиться чатом">${ic('shr')}</button>`);
 $('[data-chs]',v).onclick=Sx.chatSheet});
