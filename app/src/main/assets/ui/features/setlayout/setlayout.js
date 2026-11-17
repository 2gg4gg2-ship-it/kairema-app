/* ===== НАСТРОЙКИ: плитки вместо одного длинного столбца =====
   Строки-переходы (иконка, название, подпись, стрелка; без переключателя и полей) подряд в одной группе собираются в сетку
   плиток по две в ряд. Строки с переключателями, выбором и «Выйти» остаются списком. Чужие модули ничего не знают о плитках:
   они добавляют обычные строки .sr в событии settings:rendered, плитки получаются сами. Вызывается из core/settings.js (setView, после groupRows).
   Убрать модуль: удалить папку и строки в index.html (настройки вернутся к списку). Тест: docs/tests/draft.test.js */
const SetLayout=(()=>{
 const X='.sw,.qv,input,select,textarea,.seg,.chip';
 const isNav=c=>c.matches('.sr')&&!c.matches('.out')&&!!c.querySelector('.si')&&!!c.lastElementChild&&c.lastElementChild.matches('svg')&&!c.querySelector(X);
 function apply(box){
  if(!box)return;
  [...box.children].filter(g=>g.matches('.grp')).forEach(g=>{
   const kids=[...g.children],navs=kids.filter(isNav);
   if(!navs.length||(navs.length<2&&kids.length>navs.length))return;
   const tg=document.createElement('div');tg.className='stl';
   navs.forEach(n=>tg.append(n));
   if(!g.children.length)g.replaceWith(tg);
   else if(g.firstElementChild&&g.firstElementChild.matches('.pill'))g.after(tg);
   else g.before(tg)})}
 return{apply}})();
