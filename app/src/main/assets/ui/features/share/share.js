/* ===== ПОДЕЛИТЬСЯ: копирование, выделение текста, отправка в Telegram и другие приложения =====
   Под каждым ответом ИИ ряд кнопок «Копировать» и «Поделиться» (у ваших сообщений он открывается тапом).
   В шапке чата кнопка «Поделиться чатом». Нативная часть: com.kairema.app.share (Bridge: copyText, shareText,
   shareFile, saveFile, printHtml). В браузере без Android работает через navigator.share / скачивание файла.
   Убрать модуль: удалить папку features/share и её строки в index.html. Загружается раньше app.js. */
i18nAdd({"Копировать":"Copy","Поделиться":"Share","Скопировано":"Copied","Не удалось скопировать":"Could not copy","Поделиться чатом":"Share chat","Поделиться ответом":"Share reply","Поделиться сообщением":"Share message","Выделить текст":"Select text","Выбрать часть и скопировать":"Pick a part and copy it","Отправить текстом":"Send as text","Telegram и другие приложения":"Telegram and other apps","Отправить файлом":"Send as file","Файл .md с разметкой":"A .md file with formatting","Сохранить в «Загрузки»":"Save to Downloads","Файл .md":"A .md file","Сохранить как PDF":"Save as PDF","Откроется окно печати, выберите «Сохранить как PDF»":"The print dialog opens: choose “Save as PDF”","Копировать всё":"Copy all","Копировать весь чат":"Copy the whole chat","Выделить всё":"Select all","Скопировать выделенное или всё":"Copy the selection or everything","Нечего отправлять":"Nothing to send","Не удалось отправить":"Could not send","Сохранено в «Загрузки»":"Saved to Downloads","Не удалось открыть печать":"Could not open print","Чат Kairema":"Kairema chat","Вы":"You"});
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
 /* Готовая страница для печати из HTML-содержимого. */
 doc(title,body){
  return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>'+esc(title)+'</title><style>'
   +'body{font:12pt/1.6 Georgia,"Times New Roman",serif;color:#111;margin:0;padding:0 2px}h1{font-size:20pt}h2{font-size:16pt}h3{font-size:13.5pt}h1,h2,h3,h4{line-height:1.25;margin:1.1em 0 .4em}'
   +'p{margin:0 0 .7em}table{border-collapse:collapse;width:100%;margin:.6em 0;font:10.5pt/1.4 Arial,sans-serif}th,td{border:1px solid #999;padding:5px 8px;text-align:left;vertical-align:top}th{background:#eee}'
   +'pre{background:#f3f3f3;border:1px solid #ddd;border-radius:6px;padding:8px 10px;white-space:pre-wrap;word-break:break-word;font:9.5pt/1.45 Consolas,monospace}code{font-family:Consolas,monospace;font-size:.92em}'
   +'blockquote{margin:0 0 .7em;padding-left:12px;border-left:3px solid #bbb;color:#444}.who{font:700 9.5pt Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#666;margin:1.2em 0 .3em}.u{background:#f1f1f1;border-radius:10px;padding:8px 12px}img{max-width:100%}hr{border:0;border-top:1px solid #ccc;margin:1.2em 0}'
   +'</style></head><body>'+body+'</body></html>'},
 /* Копия сообщения без кнопок и служебных панелей, чтобы они не попали в PDF. */
 clean(el){const c=el.cloneNode(true);c.querySelectorAll('.msg-act,.runbar,.runout,.art-bar,.art-tb,.agbar').forEach(x=>x.remove());return c},
 role(m){return m.r==='a'?'Kairema':(LANG==='en'?'You':'Вы')},
 body(m){return (m.r==='u'&&m.q!=null)?String(m.q):String(m.t||'')},
 chatTitle(){return (Chx.cur&&Chx.cur.title)||(LANG==='en'?'Kairema chat':'Чат Kairema')},
 chatMd(){
  const ms=(S.apiMsgs||[]).filter(m=>m.t&&!m.err);
  return '# '+Sx.chatTitle()+'\n\n'+ms.map(m=>'**'+Sx.role(m)+':**\n\n'+Sx.body(m)).join('\n\n---\n\n')+'\n'},
 chatHtml(){
  const rows=$$('.msgs .msg').filter(d=>$('.bd',d)&&$('.bd',d).textContent.trim());
  const body='<h1>'+esc(Sx.chatTitle())+'</h1>'+rows.map(d=>{const c=Sx.clean(d),u=d.classList.contains('u');
   return '<div class="who">'+(u?(LANG==='en'?'You':'Вы'):'Kairema')+'</div><div class="'+(u?'u':'a')+'">'+$('.bd',c).innerHTML+'</div>'}).join('');
  return Sx.doc(Sx.chatTitle(),body)},
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
   ['fil','Отправить файлом','Файл .md с разметкой',()=>Sx.file(Sx.fname(o.name,'.md'),'text/markdown',o.md||o.text)],
   ['dwn','Сохранить в «Загрузки»','Файл .md',()=>Sx.save(Sx.fname(o.name,'.md'),'text/markdown',o.md||o.text)],
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
   html:()=>{const c=Sx.clean(d);return Sx.doc(Sx.chatTitle(),'<div class="a">'+$('.bd',c).innerHTML+'</div>')}})},
 chatSheet(){
  const md=Sx.chatMd();
  if(!(S.apiMsgs||[]).some(m=>m.t&&!m.err)){toast('Нечего отправлять');return}
  Sx.sheet({title:'Поделиться чатом',text:md,md,name:Sx.chatTitle(),copyLabel:'Копировать весь чат',html:Sx.chatHtml})},
 /* Ряд кнопок под сообщением. */
 actions(d,m){
  if(!m||!m.t||m.err||d.querySelector('.msg-act'))return;
  Sx.icons();
  const row=el(`<div class="msg-act"><button type="button" data-c aria-label="Копировать">${ic('cpy')}</button><button type="button" data-s aria-label="Поделиться">${ic('shr')}</button></div>`);
  $('[data-c]',row).onclick=e=>{e.stopPropagation();Sx.copyToast(Sx.body(m))};
  $('[data-s]',row).onclick=e=>{e.stopPropagation();Sx.msgSheet(m,d)};
  d.append(row);
  /* Ваше сообщение: ряд кнопок открывается тапом по пузырю (если не выделяете текст) */
  if(m.r==='u')d.addEventListener('click',e=>{if(e.target.closest('.msg-act,a'))return;const g=window.getSelection();if(g&&!g.isCollapsed)return;d.classList.toggle('sx-open')})}};
Hooks.on('msg:render',(d,m)=>Sx.actions(d,m));
Hooks.on('chat:answer',(m,bd)=>{const d=bd&&bd.closest&&bd.closest('.msg');if(d)Sx.actions(d,m)});
Hooks.on('chat:rendered',v=>{
 Sx.icons();
 const n=$('[data-chn]',v);if(!n||$('[data-chs]',v))return;
 n.insertAdjacentHTML('afterend',`<button class="ib" data-chs aria-label="Поделиться чатом">${ic('shr')}</button>`);
 $('[data-chs]',v).onclick=Sx.chatSheet});
