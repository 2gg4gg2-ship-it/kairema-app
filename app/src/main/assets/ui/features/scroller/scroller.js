/* ===== КНОПКИ ЛИСТАНИЯ: маленькие «вверх» и «вниз» в чате =====
   Появляются, когда есть куда листать. Стоят над полем ввода справа.
   Убрать модуль: удалить папку features/scroller и её строки в index.html. */
i18nAdd({"В начало":"To top","В конец":"To bottom"});
Hooks.on('chat:rendered',v=>{
 const box=$('.msgs',v),cmp=$('.cmp',v);if(!box||!cmp||$('.scl',v))return;
 P.up=P.up||'<path d="M6 15l6-6 6 6"/>';P.dn=P.dn||'<path d="M6 9l6 6 6-6"/>';
 const w=el(`<div class="scl"><button type="button" data-u aria-label="В начало">${ic('up')}</button><button type="button" data-d aria-label="В конец">${ic('dn')}</button></div>`);
 v.append(w);
 const bu=$('[data-u]',w),bd=$('[data-d]',w);
 const place=()=>{w.style.bottom=(cmp.offsetHeight+16+(parseFloat(getComputedStyle(cmp).marginBottom)||0))+'px'};
 const upd=()=>{const max=box.scrollHeight-box.clientHeight;
  bu.classList.toggle('on',max>160&&box.scrollTop>120);
  bd.classList.toggle('on',max>160&&max-box.scrollTop>120)};
 const go=y=>{try{box.scrollTo({top:y,behavior:'smooth'})}catch(e){box.scrollTop=y}};
 bu.onclick=()=>go(0);bd.onclick=()=>go(box.scrollHeight);
 box.addEventListener('scroll',upd,{passive:true});
 if(window.ResizeObserver){const ro=new ResizeObserver(()=>{place();upd()});ro.observe(cmp);ro.observe(box)}
 new MutationObserver(upd).observe(box,{childList:true,subtree:true,characterData:true});
 place();upd()});
