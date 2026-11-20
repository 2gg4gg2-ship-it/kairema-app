/* ===== ТЕГИ ЧАТОВ И ЗАКЛАДКИ =====
   Теги: у каждого чата можно поставить несколько меток («работа», «код»). В списке чатов сверху появляется ряд меток-фильтров,
   пункт «Теги» в меню чата (⋯) открывает окно правки. Теги лежат на телефоне отдельно от чатов (kairema.tags.v1: {id чата: [теги]})
   и не синхронизируются с облаком, но входят в резервную копию.
   Закладки: звёздочка под ответом ИИ (рядом с «Копировать»). Настройки → «Закладки»: список, нажатие открывает чат и подсвечивает
   сообщение. Закладка хранит id чата и начало текста (kairema.bm.v1), поэтому не ломается, если сообщения сдвинулись.
   Крючки в chats.js: chats:list (фильтр списка), chats:row (подпись строки), chats:menu (пункты меню чата).
   Убрать модуль: удалить папку и строки в index.html. */
const Org=(()=>{
 const KT='kairema.tags.v1',KB='kairema.bm.v1';
 const rd=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}};
 const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
 let tags=rd(KT,{}),bm=rd(KB,[]),active='';
 if(!Array.isArray(bm))bm=[];
 i18nAdd({"Теги":"Tags","Новый тег":"New tag","Добавить":"Add","Готово":"Done","Все":"All","Закладки":"Bookmarks","Закладка":"Bookmark","Ответы, к которым хочется вернуться":"Answers you want to come back to","Закладок пока нет. Нажмите звёздочку под ответом ИИ.":"No bookmarks yet. Tap the star under an AI answer.","Закладка добавлена":"Bookmark added","Закладка убрана":"Bookmark removed","Чат удалён":"Chat deleted","Сообщение выше: пролистайте вверх":"The message is higher up: scroll up","Убрать":"Remove","Теги чата":"Chat tags","Нажмите на тег, чтобы поставить или снять":"Tap a tag to add or remove it"});
 const icons=()=>{P.star=P.star||'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>'};
 const clean=s=>String(s||'').replace(/\s+/g,' ').trim().slice(0,24).replace(/[<>]/g,'');
 const of=id=>Array.isArray(tags[id])?tags[id]:[];
 const setT=(id,a)=>{a=[...new Set(a.map(clean).filter(Boolean))].slice(0,8);if(a.length)tags[id]=a;else delete tags[id];wr(KT,tags)};
 const counts=()=>{const m={};if(typeof Chx!=='undefined')(Chx.list||[]).forEach(c=>of(c.id).forEach(t=>m[t]=(m[t]||0)+1));return Object.entries(m).sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]))};
 const redo=()=>{const d=$('[data-screen=chats]');if(d&&d.r)d.r()};
 Hooks.on('chats:list',(fq,b)=>{
  const at=counts();fq.ls0=fq.ls.length;
  if(!at.length){active='';return}
  if(active&&!at.some(x=>x[0]===active))active='';
  const bar=el('<div class="orgb"></div>');
  const chip=(t,n,on,fn)=>{const x=el('<button class="orgc"></button>');x.textContent=t+(n!=null?' '+n:'');x.classList.toggle('on',on);x.onclick=fn;bar.append(x)};
  chip(L('Все'),null,!active,()=>{active='';redo()});
  at.forEach(([t,n])=>chip('#'+t,n,active===t,()=>{active=active===t?'':t;redo()}));
  b.append(bar);
  if(active)fq.ls=fq.ls.filter(c=>of(c.id).includes(active))});
 Hooks.on('chats:row',(r,c)=>{const t=of(c.id);if(!t.length)return;const s=el('<div class="orgt"></div>');s.textContent=t.map(x=>'#'+x).join(' ');$('.m',r).append(s)});
 Hooks.on('chats:menu',(items,c,d)=>{items.splice(2,0,{i:'tpl',l:L('Теги'),f:()=>tagSheet(c,()=>d.r())})});
 function tagSheet(c,done){
  const s=sheet('<h2></h2><p class="sub" style="margin:6px 0 10px"></p><div class="orgb wrap" data-l></div><div class="two" style="margin-top:12px"><input class="cdi" data-i maxlength="24" autocomplete="off"><button class="btn" data-a></button></div><button class="btn ghost" data-ok style="width:100%;margin-top:10px"></button>');
  $('h2',s).textContent=L('Теги чата');$('.sub',s).textContent=L('Нажмите на тег, чтобы поставить или снять');$('[data-i]',s).placeholder=L('Новый тег');$('[data-a]',s).textContent=L('Добавить');$('[data-ok]',s).textContent=L('Готово');
  const draw=()=>{const l=$('[data-l]',s);l.innerHTML='';const mine=of(c.id);const names=[...new Set([...counts().map(x=>x[0]),...mine])];names.forEach(t=>{const x=el('<button class="orgc"></button>');x.textContent='#'+t;x.classList.toggle('on',mine.includes(t));x.onclick=()=>{setT(c.id,mine.includes(t)?mine.filter(z=>z!==t):[...mine,t]);draw()};l.append(x)})};
  draw();
  const add=()=>{const i=$('[data-i]',s),v=clean(i.value).replace(/^#/,'');if(!v)return;setT(c.id,[...of(c.id),v]);i.value='';draw()};
  $('[data-a]',s).onclick=add;$('[data-i]',s).onkeydown=e=>{if(e.key==='Enter')add()};
  $('[data-ok]',s).onclick=()=>{s.close();done&&done()}}
 /* ---- закладки ---- */
 const snip=m=>String(m&&m.t||'').replace(/\s+/g,' ').trim().slice(0,60);
 const cid=()=>typeof Chx!=='undefined'&&Chx.cur?Chx.cur.id:'';
 const find=(c,p)=>bm.findIndex(x=>x.c===c&&x.p===p);
 const marked=m=>find(cid(),snip(m))>=0;
 const toggle=m=>{const p=snip(m);if(!p||!cid())return false;const i=find(cid(),p);if(i>=0){bm.splice(i,1);wr(KB,bm);return false}bm.unshift({c:cid(),p,t:String(Chx.cur.title||'').slice(0,60),ts:Date.now()});bm=bm.slice(0,300);wr(KB,bm);return true};
 const attach=(d,m)=>{
  if(!m||m.r!=='a'||m.err||!m.t||!d||d._bm)return;
  const row=$('.msg-act',d);if(!row)return;
  icons();d._bm=1;
  const b=el('<button type="button" data-bm aria-label="Закладка">'+ic('star')+'</button>');
  const paint=()=>{const on=marked(m);b.classList.toggle('on',on);b.setAttribute('aria-pressed',on?'true':'false')};
  paint();
  b.onclick=e=>{e.stopPropagation();const on=toggle(m);paint();toast(L(on?'Закладка добавлена':'Закладка убрана'))};
  row.append(b)};
 Hooks.on('msg:render',(d,m)=>attach(d,m));
 Hooks.on('chat:answer',(m,bd)=>{const d=bd&&bd.closest&&bd.closest('.msg');if(d)attach(d,m)});
 const reveal=p=>{
  const box=$('#v-api .msgs');if(!box)return false;
  const x=[...box.querySelectorAll('.msg.a')].find(e=>(e.textContent||'').replace(/\s+/g,' ').includes(p.slice(0,28)));
  if(!x)return false;x.scrollIntoView({block:'center'});x.classList.add('orgh');setTimeout(()=>x.classList.remove('orgh'),2200);return true};
 function screen(){
  return page('marks',L('Закладки'),b=>{
   b.innerHTML='';
   if(!bm.length){b.innerHTML='<div class="empty"><p></p></div>';$('p',b).textContent=L('Закладок пока нет. Нажмите звёздочку под ответом ИИ.');return}
   bm.forEach(e=>{
    const r=el('<div class="card pv in" role="button"><span class="m"><b></b><small></small></span><button class="cb" data-x aria-label="Убрать">'+ic('trash')+'</button></div>');
    $('b',r).textContent=e.p;
    const ch=typeof Chx!=='undefined'&&(Chx.list||[]).find(c=>c.id===e.c);
    $('small',r).textContent=(ch?(ch.title||L('Без названия')):L('Чат удалён'))+' · '+Chx.when(e.ts);
    r.onclick=()=>{if(!ch){toast(L('Чат удалён'));return}
     const d=$('[data-screen=marks]');if(d&&d.close)d.close();Chx.open(ch);apiView();
     setTimeout(()=>{if(!reveal(e.p))toast(L('Сообщение выше: пролистайте вверх'))},350)};
    $('[data-x]',r).onclick=ev=>{ev.stopPropagation();bm=bm.filter(z=>z!==e);wr(KB,bm);r.remove();if(!bm.length)screen2()};
    b.append(r)})})}
 const screen2=()=>{const d=$('[data-screen=marks]');if(d&&d.r)d.r()};
 Hooks.on('app:ready',()=>{SCREENS.marks=screen});
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-org-s]',v))return;icons();
  const r=el('<button class="sr" data-org-s><span class="si c">'+ic('star')+'</span><span class="m"><b></b><small></small></span>'+ic('chevR')+'</button>');
  $('b',r).textContent=L('Закладки');$('small',r).textContent=L('Ответы, к которым хочется вернуться');
  r.onclick=()=>screen();ab.before(r)});
 return{tags:of,setTags:setT,counts,marks:()=>bm.slice(),toggle,marked,reveal,screen,get active(){return active}}})();
