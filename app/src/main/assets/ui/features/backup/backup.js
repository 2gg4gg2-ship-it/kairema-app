/* ===== РЕЗЕРВНАЯ КОПИЯ: чаты, память, шаблоны, настройки и список провайдеров одним файлом (JSON) =====
   Нужна для автономности: копия делается без облака и аккаунта, восстановить можно на другом телефоне.
   API-ключи (Keystore), токен входа и данные синхронизации в файл НЕ попадают: после восстановления ключи вводятся заново.
   Восстановление только добавляет данные: ничего из текущих чатов и памяти не удаляется, а совпавший чат заменяется,
   только если в копии он новее. Экран: Настройки → «Резервная копия» (строка добавляется перед «О приложении»).
   Убрать модуль: удалить папку features/backup и строку в index.html. */
i18nAdd({"Сохранить API-ключи":"Include API keys","Зашифруются вашим паролем. Только для вас":"Encrypted with your password. For you only","Пароль для ключей":"Password for the keys","Пароль от ключей в копии":"Password for the keys in the backup","Придумайте пароль не короче 8 знаков. Он нигде не сохраняется, и восстановить его нельзя: без него ключи из этого файла не достать.":"Choose a password of at least 8 characters. It is not stored anywhere and cannot be recovered: without it the keys in this file cannot be read.","Введите пароль, которым вы защитили ключи при создании копии.":"Enter the password you used to protect the keys when you made the backup.","Пароль":"Password","Повторите пароль":"Repeat the password","Отмена":"Cancel","Продолжить":"Continue","Пароль короче 8 знаков":"Password is shorter than 8 characters","Пароли не совпадают":"Passwords do not match","Введите пароль":"Enter the password","Шифрование недоступно на этом устройстве":"Encryption is not available on this device","Нет ключей для сохранения":"No keys to save","Не удалось зашифровать ключи":"Could not encrypt the keys","Ключей сохранено (зашифрованы): ":"Keys saved (encrypted): ","В копии есть зашифрованные API-ключи (":"The backup has encrypted API keys (","). Введите пароль, чтобы вернуть их, или нажмите «Отмена», чтобы ввести ключи вручную.":"). Enter the password to restore them, or tap Cancel to enter the keys manually.","Неверный пароль":"Wrong password","Не удалось прочитать ключи":"Could not read the keys","Ключей восстановлено: ":"Keys restored: ","провайдеров: ":"providers: ","зашифрованных ключей: ":"encrypted keys: ","Файл с ключами храните только у себя и не отправляйте другим":"Keep the file with keys to yourself and do not send it to others","Резервная копия":"Backup","Сохранить и восстановить данные":"Save and restore your data","Файл содержит чаты, память, шаблоны, настройки и список провайдеров. API-ключи в файл не попадают: после восстановления их нужно ввести заново.":"The file holds chats, memory, templates, settings and the provider list. API keys are not included: enter them again after restoring.","Сохранить в «Загрузки»":"Save to Downloads","Отправить файлом":"Send as a file","Восстановить из файла":"Restore from a file","Не удалось сохранить":"Could not save","Файл не похож на копию Kairema":"This file is not a Kairema backup","Файл слишком большой":"The file is too large","Восстановить копию?":"Restore the backup?","Данные добавятся к текущим, ничего не будет удалено.":"The data will be added to the current data; nothing is deleted.","Восстановить":"Restore","Копия восстановлена":"Backup restored","Не вошло в файл из-за размера: ":"Left out because of size: ","Чатов: ":"Chats: ","фактов памяти: ":"memory facts: ","провайдеров (без ключей): ":"providers (no keys): ","Вставьте ключи провайдеров заново, а тему и профиль увидите после перезапуска приложения":"Enter the provider keys again; the theme and profile apply after the app restarts"});
const Backup=(()=>{
 const SET=['kairema.profile.v1','kairema.templates.v1','kairema.usage.v1','kairema.prices.v1','kth','kthink','kact','kairema.tags.v1','kairema.bm.v1','kairema.a11y.v1','kairema.mcp.v1'];
 const MAXIN=60e6,MEDIA=30e6;
 const api={};
 const ext=m=>(String(m||'image/png').split('/')[1]||'png').replace('jpeg','jpg').replace(/[^a-z0-9]/gi,'').slice(0,5)||'png';
 /* Одно сообщение. Картинки и PDF подгружаются из файлов устройства и вкладываются в копию (base64), пока хватает бюджета. */
 const serMsg=(m,bud)=>{
  const o=Chx.ser(m,false);
  if(m.img){const b=m.img.b64||Media.load(m.img.path);if(b&&bud.take(b.length))o.img={mime:m.img.mime||'image/png',b64:b}}
  const media=[];let want=0;
  (m.parts||[]).forEach(p=>{if(p.k!=='image'&&p.k!=='pdf')return;want++;const b=p.data||Media.load(p.path);if(b&&bud.take(b.length))media.push({k:p.k,name:p.name||'',mime:p.mime||'',b64:b})});
  if(media.length){o.media=media;if(media.length===want)delete o.n}
  return o};
 api.build=extra=>{
  Chx.load();
  const bud={left:MEDIA,skipped:0,take(n){if(this.left<n){this.skipped++;return false}this.left-=n;return true}};
  const settings={};SET.forEach(k=>{const v=st.get(k);if(typeof v==='string')settings[k]=v});
  const chats=Chx.list.filter(c=>c.msgs.some(m=>m.t)).map(c=>({id:c.id,title:c.title,named:c.named?1:0,pinned:c.pinned?1:0,ts:c.ts,msgs:c.msgs.filter(m=>m.t).map(m=>serMsg(m,bud))}));
  const data={app:'kairema',v:1,ver:typeof APP_VERSION==='string'?APP_VERSION:'',t:new Date().toISOString(),
   chats,memory:{prof:S.prof||'',items:S.memos.map(x=>typeof Mem!=='undefined'?Mem.toItem(x):({id:x[2],t:x[0],src:x[1],ts:x[3]}))},
   providers:S.providers.map(p=>({id:p.id,name:p.name,model:p.model,url:p.url})),
   sproviders:S.sproviders.map(p=>({id:p.id,name:p.name,url:p.url})),settings};
  if(extra)Object.assign(data,extra);
  return{json:JSON.stringify(data),skipped:bud.skipped,chats:chats.length,mem:data.memory.items.length}};
 const fname=()=>'kairema-backup-'+new Date().toISOString().slice(0,10)+'.json';
 const download=(name,json)=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([json],{type:'application/json'}));a.download=name;document.body.append(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1000)};
 /* Пароль для шифрования (при сохранении, с повтором) или для расшифровки (при восстановлении). Возвращает пароль или null. */
 const askPw=(save,note)=>new Promise(res=>{
  const s=sheet(`<h2></h2><p class="sub" data-n style="margin:8px 0 10px"></p><input class="cdi" data-p type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false"><input class="cdi" data-q type="password" autocomplete="new-password" autocapitalize="off" spellcheck="false" style="margin-top:8px"><p class="sub" data-e style="margin:8px 0 0;color:#d24a4a"></p><div class="two" style="margin-top:12px"><button class="btn ghost" data-c type="button"></button><button class="btn" data-o type="button"></button></div>`);
  $('h2',s).textContent=L(save?'Пароль для ключей':'Пароль от ключей в копии');
  $('[data-n]',s).textContent=note||L(save?'Придумайте пароль не короче 8 знаков. Он нигде не сохраняется, и восстановить его нельзя: без него ключи из этого файла не достать.':'Введите пароль, которым вы защитили ключи при создании копии.');
  $('[data-p]',s).placeholder=L('Пароль');$('[data-q]',s).placeholder=L('Повторите пароль');if(!save)$('[data-q]',s).style.display='none';
  $('[data-c]',s).textContent=L('Отмена');$('[data-o]',s).textContent=L('Продолжить');
  let done=0;const fin=v=>{if(done)return;done=1;s.close();res(v)};
  $('[data-c]',s).onclick=()=>fin(null);
  $('[data-o]',s).onclick=()=>{const p=$('[data-p]',s).value,e=$('[data-e]',s);
   if(save){if(p.length<8){e.textContent=L('Пароль короче 8 знаков');return}if(p!==$('[data-q]',s).value){e.textContent=L('Пароли не совпадают');return}}
   else if(!p){e.textContent=L('Введите пароль');return}
   fin(p)};
  s.addEventListener('click',ev=>{if(ev.target===s)fin(null)});
  setTimeout(()=>{try{$('[data-p]',s).focus()}catch(e){}},380)});
 const provIds=()=>[...new Set([...S.providers,...S.sproviders].map(p=>p&&p.id).filter(Boolean))];
 /* Копия с зашифрованными ключами, если включено. null = отменено или не вышло. */
 const prep=async()=>{
  if(!opt.keys||typeof BackupKeys==='undefined')return api.build();
  if(!Native.on||!BackupKeys.available()){toast(L('Шифрование недоступно на этом устройстве'));return null}
  const pw=await askPw(true);if(!pw)return null;
  let keys={};try{keys=JSON.parse(Native.sync('keysExport',JSON.stringify(provIds()))||'{}')}catch(e){}
  const n=Object.keys(keys).length;
  if(!n){toast(L('Нет ключей для сохранения'));return api.build()}
  let env=null;try{env=await BackupKeys.pack(pw,keys)}catch(e){toast(L('Не удалось зашифровать ключи'));return null}
  keys=null;
  const b=api.build({keysEnc:env,keysN:n});b.keysN=n;return b};
 const opt={keys:0};
 api.save=async()=>{
  const b=await prep();if(!b)return;const n=fname();
  if(!Native.on){download(n,b.json)}
  else{const ok=Native.sync('saveFile',n,'application/json',b.json);toast(ok?L('Сохранено в «Загрузки»'):L('Не удалось сохранить'))}
  if(b.keysN)setTimeout(()=>toast(L('Ключей сохранено (зашифрованы): ')+b.keysN),1500);
  if(b.skipped)setTimeout(()=>toast(L('Не вошло в файл из-за размера: ')+b.skipped),2200)};
 api.share=async()=>{
  const b=await prep();if(!b)return;const n=fname();
  if(!Native.on){download(n,b.json);return}
  if(!Native.sync('shareFile',n,'application/json',b.json))toast(L('Не удалось сохранить'))};
 /* Ключи из копии: спрашиваем пароль, расшифровываем, кладём в Keystore (имеющиеся не трогаем). */
 api.restoreKeys=async d=>{
  if(!d||!d.keysEnc||typeof BackupKeys==='undefined')return 0;
  for(;;){
   const pw=await askPw(false,L('В копии есть зашифрованные API-ключи (')+(+d.keysN||'?')+L('). Введите пароль, чтобы вернуть их, или нажмите «Отмена», чтобы ввести ключи вручную.'));
   if(!pw)return 0;
   let keys;
   try{keys=await BackupKeys.unpack(d.keysEnc,pw)}
   catch(e){if(e.message==='bad-password'){toast(L('Неверный пароль'));continue}toast(L('Не удалось прочитать ключи'));return 0}
   let added=[];try{added=JSON.parse(Native.sync('keysImport',JSON.stringify(keys))||'[]')}catch(e){}
   keys=null;
   if(added.length){[...S.providers,...S.sproviders].forEach(p=>{if(added.includes(p.id))p.ok=true});saveProviders();apiView()}
   return added.length}};
 /* Сообщение из копии в формат приложения; вложения снова кладутся файлами на устройство. */
 const hyd=o=>{
  const m=Chx.hyd(Object.assign({},o,{img:null}));
  if(o.img&&typeof o.img.b64==='string'){
   const mime=String(o.img.mime||'image/png');
   if(Chx.db()){const path=Media.save(o.img.b64,ext(mime));if(path)m.img={mime,path}}else m.img={mime,b64:o.img.b64}}
  if(Chx.db()&&Array.isArray(o.media)){
   o.media.forEach(p=>{
    if(!p||(p.k!=='image'&&p.k!=='pdf')||typeof p.b64!=='string')return;
    const path=Media.save(p.b64,p.k==='pdf'?'pdf':'jpg');
    if(path)(m.parts=m.parts||[]).push({k:p.k,name:String(p.name||''),mime:String(p.mime||''),path})})}
  return m};
 api.restore=d=>{
  Chx.load();let nc=0,uc=0,nm=0,np=0;
  (Array.isArray(d.chats)?d.chats:[]).forEach(c=>{
   if(!c||!Array.isArray(c.msgs))return;
   const id=String(c.id||'').slice(0,64);if(!/^[A-Za-z0-9._-]+$/.test(id))return;
   const cur=Chx.list.find(x=>x.id===id),ts=+c.ts||0;
   if(cur&&cur.ts>=ts)return;
   const n={id,title:String(c.title||'').slice(0,200),named:c.named?1:0,pinned:c.pinned?1:0,ts,msgs:c.msgs.filter(m=>m&&typeof m==='object').slice(0,5000).map(hyd)};
   if(cur){Chx.list[Chx.list.indexOf(cur)]=n;if(Chx.cur===cur)Chx.open(n);uc++}else{Chx.list.push(n);nc++}
   Hooks.run('sync:touch','chat',id)});
  Chx.list.sort((a,b)=>b.ts-a.ts);Chx.persist();
  const items=d.memory&&Array.isArray(d.memory.items)?d.memory.items:[];
  items.forEach(i=>{if(!i||typeof i.t!=='string'||!i.t.trim())return;if(S.memos.some(x=>(i.id&&x[2]===i.id)||x[0]===i.t))return;S.memos.push(typeof Mem!=='undefined'?Mem.fromItem(i,''):[i.t.slice(0,500),String(i.src||'').slice(0,200),'',0]);nm++});
  if(d.memory&&typeof d.memory.prof==='string'&&d.memory.prof.trim()&&!String(S.prof||'').trim()&&typeof Mem!=='undefined')Mem.setProfile(d.memory.prof);
  if(nm)Hooks.run('memory:changed');
  const addProv=(src,arr,chat)=>(Array.isArray(src)?src:[]).forEach(p=>{
   if(!p||!p.id||typeof p.url!=='string'||!/^https:\/\//.test(p.url)||arr.some(x=>x.id===p.id))return;
   const o={id:String(p.id).slice(0,64),name:String(p.name||'').slice(0,60),url:p.url,ok:false};if(chat)o.model=String(p.model||'');
   arr.push(o);np++});
  addProv(d.providers,S.providers,true);addProv(d.sproviders,S.sproviders,false);
  if(np)saveProviders();
  const sets=d.settings&&typeof d.settings==='object'?d.settings:{};
  SET.forEach(k=>{if(typeof sets[k]==='string'&&st.get(k)==null)st.set(k,sets[k])});
  apiView();
  return{chats:nc+uc,mem:nm,prov:np}};
 const confirm=(d,go)=>{
  const s=sheet(`<h2>${L('Восстановить копию?')}</h2><p class="sub" data-i style="margin:8px 0 6px"></p><p class="sub" style="margin:0 0 18px">${L('Данные добавятся к текущим, ничего не будет удалено.')}</p><div class="two"><button class="btn ghost" data-c type="button">Отмена</button><button class="btn" data-o type="button">${L('Восстановить')}</button></div>`);
  const items=d.memory&&Array.isArray(d.memory.items)?d.memory.items.length:0;
  $('[data-i]',s).textContent=L('Чатов: ')+(d.chats||[]).length+', '+L('фактов памяти: ')+items+', '+(d.keysEnc?L('провайдеров: '):L('провайдеров (без ключей): '))+((d.providers||[]).length+(d.sproviders||[]).length)+(d.keysEnc?', '+L('зашифрованных ключей: ')+(+d.keysN||'?'):'');
  $('[data-c]',s).onclick=s.close;
  $('[data-o]',s).onclick=()=>{s.close();go()}};
 api.pick=()=>{
  const i=document.createElement('input');i.type='file';i.accept='.json,application/json,text/plain';i.style.display='none';document.body.append(i);
  i.onchange=async()=>{
   const f=i.files&&i.files[0];i.remove();if(!f)return;
   if(f.size>MAXIN){toast(L('Файл слишком большой'));return}
   let d=null;try{d=JSON.parse(await f.text())}catch(e){}
   if(!d||d.app!=='kairema'||d.v!==1||!Array.isArray(d.chats)){toast(L('Файл не похож на копию Kairema'));return}
   confirm(d,()=>{const r=api.restore(d);toast(L('Копия восстановлена')+': '+L('Чатов: ')+r.chats+', '+L('фактов памяти: ')+r.mem);if(d.keysEnc){api.restoreKeys(d).then(k=>{if(k)setTimeout(()=>toast(L('Ключей восстановлено: ')+k),600)});return}if(r.prov)setTimeout(()=>toast(L('Вставьте ключи провайдеров заново, а тему и профиль увидите после перезапуска приложения')),2400)})};
  i.click()};
 const page_=()=>page('backup','Резервная копия',b=>{
  b.innerHTML=`<p class="sub" style="margin:0 2px 16px">${L('Файл содержит чаты, память, шаблоны, настройки и список провайдеров. По умолчанию API-ключи в файл не попадают. Если включить «Сохранить API-ключи», они кладутся в файл только в зашифрованном виде, под ваш пароль.')}</p><button class="sr" data-k type="button" style="margin-bottom:12px"><span class="m"><b>${esc(L('Сохранить API-ключи'))}</b><small>${esc(L('Зашифруются вашим паролем. Только для вас'))}</small></span><span class="sw"></span></button><button class="btn" data-s type="button" style="width:100%">${L('Сохранить в «Загрузки»')}</button><button class="btn ghost" data-h type="button" style="width:100%;margin-top:10px">${L('Отправить файлом')}</button><button class="btn ghost" data-r type="button" style="width:100%;margin-top:10px">${L('Восстановить из файла')}</button>`;
  const kb=$('[data-k]',b);if(typeof BackupKeys==='undefined'||!Native.on||!BackupKeys.available())kb.style.display='none';else{const pk=()=>{$('.sw',kb).classList.toggle('on',!!opt.keys);kb.setAttribute('aria-pressed',opt.keys?'true':'false')};pk();kb.onclick=()=>{opt.keys=opt.keys?0:1;pk();if(opt.keys)toast(L('Файл с ключами храните только у себя и не отправляйте другим'))}}
  $('[data-s]',b).onclick=api.save;$('[data-h]',b).onclick=api.share;$('[data-r]',b).onclick=api.pick});
 Hooks.on('app:ready',()=>{SCREENS.backup=page_});
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-backup]',v))return;
  const r=el(`<button class="sr" style="--i:1" data-backup><span class="si c">${ic('doc')}</span><span class="m"><b>${esc(L('Резервная копия'))}</b><small>${esc(L('Сохранить и восстановить данные'))}</small></span>${ic('chevR')}</button>`);
  r.onclick=()=>openScreen('backup');ab.insertAdjacentElement('beforebegin',r)});
 return api})();
