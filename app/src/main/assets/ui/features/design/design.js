/* ===== ДИЗАЙН: раскладка Настроек мозаикой и стартовые плитки пустого чата =====
   Настройки: группы строк получают класс mz, а каждая строка размер (w6 широкая, w4, w2 узкая) и цвет. Строки, которых нет в таблице,
   остаются обычными плитками на половину ширины, поэтому новые модули не ломают вид. Стили: features/design/design.css.
   Пустой чат: «Чем помочь?» и плитки разного размера, нажатие вставляет заготовку в поле ввода.
   Убрать: удалить папку features/design и её строки в index.html. */
i18nAdd({"Чем помочь?":"How can I help?","Выберите заготовку или просто напишите":"Pick a starter or just type","Написать код":"Write code","Рабочая страница, скрипт, формула":"A working page, script or formula","Объяснить просто":"Explain simply","Сложное простыми словами":"Complex things in plain words","Перевести":"Translate","Текст на другой язык":"Text into another language","Составить план":"Make a plan","Шаги и сроки для любой задачи":"Steps and deadlines for any task","Идеи":"Ideas","Придумать варианты":"Come up with options","Написать код: ":"Write code: ","Объясни простыми словами: ":"Explain in plain words: ","Переведи на английский: ":"Translate to English: ","Составь пошаговый план: ":"Make a step by step plan: ","Предложи 10 идей: ":"Give me 10 ideas: "});
const Design=(()=>{
 /* строка настроек (по атрибуту) -> [размер, цвет, высокая плитка] */
 const MAP={
  '[data-theme]':['w6','--y'],'[data-log]':['w2','--r'],'[data-cost]':['w2','--g'],'[data-backup]':['w2','--blue'],
  '[data-roles]':['w4','--blue',1],'[data-fd]':['w2','--y'],'[data-qh]':['w3','--g'],'[data-qc]':['w3','--r'],'[data-go="about"]':['w6','--tx2'],
  '[data-go="mem"]':['w4','--blue',1],'[data-go="tpl"]':['w2','--y']};
 const TINT=['--blue','--g','--y','--r'];
 function mosaic(v){
  $$('.st .grp',v).forEach(g=>{
   if(g.classList.contains('mz'))return;
   const rows=[...g.children].filter(x=>x.classList.contains('sr'));
   const hasPill=!!$('.pill',g),isAcc=!!$('[data-acc]',g),isTg=!!$('[data-tg]',g);
   const big=!!$('[data-theme]',g),duo=!hasPill&&!isAcc&&!isTg&&rows.length===2;
   if(!(big||duo))return;
   g.classList.add('mz');let k=0;
   rows.forEach(r=>{
    let cls='',col=TINT[k%TINT.length],tall=0;
    for(const sel in MAP){if(r.matches(sel)){const m=MAP[sel];cls=m[0]==='w3'?'':m[0];col=m[1];tall=m[2];break}}
    if(!cls&&duo)cls=k===0?'w4':'w2';
    if(cls)r.classList.add(cls);if(tall)r.classList.add('t');
    r.style.setProperty('--c','var('+col+')');k++})})}
 Hooks.on('settings:grouped',mosaic);
 /* стартовые плитки */
 const TILES=[
  {k:'code',i:'term',b:'Написать код',s:'Рабочая страница, скрипт, формула',c:'--blue',w:'w4 tall',p:'Написать код: '},
  {k:'explain',i:'brain',b:'Объяснить просто',s:'Сложное простыми словами',c:'--y',w:'w2',p:'Объясни простыми словами: '},
  {k:'tr',i:'globe',b:'Перевести',s:'Текст на другой язык',c:'--g',w:'w2',p:'Переведи на английский: '},
  {k:'plan',i:'doc',b:'Составить план',s:'Шаги и сроки для любой задачи',c:'--r',w:'w4',p:'Составь пошаговый план: '},
  {k:'ideas',i:'tpl',b:'Идеи',s:'Придумать варианты',c:'--blue',w:'w6',p:'Предложи 10 идей: '}];
 function starters(v){
  const box=$('.msgs',v),e=box&&$('.empty',box);if(!e||e.dataset.dz)return;
  e.dataset.dz='1';e.className='dz-wrap';e.innerHTML='';
  const h=el('<div class="dz-hello"><span></span><small></small></div>');$('span',h).textContent=L('Чем помочь?');$('small',h).textContent=L('Выберите заготовку или просто напишите');
  const g=el('<div class="dz-g"></div>');
  TILES.forEach((t,i)=>{
   const b=el('<button type="button" class="dz-t"><i></i><span><b></b><small></small></span></button>');
   b.className='dz-t '+t.w;b.style.setProperty('--c','var('+t.c+')');b.style.setProperty('--i',i);
   $('i',b).innerHTML=ic(t.i);$('b',b).textContent=L(t.b);$('small',b).textContent=L(t.s);
   b.onclick=()=>{const c=Chat.cmp;if(!c)return;c.setText(L(t.p));const ta=$('textarea',c);if(ta){ta.focus();try{ta.setSelectionRange(ta.value.length,ta.value.length)}catch(x){}}};
   g.append(b)});
  e.append(h,g)}
 Hooks.on('chat:rendered',starters);
 return{mosaic,starters}})();
