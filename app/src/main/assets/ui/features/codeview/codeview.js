/* ===== КОД В ОТВЕТАХ: компактный блок с номерами строк, полный код по нажатию =====
   Блок: шапка (язык, «развернуть», «копировать»), номера строк и код. Длинный код (больше 14 строк) показывает первые 12 строк,
   низ затухает, внизу «Показать все · N строк». Нажатие на блок или «развернуть» открывает весь код на отдельном экране
   (прокрутка в обе стороны, номера строк, кнопка «Копировать»). Короткий код показывается целиком.
   Вызывается из core md.js (mdBlocks) через CodeView.fill; если модуля нет, код рисуется как раньше.
   Убрать: удалить папку features/codeview и её строки в index.html. Тест: docs/tests/code031.test.py */
i18nAdd({"Показать все":"Show all","строк":"lines","Развернуть":"Expand","Код":"Code","Скопировано":"Copied"});
const CodeView=(()=>{
 const SHORT=14,HEAD=12;
 const IC={cp:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2.5"/><path d="M5 15V6.5A2.5 2.5 0 0 1 7.5 4H15"/></svg>',
  ex:'<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M14 4h6v6M10 20H4v-6M20 4l-7 7M4 20l7-7"/></svg>'};
 const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
 const nums=n=>{let s='';for(let i=1;i<=n;i++)s+=i+(i<n?'\n':'');return s};
 const copy=async text=>{let ok=false;try{if(typeof KairemaBridge!=='undefined'&&KairemaBridge.copyText)ok=KairemaBridge.copyText(text)!==false}catch(e){}
  if(!ok){try{await navigator.clipboard.writeText(text);ok=true}catch(e){}}
  try{toast(L(ok?'Скопировано':'Не удалось скопировать'))}catch(e){}};
 const btn=(k,label,fn)=>{const b=mk('button','cv-b');b.type='button';b.setAttribute('aria-label',L(label));b.innerHTML=IC[k];b.onclick=e=>{e.stopPropagation();fn()};return b};
 /* Весь код на отдельном экране. */
 function open(code,lang){
  const d=sub();d.classList.add('cv-pg');
  d.innerHTML='<div class="top"><button class="ib" data-bk aria-label="Назад"></button><h2></h2></div><div class="cv-full"><div class="cv-w"><span class="cv-g" aria-hidden="true"></span><code></code></div></div><div class="art-ft"></div>';
  $('[data-bk]',d).innerHTML=typeof ic==='function'?ic('back'):'‹';$('[data-bk]',d).onclick=()=>d.close();
  const lines=String(code).split('\n');
  $('h2',d).textContent=(lang||L('Код'))+' · '+lines.length+' '+L('строк');
  $('.cv-g',d).textContent=nums(lines.length);$('code',d).textContent=code;
  const ft=$('.art-ft',d);const c=mk('button','btn');c.type='button';c.textContent=L('Копировать');c.onclick=()=>copy(code);ft.append(c);
  return d}
 /* Заполняет pre: шапка, номера, код (для длинного только начало). */
 function fill(pre,codeEl,buf,lang){
  const n=buf.length,long=n>SHORT,shown=long?buf.slice(0,HEAD):buf,full=buf.join('\n');
  pre.classList.add('cv');if(long)pre.classList.add('long');
  const h=mk('div','cv-h');h.append(mk('span','cv-l',lang||'code'),mk('span','cv-sp'),btn('ex','Развернуть',()=>open(full,lang)),btn('cp','Копировать',()=>copy(full)));
  const w=mk('div','cv-w'),g=mk('span','cv-g',nums(shown.length));g.setAttribute('aria-hidden','true');
  codeEl.textContent=shown.join('\n');w.append(g,codeEl);pre.append(h,w);
  if(long){pre.append(mk('div','cv-more',L('Показать все')+' · '+n+' '+L('строк')));pre.onclick=()=>open(full,lang);pre.setAttribute('role','button')}}
 return{fill,open,SHORT,HEAD}})();
