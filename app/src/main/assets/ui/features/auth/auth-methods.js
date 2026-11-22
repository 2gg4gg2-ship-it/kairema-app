/* ===== ЯДРО АККАУНТА: реестр способов входа (модуль auth) =====
   Экран «Вход или регистрация» сам ничего не знает о способах: он рисует всё, что добавлено сюда.
   Новый способ входа = новый файл с вызовом AuthMethods.add({...}) и одна строка в index.html. Ничего больше не правится.
   Способ: {id, order (меньше = выше), show(ctx) -> bool (необязательно), render(box, ctx)}.
   ctx: {S2 (общее состояние экрана: S2.email), d (страница), done() (вход выполнен, закрыть экран),
         redraw() (перерисовать экран), email(v) (подставить почту и перейти к вводу кода/почты)}.
   Сейчас есть: method-email.js (почта и код, он же регистрация), method-device.js (аккаунты этого телефона). */
const AuthMethods=(()=>{
 const list=[];
 return{
  add(m){const i=list.findIndex(x=>x.id===m.id);if(i>=0)list.splice(i,1);list.push(m);list.sort((a,b)=>(a.order||50)-(b.order||50))},
  all(){return list.slice()}}})();
