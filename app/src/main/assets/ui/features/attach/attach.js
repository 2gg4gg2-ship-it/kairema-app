/* ===== ВЛОЖЕНИЯ ЧЕРЕЗ KOTLIN: фото из галереи и файлы =====
   Системный выбор файлов внутри WebView у части телефонов ничего не возвращает (фото «не прикрепляется»).
   Здесь выбор делает сам Android (Kotlin: attach/Attach.kt): фото уменьшается и поворачивается на телефоне (HEIC читается),
   файлы приходят кусками, из них собирается обычный File и дальше всё как раньше (addF в messages.js).
   Если моста нет (браузер, старая сборка), Attach.pick возвращает false и работает прежний выбор через <input type=file>.
   API: Attach.pick('g' | 'f', addF) → true, если выбор открыт через Kotlin. Убрать модуль: удалить папку и строку в index.html. */
const Attach=(()=>{
 i18nAdd({"Не удалось прикрепить":"Could not attach","Файл не выбран":"No file selected"});
 const b2u=s=>{const r=atob(s),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return u};
 const guess=n=>/\.pdf$/i.test(n)?'application/pdf':/\.jpe?g$/i.test(n)?'image/jpeg':/\.png$/i.test(n)?'image/png':'';
 const api={};
 api.ok=()=>{try{return !!(typeof Native!=='undefined'&&Native.on&&window.KairemaAttach&&typeof window.KairemaAttach.attachPick==='function')}catch(e){return false}};
 /* Собрать File из кусков, пришедших от Kotlin (ничего не знает про интерфейс, поэтому проверяется в тестах отдельно) */
 api.collect=()=>{
  const asm={},files=[],errs=[];
  return{
   on(t){
    let o;try{o=JSON.parse(t)}catch(e){return}
    if(!o)return;
    if(o.err){errs.push((o.n||'')+': '+o.err);return}
    const a=asm[o.k]||(asm[o.k]={n:o.n,m:o.m,pk:o.pk,p:[],c:o.c,got:0});
    if(!a.p[o.i]){a.p[o.i]=b2u(o.d);a.got++}
    if(a.got===a.c){const f=new File(a.p,a.n,{type:a.m||guess(a.n)});if(a.pk)f._k=a.pk;files.push(f);delete asm[o.k]}},
   files,errs}};
 api.pick=(kind,add)=>{
  if(!api.ok())return false;
  const c=api.collect();
  Native.run('attachPick',[kind==='g'?'image':'file'],t=>c.on(t))
   .then(()=>{if(c.errs.length)toast(c.errs[0]);if(c.files.length)add(c.files)})
   .catch(e=>toast(L('Не удалось прикрепить')+(e&&e.message?': '+e.message:'')));
  return true};
 return api})();
