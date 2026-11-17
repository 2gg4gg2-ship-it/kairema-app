/* core/messages.js: СООБЩЕНИЯ, МОСТ К ANDROID (Native), ЧАТ. Часть бывшего большого app.js (разрезан в 0.28.0 без смены поведения; порядок подключения в index.html важен). */
/* ===== ЧАТЫ: сообщения и ответ ИИ ===== */
function msgEl(m,isNew,q){const d=el(`<div class="msg ${m.r} ${isNew?'new':''}"><span class="bd"></span></div>`);const bd=$('.bd',d);if(m.r==='a'&&!m.err&&!q&&m.t)mdRender(bd,m.t,m);else bd.innerHTML=hl(m.t,q);Hooks.run('msg:render',d,m);return d}
function paint(box,msgs,q){box.innerHTML='';if(!msgs.length)box.innerHTML='<div class="empty"><p>Диалог пуст. Напишите первое сообщение.</p></div>';let from=0;if(!q&&!window.PAINT_FULL&&msgs.length>80)from=msgs.length-60;
 if(from){const more=el('<button class="more-old"></button>');const lab=()=>more.textContent=L('Показать ранние')+' ('+from+')';lab();
  more.onclick=()=>{const h=box.scrollHeight,t=box.scrollTop,to=from,f=Math.max(0,from-60),fr=document.createDocumentFragment();for(let i=f;i<to;i++)fr.append(msgEl(msgs[i],0));from=f;more.after(fr);if(from)lab();else more.remove();box.scrollTop=t+(box.scrollHeight-h)};box.append(more)}
 for(let i=from;i<msgs.length;i++)box.append(msgEl(msgs[i],0,q))}
/* Прокрутка чата. scr: принудительно вниз (отправили сообщение, открыли чат). scl: во время потока ответа ведёт вниз,
   ТОЛЬКО пока читатель внизу; как только он потянул чат вверх, не мешаем (b._stk=false), вернулся к низу снова следуем. */
function follow(b){if(b._fw)return;b._fw=1;
 const mark=()=>{b._u=Date.now()};['touchstart','touchmove','wheel','pointerdown','keydown'].forEach(e=>b.addEventListener(e,mark,{passive:true}));
 b.addEventListener('scroll',()=>{if(Date.now()-(b._u||0)<1800)b._stk=b.scrollHeight-b.scrollTop-b.clientHeight<90},{passive:true})}
const scr=b=>{follow(b);b._stk=true;b.scrollTop=1e6};
const scl=b=>{follow(b);if(b._stk!==false)b.scrollTop=1e6};
function stopTail(d){const b=el('<button class="more-old stp-c"></button>');b.textContent=L('Остановлено. Продолжить');b.onclick=()=>{b.remove();const c=Chat.cmp;if(!c||!c.setText)return;c.setText(L('Продолжи с того места, где остановился.'));const sd=$('.send',c);if(sd&&!sd.disabled)sd.click()};d.append(b)}
i18nAdd({"Остановлено. Продолжить":"Stopped. Continue","Продолжи с того места, где остановился.":"Continue from where you stopped.","Остановить":"Stop"});
async function respond(msgs,box,tag){const m={r:'a',t:''};msgs.push(m);const d=msgEl(m,1);box.append(d);const bd=$('.bd',d);bd.innerHTML='<span class="typing"><i></i><i></i><i></i></span>';scr(box);
 const pv=actProv();
 if(Native.on&&pv){
  const anth=/anthropic\.com/.test(pv.url),last=[...msgs].reverse().find(x=>x.r==='u');
  let src=[],serr='',qs=[];
  let nat=false;const mw=typeof Tools!=='undefined'&&Tools.mwebOn();
  if(((S.web&&!mw&&!(typeof isSelfQ==='function'&&isSelfQ(last&&(last.q||last.t))))||(last&&last.deep))&&last){
   const sp=S.sproviders.find(x=>x.ok);
   if(last.deep&&typeof Tools!=='undefined'){const r=await Tools.research(pv,sp,(last.q||last.t),bd);
    if(r.stopped){const i=msgs.indexOf(m);if(i>=0)msgs.splice(i,1);d.remove();window.GEN=null;if(Chat.cmp&&Chat.cmp.upd)Chat.cmp.upd();if(!msgs.some(x=>x.t)&&!box.children.length)paint(box,msgs);return}
    src=r.src;serr=r.serr;nat=!!r.native}
   else if(!sp)serr='нет подключённого провайдера поиска'
   else if(typeof WebSearch!=='undefined'){const r=await WebSearch.find(pv,sp,msgs,last,bd);src=r.src;serr=r.serr;qs=r.qs||[]}
   else{bd.textContent='Ищу в интернете…';let raw='';
    try{await Native.run('search',[JSON.stringify({id:sp.id,url:sp.url}),(last.q||last.t).slice(0,300)],t=>{raw+=t});src=JSON.parse(raw||'[]')}catch(e){serr=e.message}}}
  const ctx=src.length?'Результаты поиска в интернете ('+new Date().toLocaleDateString('ru-RU')+'):\n'+(qs.length?'Запросы: '+qs.join('; ')+'\n':'')+src.map((s,i)=>'['+(i+1)+'] '+s.title+'\n'+s.url+'\n'+s.snippet).join('\n\n')+'\n\nПравила: это результаты автоматического поиска по тексту вопроса, они могут не относиться к делу (например, если вопрос про тебя, это приложение или нашу беседу). Используй только то, что прямо отвечает на вопрос, и ссылайся номерами [1], [2]. Если результаты не по теме, молча игнорируй их и отвечай сам; ничего не выдумывай и не приписывай найденное предмету вопроса. Если в результатах есть даты, называй их; при расхождении источников скажи об этом; если для точного ответа не хватает данных, прямо скажи, чего не хватает, и не угадывай. Не вставляй ссылки в текст, только номера [n]. Вопрос пользователя: ':'';
  const mkHist=c=>(typeof Ctx!=='undefined'?Ctx.view(msgs):msgs).filter(x=>x!==m&&!x.err&&x.t).map(x=>({role:x.r==='u'?'user':'assistant',content:toContent(x,anth,x===last?c:'')}));const hist=mkHist(ctx);
  const tail=(src.length?'\n\nИсточники:\n'+src.map((s,i)=>'['+(i+1)+'] '+s.title+' — '+s.url).join('\n'):'')+(serr?'\n\n⚠ Поиск не сработал: '+serr:'');
  try{Quality.watch(msgs)}catch(_){}
  let got=false;window.GEN={stopped:0,pr:null,stop(){this.stopped=1;Native.cancel(this.pr&&this.pr.id)}};if(Chat.cmp&&Chat.cmp.upd)Chat.cmp.upd();
  try{
   const run=h=>{const pr=Native.run('chat',[JSON.stringify({id:pv.id,url:pv.url,model:pv.model,system:sysPrompt()+(typeof Tools!=='undefined'?Tools.sysx(last):'')+sysExtra(msgs),think:typeof Tools!=='undefined'?Tools.think():0,...(typeof Tools!=='undefined'?Tools.webArg(nat):{})}),JSON.stringify(h)],t=>{if(t.charCodeAt(0)===2){if(typeof Cost!=='undefined')Cost.usage(m,t.slice(1));return}if(t.charCodeAt(0)===1){if(typeof Tools!=='undefined')Tools.thought(d,m,t.slice(1));return}if(typeof Quality!=='undefined'){t=Quality.filter(t);if(!t)return}if(!got){got=true;bd.textContent='';m.t='';if(typeof Tools!=='undefined')Tools.thoughtDone(d)}m.t+=t;mdLive(bd,m,()=>scl(box))});if(window.GEN)GEN.pr=pr;return pr};
   await run(hist);
   /* Пустой ответ при включённом поиске: повторяем один раз без результатов поиска */
   if(!got&&ctx&&!GEN.stopped){src=[];serr='модель не ответила с результатами поиска, ответ без них';await run(mkHist(''))}
   if(!got&&GEN.stopped)throw new Error('Canceled');
   if(!got){m.err=1;m.t=bd.textContent='Пустой ответ от провайдера'}
   else{m.src=src.slice(0,5);m.serr=serr;mdRender(bd,m.t,m);scl(box);if(typeof Cost!=='undefined')Cost.done(m,pv,hist,sysPrompt());Hooks.run('chat:answer',m,bd)}
  }catch(e){
   if(window.GEN&&GEN.stopped){
    if(got&&m.t){mdRender(bd,m.t,m);m.stopped=1;stopTail(d)}
    else{const i=msgs.indexOf(m);if(i>=0)msgs.splice(i,1);d.remove();if(!msgs.some(x=>x.t)&&!box.children.length)paint(box,msgs)}
   }else{m.err=1;m.t=bd.textContent='Не удалось получить ответ: '+e.message;try{Log.add('chat',e.message)}catch(_){}}
  }finally{window.GEN=null;if(Chat.cmp&&Chat.cmp.upd)Chat.cmp.upd()}
  return}
 await wait(1000);
 const full=L((tag||'')+REPLY+(S.web?' Использованы актуальные данные из интернета.':''));bd.textContent='';
 for(const w of full.split(' ')){bd.textContent+=(bd.textContent?' ':'')+w;scr(box);await wait(reduce?0:30)}m.t=full}
/* ===== NATIVE: мост к Android (ключи в Keystore, запросы к провайдерам) ===== */
const NB=window.KairemaBridge,Native=(()=>{const pend={};let n=0,tok='';
 /* Токен приложения (Kotlin: bridge/Guard.kt). Присылается главной странице при загрузке; фреймы предпросмотра HTML его не видят.
    Методы из GUARD требуют токен первым аргументом. Пока токена нет (браузер, тесты с подменой моста), аргументы идут как есть. */
 const GUARD=new Set(['saveKey','deleteKey','termux','termuxRequestPermission','termuxStatus','shell','verify','models','chat','image','search','inboxTake']);
 const call=(fn,...a)=>GUARD.has(fn)&&tok?NB[fn](tok,...a):NB[fn](...a);
 window.KairemaNative={chunk(id,t){const p=pend[id];if(p&&p.on)p.on(t)},done(id,err){const p=pend[id];if(!p)return;delete pend[id];err?p.rej(new Error(err)):p.res()},tok(t){if(!tok&&typeof t==='string')tok=t}};
 return{on:!!NB,
  saveKey:(id,k)=>{if(NB)call('saveKey',id,k)},
  deleteKey:id=>{if(NB)call('deleteKey',id)},
  run(fn,args,on){let id;const p=new Promise((res,rej)=>{id='r'+(++n);pend[id]={res,rej,on};try{call(fn,id,...args)}catch(e){delete pend[id];rej(e)}});p.id=id;return p},
  cancel:id=>{if(NB&&id){try{NB.cancel(id)}catch(e){}}},
  sync:(fn,...a)=>{try{return NB?call(fn,...a):null}catch(e){return null}}}})();
const IMG_EXT=/\.(jpe?g|png|webp|gif|bmp|heic|heif|avif)$/i;
const isImgF=f=>String(f.type||'').startsWith('image/')||IMG_EXT.test(f.name||'');
const TXT_EXT=/\.(txt|md|markdown|json|jsonl|csv|tsv|xml|html?|css|js|mjs|ts|tsx|jsx|py|kt|kts|java|c|h|cpp|hpp|cs|go|rs|rb|php|sh|bat|ps1|ya?ml|toml|ini|cfg|conf|log|sql|swift|gradle|properties|gitignore|env|vue|svelte|lua|dart|tex|srt|svg)$/i;
const b64=buf=>{let s='';const u=new Uint8Array(buf),n=0x8000;for(let i=0;i<u.length;i+=n)s+=String.fromCharCode.apply(null,u.subarray(i,i+n));return btoa(s)};
async function imgPart(f){
 const bm=await createImageBitmap(f),k=Math.min(1,1568/Math.max(bm.width,bm.height));
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bm.width*k));c.height=Math.max(1,Math.round(bm.height*k));
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bm,0,0,c.width,c.height);if(bm.close)bm.close();
 return{k:'image',name:f.name,mime:'image/jpeg',data:c.toDataURL('image/jpeg',.85).split(',')[1]}}
async function readFiles(list,anth){
 const out=[];
 for(const f of list){
  try{
   if(isImgF(f))out.push(await imgPart(f));
   else if(f.type==='application/pdf'||/\.pdf$/i.test(f.name)){
    if(!anth){toast('PDF поддерживается только провайдером Anthropic: '+f.name);out.push({k:'text',name:f.name,text:'[Файл не передан: этот провайдер не принимает PDF. Скажи пользователю, что содержимое PDF ты не видишь, и попроси прислать текст или фото страниц.]'});continue}
    if(f.size>8*1048576){toast('Файл больше 8 МБ: '+f.name);out.push({k:'text',name:f.name,text:'[Файл не передан: больше 8 МБ.]'});continue}
    out.push({k:'pdf',name:f.name,data:b64(await f.arrayBuffer())})}
   else if(f.type.startsWith('text/')||/^application\/(json|xml)/.test(f.type)||TXT_EXT.test(f.name)){
    let t=await f.text();if(t.length>200000)t=t.slice(0,200000)+'\n[… файл обрезан]';
    out.push({k:'text',name:f.name,text:t})}
   else{toast('Формат не поддерживается: '+f.name);out.push({k:'text',name:f.name,text:'[Файл не передан: формат не поддерживается приложением. Скажи пользователю, что содержимое файла ты не видишь.]'})}
  }catch(e){const hc=/\.hei[cf]$/i.test(f.name||'');toast(hc?'Формат HEIC не читается: выберите JPEG или сделайте скриншот':'Не удалось прочитать: '+f.name);out.push({k:'text',name:f.name,text:'[Файл не передан: не удалось прочитать. Скажи пользователю, что содержимое файла ты не видишь.]'})}
 }
 return out}
const toContent=(m,anth,pre)=>{
 const parts=m.parts||[];let txt=(pre||'')+m.t;
 if(!parts.length)return txt;
 const blocks=[];
 const noVis=typeof Caps!=='undefined'&&Caps.vision&&Caps.vision(actProv())===false;
 for(const p of parts){
  if(p.k==='image'&&noVis){txt+='\n\n[Пользователь приложил изображение «'+(p.name||'')+'», но выбранная модель не умеет видеть изображения. Скажи об этом одним предложением и предложи выбрать модель со значком «Зрение». Не угадывай, что на фото.]';continue}
  if(p.k==='text')txt+='\n\n--- Файл «'+p.name+'» ---\n'+p.text+'\n--- конец файла ---';
  else if(p.k==='image'||p.k==='pdf'){
   const dd=p.data||Media.load(p.path);
   if(!dd)txt+='\n\n[вложение «'+(p.name||p.k)+'» недоступно]';
   else if(p.k==='image')blocks.push(anth?{type:'image',source:{type:'base64',media_type:p.mime,data:dd}}:{type:'image_url',image_url:{url:'data:'+p.mime+';base64,'+dd}});
   else if(anth)blocks.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:dd}})}}
 return[...blocks,{type:'text',text:txt}]};
const PKEY='kairema.providers.v1';
const PRKEY='kairema.profile.v1';
const saveProfile=()=>st.set(PRKEY,JSON.stringify(S.p));
function loadProfile(){try{const d=JSON.parse(st.get(PRKEY)||'null');if(d&&typeof d==='object')Object.assign(S.p,{name:String(d.name||'').slice(0,60),user:String(d.user||'').slice(0,20),email:String(d.email||'').slice(0,100),lang:d.lang?1:0})}catch(e){}}
function askName(){if(S.p.name||st.get('kna'))return;st.set('kna','1');
 const s=sheet(`<h2 style="margin-bottom:6px">Как вас зовут?</h2><p class="sub" style="margin:0 0 14px">Имя можно изменить позже в настройках. Пока имени нет, показывается «Гость».</p><div class="fld"><input id="nm-in" maxlength="60" autocomplete="off" placeholder="Ваше имя"></div><div class="two"><button class="btn ghost" data-c>Пропустить</button><button class="btn" data-o>Сохранить</button></div>`);
 $('[data-c]',s).onclick=s.close;
 $('[data-o]',s).onclick=()=>{const v=$('#nm-in',s).value.trim();if(!v){toast('Введите имя');return}S.p.name=v.slice(0,60);saveProfile();s.close();if(CUR==='set')setView()}}
const saveProviders=()=>st.set(PKEY,JSON.stringify({c:S.providers,s:S.sproviders}));
const loadProviders=()=>{try{const o=JSON.parse(st.get(PKEY)||'{}');if(Array.isArray(o.c))S.providers=o.c;if(Array.isArray(o.s))S.sproviders=o.s}catch(e){}};
const pid=()=>'p_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);
/* composer */
/* Включить или выключить поиск в интернете (кнопка в поле ввода и переключатель в настройках). */
function toggleWeb(){
 if(!S.web&&!S.sproviders.some(x=>x.ok)){toast('Сначала подключите провайдера поиска: Настройки, Добавить провайдера поиска');return}
 S.web=!S.web;st.set('kw',S.web?'1':'0');bus.forEach(f=>f());
 $$('[data-tg=web] .sw').forEach(x=>x.classList.toggle('on',S.web));
 toast(S.web?'Поиск в интернете включён':'Поиск в интернете выключен')}
function composer(o){
 const w=el(`<div class="cmp"><div class="att"></div><div class="modes"></div><textarea rows="1" placeholder="${o.ph||'Сообщение'}" aria-label="Сообщение"></textarea><div class="cr"><button class="cb pl" data-plus data-action="composer:plus" aria-label="Функции и вложения">${ic('plus')}</button><button class="cb gl" data-w aria-label="Поиск в интернете">${ic('globe')}</button><button class="chip2" data-c></button><span style="flex:1"></span><button class="cb tb" data-tb data-action="composer:templates" aria-label="Шаблоны" title="Шаблоны">${ic('tpl')}</button><button class="send" disabled data-action="composer:send" aria-label="Отправить">${ic('up')}</button></div><input type="file" hidden data-ig accept="image/*" multiple><input type="file" hidden data-if multiple><input type="file" hidden data-ic accept="image/*" capture="environment"></div>`);
 const ta=$('textarea',w),sd=$('.send',w),gl=$('.gl',w),ch=$('.chip2',w);let files=[],busy=0;
 const UP=sd.innerHTML,STOP='<svg class="i" viewBox="0 0 24 24"><rect x="7" y="7" width="10" height="10" rx="2" fill="currentColor"/></svg>';
 const upd=()=>{const g=!!window.GEN;sd.disabled=g?false:(busy||(!ta.value.trim()&&!files.length));if(sd._g!==g){sd._g=g;sd.innerHTML=g?STOP:UP;sd.setAttribute('aria-label',g?'Остановить':'Отправить')}};
 const grow=()=>{const p=ta.offsetHeight;ta.style.height='auto';const h=Math.min(ta.scrollHeight,110);ta.style.height=p+'px';ta.offsetHeight;ta.style.height=h+'px';upd()};
 ta.oninput=grow;ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&matchMedia('(hover:hover)').matches){e.preventDefault();send()}};
 const send=()=>{if(window.GEN){window.GEN.stop();return}if(sd.disabled)return;const t=ta.value.trim(),f=files.map(x=>x.f.name),fl=files.map(x=>x.f);files.forEach(x=>x.u&&URL.revokeObjectURL(x.u));ta.value='';files=[];$('.att',w).innerHTML='';ta.style.height='22px';upd();o.onSend(t,f,fl,typeof Tools!=='undefined'?Tools.take():null)};sd.onclick=send;
 const addF=list=>{[...list].forEach(f=>{const im=isImgF(f),o2={f,u:im?URL.createObjectURL(f):''};files.push(o2);const c=el(`<div class="ap ${im?'im':''}">${im?'<img alt="">':`${ic('file')}<span><b></b><small></small></span>`}<button class="rm" aria-label="Удалить вложение">${ic('x')}</button></div>`);if(im){$('img',c).src=o2.u}else{$('b',c).textContent=f.name;$('small',c).textContent=fmt(f.size)}$('.rm',c).onclick=()=>{files=files.filter(x=>x!==o2);if(o2.u)URL.revokeObjectURL(o2.u);c.remove();upd()};$('.att',w).append(c)});upd()};
 const ins={g:$('[data-ig]',w),f:$('[data-if]',w),c:$('[data-ic]',w)};Object.values(ins).forEach(i=>i.onchange=()=>{addF(i.files);i.value=''});
 $('[data-plus]',w).onclick=()=>{if(typeof Tools!=='undefined'){Tools.open({pick:k=>ins[k].click(),tpl:()=>tpl()});return}const s=sheet(`<button class="pi2" data-k="g">${ic('img')}<span>Галерея</span></button><button class="pi2" data-k="f">${ic('file')}<span>Файлы</span></button><button class="pi2" data-k="c">${ic('cam')}<span>Камера</span></button><button class="btn ghost" data-x style="width:100%;margin-top:10px">Отмена</button>`);$$('[data-k]',s).forEach(b=>b.onclick=()=>{s.close();ins[b.dataset.k].click()});$('[data-x]',s).onclick=s.close};
 const tpl=()=>{const s=sheet(`<h2 style="margin-bottom:12px">Шаблоны промтов</h2><div id="tl"></div>`);tplList($('#tl',s),t=>{s.close();ta.value=(ta.value?ta.value+'\n':'')+t;grow();ta.focus()})};
 let lp;ta.addEventListener('pointerdown',()=>{lp=setTimeout(tpl,650)});['pointerup','pointermove','pointercancel'].forEach(e=>ta.addEventListener(e,()=>clearTimeout(lp)));
 $('[data-tb]',w).onclick=()=>{if(typeof Roles!=='undefined'&&Roles.pick){Roles.pick(w,ta);return}tpl()};
 w.setText=t=>{ta.value=t;grow()};w.chip=()=>{ch.innerHTML=o.chip();ch.onclick=o.onChip||null};w.busy=b=>{busy=b;upd()};w.upd=upd;const g=()=>{gl.classList.toggle('on',!!S.web);gl.setAttribute('aria-pressed',S.web?'true':'false');gl.title=S.web?'Поиск в интернете включён':'Поиск в интернете выключен'};gl.onclick=()=>toggleWeb();bus.push(g);g();w.chip();if(typeof Tools!=='undefined')Tools.bind(w,o.ph);return w}
/* ===== ЧАТ: единственный чат — с подключённым AI-провайдером ===== */
function apiView(){Chx.load();const v=$('#v-api'),p=actProv();v.innerHTML='';
 if(!p){v.innerHTML=`<div class="top"><h1>Чат</h1></div><div class="warn">${ic('warn')}<h2>Подключите AI-провайдера, чтобы начать чат</h2><p class="sub">Чат работает только через вашего AI-провайдера. Добавьте название, API URL и ключ, модель выберите из списка.</p><button class="btn big" id="btn-connect-provider" data-action="provider:connect">Подключить AI-провайдера</button></div>`;
  $('#btn-connect-provider',v).onclick=()=>{show('set');provPage()};return}
 v.innerHTML=`<div class="top"><h1>Чат</h1><button class="ib" data-chl aria-label="Список чатов" style="margin-left:auto">${ic('chat')}</button><button class="ib" data-chn aria-label="Новый чат">${ic('plus')}</button></div><button class="prow" id="btn-provider-info" data-action="provider:manage" aria-label="Провайдер и модель"><span class="stt2"></span><span class="pn"></span>${ic('chevR')}</button><div class="msgs"></div>`;
 const pn=$('.pn',v);pn.textContent=p.name;const sm=document.createElement('small');sm.textContent=p.model;pn.append(sm);
 $('#btn-provider-info',v).onclick=modelMenu;
 const box=$('.msgs',v);paint(box,S.apiMsgs);$('[data-chl]',v).onclick=chatsPage;$('[data-chn]',v).onclick=()=>Chx.create(apiView);
 const cmp=composer({ph:'Сообщение',chip:()=>'',onSend:async(t,f,fl,md)=>{const ch=Chx.cur;const m={r:'u',q:t,t:(f.length?f.join(', ')+'\n':'')+t};if(md==='deep')m.deep=1;S.apiMsgs.push(m);autoFact(t,'');$('.empty',box)?.remove();const el0=msgEl(m,1);box.append(el0);scr(box);cmp.busy(1);const pv0=actProv();m.parts=await readFiles((fl||[]).slice(0,6),!!pv0&&/anthropic\.com/.test(pv0.url));if(typeof Att!=='undefined')Att.paint(el0,m);if(m.parts.some(x=>x.k==='image')&&typeof Caps!=='undefined'&&Caps.vision&&Caps.vision(pv0)===false)toast('Эта модель не видит фото: выберите модель со значком «Зрение»');Chx.busy=1;try{Chx.save(ch);await(md==='image'&&typeof Tools!=='undefined'?Tools.image(ch,box,t):respond(ch.msgs,box,'['+p.model+'] '))}finally{Chx.busy=0;Chx.save(ch);cmp.busy(0)}}});
 v.append(cmp);Chat.cmp=cmp;Hooks.run('chat:rendered',v);if(PEND){cmp.setText(PEND);PEND=''}}
