/* ===== ВЛОЖЕНИЯ В ЧАТЕ: открыть, прочитать, посмотреть =====
   Под сообщением пользователя, у которого есть вложения (m.parts), показываются плитки: фото (превью), файлы (имя и размер), PDF.
   Фото: нажатие открывает на весь экран (щипок и двойное касание для увеличения, «Сохранить», «Поделиться»).
   Текстовый файл: окно с содержимым, «Копировать» и «Поделиться». PDF: имя и размер, отправка через «Поделиться» невозможна без файла, поэтому только пометка.
   Att.paint(d,m) вызывается из core/messages.js: при создании сообщения (msg:render) и после чтения файлов (новое сообщение).
   Убрать модуль: удалить папку и строки в index.html (вызовы защищены typeof). Тест: docs/tests/attview.test.js */
i18nAdd({"Закрыть":"Close","Сохранить":"Save","Поделиться":"Share","Копировать":"Copy","Фото":"Photo","Файл":"File","Сохранено в «Загрузки»":"Saved to Downloads","Не удалось сохранить":"Could not save","Файл пустой":"The file is empty","Фото недоступно":"Photo is not available","PDF передан модели, просмотр здесь не поддерживается":"The PDF was sent to the model, preview is not supported here"});
const Att=(()=>{
 const data=p=>p.data||(typeof Media!=='undefined'?Media.load(p.path):'')||'';
 function viewImage(p){
  const b64=data(p);if(!b64){toast(L('Фото недоступно'));return}
  const mime=p.mime||'image/jpeg',name=p.name||'photo.jpg';
  const o=el(`<div class="attv" role="dialog" aria-label="${L('Фото')}"><img alt=""><div class="attv-bar"><button type="button" data-x aria-label="${L('Закрыть')}">${ic('x')}</button><span></span><button type="button" data-s>${L('Сохранить')}</button><button type="button" data-h>${L('Поделиться')}</button></div></div>`);
  const im=$('img',o);im.src='data:'+mime+';base64,'+b64;$('span',o).textContent=name;
  let sc=1,tx=0,ty=0,d0=0,sc0=1;const pts=new Map();
  const ap=()=>{im.style.transform='translate('+tx+'px,'+ty+'px) scale('+sc+')'};
  o.addEventListener('pointerdown',e=>{if(e.target.closest('.attv-bar'))return;pts.set(e.pointerId,[e.clientX,e.clientY]);if(pts.size===2){const[a,c]=[...pts.values()];d0=Math.hypot(a[0]-c[0],a[1]-c[1])||1;sc0=sc}});
  o.addEventListener('pointermove',e=>{
   if(!pts.has(e.pointerId))return;const pr=pts.get(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);
   if(pts.size===2){const[a,c]=[...pts.values()];sc=Math.min(6,Math.max(1,sc0*Math.hypot(a[0]-c[0],a[1]-c[1])/d0))}
   else if(sc>1){tx+=e.clientX-pr[0];ty+=e.clientY-pr[1]}
   ap()});
  const up=e=>{pts.delete(e.pointerId);if(sc<=1.02){sc=1;tx=ty=0;ap()}};
  o.addEventListener('pointerup',up);o.addEventListener('pointercancel',up);
  im.addEventListener('dblclick',()=>{sc=sc>1?1:2.5;if(sc===1)tx=ty=0;ap()});
  const close=()=>{o.classList.remove('on');setTimeout(()=>o.remove(),200)};
  $('[data-x]',o).onclick=close;
  $('[data-s]',o).onclick=()=>{const ok=Native.sync('saveImage',name,mime,b64);toast(ok?L('Сохранено в «Загрузки»'):L('Не удалось сохранить'))};
  $('[data-h]',o).onclick=()=>Native.sync('shareImage',name,mime,b64);
  document.body.append(o);requestAnimationFrame(()=>o.classList.add('on'))}
 function viewText(p){
  const t=String(p.text||'');if(!t.trim()){toast(L('Файл пустой'));return}
  const s=sheet('<h2 style="margin-bottom:8px;overflow-wrap:anywhere"></h2><pre class="attt"></pre><div class="two"><button class="btn ghost" data-c>'+L('Копировать')+'</button><button class="btn" data-h>'+L('Поделиться')+'</button></div>');
  $('h2',s).textContent=p.name||L('Файл');$('.attt',s).textContent=t;
  $('[data-c]',s).onclick=()=>{if(typeof Sx!=='undefined')Sx.copyToast(t)};
  $('[data-h]',s).onclick=()=>{if(typeof Sx!=='undefined')Sx.file(p.name||'file.txt','text/plain',t)}}
 function paint(d,m){
  if(!d||!m||m.r!=='u')return;
  const old=d.querySelector('.atr');if(old)old.remove();
  const ps=(m.parts||[]).filter(p=>p&&(p.k==='image'||p.k==='pdf'||(p.k==='text'&&p.name)));
  if(!ps.length)return;
  const row=el('<div class="atr"></div>');
  ps.forEach(p=>{
   const b=el('<button type="button" class="atc"></button>');
   if(p.k==='image'){
    b.classList.add('im');const im=document.createElement('img');im.alt='';im.decoding='async';im.loading='lazy';
    const dd=data(p);if(dd)im.src='data:'+(p.mime||'image/jpeg')+';base64,'+dd;else b.classList.add('gone');
    b.append(im);b.setAttribute('aria-label',L('Фото')+(p.name?': '+p.name:''));b.onclick=()=>viewImage(p)}
   else{
    b.innerHTML=ic('file')+'<span><b></b><small></small></span>';
    $('b',b).textContent=p.name||L('Файл');
    $('small',b).textContent=p.k==='pdf'?'PDF':fmt(new Blob([p.text||'']).size);
    b.onclick=p.k==='pdf'?()=>toast(L('PDF передан модели, просмотр здесь не поддерживается')):()=>viewText(p)}
   row.append(b)});
  const bd=d.querySelector('.bd');d.insertBefore(row,bd||d.firstChild)}
 Hooks.on('msg:render',paint);
 return{paint}})();
