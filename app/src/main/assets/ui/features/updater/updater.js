/* ===== ОБНОВЛЕНИЕ ИЗ ПРИЛОЖЕНИЯ =====
   Настройки → «Обновление»: проверяет последний релиз репозитория на GitHub (releases/latest), показывает, что нового, и по кнопке
   скачивает APK и открывает установку Android. Раз в сутки приложение само проверяет релиз (можно выключить в окне обновления) и
   показывает подсказку, если вышла версия новее. Подпись APK Android проверяет сам: ставится только то, что подписано тем же ключом.
   Условие: сборка на GitHub должна выкладывать APK в Releases (шаг для владельца: docs/UPDATER_SETUP.md). Без релиза показывается
   «релизов пока нет». Kotlin: update/Updater.kt, Bridge.updCheck и Bridge.updInstall.
   API: Updater.cmp(a,b), Updater.check(), Updater.open(). Убрать модуль: удалить папку и строку в index.html. Тест: docs/tests/upd037.test.py */
const Updater=(()=>{
 const REPO='2gg4gg2-ship-it/kairema-app',KA='kairema.upd.auto',KT='kairema.upd.t';
 const api={REPO};
 const ver=s=>{const m=/(\d+)\.(\d+)\.(\d+)/.exec(String(s||''));return m?[+m[1],+m[2],+m[3]]:null};
 /* 1, если a новее b; -1, если старше; 0, если равны или не разобрать */
 api.cmp=(a,b)=>{const x=ver(a),y=ver(b);if(!x||!y)return 0;for(let i=0;i<3;i++){if(x[i]!==y[i])return x[i]>y[i]?1:-1}return 0};
 const autoOn=()=>{try{return localStorage.getItem(KA)!=='0'}catch(e){return true}};
 api.check=async()=>{
  if(!Native.on)throw new Error(L('Работает только в приложении'));
  let raw='';await Native.run('updCheck',[REPO],t=>{raw+=t});
  const o=JSON.parse(raw||'{}');
  if(o.none)return{none:true};
  return{tag:o.tag,name:o.name,body:o.body||'',page:o.page,url:o.url,size:o.size||0,newer:api.cmp(o.tag,APP_VERSION)>0}};
 const mb=n=>(n/1048576).toFixed(1);
 api.open=async()=>{
  const s=sheet('<h2></h2><p class="sub upd-t" style="margin:6px 0 10px"></p><pre class="attt upd-n" hidden></pre><div class="upd-p" hidden><em><i></i></em></div><div class="two"><button class="btn ghost" data-c></button><button class="btn" data-o hidden></button></div><button class="sr upd-a" type="button"><span class="m"><b></b><small></small></span><span class="sw"></span></button>');
  const h=$('h2',s),t=$('.upd-t',s),nt=$('.upd-n',s),pr=$('.upd-p',s),ok=$('[data-o]',s),cl=$('[data-c]',s),au=$('.upd-a',s);
  h.textContent=L('Обновление');cl.textContent=L('Закрыть');cl.onclick=s.close;
  $('b',au).textContent=L('Проверять само раз в сутки');$('small',au).textContent=L('Запрос к GitHub, ничего о вас не отправляется');
  const sw=$('.sw',au),dsw=()=>sw.classList.toggle('on',autoOn());dsw();
  au.onclick=()=>{try{localStorage.setItem(KA,autoOn()?'0':'1')}catch(e){}dsw()};
  t.textContent=L('Версия')+' '+APP_VERSION+'. '+L('Проверяю…');
  let r;
  try{r=await api.check()}catch(e){t.textContent=L('Не удалось проверить')+': '+(e&&e.message?e.message:'');return}
  try{localStorage.setItem(KT,String(Date.now()))}catch(e){}
  if(r.none){t.textContent=L('Релизов на GitHub пока нет. Версия')+' '+APP_VERSION;return}
  if(!r.newer){t.textContent=L('У вас последняя версия')+': '+APP_VERSION;return}
  t.textContent=L('Доступна версия')+' '+r.tag.replace(/^v/i,'')+(r.size?' · '+mb(r.size)+' MB':'')+'. '+L('У вас')+' '+APP_VERSION+'.';
  if(r.body){nt.hidden=false;nt.textContent=r.body}
  if(!r.url){t.textContent+=' '+L('В релизе нет файла APK.');return}
  ok.hidden=false;ok.textContent=L('Скачать и установить');
  ok.onclick=async()=>{
   ok.disabled=true;pr.hidden=false;const bar=$('i',pr);let perm=0;
   t.textContent=L('Скачивание…');
   try{
    await Native.run('updInstall',[REPO,r.url],c=>{
     if(c.startsWith('p:')){const [d,tt]=c.slice(2).split('/').map(Number);if(tt>0){const p=Math.round(d/tt*100);bar.style.width=p+'%';t.textContent=L('Скачивание')+' '+p+'%'}else t.textContent=L('Скачивание')+' '+mb(d)+' MB'}
     else if(c==='perm')perm=1});
    t.textContent=perm?L('Разрешите установку из Kairema в открывшихся настройках, вернитесь и нажмите кнопку ещё раз'):L('Откроется окно установки Android: нажмите «Обновить»');
    ok.disabled=false;ok.textContent=perm?L('Скачать и установить'):L('Установить ещё раз')}
   catch(e){ok.disabled=false;t.textContent=L('Не удалось скачать')+': '+(e&&e.message?e.message:'');pr.hidden=true}}};
 /* Тихая проверка раз в сутки */
 api.auto=async()=>{
  if(!Native.on||!autoOn())return;
  let last=0;try{last=+localStorage.getItem(KT)||0}catch(e){}
  if(Date.now()-last<86400000)return;
  try{const r=await api.check();try{localStorage.setItem(KT,String(Date.now()))}catch(e){}
   if(r.newer&&r.url)toast(L('Доступна версия')+' '+r.tag.replace(/^v/i,'')+': '+L('Настройки → Обновление'))}catch(e){}};
 Hooks.on('app:ready',()=>setTimeout(api.auto,6000));
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-upd]',v))return;
  const r=el('<button class="sr" data-upd><span class="si c">'+ic('ok')+'</span><span class="m"><b></b><small></small></span></button>');
  $('b',r).textContent=L('Обновление');$('small',r).textContent=L('Версия')+' '+APP_VERSION+' · '+L('Проверить');
  r.onclick=api.open;ab.insertAdjacentElement('beforebegin',r)});
 i18nAdd({"Обновление":"Update","Проверить":"Check","Версия":"Version","Закрыть":"Close","Проверяю…":"Checking…","Не удалось проверить":"Could not check","Релизов на GitHub пока нет. Версия":"No releases on GitHub yet. Version","У вас последняя версия":"You have the latest version","Доступна версия":"Version available","У вас":"You have","В релизе нет файла APK.":"The release has no APK file.","Скачать и установить":"Download and install","Скачивание…":"Downloading…","Скачивание":"Downloading","Разрешите установку из Kairema в открывшихся настройках, вернитесь и нажмите кнопку ещё раз":"Allow installs from Kairema in the settings that opened, come back and tap the button again","Откроется окно установки Android: нажмите «Обновить»":"The Android install window will open: tap “Update”","Установить ещё раз":"Install again","Не удалось скачать":"Download failed","Проверять само раз в сутки":"Check automatically once a day","Запрос к GitHub, ничего о вас не отправляется":"A request to GitHub, nothing about you is sent","Настройки → Обновление":"Settings → Update","Работает только в приложении":"Works only in the app"});
 return api})();
