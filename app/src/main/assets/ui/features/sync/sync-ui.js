/* ===== СИНХРОНИЗАЦИЯ: интерфейс (модуль sync) =====
   Блок состояния на экране «Аккаунт» и вопрос при входе под другим аккаунтом. */
i18nAdd({"В этом аккаунте уже есть чаты. Добавить к ним чаты с этого телефона?":"This account already has chats. Add the chats from this phone to them?","Добавить чаты с телефона":"Add chats from this phone","Не добавлять, удалить с телефона":"Do not add, delete from this phone","Синхронизировать сейчас":"Sync now","Другой аккаунт":"Another account","Чаты и память на этом телефоне принадлежат другому аккаунту. Что сделать?":"Chats and memory on this phone belong to another account. What should we do?","Добавить к этому аккаунту":"Add to this account","Очистить телефон и загрузить данные аккаунта":"Clear the phone and load the account data"});
const syncEn=(ru,en)=>LANG==='en'?en:ru;
function syncText(){
 const s=Sync.status();
 if(s.running)return syncEn('Синхронизация…','Syncing…');
 if(s.err)return s.err;
 const t=s.last?new Date(s.last).toLocaleTimeString(LANG==='en'?'en-US':'ru-RU',{hour:'2-digit',minute:'2-digit'}):'';
 if(!t)return syncEn('Ещё не синхронизировано','Not synced yet');
 return syncEn('Синхронизировано в ','Synced at ')+t+(s.pending?syncEn(', ждут отправки: ',', waiting to upload: ')+s.pending:'')}
Hooks.on('account:rendered',(b)=>{
 const box=el('<div class="ac-sync" style="margin-bottom:12px"><p class="ac-note" data-ss></p><button class="btn ghost" data-sn style="width:100%">Синхронизировать сейчас</button></div>');
 const ss=$('[data-ss]',box),btn=$('[data-sn]',box);
 const paint=()=>{ss.textContent=syncText();btn.disabled=Sync.status().running};
 paint();
 const off=Sync.onChange(()=>{if(!box.isConnected){off();return}paint()});
 btn.onclick=()=>{Sync.run()};
 const out=$('[data-out]',b);out?b.insertBefore(box,out):b.append(box)});
Sync.chooser=()=>new Promise(res=>{
 let fin=false;const end=v=>{if(fin)return;fin=true;res(v)};
 const s=sheet(`<h2 style="margin-bottom:6px">Чаты с этого телефона</h2><p class="sub" style="margin:0 0 16px">В этом аккаунте уже есть чаты. Добавить к ним чаты с этого телефона?</p><button class="btn" data-m style="width:100%">Добавить чаты с телефона</button><button class="btn ghost" data-w style="width:100%;margin-top:10px">Не добавлять, удалить с телефона</button>`);
 $('[data-m]',s).onclick=()=>{end('merge');s.close()};
 $('[data-w]',s).onclick=()=>{end('wipe');s.close()};
 const iv=setInterval(()=>{if(!s.isConnected){clearInterval(iv);end(null)}},500)});
