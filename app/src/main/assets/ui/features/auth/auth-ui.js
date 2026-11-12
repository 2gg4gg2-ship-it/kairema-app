/* ===== АККАУНТ: экраны входа (модуль auth) =====
   Подключается через Hooks: строка «Аккаунт» в настройках и экран accountPage.
   Убрать модуль: удалить папку features/auth и его строки в index.html. */
i18nAdd({"Аккаунт":"Account","Войти по коду или паролю":"Sign in with a code or password","Вы вошли":"Signed in","Вы вышли":"Signed out","Выйти":"Sign out","Выйти из аккаунта?":"Sign out?","Чаты на этом телефоне останутся. Войти можно в любой момент.":"Chats on this phone will stay. You can sign in again at any time.","По коду":"By code","По паролю":"By password","Почта":"Email","Пароль":"Password","Введите корректную почту":"Enter a valid email","Минимум 6 знаков":"At least 6 characters","Введите почту. Мы отправим на неё код для входа. Если аккаунта нет, он создастся.":"Enter your email. We will send a sign-in code to it. If there is no account yet, it will be created.","Получить код":"Get code","Отправляем…":"Sending…","Код из письма":"Code from the email","Только цифры, 6–10 знаков":"Digits only, 6–10 characters","Отправить код ещё раз":"Send the code again","Код отправлен ещё раз":"Code sent again","Изменить почту":"Change email","Создать аккаунт":"Create account","Входим…":"Signing in…","Аккаунт создан. Подтвердите почту по письму и войдите":"Account created. Confirm your email from the message and sign in","Для аккаунтов нужен бесплатный проект Supabase. Вставьте адрес проекта и публичный ключ (anon key).":"Accounts need a free Supabase project. Paste the project address and the public key (anon key).","Адрес проекта":"Project address","Адрес вида https://xxxx.supabase.co":"Address like https://xxxx.supabase.co","Публичный ключ (anon key)":"Public key (anon key)","Ключ слишком короткий":"The key is too short","Сохранить":"Save","Войти":"Sign in"});
const ACC_MAIL=/^\S+@\S+\.\S+$/;
const accBusy=(btn,t)=>{btn.disabled=true;btn.innerHTML='<span class="spin"></span>'+t};
const accEn=(ru,en)=>LANG==='en'?en:ru;
function accConfirmOut(after){
 ask('Выйти из аккаунта?','Чаты на этом телефоне останутся. Войти можно в любой момент.','Выйти',async()=>{await Auth.signOut();toast('Вы вышли');if(after)after()})}
function accountPage(){
 if($('[data-screen=account]'))return;
 const S2={mode:0,sent:false,email:'',srv:false,cd:0};
 return page('account','Аккаунт',(b,d)=>{
  if(!Auth.configured()||S2.srv)return accServer(b,d,S2);
  if(Auth.user())return accMe(b,d,S2);
  accLogin(b,d,S2)})}
function accSrvLink(b,d,S2){
 const l=el('<button class="ac-link" data-srv></button>');
 l.textContent=accEn('Сервер: ','Server: ')+Auth.host()+accEn(' · изменить',' · change');
 l.onclick=()=>{S2.srv=true;d.r()};b.append(l)}
function accServer(b,d,S2){
 b.innerHTML='<p class="ac-note">Для аккаунтов нужен бесплатный проект Supabase. Вставьте адрес проекта и публичный ключ (anon key).</p>'
  +fld('Адрес проекта','url',Auth.url(),'Адрес вида https://xxxx.supabase.co','url','https://xxxx.supabase.co')
  +fld('Публичный ключ (anon key)','key','','Ключ слишком короткий','text','eyJ… / sb_publishable_…')
  +'<div class="stat"></div><button class="btn" data-s style="width:100%">Сохранить</button>';
 const sv=$('[data-s]',b),stt=$('.stat',b);
 form(b,{url:v=>/^https:\/\/[^\s/]+\.[^\s/]+$/.test(v.replace(/\/+$/,'')),key:v=>v.length>=20},sv);
 sv.onclick=()=>{try{Auth.setConfig($('[data-k=url]',b).value,$('[data-k=key]',b).value);S2.srv=false;d.r()}catch(e){stt.className='stat bad';stt.textContent='✗ '+e.message}}}
function accMe(b,d,S2){
 const u=Auth.user();
 b.innerHTML='<div class="card ac-me"></div><button class="btn ghost" data-out style="width:100%">Выйти</button>';
 const c=$('.ac-me',b);c.innerHTML=ini({name:u.email||'?'})+'<span class="m"><b></b><small>Вы вошли</small></span>';
 $('b',c).textContent=u.email||'';
 $('[data-out]',b).onclick=()=>accConfirmOut(()=>d.close());
 Hooks.run('account:rendered',b,d);
 accSrvLink(b,d,S2)}
function accLogin(b,d,S2){
 b.innerHTML='<div data-sg></div><div data-bd style="margin-top:14px"></div>';
 $('[data-sg]',b).append(seg(['По коду','По паролю'],S2.mode,i=>{S2.mode=i;S2.sent=false;d.r()}));
 const body=$('[data-bd]',b),mail=()=>$('[data-k=email]',body).value.trim();
 const fail=(stt,sv,label,e)=>{stt.className='stat bad';stt.textContent='✗ '+e.message;sv.disabled=false;sv.textContent=label};
 const ok=()=>{toast('Вы вошли');d.close()};
 if(S2.mode===0&&!S2.sent){
  body.innerHTML='<p class="ac-note">Введите почту. Мы отправим на неё код для входа. Если аккаунта нет, он создастся.</p>'
   +fld('Почта','email',S2.email,'Введите корректную почту','email','name@example.com')
   +'<div class="stat"></div><button class="btn" data-s style="width:100%">Получить код</button>';
  const sv=$('[data-s]',body),stt=$('.stat',body);
  form(body,{email:v=>ACC_MAIL.test(v)},sv);
  sv.onclick=async()=>{
   const em=mail();accBusy(sv,'Отправляем…');stt.className='stat';stt.textContent='';
   try{await Auth.sendCode(em);S2.email=em;S2.sent=true;S2.cd=Date.now()+60000;d.r()}
   catch(e){fail(stt,sv,'Получить код',e)}}
 }else if(S2.mode===0){
  body.innerHTML='<p class="ac-note" data-nt></p>'
   +fld('Код из письма','code','','Только цифры, 6–10 знаков','text','123456')
   +'<div class="stat"></div><button class="btn" data-s style="width:100%">Войти</button><button class="btn ghost" data-re style="width:100%;margin-top:10px"></button><button class="ac-link" data-em>Изменить почту</button>';
  $('[data-nt]',body).textContent=accEn('Код отправлен на ','Code sent to ')+S2.email;
  $('[data-k=code]',body).setAttribute('inputmode','numeric');
  const sv=$('[data-s]',body),stt=$('.stat',body),re=$('[data-re]',body);
  form(body,{code:v=>/^\d{6,10}$/.test(v)},sv);
  const tick=()=>{const s=Math.ceil((S2.cd-Date.now())/1000);re.disabled=s>0;re.textContent=s>0?accEn('Отправить ещё раз через '+s+' с','Resend in '+s+' s'):accEn('Отправить код ещё раз','Send the code again')};
  tick();const iv=setInterval(()=>{if(!body.isConnected){clearInterval(iv);return}tick()},1000);
  sv.onclick=async()=>{
   accBusy(sv,'Входим…');stt.className='stat';stt.textContent='';
   try{await Auth.verifyCode(S2.email,$('[data-k=code]',body).value.trim());ok()}
   catch(e){fail(stt,sv,'Войти',e)}};
  re.onclick=async()=>{
   re.disabled=true;
   try{await Auth.sendCode(S2.email);S2.cd=Date.now()+60000;stt.className='stat ok';stt.textContent=accEn('Код отправлен ещё раз','Code sent again')}
   catch(e){stt.className='stat bad';stt.textContent='✗ '+e.message}};
  $('[data-em]',body).onclick=()=>{S2.sent=false;d.r()}
 }else{
  body.innerHTML=fld('Почта','email',S2.email,'Введите корректную почту','email','name@example.com')
   +fld('Пароль','pw','','Минимум 6 знаков','password','••••••')
   +'<div class="stat"></div><button class="btn" data-s style="width:100%">Войти</button><button class="btn ghost" data-up style="width:100%;margin-top:10px">Создать аккаунт</button>';
  const sv=$('[data-s]',body),up=$('[data-up]',body),stt=$('.stat',body),pw=()=>$('[data-k=pw]',body).value;
  form(body,{email:v=>ACC_MAIL.test(v),pw:v=>v.length>=6},sv);
  const sync=()=>{up.disabled=sv.disabled};sync();
  $$('[data-k]',body).forEach(i=>i.addEventListener('input',sync));
  sv.onclick=async()=>{
   S2.email=mail();accBusy(sv,'Входим…');up.disabled=true;stt.className='stat';stt.textContent='';
   try{await Auth.signIn(S2.email,pw());ok()}catch(e){fail(stt,sv,'Войти',e);sync()}};
  up.onclick=async()=>{
   S2.email=mail();accBusy(up,'Входим…');sv.disabled=true;stt.className='stat';stt.textContent='';
   try{
    const r=await Auth.signUp(S2.email,pw());
    if(r.confirm){stt.className='stat ok';stt.textContent='Аккаунт создан. Подтвердите почту по письму и войдите';up.textContent='Создать аккаунт';sv.disabled=false;up.disabled=false}
    else ok()
   }catch(e){fail(stt,up,'Создать аккаунт',e);sv.disabled=false}}}
 accSrvLink(b,d,S2)}
/* Подключение к ядру: строка в настройках, экран и выход. */
Hooks.on('app:ready',()=>{SCREENS.account=accountPage});
Auth.onChange(()=>{if(typeof CUR!=='undefined'&&CUR==='set')setView()});
Hooks.on('settings:rendered',v=>{
 const u=Auth.user(),pf=$('.pf',v);
 if(pf){
  const r=el(`<button class="sr" style="--i:1" data-acc><span class="si c">${ic('user')}</span><span class="m"><b>Аккаунт</b><small></small></span>${ic('chevR')}</button>`);
  $('small',r).textContent=u?u.email:accEn('Войти по коду или паролю','Sign in with a code or password');
  r.onclick=()=>openScreen('account');pf.insertAdjacentElement('afterend',r)}
 const o=$('[data-act=out]',v);
 if(o){if(u)o.onclick=()=>accConfirmOut();else o.remove()}});
