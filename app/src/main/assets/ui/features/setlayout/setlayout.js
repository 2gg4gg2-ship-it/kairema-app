/* ===== НАСТРОЙКИ: раскладка как у профессиональных приложений =====
   Принципы (Android Settings Guidelines, Material 3, Apple HIG, чёрно-белая система Geist):
   • сверху «кто вы»: профиль и аккаунт одной карточкой;
   • три равные плитки только там, где есть живое состояние: Провайдеры (сколько подключено), Поиск в сети (вкл/выкл), Тема (какая);
   • дальше короткие группы-списки по смыслу (в каждой до 5 строк), заголовок группы маленькими буквами;
   • редкое (мелкие настройки поведения) спрятано в «Дополнительно» и свёрнуто;
   • подпись у строки в одну строку (у переключателя в две), значения вместо длинных описаний;
   • помощь и сведения о приложении внизу, «Выйти» отдельной серой кнопкой.
   Строки других модулей не пропадают: неизвестные собираются в группу «Прочее». Идентификатор строки: data-go, data-tg или имя data-атрибута.
   Вызывается из core/settings.js (setView после groupRows). Классы только с префиксом sx- (короткие .bn/.tg/.stl заняты другими модулями).
   Убрать модуль: удалить папку и строки в index.html (настройки вернутся к обычному списку). Тест: docs/tests/sx044.test.js */
const SetLayout=(()=>{
 const KEY='kairema.setadv';
 const SEC=[
  {t:'ИИ',k:['add','adds','mem','tpl','roles']},
  {t:'Агент и терминал',k:['coder-s','fd']},
  {t:'Чат и вид',k:['org-s','ca','a11y-s','feel','feels']},
  {t:'Данные',k:['cost','backup','log']}];
 const ADV=['qh','qc','rag'],HELP=['hp','upd','about'],QUICK=['prov','web','theme'];
 const STACK='<svg class="i" viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>';
 /* Свои значки (линия 2px, как у остальных): чтобы строки не сливались в одинаковые «плюс в квадрате». */
 const P={
  adds:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M11 8v6M8 11h6"/>',
  roles:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M14.5 8l-5 8"/>',
  fd:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M12 7v6M9 10h6M9 17h6"/>',
  ca:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  'a11y-s':'<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
  feel:'<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4 9v6M20 9v6"/>',
  feels:'<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12"/>',
  backup:'<path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/>',
  qh:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  rag:'<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8l-5-5z"/><path d="M14 3v5h5M9 14h6M9 17h4"/>'};
 const key=e=>{
  if(e.matches('.card.pf'))return'prof';
  if(e.matches('.card.hp-set'))return'hp';
  if(e.matches('.out'))return'out';
  const d=e.dataset;
  if(d.go)return d.go;
  if(d.tg)return d.tg;
  const a=[...e.attributes].map(x=>x.name).find(n=>/^data-/.test(n));
  return a?a.slice(5):''};
 const div=c=>{const d=document.createElement('div');d.className=c;return d};
 const group=rows=>{const g=div('sx-g');rows.forEach(r=>{
  r.classList.add('sx-r');
  const k=key(r),si=r.querySelector('.si');
  if(si&&P[k])si.innerHTML='<svg class="i" viewBox="0 0 24 24">'+P[k]+'</svg>';
  g.append(r)});return g};
 const head=t=>{const h=div('sx-h');h.textContent=t;return h};
 function tile(e,k){
  e.classList.add('sx-t');
  if(k==='prov'){
   const m=((e.textContent||'').match(/\d+/)||['0'])[0],sv=e.querySelector('svg');
   e.textContent='';
   const ic=document.createElement('span');ic.className='si';ic.innerHTML=STACK;
   const mm=div('m'),b=document.createElement('b'),s=document.createElement('small');
   b.textContent='Сервисы';s.textContent='Активно: '+m;mm.append(b,s);
   e.append(ic,mm);if(sv)e.append(sv)}
  if(k==='web'){
   const b=e.querySelector('b'),s=e.querySelector('small'),sw=e.querySelector('.sw');
   if(b)b.textContent='Поиск';
   const upd=()=>{if(s&&sw)s.textContent=sw.classList.contains('on')?'Включён':'Выключен'};
   upd();e.addEventListener('click',()=>setTimeout(upd,60));
   if(sw)e.append(sw)}}
 function apply(box){
  if(!box||box.querySelector(':scope>.sx'))return;
  const rows=new Map(),extra=[];
  [...box.querySelectorAll('.sr,.pill,.card.pf,.card.hp-set')].forEach(e=>{const k=key(e);if(!rows.has(k))rows.set(k,e);else extra.push(e)});
  const take=k=>{const e=rows.get(k);if(e)rows.delete(k);return e};
  const root=div('sx');
  /* 1. кто вы */
  const pf=take('prof'),ac=take('acc');
  if(pf||ac){const g=group([pf,ac].filter(Boolean));g.classList.add('sx-id');root.append(g)}
  /* 2. живое состояние: три плитки */
  const q=QUICK.map(take).filter(Boolean);
  if(q.length){const g=div('sx-q');q.forEach((e,i)=>{tile(e,QUICK[i]);g.append(e)});root.append(g)}
  /* 3. группы по смыслу */
  SEC.forEach(s=>{const r=s.k.map(take).filter(Boolean);if(r.length){root.append(head(s.t),group(r))}});
  /* 4. остальные строки других модулей */
  const out=take('out'),adv=ADV.map(take).filter(Boolean),hp=HELP.map(take).filter(Boolean);
  const rest=[...rows.values()];rows.clear();
  if(rest.length)root.append(head('Прочее'),group(rest));
  /* 5. дополнительно (свёрнуто) */
  if(adv.length){
   const w=div('sx-adv'),b=document.createElement('button');b.type='button';b.className='sx-ah';
   b.innerHTML='<span>Дополнительно</span><em></em><svg class="i" viewBox="0 0 24 24"><path d="M6 9l6 6 6-6"/></svg>';
   b.querySelector('em').textContent=adv.length;
   const body=div('sx-ab'),inner=div('sx-ai');inner.append(group(adv));body.append(inner);
   let on=false;try{on=localStorage.getItem(KEY)==='1'}catch(e){}
   w.classList.toggle('on',on);b.setAttribute('aria-expanded',on?'true':'false');
   b.onclick=()=>{const v=!w.classList.contains('on');w.classList.toggle('on',v);b.setAttribute('aria-expanded',v?'true':'false');try{localStorage.setItem(KEY,v?'1':'0')}catch(e){}};
   w.append(b,body);root.append(w)}
  /* 6. помощь и сведения */
  if(hp.length)root.append(head('Помощь'),group(hp));
  if(out){out.classList.add('sx-out');root.append(out)}
  /* убрать опустевшие старые группы и заголовки, чужие блоки оставить после */
  [...box.children].forEach(c=>{
   if(c.matches('.sh')||((c.matches('.grp')||c.matches('.stl')||c.matches('.bento'))&&!c.querySelector('.sr,.pill,.card')))c.remove()});
  extra.forEach(e=>{if(!e.isConnected)return});
  box.prepend(root)}
 return{apply}})();
i18nAdd({"Агент и терминал":"Agent and terminal","Чат и вид":"Chat and appearance","Данные":"Data","Дополнительно":"Advanced","Помощь":"Help","Прочее":"Other","Сервисы":"Services","Поиск":"Search","Включён":"On","Выключен":"Off","Активно: ":"Active: "});
