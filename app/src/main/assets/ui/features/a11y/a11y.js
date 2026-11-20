/* ===== ДОСТУПНОСТЬ =====
   • Размер текста и интерфейса: Настройки → «Размер текста» (100%, 115%, 130%). Применяется ко всему приложению (CSS zoom), хранится в kairema.a11y.v1.
   • Подписи для TalkBack: кнопки без текста и без aria-label получают подпись из title или из таблицы известных кнопок;
     окна (.sheet) получают role="dialog". Следит за появлением новых элементов (MutationObserver).
   • Уважает системную настройку «уменьшить анимации» (prefers-reduced-motion): анимации сокращаются.
   Убрать модуль: удалить папку и строки в index.html. */
const A11y=(()=>{
 const K='kairema.a11y.v1',cfg={zoom:1};
 try{Object.assign(cfg,JSON.parse(localStorage.getItem(K)||'{}'))}catch(e){}
 const save=()=>{try{localStorage.setItem(K,JSON.stringify(cfg))}catch(e){}};
 i18nAdd({"Размер текста":"Text size","Крупнее, если мелко читать":"Larger if the text is hard to read","Обычный":"Normal","Крупный":"Large","Очень крупный":"Extra large","Назад":"Back","Закрыть":"Close","Меню":"Menu","Готово":"Done"});
 const apply=()=>{const z=[1,1.15,1.3].includes(+cfg.zoom)?+cfg.zoom:1;document.documentElement.style.zoom=z===1?'':String(z);document.documentElement.dataset.zoom=String(z)};
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
 function panel(){
  const s=sheet('<h2></h2><p class="sub" style="margin:6px 0 10px"></p><div class="cdr" data-z></div><button class="btn" data-ok style="width:100%;margin-top:12px"></button>');
  $('h2',s).textContent=L('Размер текста');$('.sub',s).textContent=L('Крупнее, если мелко читать');$('[data-ok]',s).textContent=L('Готово');
  const bx=$('[data-z]',s),draw=()=>{bx.innerHTML='';[[1,'Обычный'],[1.15,'Крупный'],[1.3,'Очень крупный']].forEach(([v,t])=>{const x=el('<button class="cdg"></button>');x.textContent=L(t)+' '+Math.round(v*100)+'%';x.classList.toggle('on',+cfg.zoom===v);x.onclick=()=>{cfg.zoom=v;save();apply();draw()};bx.append(x)})};draw();
  $('[data-ok]',s).onclick=()=>s.close()}
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-a11y-s]',v))return;
  const r=el('<button class="sr" data-a11y-s><span class="si c">'+ic('tpl')+'</span><span class="m"><b></b><small></small></span>'+ic('chevR')+'</button>');
  $('b',r).textContent=L('Размер текста');$('small',r).textContent=L('Крупнее, если мелко читать');r.onclick=panel;ab.before(r)});
 return{cfg,apply,scan,label,panel}})();
