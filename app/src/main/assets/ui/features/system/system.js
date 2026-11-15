/* ===== СИСТЕМА: статус-бар, клавиатура, системная тема =====
   Отступы под статус-бар, панель навигации и клавиатуру теперь применяет Kotlin (com.kairema.app.system.SystemBridge):
   он сдвигает сам WebView, поэтому здесь отступы нулевые и приходит только признак «клавиатура открыта» и тема телефона.
   JS больше ничего не угадывает: ни высоту клавиатуры, ни таймеры. */
const Sys=(()=>{
 const B=window.KairemaSysBridge,root=document.documentElement;
 let dark=null;try{if(B)dark=!!B.dark()}catch(e){}
 /* В приложении отступов в вёрстке нет с самого начала (не ждём первого ответа Kotlin) */
 if(B){root.style.setProperty('--sat','0px');root.style.setProperty('--sab','0px');root.style.setProperty('--kb','0px')}
 const api={
  get dark(){return dark},
  /* t, b: дополнительные отступы (из Kotlin приходят нули); k: высота клавиатуры в dp, 0 = закрыта. Стили: system.css */
  insets(t,b,k){
   k=k||0;
   root.style.setProperty('--sat',(t||0)+'px');root.style.setProperty('--sab',(b||0)+'px');root.style.setProperty('--kb','0px');
   const was=root.classList.contains('kb');root.classList.toggle('kb',k>0);
   if(k>0&&!was)requestAnimationFrame(()=>{const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName)){try{a.scrollIntoView({block:'nearest'})}catch(e){}}})},
  /* Оставлено для совместимости со старыми тестами: оценку высоты клавиатуры больше никто не делает */
  _est(){}};
 /* Системная тема изменилась (Kotlin) */
 api.system=d=>{dark=!!d;if(typeof S!=='undefined'&&S.theme==='auto'&&typeof applyTheme==='function')applyTheme()};
 /* Сказать Kotlin цвет фона и цвет значков статус-бара под текущую тему */
 api.sync=()=>{try{if(B)B.bars(root.dataset.theme!=='light')}catch(e){}};
 if(window.matchMedia){try{matchMedia('(prefers-color-scheme:dark)').addEventListener('change',e=>{if(!B)api.system(e.matches)})}catch(e){}}
 return api})();
