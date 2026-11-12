/* ===== АККАУНТ: сервис входа (Supabase Auth по REST, без интерфейса) =====
   Способы: код на почту, почта и пароль. Google добавится отдельным шагом.
   Сессия хранится на устройстве (localStorage kairema.session.v1). Ключ anon публичный. */
const Auth=(()=>{
 const SKEY='kairema.session.v1',CKEY='kairema.sb.v1',subs=[];
 let sess=null,loaded=false;
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
  save();emit();return true}
 return{
  configured(){const c=cfg();return!!(c.url&&c.key)},
  url(){return cfg().url},
  config(){const c=cfg();return{url:c.url,key:c.key}},
  host(){try{return new URL(cfg().url).host}catch(e){return''}},
  setConfig(url,key){
   url=String(url||'').trim().replace(/\/+$/,'');key=String(key||'').trim();
   if(!/^https:\/\/[^\s/]+\.[^\s/]+$/.test(url))throw new Error('Адрес должен быть вида https://xxxx.supabase.co');
   if(key.length<20)throw new Error('Ключ слишком короткий');
   load();if(url!==cfg().url&&sess){sess=null;save();emit()}
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
  async signOut(){load();const t=sess&&sess.access;sess=null;save();emit();if(t){try{await call('/logout',{},t)}catch(e){}}}}})();
