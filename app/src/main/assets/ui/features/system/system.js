/* ===== СИСТЕМА: отступы под статус-бар, системная тема =====
   Kotlin (com.kairema.app.system.SystemBridge) присылает размеры системных панелей и тему телефона.
   Приложение занимает весь экран, сверху остаётся пустое место под время, батарею и сеть. */
const Sys=(()=>{
 const B=window.KairemaSysBridge,root=document.documentElement;
 let dark=null;try{if(B)dark=!!B.dark()}catch(e){}
 const api={
  get dark(){return dark},
  /* t, b: отступы под статус-бар и панель навигации; k: высота клавиатуры (0, если закрыта). Стили: system.css */
  insets(t,b,k){nat=[t,b,k||0];est=0;if(k>0)try{localStorage.setItem('kairema.kbh',String(Math.round(k)))}catch(e){}paint(t,b,k)},
  /* Запасной путь (см. ниже): оценка высоты клавиатуры, если система её не сообщила */
  _est(k){est=1;paint(nat[0],nat[1],k)}};
 let nat=[0,0,0],est=0,base=innerHeight;
 const paint=(t,b,k)=>{t=B?Math.max(t,34)+34:t;k=k||0;root.style.setProperty('--sat',t+'px');root.style.setProperty('--sab',b+'px');root.style.setProperty('--kb',k+'px');
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
 /* Поднимаем сразу при фокусе (по высоте, запомненной с прошлого раза), не дожидаясь ответа системы: так ввод не «ползёт» с задержкой.
    Реальные данные Kotlin потом уточняют высоту. Опускаем сразу при потере фокуса. */
 const known=()=>{let k=0;try{k=+localStorage.getItem('kairema.kbh')||0}catch(e){}return k>=150&&k<=innerHeight*.6?k:Math.round(innerHeight*.4)};
 addEventListener('focusin',()=>{if(!isIn()||root.classList.contains('kb')||innerHeight<base*.85)return;api._est(known())});
 addEventListener('focusout',()=>setTimeout(()=>{if(est&&!isIn()){est=0;paint(nat[0],nat[1],0)}},60));
 if(window.matchMedia){try{matchMedia('(prefers-color-scheme:dark)').addEventListener('change',e=>{if(!B)api.system(e.matches)})}catch(e){}}
 return api})();
