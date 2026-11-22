/* ===== ВХОД: почта и код (модуль auth, способ «email») =====
   Один поток для регистрации и входа: ввели почту, получили код, ввели код. Аккаунта нет, он создастся. Пароль не нужен. */
i18nAdd({"Вход или регистрация":"Sign in or sign up","Введите почту. Мы пришлём на неё код. Если аккаунта нет, он создастся сам.":"Enter your email. We will send you a code. If there is no account yet, it will be created automatically.","Продолжить":"Continue"});
AuthMethods.add({id:'email',order:10,render(box,ctx){
 const S2=ctx.S2,en=(ru,e)=>LANG==='en'?e:ru;
 const fail=(stt,sv,label,e)=>{stt.className='stat bad';stt.textContent='✗ '+e.message;sv.disabled=false;sv.textContent=label};
 if(!S2.sent){
  box.innerHTML='<p class="ac-note">Введите почту. Мы пришлём на неё код. Если аккаунта нет, он создастся сам.</p>'
   +fld('Почта','email',S2.email,'Введите корректную почту','email','name@example.com')
   +'<div class="stat"></div><button class="btn" data-s style="width:100%">Продолжить</button>';
  const sv=$('[data-s]',box),stt=$('.stat',box);
  form(box,{email:v=>ACC_MAIL.test(v)},sv);
  sv.onclick=async()=>{
   const em=$('[data-k=email]',box).value.trim();accBusy(sv,'Отправляем…');stt.className='stat';stt.textContent='';
   try{await Auth.sendCode(em);S2.email=em;S2.sent=true;S2.cd=Date.now()+60000;ctx.redraw()}
   catch(e){fail(stt,sv,'Продолжить',e)}};
  return}
 box.innerHTML='<p class="ac-note" data-nt></p>'
  +fld('Код из письма','code','','Только цифры, 6–10 знаков','text','123456')
  +'<div class="stat"></div><button class="btn" data-s style="width:100%">Войти</button><button class="btn ghost" data-re style="width:100%;margin-top:10px"></button><button class="ac-link" data-em>Изменить почту</button>';
 $('[data-nt]',box).textContent=en('Код отправлен на ','Code sent to ')+S2.email;
 $('[data-k=code]',box).setAttribute('inputmode','numeric');
 const sv=$('[data-s]',box),stt=$('.stat',box),re=$('[data-re]',box);
 form(box,{code:v=>/^\d{6,10}$/.test(v)},sv);
 const tick=()=>{const s=Math.ceil((S2.cd-Date.now())/1000);re.disabled=s>0;re.textContent=s>0?en('Отправить ещё раз через '+s+' с','Resend in '+s+' s'):en('Отправить код ещё раз','Send the code again')};
 tick();const iv=setInterval(()=>{if(!box.isConnected){clearInterval(iv);return}tick()},1000);
 sv.onclick=async()=>{
  accBusy(sv,'Входим…');stt.className='stat';stt.textContent='';
  try{await Auth.verifyCode(S2.email,$('[data-k=code]',box).value.trim());ctx.done()}
  catch(e){fail(stt,sv,'Войти',e)}};
 re.onclick=async()=>{
  re.disabled=true;
  try{await Auth.sendCode(S2.email);S2.cd=Date.now()+60000;stt.className='stat ok';stt.textContent=en('Код отправлен ещё раз','Code sent again')}
  catch(e){stt.className='stat bad';stt.textContent='✗ '+e.message}};
 $('[data-em]',box).onclick=()=>{S2.sent=false;ctx.redraw()}}});
