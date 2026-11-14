/* ===== СИСТЕМА: отступы под статус-бар, системная тема =====
   Kotlin (com.kairema.app.system.SystemBridge) присылает размеры системных панелей и тему телефона.
   Приложение занимает весь экран, сверху остаётся пустое место под время, батарею и сеть. */
const Sys=(()=>{
 const B=window.KairemaSysBridge,root=document.documentElement;
 let dark=null;try{if(B)dark=!!B.dark()}catch(e){}
 const api={
  get dark(){return dark},
  /* t, b: отступы под статус-бар и панель навигации; k: высота клавиатуры (0, если закрыта). Стили: system.css */
  insets(t,b,k){nat=[t,b,k||0];est=0;paint(t,b,k)},
  /* Запасной путь (см. ниже): оценка высоты клавиатуры, если система её не сообщила */
  _est(k){est=1;paint(nat[0],nat[1],k)}};
 let nat=[0,0,0],est=0,base=innerHeight;
 const paint=(t,b,k)=>{t=B?Math.max(t,30)+26:t;k=k||0;root.style.setProperty('--sat',t+'px');root.style.setProperty('--sab',b+'px');root.style.setProperty('--kb',k+'px');
   const was=root.classList.contains('kb');root.classList.toggle('kb',k>0);
   if(k>0&&!was)setTimeout(()=>{const a=document.activeElement;if(a&&/^(INPUT|TEXTAREA)$/.test(a.tagName)){try{a.scrollIntoView({block:'nearest'})}catch(e){}}},80)};
 /* Системная тема изменилась (Kotlin) */
 api.system=d=>{dark=!!d;if(typeof S!=='undefined'&&S.theme==='auto'&&typeof applyTheme==='function')applyTheme()};
 /* Сказать Kotlin цвет фона и цвет значков статус-бара под текущую тему */
 api.sync=()=>{try{if(B)B.bars(root.dataset.theme!=='light')}catch(e){}};
 /* Страховка для клавиатуры: если фокус в поле ввода, а ни WindowInsets, ни размер окна клавиатуру не показали
    (так бывает на некоторых прошивках), поднимаем экран на оценку 40% высоты. Реальные данные от Kotlin её заменяют.
    Если WebView сам уменьшился под клавиатуру (innerHeight упал), оценка не нужна. */
 const isIn=()=>{const a=document.activeElement;return !!a&&/^(INPUT|TEXTAREA)$/.test(a.tagName)};
 addEventListener('resize',()=>{if(!isIn())base=Math.max(base,innerHeight)});
 addEventListener('focusin',()=>{if(!isIn())return;setTimeout(()=>{
  if(!isIn()||root.classList.contains('kb')||innerHeight<base*.85)return;
  api._est(Math.round(innerHeight*.4))},700)});
 addEventListener('focusout',()=>setTimeout(()=>{if(est&&!isIn()){est=0;paint(nat[0],nat[1],0)}},200));
 if(window.matchMedia){try{matchMedia('(prefers-color-scheme:dark)').addEventListener('change',e=>{if(!B)api.system(e.matches)})}catch(e){}}
 return api})();
