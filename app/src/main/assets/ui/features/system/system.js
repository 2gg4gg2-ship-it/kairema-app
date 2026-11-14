/* ===== СИСТЕМА: отступы под статус-бар, системная тема =====
   Kotlin (com.kairema.app.system.SystemBridge) присылает размеры системных панелей и тему телефона.
   Приложение занимает весь экран, сверху остаётся пустое место под время, батарею и сеть. */
const Sys=(()=>{
 const B=window.KairemaSysBridge,root=document.documentElement;
 let dark=null;try{if(B)dark=!!B.dark()}catch(e){}
 const api={
  get dark(){return dark},
  insets(t,b){t=B?Math.max(t,28)+10:t;root.style.setProperty('--sat',t+'px');root.style.setProperty('--sab',b+'px')},
  /* Системная тема изменилась (Kotlin) */
  system(d){dark=!!d;if(typeof S!=='undefined'&&S.theme==='auto'&&typeof applyTheme==='function')applyTheme()},
  /* Сказать Kotlin цвет фона и цвет значков статус-бара под текущую тему */
  sync(){try{if(B)B.bars(root.dataset.theme!=='light')}catch(e){}}};
 if(window.matchMedia){try{matchMedia('(prefers-color-scheme:dark)').addEventListener('change',e=>{if(!B)api.system(e.matches)})}catch(e){}}
 return api})();
