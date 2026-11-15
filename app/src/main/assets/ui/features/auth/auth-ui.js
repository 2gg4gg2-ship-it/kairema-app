/* ===== АККАУНТ: экраны (модуль auth) =====
   Экран «Аккаунт» (вход, профиль), стартовое окно «с аккаунтом / без аккаунта», строка «Аккаунт» в настройках.
   Способы входа рисуются из реестра AuthMethods (auth-methods.js), здесь их нет.
   Убрать модуль: удалить папку features/auth и его строки в index.html. */
i18nAdd({"Как хотите начать?":"How would you like to start?","Без аккаунта чаты и память хранятся только на этом телефоне: они сохраняются при обновлении приложения, но пропадут, если его удалить. С аккаунтом всё хранится ещё и в облаке и возвращается после переустановки.":"Without an account, chats and memory are stored only on this phone: they survive app updates but are lost if you delete the app. With an account everything is also kept in the cloud and comes back after reinstalling.","Войти в аккаунт":"Sign in","Продолжить без аккаунта":"Continue without an account","Не вошли: данные только на этом телефоне":"Not signed in: data stays on this phone","Сменить аккаунт":"Switch account","Аккаунт остаётся в списке этого телефона, войти в него можно без кода.":"The account stays in this phone's list, you can sign in again without a code."});
i18nAdd({"Аккаунт":"Account","Войти по коду или паролю":"Sign in with a code or password","Вы вошли":"Signed in","Вы вышли":"Signed out","Выйти":"Sign out","Выйти из аккаунта?":"Sign out?","Чаты на этом телефоне останутся. Войти можно в любой момент.":"Chats on this phone will stay. You can sign in again at any time.","По коду":"By code","По паролю":"By password","Почта":"Email","Пароль":"Password","Введите корректную почту":"Enter a valid email","Минимум 6 знаков":"At least 6 characters","Введите почту. Мы отправим на неё код для входа. Если аккаунта нет, он создастся.":"Enter your email. We will send a sign-in code to it. If there is no account yet, it will be created.","Получить код":"Get code","Отправляем…":"Sending…","Код из письма":"Code from the email","Только цифры, 6–10 знаков":"Digits only, 6–10 characters","Отправить код ещё раз":"Send the code again","Код отправлен ещё раз":"Code sent again","Изменить почту":"Change email","Создать аккаунт":"Create account","Входим…":"Signing in…","Аккаунт создан. Подтвердите почту по письму и войдите":"Account created. Confirm your email from the message and sign in","Для аккаунтов нужен бесплатный проект Supabase. Вставьте адрес проекта и публичный ключ (anon key).":"Accounts need a free Supabase project. Paste the project address and the public key (anon key).","Адрес проекта":"Project address","Адрес вида https://xxxx.supabase.co":"Address like https://xxxx.supabase.co","Публичный ключ (anon key)":"Public key (anon key)","Ключ слишком короткий":"The key is too short","Сохранить":"Save","Войти":"Sign in"});
const ACC_MAIL=/^\S+@\S+\.\S+$/;
const accBusy=(btn,t)=>{btn.disabled=true;btn.innerHTML='<span class="spin"></span>'+t};
const accEn=(ru,en)=>LANG==='en'?en:ru;
function accConfirmOut(after){
 ask('Выйти из аккаунта?','Чаты на этом телефоне останутся. Аккаунт остаётся в списке этого телефона, войти в него можно без кода.','Выйти',async()=>{await Auth.signOut();toast('Вы вышли');if(after)after()})}
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
 if(Auth.devices().length>1&&typeof AuthDevice!=='undefined'){
  const sw=el('<button class="btn ghost" data-sw style="width:100%;margin-bottom:10px">Сменить аккаунт</button>');
  sw.onclick=()=>AuthDevice.sheet({pick:()=>{toast('Вы вошли');d.r()},stale:em=>{Auth.signOut().then(()=>{S2.email=em;S2.sent=false;d.r()})},other:()=>{Auth.signOut().then(()=>d.r())}});
  b.insertBefore(sw,$('[data-out]',b))}
 Hooks.run('account:rendered',b,d);
 accSrvLink(b,d,S2)}
function accLogin(b,d,S2){
 b.innerHTML='<h3 class="ac-h">Вход или регистрация</h3><div data-ms></div>';
 const host=$('[data-ms]',b);
 const ctx={S2,d,done(){toast('Вы вошли');d.close()},redraw(){d.r()},email(em){S2.email=em;S2.sent=false;d.r()}};
 AuthMethods.all().forEach(m=>{
  if(m.show&&!m.show(ctx))return;
  const box=el('<section data-m="'+m.id+'"></section>');host.append(box);
  try{m.render(box,ctx)}catch(e){console.warn('Способ входа '+m.id,e)}});
 accSrvLink(b,d,S2)}
/* Стартовое окно: один раз, после заставки, обучения и вопроса об имени. */
const ACC_WK='kairema.welcome.v1';
function accWelcome(){
 if(st.get(ACC_WK)||Auth.user())return;
 let n=0;const iv=setInterval(()=>{
  if(++n>120){clearInterval(iv);return}
  if(st.get(ACC_WK)||Auth.user()){clearInterval(iv);return}
  if($('#splash')||$('[data-screen=onboarding]')||$('.sheet-bg')||$('[data-screen=account]'))return;
  clearInterval(iv);st.set(ACC_WK,'1');
  const s=sheet('<h2 style="margin-bottom:6px">Как хотите начать?</h2><p class="sub" style="margin:0 0 16px">Без аккаунта чаты и память хранятся только на этом телефоне: они сохраняются при обновлении приложения, но пропадут, если его удалить. С аккаунтом всё хранится ещё и в облаке и возвращается после переустановки.</p><button class="btn" data-in style="width:100%">Войти в аккаунт</button><button class="btn ghost" data-no style="width:100%;margin-top:10px">Продолжить без аккаунта</button>');
  $('[data-no]',s).onclick=s.close;
  $('[data-in]',s).onclick=()=>{s.close();openScreen('account')}},500)}
/* Подключение к ядру: строка в настройках, экран и выход. */
Hooks.on('app:ready',()=>{SCREENS.account=accountPage;accWelcome()});
Auth.onChange(()=>{if(typeof CUR!=='undefined'&&CUR==='set')setView()});
Hooks.on('settings:rendered',v=>{
 const u=Auth.user(),pf=$('.pf',v);
 if(pf){
  const r=el(`<button class="sr" style="--i:1" data-acc><span class="si c">${ic('user')}</span><span class="m"><b>Аккаунт</b><small></small></span>${ic('chevR')}</button>`);
  $('small',r).textContent=u?u.email:accEn('Не вошли: данные только на этом телефоне','Not signed in: data stays on this phone');
  r.onclick=()=>openScreen('account');pf.insertAdjacentElement('afterend',r)}
 const o=$('[data-act=out]',v);
 if(o){if(u)o.onclick=()=>accConfirmOut();else o.remove()}});
