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
  b.textContent='';b.classList.add('hp-pg');
  const hero=mk('div','hp-art-hero');hero.append(mk('span','hp-art-e',s.e),mk('h1','',s.t),mk('p','',s.lead));b.append(hero);
  s.b.forEach((x,i)=>{const e=block(x);e.style.setProperty('--i',i);b.append(e)});
  const all=D(),k=all.findIndex(v=>v.id===id),nx=all[k+1];
  const nav=mk('div','hp-nav');
  const home=mk('button','hp-navb',L('Все разделы'));home.type='button';home.onclick=()=>{d.r=()=>index(b,d);d.r()};nav.append(home);
  if(nx){const n=mk('button','hp-navb pri',L('Читать дальше')+': '+nx.t);n.type='button';n.onclick=()=>{article(b,nx.id,d);b.scrollTop=0};nav.append(n)}
  b.append(nav);b.scrollTop=0;return true}
 /* ---- список разделов ---- */
 function index(b,d){
  b.textContent='';b.classList.add('hp-pg');
  const hero=mk('div','hp-hero');hero.append(mk('span','hp-hero-e','📘'),mk('h1','',L('Справка')),mk('p','',L('Как пользоваться Kairema простыми словами')));
  const q=mk('input','hp-search');q.type='search';q.placeholder=L('Найти в справке');q.autocomplete='off';q.setAttribute('aria-label',L('Найти в справке'));
  const g=mk('div','hp-grid'),em=mk('p','hp-empty',L('Ничего не нашлось. Попробуйте другое слово.'));em.hidden=true;
  const cards=D().map((s,i)=>{const c=mk('button','hp-card');c.type='button';c.style.setProperty('--i',i);c.dataset.id=s.id;c.append(mk('span','hp-ce',s.e),mk('b','',s.t),mk('small','',s.s));c.onclick=()=>{article(b,s.id,d);d.r=()=>article(b,s.id,d)};return{c,s,tx:plain(s)}});
  cards.forEach(x=>g.append(x.c));
  q.oninput=()=>{const t=q.value.trim().toLowerCase();let n=0;cards.forEach(x=>{const ok=!t||x.tx.includes(t);x.c.hidden=!ok;if(ok)n++});em.hidden=n>0};
  b.append(hero,q,mk('div','sh',L('Разделы')),g,em)}
 function open(id){
  return page('help',L('Справка'),(b,d)=>{
   const s=id&&byId(id);
   if(s)article(b,id,d);else index(b,d)})}
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
