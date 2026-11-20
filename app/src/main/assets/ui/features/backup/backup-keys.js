/* ===== РЕЗЕРВНАЯ КОПИЯ: ЗАШИФРОВАННЫЕ API-КЛЮЧИ =====
   По умолчанию ключи в копию не попадают. Если включить «Сохранить API-ключи», они кладутся в файл ТОЛЬКО в зашифрованном виде:
   AES-256-GCM, ключ шифрования выводится из вашего пароля (PBKDF2, SHA-256, 250 000 кругов, случайная соль). Пароль нигде не хранится
   и восстановить его нельзя: забыли пароль, ключи из этого файла не достать (остальные данные копии откроются).
   Ключи достаёт Kotlin (Bridge.keysExport) только по токену приложения, шифрует JS (WebCrypto), при восстановлении Kotlin
   (Bridge.keysImport) кладёт их обратно в Keystore и НЕ перезаписывает ключи, которые на телефоне уже есть.
   Формат в файле: keysEnc = {v:1, kdf:'PBKDF2-SHA256', iter, salt, iv, ct} (всё в base64), keysN = сколько ключей.
   API: BackupKeys.available(), pack(пароль, {id: ключ}), unpack(keysEnc, пароль) → {id: ключ} или бросает ошибку 'bad-password'.
   Тест: docs/tests/backupkeys041.test.py. Убрать модуль: удалить файл и строку в index.html (в backup.js вызовы защищены typeof). */
const BackupKeys=(()=>{
 const ITER=250000,te=new TextEncoder(),td=new TextDecoder();
 const subtle=()=>typeof crypto!=='undefined'&&crypto.subtle?crypto.subtle:null;
 const b64=u=>{let s='';const a=new Uint8Array(u);for(let i=0;i<a.length;i+=0x8000)s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000));return btoa(s)};
 const unb64=t=>{const s=atob(t),a=new Uint8Array(s.length);for(let i=0;i<s.length;i++)a[i]=s.charCodeAt(i);return a};
 const derive=async(pw,salt,iter)=>{
  const base=await subtle().importKey('raw',te.encode(pw),'PBKDF2',false,['deriveKey']);
  return subtle().deriveKey({name:'PBKDF2',salt,iterations:iter,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])};
 const available=()=>!!subtle()&&typeof TextEncoder!=='undefined';
 async function pack(pw,keys){
  if(!available())throw new Error('no-crypto');
  const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
  const k=await derive(String(pw),salt,ITER);
  const ct=await subtle().encrypt({name:'AES-GCM',iv},k,te.encode(JSON.stringify({keys})));
  return{v:1,kdf:'PBKDF2-SHA256',iter:ITER,salt:b64(salt),iv:b64(iv),ct:b64(ct)}}
 async function unpack(env,pw){
  if(!available())throw new Error('no-crypto');
  if(!env||env.v!==1||typeof env.salt!=='string'||typeof env.iv!=='string'||typeof env.ct!=='string')throw new Error('bad-file');
  const iter=Math.min(Math.max(+env.iter||0,100000),2000000);
  let out;
  try{const k=await derive(String(pw),unb64(env.salt),iter);out=await subtle().decrypt({name:'AES-GCM',iv:unb64(env.iv)},k,unb64(env.ct))}
  catch(e){throw new Error('bad-password')}
  const o=JSON.parse(td.decode(out));
  return o&&o.keys&&typeof o.keys==='object'?o.keys:{}}
 return{available,pack,unpack,ITER}})();
