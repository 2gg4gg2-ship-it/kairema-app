/* ===== НАСТРОЙКИ: раскладка как у профессиональных приложений =====
   Принципы (Android Settings Guidelines, Material 3, Apple HIG, чёрно-белая система Geist):
   • сверху «кто вы»: профиль и аккаунт одной карточкой;
   • сразу под ним ИИ и подключения: провайдеры сверху (с числом подключённых), потом поиск, память, шаблоны, роли; «Основное»: Поиск (вкл/выкл) и Тема (какая);
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
  {t:'ИИ и подключения',k:['add','adds','mem','tpl','roles']},
  {t:'Основное',k:['web','theme'],live:1},
  {t:'Агент и терминал',k:['coder-s','fd']},
  {t:'Чат и вид',k:['org-s','ca','feel','feels']},
  {t:'Данные',k:['cost','backup','log']},
  {t:'Отдых',k:['game-go']}];
 const ADV=['qh','qc','rag'],HELP=['hp','upd','about'],QUICK='prov';
 const STACK='<svg class="i" viewBox="0 0 24 24"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 13l9 5 9-5"/></svg>';
 /* Свои значки (линия 2px, как у остальных): чтобы строки не сливались в одинаковые «плюс в квадрате». */
 const P={
  add:'<path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5 4 4 0 0 1 17.5 18H7z"/><path d="M12 15v-5M9.5 12l2.5-2.5 2.5 2.5"/>',
  adds:'<circle cx="11" cy="11" r="7"/><path d="M21 21l-4.5-4.5M11 8v6M8 11h6"/>',
  roles:'<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><path d="M14.5 8l-5 8"/>',
  fd:'<rect x="4" y="3" width="16" height="18" rx="3"/><path d="M12 7v6M9 10h6M9 17h6"/>',
  ca:'<path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5"/>',
  'a11y-s':'<path d="M4 7V5h16v2M12 5v14M9 19h6"/>',
  feel:'<rect x="8" y="4" width="8" height="16" rx="2"/><path d="M4 9v6M20 9v6"/>',
  feels:'<path d="M11 5L6 9H3v6h3l5 4V5z"/><path d="M15.5 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12"/>',
  backup:'<path d="M3 4h18v4H3zM5 8v12h14V8M10 12h4"/>',
  qh:'<path d="M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z"/>',
  'game-go':'<rect x="3" y="7" width="18" height="11" rx="4"/><path d="M8 10v5M5.5 12.5h5"/><circle cx="15.5" cy="11" r=".8"/><circle cx="18" cy="14" r=".8"/>',
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
 /* Живое состояние в самой строке: у «Поиска» Включён/Выключен (переключатель справа), у «Провайдеров ИИ» сколько подключено */
 function live(e,k){
  if(k==='web'){
   const b=e.querySelector('b'),s=e.querySelector('small'),sw=e.querySelector('.sw');
   if(b)b.textContent='Поиск';
   const upd=()=>{if(s&&sw)s.textContent=sw.classList.contains('on')?'Включён':'Выключен'};
   upd();e.addEventListener('click',()=>setTimeout(upd,60))}}
 function apply(box){
  if(!box||box.querySelector(':scope>.sx'))return;
  const rows=new Map(),extra=[];
  [...box.querySelectorAll('.sr,.pill,.card.pf,.card.hp-set')].forEach(e=>{const k=key(e);if(!rows.has(k))rows.set(k,e);else extra.push(e)});
  const take=k=>{const e=rows.get(k);if(e)rows.delete(k);return e};
  const root=div('sx');
  /* 1. кто вы */
  const pf=take('prof'),ac=take('acc');
  if(pf||ac){const g=group([pf,ac].filter(Boolean));g.classList.add('sx-id');root.append(g)}
  /* 2. сколько провайдеров подключено: показываем в строке «Провайдеры ИИ», старая плитка «Сервисы» не нужна */
  const nm=(k,t,sub)=>{const e=rows.get(k);if(!e)return;const b=e.querySelector('b'),sm=e.querySelector('small');if(b)b.textContent=t;if(sm&&sub)sm.textContent=sub};
  nm('add','Провайдеры ИИ','Название, API URL и ключ');nm('adds','Провайдер поиска','Подключение поиска в интернете');
  const pv=take(QUICK);
  if(pv){const m=((pv.textContent||'').match(/\d+/)||['0'])[0],a=rows.get('add'),sm=a&&a.querySelector('small');
   if(sm&&m!=='0')sm.textContent=(typeof L==='function'?L('Подключено: '):'Подключено: ')+m;pv.remove()}
  /* 3. группы по смыслу: сначала ИИ и подключения (провайдеры сверху), потом основное */
  SEC.forEach(s=>{const r=s.k.map(take).filter(Boolean);if(r.length){if(s.live)r.forEach((e,i)=>live(e,s.k[i]));root.append(head(s.t),group(r))}});
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
i18nAdd({"Отдых":"Break","ИИ и подключения":"AI and connections","Основное":"Main","Провайдеры ИИ":"AI providers","Провайдер поиска":"Search provider","Название, API URL и ключ":"Name, API URL and key","Подключение поиска в интернете":"Web search connection","Подключено: ":"Connected: ","Агент и терминал":"Agent and terminal","Чат и вид":"Chat and appearance","Данные":"Data","Дополнительно":"Advanced","Помощь":"Help","Прочее":"Other","Сервисы":"Services","Поиск":"Search","Включён":"On","Выключен":"Off","Активно: ":"Active: "});
