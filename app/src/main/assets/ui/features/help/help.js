/* ===== СПРАВКА: «Что такое Kairema» — полная инструкция простыми словами =====
   Экран SCREENS.help. Открыть из кода: Help.open() (список) или Help.open('terminal') (сразу статья).
   Тексты лежат в help-data.js (HELP_DATA), здесь только отрисовка. Строится через DOM/textContent, HTML из данных не вставляется.
   Кнопки входа: карточка в Настройках (settings:rendered), «?» в Терминале и в Памяти.
   Убрать модуль: удалить папку features/help и её строки в index.html (кнопка «?» в терминале спрячется сама). */
i18nAdd({"Справка и инструкции":"Help and guides","Как пользоваться Kairema простыми словами":"How to use Kairema in plain words","Справка":"Help","Найти в справке":"Search help","Ничего не нашлось. Попробуйте другое слово.":"Nothing found. Try another word.","Разделы":"Sections","Что это":"What it is","Скопировано":"Copied","Нажмите, чтобы скопировать":"Tap to copy","Частые вопросы":"FAQ","Слова":"Words","Читать дальше":"Read next","Все разделы":"All sections","Что такое терминал":"What is the terminal","Подсказка":"Tip","Осторожно":"Careful","Начните с «Быстрый старт», если приложение у вас впервые.":"Start with “Quick start” if this is your first time."});
const Help=(()=>{
 const D=()=>typeof HELP_DATA!=='undefined'?HELP_DATA:[];
 const mk=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!=null)e.textContent=txt;return e};
 const byId=id=>D().find(s=>s.id===id);

 /* Свои значки разделов: линия 1.8, сетка 24, цвет из токенов (--hc). Не эмодзи. */
 const ICON={
  book:'<path d="M5 4.5h10.5A2.5 2.5 0 0 1 18 7v12.5H7.5A2.5 2.5 0 0 1 5 17z"/><path d="M5 17a2.5 2.5 0 0 1 2.5-2.5H18"/><path d="M10 8.5h4"/>',
  start:'<path d="M12 3c3.2 2 5 5.2 5 8.6 0 2-.6 3.7-1.6 5.1H8.6C7.6 15.300 7 13.600 7 11.600 7 8.200 8.800 5 12 3z"/><circle cx="12" cy="10" r="1.6"/><path d="M8.600 16.700 6.500 20M15.400 16.700 17.500 20M12 17v3.500"/>',
  providers:'<path d="M9 3v5M15 3v5"/><path d="M6.500 8h11v3a5.500 5.500 0 0 1-11 0z"/><path d="M12 16.500V21"/>',
  plus:'<rect x="3.500" y="3.500" width="17" height="17" rx="5"/><path d="M12 8v8M8 12h8"/>',
  search:'<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c2.600 2.500 3.600 5.300 3.600 8.500s-1 6-3.600 8.500c-2.600-2.500-3.600-5.300-3.600-8.500s1-6 3.600-8.500z"/>',
  memory:'<circle cx="7" cy="7" r="2.500"/><circle cx="17" cy="9" r="2.500"/><circle cx="9" cy="17.500" r="2.500"/><path d="M9 8.200l6 .6M7.700 9.500l.9 5.500M15.600 11.200l-5 4.600"/>',
  templates:'<path d="M6 3.500h9l3.500 3.500v13.500H6z"/><path d="M14.500 3.500V7.500h4"/><path d="M11.500 11l-2 6"/>',
  terminal:'<rect x="3" y="4.500" width="18" height="15" rx="3.500"/><path d="M7 10l3 2.500L7 15M12.500 15H17"/>',
  agent:'<rect x="5" y="8" width="14" height="10.500" rx="3.500"/><path d="M12 8V4.500"/><circle cx="12" cy="3.600" r="1"/><circle cx="9.200" cy="13" r="1"/><circle cx="14.800" cy="13" r="1"/><path d="M9.500 16h5"/>',
  backup:'<path d="M12 3.500l7 2.500v5.500c0 4.200-2.800 7.500-7 9-4.200-1.500-7-4.800-7-9V6z"/><path d="M12 8.500v6M9.500 12.200l2.500 2.500 2.500-2.500"/>',
  cost:'<circle cx="12" cy="12" r="8.500"/><path d="M14.800 9.200c-.5-.9-1.500-1.400-2.800-1.400-1.600 0-2.700.8-2.700 2 0 3 5.700 1.300 5.700 4.200 0 1.200-1.200 2.100-2.900 2.100-1.400 0-2.500-.6-3-1.600M12 6.500v1.300M12 16.200v1.300"/>',
  trouble:'<circle cx="12" cy="12" r="8.500"/><circle cx="12" cy="12" r="3.300"/><path d="M6 6l3.700 3.700M18 6l-3.700 3.700M6 18l3.700-3.700M18 18l-3.700-3.700"/>',
  words:'<path d="M4.500 5.500h6.500a1.500 1.500 0 0 1 1 .4v13.100a1.500 1.500 0 0 0-1-.4H4.500z"/><path d="M19.500 5.500H13a1.500 1.500 0 0 0-1 .4v13.100a1.500 1.500 0 0 1 1-.4h6.500z"/>'};
 const HUE={start:'--y',providers:'--blue',plus:'--g',search:'--blue',memory:'--g',templates:'--y',terminal:'--tx',agent:'--blue',backup:'--g',cost:'--y',trouble:'--r',words:'--tx2',book:'--blue'};
 const icon=(k,cls)=>{const w=mk('span','hp-ico '+(cls||''));w.style.setProperty('--hc','var('+(HUE[k]||'--tx')+')');w.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(ICON[k]||ICON.book)+'</svg>';return w};
 const copy=async t=>{try{await navigator.clipboard.writeText(t)}catch(e){const a=mk('textarea');a.value=t;document.body.append(a);a.select();try{document.execCommand('copy')}catch(_){}a.remove()}toast(L('Скопировано'))};
 /* ---- блоки статьи ---- */
 function block(x){
  const w=mk('div','hp-blk');
  if(x.h)w.append(mk('h3','hp-h',x.h));
  if(x.p)w.append(mk('p','hp-p',x.p));
  if(x.steps){const o=mk('ol','hp-steps');x.steps.forEach((s,i)=>{const li=mk('li');li.style.setProperty('--n','"'+(i+1)+'"');li.append(mk('span','hp-n',String(i+1)),mk('span','hp-st',s));o.append(li)});w.append(o)}
  if(x.list){const u=mk('ul','hp-list');x.list.forEach(s=>u.append(mk('li','',s)));w.append(u)}
  if(x.tip||x.warn){const k=x.warn?'warn':'tip',t=x.warn||x.tip;const n=mk('div','hp-note '+k);n.append(mk('b','',L(k==='warn'?'Осторожно':'Подсказка')),mk('span','',t));w.append(n)}
  if(x.code){const c=mk('div','hp-codes');x.code.forEach(s=>{const b=mk('button','hp-code');b.type='button';b.title=L('Нажмите, чтобы скопировать');b.append(mk('code','',s),mk('span','hp-cp','⧉'));b.onclick=()=>copy(s);c.append(b)});w.append(c)}
  if(x.faq){const f=mk('div','hp-faq');x.faq.forEach(q=>{const d=mk('details','hp-q');d.append(mk('summary','',q[0]),mk('p','',q[1]));f.append(d)});w.append(mk('h3','hp-h',L('Частые вопросы')),f)}
  if(x.terms){const t=mk('dl','hp-terms');x.terms.forEach(q=>{t.append(mk('dt','',q[0]),mk('dd','',q[1]))});w.append(t)}
  return w}
 const plain=s=>{const o=[s.t,s.s,s.lead];s.b.forEach(x=>{['h','p','tip','warn'].forEach(k=>x[k]&&o.push(x[k]));(x.steps||[]).forEach(v=>o.push(v));(x.list||[]).forEach(v=>o.push(v));(x.faq||[]).forEach(v=>o.push(v[0],v[1]));(x.terms||[]).forEach(v=>o.push(v[0],v[1]))});return o.join(' ').toLowerCase()};
 /* ---- статья ---- */
 function article(b,id,d){
  const s=byId(id);if(!s)return false;
  d.hpArt=true;b.textContent='';b.classList.add('hp-pg');
  const hero=mk('div','hp-art-hero');hero.append(icon(s.e,'big'),mk('h1','',s.t),mk('p','',s.lead));b.append(hero);
  s.b.forEach((x,i)=>{const e=block(x);e.style.setProperty('--i',i);b.append(e)});
  const all=D(),k=all.findIndex(v=>v.id===id),nx=all[k+1];
  const nav=mk('div','hp-nav');
  const home=mk('button','hp-navb',L('Все разделы'));home.type='button';home.onclick=()=>{d.r=()=>index(b,d);d.r()};nav.append(home);
  if(nx){const n=mk('button','hp-navb pri',L('Читать дальше')+': '+nx.t);n.type='button';n.onclick=()=>{article(b,nx.id,d);b.scrollTop=0};nav.append(n)}
  b.append(nav);b.scrollTop=0;return true}
 /* ---- список разделов ---- */
 function index(b,d){
  d.hpArt=false;b.textContent='';b.classList.add('hp-pg');b.scrollTop=0;
  const hero=mk('div','hp-hero');hero.append(icon('book','big'),mk('h1','',L('Справка')),mk('p','',L('Как пользоваться Kairema простыми словами')));
  const q=mk('input','hp-search');q.type='search';q.placeholder=L('Найти в справке');q.autocomplete='off';q.setAttribute('aria-label',L('Найти в справке'));
  const g=mk('div','hp-grid'),em=mk('p','hp-empty',L('Ничего не нашлось. Попробуйте другое слово.'));em.hidden=true;
  const cards=D().map((s,i)=>{const c=mk('button','hp-card');c.type='button';c.style.setProperty('--i',i);c.dataset.id=s.id;c.append(icon(s.e),mk('b','',s.t),mk('small','',s.s));c.onclick=()=>{article(b,s.id,d);d.r=()=>article(b,s.id,d)};return{c,s,tx:plain(s)}});
  cards.forEach(x=>g.append(x.c));
  q.oninput=()=>{const t=q.value.trim().toLowerCase();let n=0;cards.forEach(x=>{const ok=!t||x.tx.includes(t);x.c.hidden=!ok;if(ok)n++});em.hidden=n>0};
  b.append(hero,q,mk('div','sh',L('Разделы')),g,em)}
 function open(id){
  let first=true;
  const d=page('help',L('Справка'),(b,d)=>{
   const s=first&&id&&byId(id);first=false;
   if(s)article(b,id,d);else index(b,d)});
  /* «Назад» (кнопка и системная): из статьи в список справки, из списка закрыть. */
  const real=d.close;
  d.close=()=>{if(d.hpArt){d.r=()=>index($('.scroll',d),d);d.r()}else real()};
  $('[data-bk]',d).onclick=()=>d.close();
  return d}
 Hooks.on('app:ready',()=>{SCREENS.help=open});
 /* Карточка в Настройках: отдельная заметная кнопка над «О приложении». */
 Hooks.on('settings:rendered',v=>{
  if($('[data-help-go]',v))return;
  const ab=$('[data-go="about"]',v),pf=$('.pf',v);
  const r=el(`<button class="card hp-set" data-help-go><span class="hp-set-i">${ic('chat')}</span><span class="m"><b></b><small></small></span>${ic('chevR')}</button>`);
  $('b',r).textContent=L('Справка и инструкции');$('small',r).textContent=L('Как пользоваться Kairema простыми словами');
  r.onclick=()=>open();
  if(pf)pf.insertAdjacentElement('afterend',r);else if(ab)ab.insertAdjacentElement('beforebegin',r)});
 /* «?» на экране «Память». */
 Hooks.on('app:ready',()=>{
  const prev=SCREENS.memory;if(!prev||prev.__help)return;
  const w=(...a)=>{const d=prev(...a);try{const top=$('.top',d);if(top&&!$('[data-help-q]',top)){const q=mk('button','ib tm-q','?');q.dataset.helpQ='1';q.setAttribute('aria-label',L('Справка'));q.onclick=()=>open('memory');top.append(q)}}catch(e){}return d};
  w.__help=1;SCREENS.memory=w});
 return{open,list:()=>D().map(s=>s.id)}})();
