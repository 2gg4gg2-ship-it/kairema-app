/* ===== ФАЙЛЫ ИЗ ОТВЕТОВ ИИ: таблицы, HTML-страницы, PDF, CSV =====
   Модель не умеет создавать файлы сама, поэтому приложение делает их из ответа:
   - блок ```html → «Предпросмотр», «PDF» (системное окно печати → «Сохранить как PDF»), «Скачать», «Поделиться»;
   - блок ```csv, ```markdown, ```svg, ```json и т.п. → «Скачать» и «Поделиться»;
   - таблица Markdown → «Копировать таблицу» (вставляется в Excel и Google Таблицы по ячейкам) и «CSV»;
   - у любого блока кода есть «Копировать».
   Инструкция для модели подмешивается в системный запрос через artifactPrompt() (см. sysPrompt в providers.js).
   Нужен модуль share (Sx). Убрать модуль: удалить папку features/artifacts и её строки в index.html. */
i18nAdd({"Предпросмотр":"Preview","Скачать":"Download","Копировать таблицу":"Copy table","Таблица скопирована":"Table copied","Скачать CSV":"Download CSV","Страница":"Page","Копировать код":"Copy code"});
function artifactPrompt(){
 return "\n\nFiles and tables. The app turns fenced code blocks into real files, so never say that you cannot create files, PDFs or tables. "
  +"For a table use a Markdown table (the app adds Copy and CSV buttons). "
  +"For a document, report, resume, invoice, web page, poster or anything the user wants as HTML or PDF, write ONE complete self-contained HTML document (<!doctype html>, <meta charset>, inline <style>, readable on a phone, no external scripts) inside a single ```html fenced block; the app adds Preview, PDF, Download and Share buttons, so do not explain how to convert it. "
  +"For spreadsheet data use a ```csv block (header row, comma separated). For a text or Markdown file use a ```markdown block. "
  +"Keep the text outside the file block to one or two sentences."}
const Art={
 ext:{html:'.html',htm:'.html',svg:'.svg',csv:'.csv',markdown:'.md',md:'.md',json:'.json',txt:'.txt',xml:'.xml'},
 mime:{'.html':'text/html','.svg':'image/svg+xml','.csv':'text/csv','.md':'text/markdown','.json':'application/json','.txt':'text/plain','.xml':'application/xml'},
 btn(label,icon,fn){
  const b=document.createElement('button');b.type='button';b.className='art-b';
  b.innerHTML=ic(icon)+'<span></span>';b.lastChild.textContent=label;b.onclick=fn;return b},
 title(code,def){const t=(String(code).match(/<title[^>]*>([^<]{1,80})/i)||[])[1];return (t&&t.trim())||def||'Kairema'},
 /* Страница для печати и предпросмотра: SVG оборачиваем в HTML. */
 page(code,lang){return lang==='svg'?'<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body style="margin:0;display:grid;place-items:center;min-height:100vh">'+code+'</body></html>':code},
 /* Масштаб предпросмотра: в страницу добавляется маленький скрипт, он меняет zoom по сообщению от кнопок «−/+» и по щипку двумя пальцами.
    Страница изолирована (sandbox), поэтому управление идёт через postMessage. Исходный код для PDF и файлов не меняется. */
 zoomJs:'<script>(function(){var z=1,d0=0,z0=1;function set(v){z=Math.max(.5,Math.min(4,v));document.documentElement.style.zoom=z;try{parent.postMessage({kz:z},"*")}catch(e){}}'
  +'addEventListener("message",function(e){var d=e.data;if(d&&d.kz!==undefined)set(d.kz==="reset"?1:z*d.kz)});'
  +'function dist(e){var a=e.touches[0],b=e.touches[1];return Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY)}'
  +'addEventListener("touchstart",function(e){if(e.touches.length===2){d0=dist(e);z0=z}},{passive:true});'
  +'addEventListener("touchmove",function(e){if(e.touches.length===2&&d0){e.preventDefault();set(z0*dist(e)/d0)}},{passive:false});'
  +'addEventListener("touchend",function(e){if(e.touches.length<2)d0=0})})()<\/script>',
 withZoom(html){const s=String(html),i=s.toLowerCase().lastIndexOf('</body>');return i>=0?s.slice(0,i)+Art.zoomJs+s.slice(i):s+Art.zoomJs},
 /* Предпросмотр на весь экран. Скрипты внутри страницы работают, но изолированно: доступа к данным приложения у неё нет. */
 preview(html,title,code,lang){
  const d=sub();
  d.innerHTML=`<div class="top"><button class="ib" data-bk aria-label="Назад">${ic('back')}</button><h2></h2></div><div class="art-fr"><iframe sandbox="allow-scripts" title="preview"></iframe></div><div class="art-ft"></div>`;
  $('h2',d).textContent=title||'Предпросмотр';
  $('[data-bk]',d).onclick=d.close;
  const fr=$('iframe',d);fr.srcdoc=Art.withZoom(html);
  const ft=$('.art-ft',d),ex=Art.ext[lang]||'.html',nm=Sx.fname(title,ex);
  const zb=document.createElement('div');zb.className='art-z';
  zb.innerHTML='<button type="button" data-zo aria-label="Отдалить">−</button><button type="button" data-zr class="art-zl">100%</button><button type="button" data-zi aria-label="Приблизить">+</button>';
  const send=v=>{try{fr.contentWindow.postMessage({kz:v},'*')}catch(e){}};
  $('[data-zo]',zb).onclick=()=>send(.8);$('[data-zi]',zb).onclick=()=>send(1.25);$('[data-zr]',zb).onclick=()=>send('reset');
  const on=e=>{if(e.source===fr.contentWindow&&e.data&&typeof e.data.kz==='number')$('[data-zr]',zb).textContent=Math.round(e.data.kz*100)+'%'};
  window.addEventListener('message',on);const oc=d.close;d.close=()=>{window.removeEventListener('message',on);oc()};$('[data-bk]',d).onclick=()=>d.close();
  ft.before(zb);
  ft.append(Art.btn('PDF','fil',()=>Sx.pdf(title,html)),Art.btn('Скачать','dwn',()=>Sx.save(nm,Art.mime[ex],code)),Art.btn('Поделиться','shr',()=>Sx.file(nm,Art.mime[ex],code)));
  return d},
 /* Таблица Markdown в строки ячеек. */
 rows(tb){return [...tb.rows].map(r=>[...r.cells].map(c=>c.textContent.trim().replace(/\s+/g,' ')))},
 /* CSV для Excel: BOM для кириллицы и «;» как разделитель (так Excel с русскими настройками открывает по столбцам). */
 csv(rows){return '﻿'+rows.map(r=>r.map(c=>'"'+c.replace(/"/g,'""')+'"').join(';')).join('\r\n')}};
Hooks.on('md:code',(pre,code,lang)=>{
 if(!String(code).trim())return;
 Sx.icons();
 const bar=document.createElement('div');bar.className='art-bar';
 bar.append(Art.btn('Копировать','cpy',()=>Sx.copyToast(code)));
 const ex=Art.ext[lang];
 if(ex){
  const mime=Art.mime[ex];
  if(ex==='.html'||ex==='.svg'){
   const html=Art.page(code,lang),title=Art.title(code,LANG==='en'?'Page':'Страница'),nm=Sx.fname(title,ex);
   bar.append(Art.btn('Предпросмотр','eye',()=>Art.preview(html,title,code,lang)),Art.btn('PDF','fil',()=>Sx.pdf(title,html)),
    Art.btn('Скачать','dwn',()=>Sx.save(nm,mime,code)),Art.btn('Поделиться','shr',()=>Sx.file(nm,mime,code)))}
  else{
   const nm=Sx.fname('kairema-'+Date.now().toString(36).slice(-4),ex),body=ex==='.csv'?'﻿'+code:code;
   bar.append(Art.btn('Скачать','dwn',()=>Sx.save(nm,mime,body)),Art.btn('Поделиться','shr',()=>Sx.file(nm,mime,body)))}}
 pre.after(bar)});
Hooks.on('md:table',(wrap,tb)=>{
 Sx.icons();
 const rows=Art.rows(tb);if(rows.length<1)return;
 const bar=document.createElement('div');bar.className='art-bar art-tb';
 bar.append(Art.btn('Копировать таблицу','cpy',()=>Sx.copyToast(rows.map(r=>r.join('\t')).join('\n'),'Таблица скопирована')),
  Art.btn('CSV','dwn',()=>Sx.save(Sx.fname('kairema-table','.csv'),'text/csv',Art.csv(rows))));
 wrap.after(bar)});
