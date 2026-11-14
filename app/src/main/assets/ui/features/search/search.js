/* ===== УМНЫЙ ПОИСК ПО ЧАТАМ И КОДУ (необязательный модуль) =====
   В приложении (есть KairemaSearch) текст чатов копируется в отдельный индекс SQLite FTS5 (Kotlin: search/SearchIndex.kt),
   поиск мгновенный и ищет по началу слов («пельм» найдёт «пельмени»). Если FTS5 нет в прошивке, Kotlin ищет по подстроке;
   без KairemaSearch (браузер, тесты) то же самое делает JS по Chx.list. Ничего не меняет в самих чатах.
   Что ищем: заголовки (t), сообщения (m), блоки кода из ответов ИИ (c, с языком). Индекс обновляется через события
   sync:touch и sync:delete, при запуске и при открытии поиска сверяются подписи чатов (число сообщений и время).
   Убрать модуль: удалить папку features/search и её строки в index.html; кнопка поиска в списке чатов исчезнет сама. */
const SRCH_CAP=50000;
const Srch={seen:{},t:{},syncing:0};
Srch.nat=()=>{try{return typeof KairemaSearch!=='undefined'&&KairemaSearch}catch(e){return false}};
Srch.toks=q=>[...new Set(String(q||'').toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean))].slice(0,8);
Srch.sig=c=>c.ts+':'+c.msgs.filter(m=>m.t).length;
/* Документы чата: [номер сообщения среди непустых (-1 у заголовка), вид t|m|c, язык, текст] */
Srch.docs=c=>{
 const out=[];
 if(c.title)out.push([-1,'t','',String(c.title)]);
 c.msgs.filter(m=>m.t).forEach((m,i)=>{
  const t=String(m.t);let rest='',last=0;
  t.replace(/```([^\n`]*)\n([\s\S]*?)(```|$)/g,(all,lang,code,end,off)=>{
   rest+=t.slice(last,off)+'\n';last=off+all.length;
   if(code.trim())out.push([i,'c',lang.trim().split(/\s/)[0].slice(0,20),code.slice(0,SRCH_CAP)]);
   return all});
  rest+=t.slice(last);
  if(rest.trim())out.push([i,'m','',rest.trim().slice(0,SRCH_CAP)])});
 return out};
Srch.put=(c,fresh)=>{
 const n=Srch.nat();if(!n)return true;
 Srch.seen[c.id]=1;
 try{return !!n.put(JSON.stringify({id:c.id,title:c.title||'',ts:c.ts||0,sig:Srch.sig(c),docs:Srch.docs(c)}),!!fresh)}catch(e){return false}};
/* Сверка индекса с чатами: лишние убрать, новые и изменённые дописать по одному (интерфейс не подвисает). */
Srch.sync=()=>{
 const n=Srch.nat();if(!n||Srch.syncing)return;
 Chx.load();
 let have={};try{have=JSON.parse(n.sigs()||'{}')}catch(e){}
 const ids=new Set(Chx.list.map(c=>c.id));
 Object.keys(have).forEach(id=>{if(!ids.has(id)){try{n.remove(id)}catch(e){}}});
 const empty=!Object.keys(have).length;
 const todo=Chx.list.filter(c=>have[c.id]!==Srch.sig(c));
 if(!todo.length)return;
 Srch.syncing=1;
 const step=()=>{
  const c=todo.shift();
  if(!c){Srch.syncing=0;return}
  if(!Srch.seen[c.id])Srch.put(c,empty);
  setTimeout(step,12)};
 step()};
Srch.snip=(text,tk)=>{
 const low=text.toLowerCase();let pos=-1;
 tk.forEach(t=>{const i=low.indexOf(t);if(i>=0&&(pos<0||i<pos))pos=i});
 if(pos<0)pos=0;
 const s=Math.max(0,pos-50),e=Math.min(text.length,pos+110);
 return(s>0?'…':'')+text.slice(s,e).replace(/\s+/g,' ').trim()+(e<text.length?'…':'')};
Srch.jsFind=(q,kind,limit)=>{
 const tk=Srch.toks(q),out=[];if(!tk.length)return out;
 for(const c of Chx.sorted())for(const d of Srch.docs(c)){
  if(kind&&d[1]!==kind)continue;
  const low=d[3].toLowerCase();
  if(tk.every(t=>low.includes(t))){
   out.push({chat:c.id,title:c.title||'',ts:c.ts||0,mi:d[0],kind:d[1],lang:d[2],snip:Srch.snip(d[3],tk)});
   if(out.length>=limit)return out}}
 return out};
Srch.find=(q,kind,limit=60)=>{
 const n=Srch.nat();
 if(n){try{if(n.mode()){const r=JSON.parse(n.find(q,kind||'',limit)||'[]');if(Array.isArray(r))return r}}catch(e){}}
 return Srch.jsFind(q,kind||'',limit)};
Srch.modeName=()=>{
 const n=Srch.nat();let m='';
 if(n){try{m=n.mode()}catch(e){}}
 return m==='fts5'?'SQLite FTS5':(LANG==='en'?'on device':'на устройстве')};
/* Безопасная подсветка: только textContent и <mark>, найденное слово растягивается до конца слова */
Srch.mark=(node,text,tk)=>{
 const low=text.toLowerCase(),sp=[];
 if(low.length===text.length)tk.forEach(t=>{let p=0,j;while((j=low.indexOf(t,p))>=0){let e=j+t.length;while(e<text.length&&/[\p{L}\p{N}]/u.test(text[e]))e++;sp.push([j,e]);p=Math.max(e,j+1)}});
 sp.sort((a,b)=>a[0]-b[0]||b[1]-a[1]);
 let pos=0;
 sp.forEach(([s,e])=>{if(s<pos)return;node.append(text.slice(pos,s));const m=document.createElement('mark');m.textContent=text.slice(s,e);node.append(m);pos=e});
 node.append(text.slice(pos))};
Srch.go=(id,mi,d)=>{
 const c=Chx.list.find(x=>x.id===id);if(!c)return;
 if(Chx.busy){toast('Дождитесь ответа');return}
 d.close();const cp=$('[data-screen=chats]');if(cp&&cp.close)cp.close();
 Chx.open(c);apiView();
 if(mi>=0){
  const k=c.msgs.indexOf(c.msgs.filter(x=>x.t)[mi]);
  setTimeout(()=>{const box=$('.msgs'),e=box&&box.children[k];if(e){e.scrollIntoView({block:'center'});e.classList.add('srch-flash');setTimeout(()=>e.classList.remove('srch-flash'),2200)}},350)}};
Srch.open=()=>{
 Chx.load();
 if($('[data-screen=search]'))return;
 Srch.sync();
 const en=LANG==='en';
 const d=page('search','Поиск',b=>{
  b.innerHTML='<div class="srch-in"><input class="inp" type="search" data-q autocomplete="off" autocapitalize="off" spellcheck="false"></div><div class="seg srch-seg"></div><div class="srch-res"></div><p class="hint srch-mode"></p>'});
 const b=$('.scroll',d),inp=$('[data-q]',b),res=$('.srch-res',b),seg=$('.srch-seg',b);
 inp.placeholder=en?'Search chats and code':'Поиск по чатам и коду';
 $('.srch-mode',b).textContent=(en?'Search: ':'Поиск: ')+Srch.modeName();
 let kind='',tm=0;
 const kinds=[['',en?'All':'Все'],['m',en?'Messages':'Сообщения'],['c',en?'Code':'Код'],['t',en?'Titles':'Заголовки']];
 const run=()=>{
  const q=inp.value.trim(),tk=Srch.toks(q);
  res.innerHTML='';
  if(!tk.length){const p=el('<p class="hint"></p>');p.textContent=en?'Type a word to search all chats, answers and code.':'Введите слово: поиск идёт по всем чатам, ответам и коду.';res.append(p);return}
  const rows=Srch.find(q,kind,60);
  if(!rows.length){const p=el('<div class="empty"><p></p></div>');$('p',p).textContent=en?'Nothing found':'Ничего не найдено';res.append(p);return}
  const groups=[],byId={};
  rows.forEach(r=>{let g=byId[r.chat];if(!g){g=byId[r.chat]={id:r.chat,title:r.title,ts:r.ts,hits:[]};groups.push(g)}g.hits.push(r)});
  const cnt=el('<p class="hint srch-cnt"></p>');
  cnt.textContent=(en?'Found: ':'Найдено: ')+rows.length+(en?' in chats: ':' в чатах: ')+groups.length;res.append(cnt);
  groups.forEach((g,gi)=>{
   const card=el('<div class="srch-g in"><div class="srch-h"><b class="srch-t"></b><small></small></div></div>');
   card.style.setProperty('--i',Math.min(gi,8));
   const t=$('.srch-t',card);
   if(g.title)Srch.mark(t,g.title,tk);else t.textContent=en?'Untitled':'Без названия';
   $('small',card).textContent=Chx.when(g.ts);
   g.hits.filter(h=>h.kind!=='t').slice(0,4).forEach(h=>{
    const row=el('<button type="button" class="srch-hit"><span class="srch-tag"></span><span class="srch-sn"></span></button>');
    const tag=$('.srch-tag',row);
    tag.textContent=h.kind==='c'?('</> '+(h.lang||(en?'code':'код'))):'';
    if(h.kind!=='c')tag.remove();else row.classList.add('code');
    Srch.mark($('.srch-sn',row),h.snip,tk);
    row.onclick=()=>Srch.go(g.id,h.mi,d);
    card.append(row)});
   $('.srch-h',card).onclick=()=>Srch.go(g.id,-1,d);
   res.append(card)})};
 kinds.forEach(([k,l],i)=>{
  const c=el('<button type="button" class="chip"></button>');c.textContent=l;if(!i)c.classList.add('on');
  c.onclick=()=>{kind=k;$$('.chip',seg).forEach(x=>x.classList.toggle('on',x===c));run()};seg.append(c)});
 inp.oninput=()=>{clearTimeout(tm);tm=setTimeout(run,150)};
 run();
 setTimeout(()=>{try{inp.focus()}catch(e){}},380);
 return d};
Hooks.on('sync:touch',(k,id)=>{
 if(k!=='chat'||!Srch.nat())return;
 clearTimeout(Srch.t[id]);
 Srch.t[id]=setTimeout(()=>{const c=Chx.list.find(x=>x.id===id);if(c)Srch.put(c,false)},1200)});
Hooks.on('sync:delete',(k,id)=>{
 if(k!=='chat')return;
 const n=Srch.nat();if(n){try{n.remove(id)}catch(e){}}});
Hooks.on('app:ready',()=>setTimeout(Srch.sync,2500));
i18nAdd({"Поиск":"Search","Поиск по чатам и коду":"Search chats and code","Все":"All","Сообщения":"Messages","Код":"Code","Заголовки":"Titles","Ничего не найдено":"Nothing found"});
