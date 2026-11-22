/* ===== ДОСТУПНОСТЬ =====
   • Размер текста: кнопка из настроек убрана в 0.46.2 (владелец не пользовался). Масштаб всегда 100%; размер можно менять системным масштабом шрифта Android.
   • Подписи для TalkBack: кнопки без текста и без aria-label получают подпись из title или из таблицы известных кнопок;
     окна (.sheet) получают role="dialog". Следит за появлением новых элементов (MutationObserver).
   • Уважает системную настройку «уменьшить анимации» (prefers-reduced-motion): анимации сокращаются.
   Убрать модуль: удалить папку и строки в index.html. */
const A11y=(()=>{
 const K='kairema.a11y.v1',cfg={zoom:1};
 try{Object.assign(cfg,JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){}
 const save=()=>{try{localStorage.setItem(K,JSON.stringify(cfg))}catch(e){}};
 i18nAdd({"Размер текста":"Text size","Крупнее, если мелко читать":"Larger if the text is hard to read","Обычный":"Normal","Крупный":"Large","Очень крупный":"Extra large","Назад":"Back","Закрыть":"Close","Меню":"Menu","Готово":"Done"});
 const apply=()=>{const z=1;document.documentElement.style.zoom=z===1?'':String(z);document.documentElement.dataset.zoom=String(z)};
 const KNOWN={'data-bk':'Назад','data-x':'Закрыть','data-cl':'Закрыть','data-m':'Меню'};
 const label=b=>{
  if(b.getAttribute('aria-label'))return;
  if((b.textContent||'').trim())return;
  let t=b.getAttribute('title');
  if(!t)for(const k in KNOWN)if(b.hasAttribute(k)){t=L(KNOWN[k]);break}
  if(t)b.setAttribute('aria-label',t)};
 const scan=root=>{
  if(!root||root.nodeType!==1)return;
  if(root.matches&&root.matches('button,[role=button]'))label(root);
  if(root.matches&&root.matches('.sheet:not([role])')){root.setAttribute('role','dialog');root.setAttribute('aria-modal','true')}
  root.querySelectorAll&&root.querySelectorAll('button:not([aria-label]),[role=button]:not([aria-label]),.sheet:not([role])').forEach(x=>{if(x.matches('.sheet')){x.setAttribute('role','dialog');x.setAttribute('aria-modal','true')}else label(x)})};
 const start=()=>{try{document.documentElement.lang=LANG==='en'?'en':'ru'}catch(e){}apply();scan(document.body);
  new MutationObserver(ms=>{ms.forEach(m=>m.addedNodes.forEach(scan))}).observe(document.body,{childList:true,subtree:true})};
 if(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.classList.add('rmotion');
 Hooks.on('app:ready',start);
 return{cfg,apply,scan,label}})();
