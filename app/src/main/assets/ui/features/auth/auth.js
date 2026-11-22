/* ===== ЯДРО АККАУНТА: сервис входа (Supabase Auth по REST, без интерфейса) =====
   Способы: код на почту (основной, он же регистрация), почта и пароль (старые аккаунты, в интерфейсе не показывается).
   Сессия активного аккаунта: localStorage kairema.session.v1. Список аккаунтов этого телефона для быстрого входа:
   kairema.accounts.v1 ([{id,email,refresh,last}]). Ключ anon публичный.
   Новый способ входа (например Google) = отдельный файл с AuthMethods.add (см. auth-methods.js), ядро не правится. */
const Auth=(()=>{
 const SKEY='kairema.session.v1',CKEY='kairema.sb.v1',AKEY='kairema.accounts.v1',subs=[];
 let sess=null,loaded=false,accs=null;
 const outs=[];
 /* Перед выходом или сменой аккаунта модули (sync) отправляют несохранённое в облако и очищают телефон. force=true: не ждать отправки. */
 const runOut=async force=>{for(const f of outs.slice())await f(!!force)};
 const aload=()=>{if(accs)return;try{const a=JSON.parse(st.get(AKEY)||'[]');accs=Array.isArray(a)?a.filter(x=>x&&x.id&&x.email):[]}catch(e){accs=[]}};
 const asave=()=>st.set(AKEY,JSON.stringify(accs));
 const remember=()=>{aload();if(!sess)return;const rec={id:sess.user.id,email:sess.user.email,refresh:sess.refresh||'',last:Date.now()},i=accs.findIndex(x=>x.id===rec.id);if(i>=0)accs[i]=rec;else accs.push(rec);asave()};
 const load=()=>{if(loaded)return;loaded=true;try{const d=JSON.parse(st.get(SKEY)||'null');if(d&&d.refresh&&d.user)sess=d}catch(e){}};
 const save=()=>{if(sess)st.set(SKEY,JSON.stringify(sess));else{try{localStorage.removeItem(SKEY)}catch(e){}}};
 const emit=()=>subs.forEach(f=>{try{f(sess?sess.user:null)}catch(e){}});
 const cfg=()=>{let c={};try{c=JSON.parse(st.get(CKEY)||'{}')||{}}catch(e){}
  return{url:String(c.url||CONFIG.supabaseUrl||'').trim().replace(/\/+$/,''),key:String(c.key||CONFIG.supabaseAnonKey||'').trim()}};
 const errText=(status,j)=>{
  const code=String((j&&(j.error_code||j.code))||''),msg=String((j&&(j.msg||j.message||j.error_description||j.error))||'');
  if(code==='invalid_credentials'||/invalid login credentials/i.test(msg))return'Неверная почта или пароль';
  if(code==='email_not_confirmed'||/not confirmed/i.test(msg))return'Почта не подтверждена. В Supabase отключите Confirm email';
  if(code==='user_already_exists'||/already registered/i.test(msg))return'Такая почта уже зарегистрирована';
  if(code==='weak_password'||/password should be|at least \d+ char/i.test(msg))return'Пароль слишком простой, минимум 6 знаков';
  if(code==='otp_expired'||/token has expired|invalid.*token|otp/i.test(msg))return'Код неверный или просрочен';
  if(code==='over_email_send_rate_limit'||code==='over_request_rate_limit'||status===429)return'Слишком много попыток. Подождите немного';
  if(code==='signup_disabled'||/signups not allowed/i.test(msg))return'Регистрация отключена на сервере';
  if(code==='email_address_invalid'||/invalid.*email/i.test(msg))return'Некорректный адрес почты';
  if(status===401||status===403)return'Сервер отклонил ключ (anon key). Проверьте настройки сервера';
  if(status===404)return'Адрес сервера неверный (404)';
  return msg||('Ошибка сервера ('+status+')')};
 async function call(path,body,token){
  const c=cfg();if(!c.url||!c.key)throw new Error('Сервер аккаунтов не подключён');
  let r;
  try{r=await fetch(c.url+'/auth/v1'+path,{method:'POST',headers:Object.assign({'Content-Type':'application/json',apikey:c.key},token?{Authorization:'Bearer '+token}:{}),body:JSON.stringify(body||{})})}
  catch(e){throw new Error('Нет соединения с сервером')}
  let j={};try{j=await r.json()}catch(e){}
  if(!r.ok)throw new Error(errText(r.status,j));
  return j}
 function take(j){
  if(!j||!j.access_token||!j.user)return false;
  sess={access:j.access_token,refresh:j.refresh_token,exp:Date.now()+(j.expires_in||3600)*1000,user:{id:j.user.id,email:j.user.email||''}};
  save();remember();emit();return true}
 return{
  configured(){const c=cfg();return!!(c.url&&c.key)},
  url(){return cfg().url},
  config(){const c=cfg();return{url:c.url,key:c.key}},
  host(){try{return new URL(cfg().url).host}catch(e){return''}},
  setConfig(url,key){
   url=String(url||'').trim().replace(/\/+$/,'');key=String(key||'').trim();
   if(!/^https:\/\/[^\s/]+\.[^\s/]+$/.test(url))throw new Error('Адрес должен быть вида https://xxxx.supabase.co');
   if(key.length<20)throw new Error('Ключ слишком короткий');
   load();aload();if(url!==cfg().url){accs=[];asave();if(sess){sess=null;save();emit()}}
   st.set(CKEY,JSON.stringify({url,key}))},
  user(){load();return sess?sess.user:null},
  onChange(f){subs.push(f)},
  async signUp(email,pw){const j=await call('/signup',{email,password:pw});return{confirm:!take(j)}},
  async signIn(email,pw){take(await call('/token?grant_type=password',{email,password:pw}))},
  async sendCode(email){await call('/otp',{email,create_user:true})},
  async verifyCode(email,code){if(!take(await call('/verify',{type:'email',email,token:code})))throw new Error('Сервер не вернул сессию')},
  /* Действующий access token (обновляет при необходимости) или null. */
  async token(){
   load();if(!sess)return null;
   if(sess.exp-60000>Date.now())return sess.access;
   try{take(await call('/token?grant_type=refresh_token',{refresh_token:sess.refresh}));return sess?sess.access:null}
   catch(e){if(/Нет соединения/.test(e.message))return null;sess=null;save();emit();return null}},
  /* Выход: сессия закрывается на телефоне, а аккаунт остаётся в списке для быстрого входа (токен на сервере не отзывается).
     Полностью убрать аккаунт с телефона и отозвать токен: forget(id). */
  beforeSignOut(f){outs.push(f)},
  async signOut(force){load();if(sess)await runOut(force);sess=null;save();emit()},
  /* Аккаунты этого телефона: [{id,email,last,stale}] (stale: быстрый вход недоступен, нужен код). Свежие сверху. */
  devices(){aload();return accs.slice().sort((a,b)=>(b.last||0)-(a.last||0)).map(x=>({id:x.id,email:x.email,last:x.last||0,stale:!x.refresh}))},
  /* Быстрый вход в аккаунт из списка без кода. При отказе сервера ставит stale и бросает ошибку с e.stale=true и e.email. */
  async switchTo(id){
   load();aload();const a=accs.find(x=>x.id===id);if(!a)throw new Error('Аккаунт не найден на этом телефоне');
   const stale=()=>{a.refresh='';asave();const e=new Error('Вход устарел. Войдите по коду');e.stale=true;e.email=a.email;return e};
   if(!a.refresh)throw stale();
   if(sess&&sess.user.id!==id)await runOut(false);
   let j;
   try{j=await call('/token?grant_type=refresh_token',{refresh_token:a.refresh})}
   catch(e){if(/Нет соединения|Слишком много/.test(e.message))throw e;throw stale()}
   if(!take(j))throw stale()},
  /* Убрать аккаунт с телефона и отозвать его вход на сервере (если получится). */
  async forget(id){
   load();aload();const a=accs.find(x=>x.id===id);if(!a)return;
   accs=accs.filter(x=>x!==a);asave();Hooks.run('auth:forgot',id);
   let t=null;
   if(sess&&sess.user.id===id){await runOut(false);t=sess.access;sess=null;save();emit()}
   else if(a.refresh){try{const j=await call('/token?grant_type=refresh_token',{refresh_token:a.refresh});t=j&&j.access_token}catch(e){}}
   if(t){try{await call('/logout?scope=local',{},t)}catch(e){}}}}})();
