/* ===== ВХОД: аккаунты этого телефона (модуль auth, способ «device») =====
   Кнопка показывает аккаунты, в которые уже входили на этом телефоне по почте. Выбрали аккаунт, и вход без кода.
   Это не вход через Google (он потребует AndroidX и ключей Google Cloud). Данные берутся из Auth.devices(). */
i18nAdd({"Аккаунты на этом телефоне":"Accounts on this phone","Выберите аккаунт":"Choose an account","Вход без кода, только на этом телефоне.":"Sign in without a code, on this phone only.","Вы вошли сейчас":"Signed in now","Нужен код":"Code needed","Убрать":"Remove","Убрать аккаунт с телефона?":"Remove the account from this phone?","Для входа в него понадобится код из письма. Чаты в облаке останутся.":"You will need an email code to sign in again. Chats in the cloud will stay.","Другой почтой":"Use another email","Вход выполнен":"Signed in"});
const AuthDevice={
 /* Окно выбора аккаунта. pick(acc) вызывается после успешного входа; other() по кнопке «Другой почтой»; stale(email) если нужен код. */
 sheet(o){
  o=o||{};const en=(ru,e)=>LANG==='en'?e:ru;
  const s=sheet('<h2 style="margin-bottom:6px">Выберите аккаунт</h2><p class="sub" style="margin:0 0 14px">Вход без кода, только на этом телефоне.</p><div data-ls></div><div class="stat"></div>'+(o.other?'<button class="btn ghost" data-ot style="width:100%;margin-top:10px">Другой почтой</button>':''));
  const ls=$('[data-ls]',s),stt=$('.stat',s);
  const cur=Auth.user();
  const paint=()=>{
   ls.innerHTML='';
   const L=Auth.devices();
   if(!L.length){s.close();return}
   L.forEach(a=>{
    const r=el('<div class="ad-row"><button class="ad-pick"><span class="ad-i"></span><span class="m"><b></b><small></small></span></button><button class="ad-x" aria-label="Убрать">✕</button></div>');
    $('.ad-i',r).textContent=(a.email[0]||'?').toUpperCase();$('b',r).textContent=a.email;
    const me=cur&&cur.id===a.id;
    $('small',r).textContent=me?en('Вы вошли сейчас','Signed in now'):(a.stale?en('Нужен код','Code needed'):'');
    $('.ad-pick',r).onclick=async()=>{
     if(me){s.close();return}
     if(a.stale){s.close();if(o.stale)o.stale(a.email);return}
     r.classList.add('busy');stt.className='stat';stt.textContent='';
     try{await Auth.switchTo(a.id);s.close();if(o.pick)o.pick(a)}
     catch(e){r.classList.remove('busy');if(e.stale){s.close();if(o.stale)o.stale(e.email);return}stt.className='stat bad';stt.textContent='✗ '+e.message}};
    $('.ad-x',r).onclick=()=>ask('Убрать аккаунт с телефона?','Для входа в него понадобится код из письма. Чаты в облаке останутся.','Убрать',async()=>{await Auth.forget(a.id);paint()});
    ls.append(r)})};
  paint();
  if(o.other)$('[data-ot]',s).onclick=()=>{s.close();o.other()};
  return s}};
AuthMethods.add({id:'device',order:20,show:ctx=>!ctx.S2.sent&&Auth.devices().length>0,render(box,ctx){
 box.innerHTML='<div class="ac-or"><span>или</span></div><button class="btn ghost" data-dv style="width:100%">Аккаунты на этом телефоне</button>';
 $('[data-dv]',box).onclick=()=>AuthDevice.sheet({pick:()=>ctx.done(),stale:em=>ctx.email(em)})}});
