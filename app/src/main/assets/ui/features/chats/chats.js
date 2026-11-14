/* ===== ИСТОРИЯ ЧАТОВ: список и сохранение =====
   В приложении (есть KairemaDb) чаты лежат в SQLite на устройстве, картинки и PDF файлами в filesDir/media,
   в чате хранится только имя файла. Лимита localStorage нет; пишется только изменившийся чат.
   Без KairemaDb (браузер, тесты) работает прежний режим: localStorage kairema.chats.v1, лимит 3,5 млн знаков,
   фото и PDF не сохраняются, остаётся пометка. Старые чаты из localStorage переносятся в базу один раз. */
const CHATS_KEY='kairema.chats.v1',CHATS_FILE_MAX=20000,CHATS_TOTAL_MAX=3500000;
const CHATS_EN={"Чаты":"Chats","Список чатов":"Chat list","Новый чат":"New chat","Меню чата":"Chat menu","Сохранённых чатов пока нет.":"No saved chats yet.","Переименовать":"Rename","Переименовать чат":"Rename chat","Название":"Name","Введите название":"Enter a name","Удалить чат?":"Delete chat?","Переписка будет удалена без возможности восстановления.":"The conversation will be permanently deleted.","Чат удалён":"Chat deleted","Дождитесь ответа":"Wait for the reply","Это уже новый чат":"This is already a new chat","Память заполнена":"Storage is full","Последние сообщения не сохранены. Удалите старые чаты, уже сохранённые чаты не пострадали.":"The latest messages were not saved. Delete old chats; the chats already saved are safe.","Открыть список":"Open list","Закрыть":"Close","Не удалось прочитать сохранённые чаты. Новые не записываются, чтобы ничего не потерять":"Could not read the saved chats. New ones are not written so that nothing is lost"};
const Chx={list:[],cur:null,ready:0,broken:0,busy:0,w:0,sig:{}};
Chx.db=()=>{try{return typeof KairemaDb!=='undefined'&&!!KairemaDb}catch(e){return false}};
/* Файлы на устройстве: сохранить base64 (вернёт имя) и прочитать обратно. */
const Media={
 save(b64,ext){try{return Chx.db()&&b64?String(KairemaDb.saveFile(b64,ext)||''):''}catch(e){return ''}},
 load(name){try{return Chx.db()&&name?String(KairemaDb.loadFile(name)||''):''}catch(e){return ''}}};
Chx.fresh=()=>({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:'',named:0,pinned:0,ts:Date.now(),msgs:[]});
/* local=true: запись в базу устройства (с путями к файлам); иначе для синхронизации и localStorage. */
Chx.ser=(m,local)=>{
 const o={r:m.r,t:m.t};
 if(m.q!=null)o.q=m.q;
 if(m.err)o.err=1;
 const ps=[],nn=[];
 (m.parts||[]).forEach(p=>{
  if(p.k==='text'){const x=String(p.text||'');ps.push({k:'text',name:p.name,text:x.length>CHATS_FILE_MAX?x.slice(0,CHATS_FILE_MAX)+'\n[… файл обрезан в истории]':x})}
  else if(local&&(p.k==='image'||p.k==='pdf')){
   if(!p.path&&p.data)p.path=Media.save(p.data,p.k==='pdf'?'pdf':'jpg');
   if(p.path)ps.push({k:p.k,name:p.name,mime:p.mime,path:p.path});
   else nn.push(p.k==='pdf'?'📄 PDF':(LANG==='en'?'📷 photo':'📷 фото'))}
  else if(p.k==='image')nn.push(LANG==='en'?'📷 photo':'📷 фото');
  else if(p.k==='pdf')nn.push('📄 PDF')});
 if(local&&m.img){
  if(!m.img.path&&m.img.b64)m.img.path=Media.save(m.img.b64,(String(m.img.mime||'image/png').split('/')[1]||'png').replace('jpeg','jpg'));
  if(m.img.path)o.img={mime:m.img.mime,path:m.img.path}}
 if(Array.isArray(m.src)&&m.src.length)o.src=m.src.slice(0,5).map(z=>({title:String(z.title||'').slice(0,200),url:String(z.url||'').slice(0,500)}));
 if(m.serr)o.serr=String(m.serr).slice(0,200);
 if(ps.length)o.parts=ps;
 if(nn.length)o.n=nn;
 return o};
Chx.hyd=o=>{
 const safe=s=>/^[A-Za-z0-9._-]+$/.test(String(s||''));
 const m={r:o.r==='a'?'a':'u',t:String(o.t||'')};
 if(o.q!=null)m.q=o.q;
 if(o.err)m.err=1;
 if(Array.isArray(o.src)&&o.src.length)m.src=o.src.filter(z=>z&&typeof z.url==='string').slice(0,5);
 if(o.serr)m.serr=String(o.serr);
 if(Chx.db()&&o.img&&safe(o.img.path))m.img={mime:String(o.img.mime||'image/png'),path:o.img.path};
 if(Array.isArray(o.parts)&&o.parts.length)m.parts=o.parts.filter(p=>p&&(p.k==='text'||(Chx.db()&&(p.k==='image'||p.k==='pdf')&&safe(p.path))));
 if(Array.isArray(o.n)&&o.n.length)m.t='['+o.n.join(', ')+']\n'+m.t;
 return m};
Chx.open=c=>{Chx.cur=c;S.apiMsgs=c.msgs};
Chx.mark=()=>{Chx.sig={};Chx.list.forEach(c=>Chx.sig[c.id]=c.ts+':'+c.msgs.length)};
Chx.load=()=>{
 if(Chx.ready)return;Chx.ready=1;
 let raw=null;
 if(Chx.db()){
  try{
   const rows=JSON.parse(KairemaDb.loadAll()||'[]');
   Chx.list=rows.filter(c=>c&&c.id&&Array.isArray(c.msgs)).map(c=>({id:String(c.id),title:String(c.title||''),named:c.named?1:0,pinned:c.pinned?1:0,ts:+c.ts||0,msgs:c.msgs.filter(m=>m&&typeof m==='object').map(Chx.hyd)}));
   Chx.mark();
   let old=null;try{old=localStorage.getItem(CHATS_KEY)}catch(e){}
   if(old&&!Chx.list.length){
    /* Перенос старых чатов из localStorage; ключ удаляется, только если всё записалось. */
    try{
     const d=JSON.parse(old);
     Chx.list=(Array.isArray(d.list)?d.list:[]).filter(c=>c&&c.id&&Array.isArray(c.msgs)).map(c=>({id:String(c.id),title:String(c.title||''),named:c.named?1:0,pinned:c.pinned?1:0,ts:+c.ts||0,msgs:c.msgs.filter(m=>m&&typeof m==='object').map(Chx.hyd)}));
     if(Chx.persist()&&KairemaDb.count()===Chx.list.length){try{localStorage.removeItem(CHATS_KEY)}catch(e){}}
    }catch(e){Chx.list=[]}}
  }catch(e){Chx.broken=1}
  Chx.list.sort((a,b)=>b.ts-a.ts);
  Chx.open(Chx.list[0]||Chx.fresh());return}
 try{raw=localStorage.getItem(CHATS_KEY)}catch(e){}
 if(raw){try{
  const d=JSON.parse(raw);
  Chx.list=(Array.isArray(d.list)?d.list:[]).filter(c=>c&&c.id&&Array.isArray(c.msgs)).map(c=>({id:String(c.id),title:String(c.title||''),named:c.named?1:0,pinned:c.pinned?1:0,ts:+c.ts||0,msgs:c.msgs.filter(m=>m&&typeof m==='object').map(Chx.hyd)}))
 }catch(e){Chx.broken=1}}
 Chx.list.sort((a,b)=>b.ts-a.ts);
 Chx.open(Chx.list[0]||Chx.fresh())};
Chx.newChat=()=>{Chx.load();if(Chx.cur.msgs.length)Chx.open(Chx.fresh())};
Chx.warnFull=()=>{
 const n=Date.now();if(n-Chx.w<60000)return;Chx.w=n;
 const s=sheet(`<h2>Память заполнена</h2><p class="sub" style="margin:8px 0 18px">Последние сообщения не сохранены. Удалите старые чаты, уже сохранённые чаты не пострадали.</p><div class="two"><button class="btn ghost" data-c>Закрыть</button><button class="btn" data-o>Открыть список</button></div>`);
 $('[data-c]',s).onclick=s.close;
 $('[data-o]',s).onclick=()=>{s.close();chatsPage()}};
Chx.warnBroken=()=>{
 const n=Date.now();if(n-Chx.w<60000)return;Chx.w=n;
 toast('Не удалось прочитать сохранённые чаты. Новые не записываются, чтобы ничего не потерять')};
/* Записывает весь список. Если не вышло, старая запись в хранилище остаётся нетронутой. */
Chx.persist=()=>{
 if(Chx.broken){Chx.warnBroken();return false}
 if(Chx.db()){
  try{
   let ok=true;const ids={};
   Chx.list.forEach(c=>{
    ids[c.id]=1;const sg=c.ts+':'+c.msgs.length;
    if(Chx.sig[c.id]===sg)return;
    const r=KairemaDb.put(JSON.stringify({id:c.id,title:c.title,named:c.named?1:0,pinned:c.pinned?1:0,ts:c.ts,msgs:c.msgs.filter(m=>m.t).map(m=>Chx.ser(m,true))}));
    if(r)Chx.sig[c.id]=sg;else ok=false});
   Object.keys(Chx.sig).forEach(id=>{if(!ids[id]){KairemaDb.remove(id);delete Chx.sig[id]}});
   if(!ok)Chx.warnFull();
   return ok}catch(e){Chx.warnFull();return false}}
 const data=JSON.stringify({v:1,list:[...Chx.list].sort((a,b)=>b.ts-a.ts).map(c=>({id:c.id,title:c.title,named:c.named?1:0,pinned:c.pinned?1:0,ts:c.ts,msgs:c.msgs.filter(m=>m.t).map(Chx.ser)}))});
 if(data.length>CHATS_TOTAL_MAX){Chx.warnFull();return false}
 try{localStorage.setItem(CHATS_KEY,data);return true}
 catch(e){Chx.warnFull();return false}};
Chx.save=c=>{
 Chx.load();c=c||Chx.cur;
 if(!c)return true;
 const has=c.msgs.some(m=>m.t);
 /* Пустой чат сохраняется, только если его уже добавили в список (Chx.keep, диалог «Новый чат») */
 if(!has&&!Chx.list.includes(c))return true;
 if(!c.named){
  /* Название по первым строкам первого вопроса; пока вопроса нет, название пустое («Без названия») */
  const f=c.msgs.find(m=>m.r==='u'&&m.t),s=String((f&&(f.q||f.t))||'').replace(/\s+/g,' ').trim();
  c.title=s.length>40?s.slice(0,40)+'…':s}
 c.ts=Date.now();
 if(!Chx.list.includes(c))Chx.list.push(c);
 Hooks.run('sync:touch','chat',c.id);
 return Chx.persist()};
/* Добавляет чат в историю сразу, даже пустой. */
Chx.keep=c=>{if(!Chx.list.includes(c))Chx.list.push(c);return Chx.save(c)};
/* Закрепить / открепить: закреплённые чаты всегда сверху списка. */
Chx.sorted=()=>[...Chx.list].sort((x,y)=>(y.pinned?1:0)-(x.pinned?1:0)||y.ts-x.ts);
Chx.pin=(c,done)=>{c.pinned=c.pinned?0:1;c.ts=Date.now();Chx.persist();Hooks.run('sync:touch','chat',c.id);done();toast(c.pinned?'Чат закреплён':'Чат откреплён')};
Chx.when=ts=>{
 const d=new Date(ts),n=new Date(),loc=LANG==='en'?'en-US':'ru-RU';
 return d.toDateString()===n.toDateString()?d.toLocaleTimeString(loc,{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString(loc,{day:'numeric',month:'short'})};
Chx.rename=(c,done)=>{
 const s=sheet(`<h2 style="margin-bottom:14px">Переименовать чат</h2><div class="fld"><label for="ch-name">Название</label><input id="ch-name" maxlength="60" autocomplete="off"></div><div class="two"><button class="btn ghost" data-c>Отмена</button><button class="btn" data-o>Сохранить</button></div>`);
 const i=$('#ch-name',s);i.value=c.title;
 $('[data-c]',s).onclick=s.close;
 $('[data-o]',s).onclick=()=>{const v=i.value.trim();if(!v){toast('Введите название');return}c.title=v.slice(0,60);c.named=1;c.ts=Date.now();s.close();Chx.persist();Hooks.run('sync:touch','chat',c.id);done()}};
Chx.remove=(c,done)=>{
 ask('Удалить чат?','Переписка будет удалена без возможности восстановления.','Удалить',()=>{
  if(Chx.busy&&c===Chx.cur){toast('Дождитесь ответа');return}
  Chx.list=Chx.list.filter(x=>x!==c);
  const wasCur=c===Chx.cur;
  if(wasCur){Chx.open(Chx.fresh());apiView()}
  Chx.persist();Hooks.run('sync:delete','chat',c.id);done();toast('Чат удалён')})};
/* Новый чат: сначала просим название. «Пропустить» — название появится само по первым строкам сообщения. */
Chx.create=done=>{
 Chx.load();
 if(Chx.busy){toast('Дождитесь ответа');return}
 const s=sheet(`<h2 class="chx-h">Новый чат</h2><p class="sub chx-p">Введите название или пропустите: оно появится само по первым строкам вашего сообщения.</p><div class="fld"><label for="ch-new">Название</label><input id="ch-new" maxlength="60" autocomplete="off" placeholder="Например, План поездки"></div><div class="two chx-two"><button class="btn ghost" data-s type="button">Пропустить</button><button class="btn" data-o type="button" disabled>Создать</button></div>`);
 s.classList.add('mid');setTimeout(()=>{try{$('#ch-new',s).focus()}catch(e){}},380);
 const i=$('#ch-new',s),ok=$('[data-o]',s);
 const make=title=>{
  s.close();
  if(Chx.cur.msgs.length)Chx.open(Chx.fresh());
  Chx.cur.title=title||'';Chx.cur.named=title?1:0;
  Chx.keep(Chx.cur);
  done();
  if(title)toast('Чат «'+title+'» создан')};
 i.oninput=()=>{ok.disabled=!i.value.trim()};
 i.onkeydown=e=>{if(e.key==='Enter'&&i.value.trim())make(i.value.trim().slice(0,60))};
 $('[data-s]',s).onclick=()=>make('');
 ok.onclick=()=>make(i.value.trim().slice(0,60));
 setTimeout(()=>{try{i.focus()}catch(e){}},380)};
/* Удалить все чаты: подтверждение, затем очистка списка и сигнал синхронизации по каждому чату. */
Chx.removeAll=done=>{
 Chx.load();
 if(!Chx.list.length)return;
 if(Chx.busy){toast('Дождитесь ответа');return}
 ask('Удалить все чаты?','Все переписки будут удалены без возможности восстановления.','Удалить все',()=>{
  if(Chx.busy){toast('Дождитесь ответа');return}
  const ids=Chx.list.map(c=>c.id);
  Chx.list=[];Chx.open(Chx.fresh());Chx.persist();
  ids.forEach(id=>Hooks.run('sync:delete','chat',id));
  apiView();done();toast('Все чаты удалены')})};
function chatsPage(){
 Chx.load();
 if($('[data-screen=chats]'))return;
 if(Chx.busy){toast('Дождитесь ответа');return}
 const d=page('chats','Чаты',(b)=>{
  b.innerHTML='';
  const ls=Chx.sorted();
  if(!P.pin)P.pin='<path d="M12 17v5M8.5 3h7l-1.2 6.2L18 13v2H6v-2l3.7-3.8z"/>';
  if(!ls.length)b.innerHTML='<div class="empty"><p>Сохранённых чатов пока нет.</p></div>';
  else{
   const bar=el(`<div class="chx-bar"><span class="sub"></span><button class="chx-all" type="button">${ic('trash')}<span>Удалить все чаты</span></button></div>`);
   $('.sub',bar).textContent=(LANG==='en'?'Chats: ':'Чатов: ')+ls.length;
   $('.chx-all',bar).onclick=()=>Chx.removeAll(()=>{
    const rows=$$('.pv',b);rows.forEach((x,k)=>{x.style.setProperty('--o',Math.min(k,8));x.classList.add('gone')});
    setTimeout(()=>d.r(),Math.min(rows.length,8)*40+340)});
   b.append(bar)}
  const anyPin=ls.some(c=>c.pinned);
  ls.forEach((c,i)=>{
   if(anyPin&&(i===0||!!c.pinned!==!!ls[i-1].pinned)){const h=el('<p class="chx-sec"></p>');h.textContent=c.pinned?(LANG==='en'?'Pinned':'Закреплённые'):(LANG==='en'?'Other':'Остальные');b.append(h)}
   const r=el(`<div class="card pv in" role="button" style="--i:${i}"><span class="m"><b><span class="chx-t"></span></b><small></small></span><button class="cb" data-m aria-label="Меню чата">${ic('dots')}</button></div>`);
   const t=$('.chx-t',r);
   if(c.title)t.textContent=c.title;
   else{t.textContent=LANG==='en'?'Untitled':'Без названия';t.classList.add('chx-un')}
   if(c.pinned)$('b',r).insertAdjacentHTML('afterbegin',`<span class="chx-pin">${ic('pin')}</span>`);
   const n=c.msgs.filter(m=>m.t).length;
   $('small',r).textContent=Chx.when(c.ts)+' · '+(n?n+(LANG==='en'?' msgs':' сообщ.'):(LANG==='en'?'empty':'пусто'));
   r.onclick=()=>{d.close();Chx.open(c);apiView()};
   $('[data-m]',r).onclick=e=>{e.stopPropagation();menu([
    {i:'pin',l:c.pinned?'Открепить':'Закрепить',f:()=>Chx.pin(c,()=>d.r())},
    {i:'edit',l:'Переименовать',f:()=>Chx.rename(c,()=>d.r())},
    {i:'trash',l:'Удалить',d:1,f:()=>Chx.remove(c,()=>{r.classList.add('gone');r.style.setProperty('--o',0);setTimeout(()=>d.r(),340)})}])};
   b.append(r)})
 },(typeof Srch!=='undefined'?`<button class="ib" data-chs aria-label="Поиск">${ic('search')}</button>`:'')+`<button class="ib" data-chn aria-label="Новый чат">${ic('plus')}</button>`);
 if(typeof Srch!=='undefined')$('[data-chs]',d).onclick=()=>Srch.open();
 $('[data-chn]',d).onclick=()=>Chx.create(()=>{d.close();apiView()});
 return d}

/* Подключение к синхронизации: чаты как вид данных «chat». */
Hooks.on('sync:register',Sy=>Sy.register('chat',{
 ids(){Chx.load();return Chx.list.map(c=>({id:c.id,ts:c.ts}))},
 get(id){Chx.load();const c=Chx.list.find(x=>x.id===id);return c?{id:c.id,title:c.title,named:c.named?1:0,pinned:c.pinned?1:0,ts:c.ts,msgs:c.msgs.filter(m=>m.t).map(Chx.ser)}:null},
 put(id,d){
  Chx.load();
  const c={id:String(id),title:String(d.title||''),named:d.named?1:0,pinned:d.pinned?1:0,ts:+d.ts||0,msgs:(Array.isArray(d.msgs)?d.msgs:[]).filter(m=>m&&typeof m==='object').map(Chx.hyd)};
  const i=Chx.list.findIndex(x=>x.id===c.id);
  if(!Chx.list.length&&Chx.cur&&!Chx.cur.msgs.length)Chx._adopt=1;
  if(Chx.cur&&Chx.cur.id===c.id){if(Chx.busy)return;Chx.cur=c;S.apiMsgs=c.msgs}
  if(i>=0)Chx.list[i]=c;else Chx.list.push(c);
  Chx.persist()},
 del(id){
  Chx.load();Chx.list=Chx.list.filter(x=>x.id!==id);
  if(Chx.cur&&Chx.cur.id===id)Chx.open(Chx.fresh());
  Chx.persist()},
 clear(){Chx.load();Chx.list=[];Chx.open(Chx.fresh());Chx.persist()},
 refresh(){
  if(Chx._adopt){Chx._adopt=0;if(Chx.cur&&!Chx.cur.msgs.length&&!Chx.busy&&Chx.list.length)Chx.open([...Chx.list].sort((x,y)=>y.ts-x.ts)[0])}
  if(typeof CUR!=='undefined'&&CUR==='api'&&!Chx.busy)apiView()}}));
i18nAdd(CHATS_EN);
i18nAdd({"Введите название или пропустите: оно появится само по первым строкам вашего сообщения.":"Enter a name or skip: it will be set automatically from the first lines of your message.","Например, План поездки":"E.g. Trip plan","Пропустить":"Skip","Создать":"Create","Удалить все чаты":"Delete all chats","Удалить все чаты?":"Delete all chats?","Все переписки будут удалены без возможности восстановления.":"All conversations will be permanently deleted.","Удалить все":"Delete all","Все чаты удалены":"All chats deleted","Закрепить":"Pin","Открепить":"Unpin","Чат закреплён":"Chat pinned","Чат откреплён":"Chat unpinned"});
