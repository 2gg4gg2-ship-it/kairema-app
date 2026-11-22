/* ===== ДИЗАЙН: спокойный вид и стартовые плитки пустого чата =====
   Настройки и Справка оформлены только стилями (design.css): один цвет, ровные карточки, без пёстрых плиток.
   Пустой чат: «Чем помочь?» и плитки разного размера, нажатие вставляет заготовку в поле ввода.
   Убрать: удалить папку features/design и её строки в index.html. */
i18nAdd({"Чем помочь?":"How can I help?","Выберите заготовку или просто напишите":"Pick a starter or just type","Написать код":"Write code","Рабочая страница, скрипт, формула":"A working page, script or formula","Объяснить просто":"Explain simply","Сложное простыми словами":"Complex things in plain words","Перевести":"Translate","Текст на другой язык":"Text into another language","Составить план":"Make a plan","Шаги и сроки для любой задачи":"Steps and deadlines for any task","Идеи":"Ideas","Придумать варианты":"Come up with options","Написать код: ":"Write code: ","Объясни простыми словами: ":"Explain in plain words: ","Переведи на английский: ":"Translate to English: ","Составь пошаговый план: ":"Make a step by step plan: ","Предложи 10 идей: ":"Give me 10 ideas: "});
const Design=(()=>{
 /* стартовые плитки */
 const TILES=[
  {k:'code',i:'term',b:'Написать код',s:'Рабочая страница, скрипт, формула',w:'w6',p:'Написать код: '},
  {k:'explain',i:'brain',b:'Объяснить просто',s:'Сложное простыми словами',w:'w3',p:'Объясни простыми словами: '},
  {k:'tr',i:'globe',b:'Перевести',s:'Текст на другой язык',w:'w3',p:'Переведи на английский: '},
  {k:'plan',i:'doc',b:'Составить план',s:'Шаги и сроки для любой задачи',w:'w3',p:'Составь пошаговый план: '},
  {k:'ideas',i:'tpl',b:'Идеи',s:'Придумать варианты',w:'w3',p:'Предложи 10 идей: '}];
 function starters(v){
  const box=$('.msgs',v),e=box&&$('.empty',box);if(!e||e.dataset.dz)return;
  e.dataset.dz='1';e.className='dz-wrap';e.innerHTML='';
  const h=el('<div class="dz-hello"><span></span><small></small></div>');$('span',h).textContent=L('Чем помочь?');$('small',h).textContent=L('Выберите заготовку или просто напишите');
  const g=el('<div class="dz-g"></div>');
  TILES.forEach((t,i)=>{
   const b=el('<button type="button" class="dz-t"><i></i><span><b></b><small></small></span></button>');
   b.className='dz-t '+t.w;b.style.setProperty('--i',i);
   $('i',b).innerHTML=ic(t.i);$('b',b).textContent=L(t.b);$('small',b).textContent=L(t.s);
   b.onclick=()=>{const c=Chat.cmp;if(!c)return;c.setText(L(t.p));const ta=$('textarea',c);if(ta){ta.focus();try{ta.setSelectionRange(ta.value.length,ta.value.length)}catch(x){}}};
   g.append(b)});
  e.append(h,g)}
 Hooks.on('chat:rendered',starters);
 return{starters}})();
