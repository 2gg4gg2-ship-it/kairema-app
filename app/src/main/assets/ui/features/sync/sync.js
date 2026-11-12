/* ===== СИНХРОНИЗАЦИЯ: облачное хранение данных пользователя (таблица sync_items в Supabase) =====
   Каждый модуль данных подключает свой «вид» (kind) событием 'sync:register':
     Hooks.on('sync:register',S=>S.register('chat',адаптер))
   Адаптер: ids() → [{id,ts}], get(id) → объект с полем ts или null, put(id,data), del(id), clear(), refresh() (необязательно).
   Модули сообщают об изменениях: Hooks.run('sync:touch',kind,id) и Hooks.run('sync:delete',kind,id).
   Конфликты: побеждает запись с большим ts (последнее изменение). Убрать модуль: удалить папку features/sync и его строки в index.html. */
const Sync=(()=>{
 const KD='kairema.sync.dirty.v1',KM='kairema.sync.meta.v1',ad={},subs=[];
 let dirty={},meta={uid:'',cursor:'',last:0,err:''},loaded=false,running=false,runStart=0,again=false,timer=0,lastRun=0;
 const lj=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}};
 const load=()=>{if(loaded)return;loaded=true;dirty=lj(KD,{});meta=Object.assign(meta,lj(KM,{}))};
 const save=()=>{try{localStorage.setItem(KD,JSON.stringify(dirty));localStorage.setItem(KM,JSON.stringify(meta))}catch(e){}};
 const emit=()=>subs.slice().forEach(f=>{try{f()}catch(e){}});
 const kk=(k,i)=>k+'|'+i;
 const schedule=ms=>{clearTimeout(timer);timer=setTimeout(()=>run(),ms==null?2500:ms)};
 async function rest(method,q,body,extra){
  const c=Auth.config(),tk=await Auth.token();
  if(!tk)throw new Error('Нет соединения или нужно войти заново');
  let r;
  try{r=await fetch(c.url+'/rest/v1/sync_items'+q,{method,headers:Object.assign({apikey:c.key,Authorization:'Bearer '+tk,'Content-Type':'application/json'},extra||{}),body:body?JSON.stringify(body):undefined})}
  catch(e){throw new Error('Нет соединения с сервером')}
  if(!r.ok){
   let m='';try{m=String((await r.json()).message||'')}catch(e){}
   if(r.status===404||/sync_items|schema cache|does not exist/i.test(m))throw new Error('В Supabase нет таблицы sync_items: выполните SQL из инструкции');
   if(r.status===401||r.status===403)throw new Error('Нет доступа к данным: войдите заново');
   throw new Error(m||('Ошибка сервера '+r.status))}
  return method==='GET'?r.json():null}
 const markAll=()=>{for(const kind in ad)ad[kind].ids().forEach(x=>{dirty[kk(kind,x.id)]={d:0,ts:x.ts||Date.now()}})};
 async function ensureUser(u){
  if(meta.uid===u.id)return true;
  if(!meta.uid){meta.uid=u.id;markAll();meta.cursor='';save();return true}
  const c=api.chooser?await api.chooser(u):null;
  if(!c)return false;
  if(c==='wipe'){for(const kind in ad)ad[kind].clear();dirty={}}else markAll();
  meta.uid=u.id;meta.cursor='';save();return true}
 async function pull(){
  let cur=meta.cursor,n=500;const ch={},idx={};
  const loc=(kind,id)=>{const m=idx[kind]||(idx[kind]=Object.fromEntries(ad[kind].ids().map(x=>[x.id,x.ts||0])));return m[id]||0};
  while(n===500){
   const rows=await rest('GET','?select=kind,id,data,ts,deleted,updated_at&order=updated_at.asc&limit=500'+(cur?'&updated_at=gt.'+encodeURIComponent(cur):''));
   n=rows.length;
   for(const r of rows){
    cur=r.updated_at;const a=ad[r.kind];if(!a)continue;
    const k=kk(r.kind,r.id),d=dirty[k],lts=d?d.ts:loc(r.kind,r.id);
    if((+r.ts||0)>lts){
     if(r.deleted)a.del(r.id);else if(r.data)a.put(r.id,r.data);
     delete dirty[k];ch[r.kind]=1}}
   meta.cursor=cur;save()}
  Object.keys(ch).forEach(k=>{try{if(ad[k].refresh)ad[k].refresh()}catch(e){}})}
 async function push(){
  const keys=Object.keys(dirty);if(!keys.length)return;
  let batch=[],size=0;
  const flush=async()=>{
   if(!batch.length)return;
   await rest('POST','?on_conflict=user_id,kind,id',batch.map(b=>b.row),{Prefer:'resolution=merge-duplicates,return=minimal'});
   batch.forEach(b=>{if(dirty[b.k]===b.d)delete dirty[b.k]});save();batch=[];size=0};
  for(const k of keys){
   const d=dirty[k],i=k.indexOf('|'),kind=k.slice(0,i),id=k.slice(i+1),a=ad[kind];
   if(!a){delete dirty[k];continue}
   let row;
   if(d.d)row={kind,id,data:null,ts:d.ts,deleted:true};
   else{const data=a.get(id);if(!data){delete dirty[k];continue}row={kind,id,data,ts:+data.ts||d.ts,deleted:false}}
   const len=JSON.stringify(row).length;
   if(size+len>700000)await flush();
   batch.push({k,d,row});size+=len}
  await flush()}
 async function run(){
  load();
  const u=Auth.configured()?Auth.user():null;
  if(!u)return;
  if(running&&Date.now()-runStart<120000){again=true;return}
  running=true;runStart=Date.now();meta.err='';emit();
  try{
   if(!(await ensureUser(u))){meta.err='Синхронизация не включена';return}
   await pull();await push();meta.last=Date.now()}
  catch(e){meta.err=e.message||'Ошибка'}
  finally{running=false;lastRun=Date.now();save();emit();if(again){again=false;schedule(1500)}}}
 const api={
  register(kind,a){ad[kind]=a},
  touch(kind,id){load();dirty[kk(kind,id)]={d:0,ts:Date.now()};save();if(Auth.user())schedule()},
  remove(kind,id){load();dirty[kk(kind,id)]={d:1,ts:Date.now()};save();if(Auth.user())schedule()},
  run,
  status(){load();return{running,last:meta.last,err:meta.err,pending:Object.keys(dirty).length,uid:meta.uid}},
  onChange(f){subs.push(f);return()=>{const i=subs.indexOf(f);if(i>=0)subs.splice(i,1)}},
  chooser:null};
 Hooks.on('sync:touch',api.touch);
 Hooks.on('sync:delete',api.remove);
 Hooks.on('app:ready',()=>{Hooks.run('sync:register',api);run()});
 Auth.onChange(u=>{if(u)setTimeout(()=>run(),300)});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&Date.now()-lastRun>30000)run()});
 return api})();
