/* ===== ИСТОРИЯ ЧАТОВ: список, сохранение в localStorage (kairema.chats.v1) =====
   Лимиты: текст файла в истории до 20 000 знаков; все чаты вместе до 3,5 млн знаков
   (WebView даёт около 5 МБ на всё, часть нужна провайдерам и настройкам).
   Фото и PDF не сохраняются, остаётся только пометка. Загружается раньше app.js. */
const CHATS_KEY='kairema.chats.v1',CHATS_FILE_MAX=20000,CHATS_TOTAL_MAX=3500000;
const CHATS_EN={"Чаты":"Chats","Список чатов":"Chat list","Новый чат":"New chat","Меню чата":"Chat menu","Сохранённых чатов пока нет.":"No saved chats yet.","Переименовать":"Rename","Переименовать чат":"Rename chat","Название":"Name","Введите название":"Enter a name","Удалить чат?":"Delete chat?","Переписка будет удалена без возможности восстановления.":"The conversation will be permanently deleted.","Чат удалён":"Chat deleted","Дождитесь ответа":"Wait for the reply","Это уже новый чат":"This is already a new chat","Память заполнена":"Storage is full","Последние сообщения не сохранены. Удалите старые чаты, уже сохранённые чаты не пострадали.":"The latest messages were not saved. Delete old chats; the chats already saved are safe.","Открыть список":"Open list","Закрыть":"Close","Не удалось прочитать сохранённые чаты. Новые не записываются, чтобы ничего не потерять":"Could not read the saved chats. New ones are not written so that nothing is lost"};
const Chx={list:[],cur:null,ready:0,broken:0,busy:0,w:0};
Chx.fresh=()=>({id:'c'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),title:'',named:0,ts:Date.now(),msgs:[]});
Chx.ser=m=>{
 const o={r:m.r,t:m.t};
 if(m.q!=null)o.q=m.q;
 if(m.err)o.err=1;
 const ps=[],nn=[];
 (m.parts||[]).forEach(p=>{
  if(p.k==='text'){const x=String(p.text||'');ps.push({k:'text',name:p.name,text:x.length>CHATS_FILE_MAX?x.slice(0,CHATS_FILE_MAX)+'\n[… файл обрезан в истории]':x})}
  else if(p.k==='image')nn.push(LANG==='en'?'📷 photo':'📷 фото');
  else if(p.k==='pdf')nn.push('📄 PDF')});
 if(Array.isArray(m.src)&&m.src.length)o.src=m.src.slice(0,5).map(z=>({title:String(z.title||'').slice(0,200),url:String(z.url||'').slice(0,500)}));
 if(m.serr)o.serr=String(m.serr).slice(0,200);
 if(ps.length)o.parts=ps;
 if(nn.length)o.n=nn;
 return o};
Chx.hyd=o=>{
 const m={r:o.r==='a'?'a':'u',t:String(o.t||'')};
 if(o.q!=null)m.q=o.q;
 if(o.err)m.err=1;
 if(Array.isArray(o.src)&&o.src.length)m.src=o.src.filter(z=>z&&typeof z.url==='string').slice(0,5);
 if(o.serr)m.serr=String(o.serr);
 if(Array.isArray(o.parts)&&o.parts.length)m.parts=o.parts.filter(p=>p&&p.k==='text');
 if(Array.isArray(o.n)&&o.n.length)m.t='['+o.n.join(', ')+']\n'+m.t;
 return m};
Chx.open=c=>{Chx.cur=c;S.apiMsgs=c.msgs};
Chx.load=()=>{
 if(Chx.ready)return;Chx.ready=1;
 let raw=null;try{raw=localStorage.getItem(CHATS_KEY)}catch(e){}
 if(raw){try{
  const d=JSON.parse(raw);
  Chx.list=(Array.isArray(d.list)?d.list:[]).filter(c=>c&&c.id&&Array.isArray(c.msgs)).map(c=>({id:String(c.id),title:String(c.title||''),named:c.named?1:0,ts:+c.ts||0,msgs:c.msgs.filter(m=>m&&typeof m==='object').map(Chx.hyd)}))
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
 const data=JSON.stringify({v:1,list:[...Chx.list].sort((a,b)=>b.ts-a.ts).map(c=>({id:c.id,title:c.title,named:c.named?1:0,ts:c.ts,msgs:c.msgs.filter(m=>m.t).map(Chx.ser)}))});
 if(data.length>CHATS_TOTAL_MAX){Chx.warnFull();return false}
 try{localStorage.setItem(CHATS_KEY,data);return true}
 catch(e){Chx.warnFull();return false}};
Chx.save=c=>{
 Chx.load();c=c||Chx.cur;
 if(!c||!c.msgs.some(m=>m.t))return true;
 if(!c.named){
  const f=c.msgs.find(m=>m.r==='u'&&m.t),s=String((f&&(f.q||f.t))||'').replace(/\s+/g,' ').trim()||(LANG==='en'?'New chat':'Новый чат');
  c.title=s.length>40?s.slice(0,40)+'…':s}
 c.ts=Date.now();
 if(!Chx.list.includes(c))Chx.list.push(c);
 return Chx.persist()};
Chx.when=ts=>{
 const d=new Date(ts),n=new Date(),loc=LANG==='en'?'en-US':'ru-RU';
 return d.toDateString()===n.toDateString()?d.toLocaleTimeString(loc,{hour:'2-digit',minute:'2-digit'}):d.toLocaleDateString(loc,{day:'numeric',month:'short'})};
Chx.rename=(c,done)=>{
 const s=sheet(`<h2 style="margin-bottom:14px">Переименовать чат</h2><div class="fld"><label for="ch-name">Название</label><input id="ch-name" maxlength="60" autocomplete="off"></div><div class="two"><button class="btn ghost" data-c>Отмена</button><button class="btn" data-o>Сохранить</button></div>`);
 const i=$('#ch-name',s);i.value=c.title;
 $('[data-c]',s).onclick=s.close;
 $('[data-o]',s).onclick=()=>{const v=i.value.trim();if(!v){toast('Введите название');return}c.title=v.slice(0,60);c.named=1;s.close();Chx.persist();done()}};
Chx.remove=(c,done)=>{
 ask('Удалить чат?','Переписка будет удалена без возможности восстановления.','Удалить',()=>{
  if(Chx.busy&&c===Chx.cur){toast('Дождитесь ответа');return}
  Chx.list=Chx.list.filter(x=>x!==c);
  const wasCur=c===Chx.cur;
  if(wasCur){Chx.open(Chx.fresh());apiView()}
  Chx.persist();done();toast('Чат удалён')})};
function chatsPage(){
 Chx.load();
 if($('[data-screen=chats]'))return;
 if(Chx.busy){toast('Дождитесь ответа');return}
 const d=page('chats','Чаты',(b)=>{
  b.innerHTML='';
  const ls=[...Chx.list].sort((x,y)=>y.ts-x.ts);
  if(!ls.length)b.innerHTML='<div class="empty"><p>Сохранённых чатов пока нет.</p></div>';
  ls.forEach((c,i)=>{
   const r=el(`<div class="card pv in" role="button" style="--i:${i}"><span class="m"><b></b><small></small></span><button class="cb" data-m aria-label="Меню чата">${ic('dots')}</button></div>`);
   $('b',r).textContent=c.title||(LANG==='en'?'New chat':'Новый чат');
   $('small',r).textContent=Chx.when(c.ts)+' · '+c.msgs.filter(m=>m.t).length+(LANG==='en'?' msgs':' сообщ.');
   r.onclick=()=>{d.close();Chx.open(c);apiView()};
   $('[data-m]',r).onclick=e=>{e.stopPropagation();menu([
    {i:'edit',l:'Переименовать',f:()=>Chx.rename(c,()=>d.r())},
    {i:'trash',l:'Удалить',d:1,f:()=>Chx.remove(c,()=>d.r())}])};
   b.append(r)})
 },`<button class="ib" data-chn aria-label="Новый чат">${ic('plus')}</button>`);
 $('[data-chn]',d).onclick=()=>{Chx.newChat();d.close();apiView()};
 return d}
i18nAdd(CHATS_EN);
