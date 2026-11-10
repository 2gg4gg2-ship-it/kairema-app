/* ===== 00. УТИЛИТЫ И ХЕЛПЕРЫ ===== */
const $=(s,e=document)=>e.querySelector(s),$$=(s,e=document)=>[...e.querySelectorAll(s)];
const el=h=>{const t=document.createElement('template');t.innerHTML=h.trim();return t.content.firstChild};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const raf=f=>requestAnimationFrame(()=>requestAnimationFrame(f)),wait=ms=>new Promise(r=>setTimeout(r,ms));
const app=$('#app'),reduce=matchMedia('(prefers-reduced-motion:reduce)').matches,bus=[];
const st={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const P={search:'<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',back:'<path d="M15 5l-7 7 7 7"/>',plus:'<path d="M12 5v14M5 12h14"/>',dots:'<circle cx="12" cy="5" r="1.2"/><circle cx="12" cy="12" r="1.2"/><circle cx="12" cy="19" r="1.2"/>',mem:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.5"/>',clip:'<path d="M20 11l-8 8a5 5 0 01-7-7l8-8a3.5 3.5 0 015 5l-8 8a2 2 0 01-3-3l7-7"/>',tpl:'<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><path d="M16.5 14v6M13.5 17h6"/>',mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0014 0M12 18v3"/>',up:'<path d="M12 19V5M5 12l7-7 7 7"/>',globe:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',user:'<circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/>',chev:'<path d="M6 9l6 6 6-6"/>',chevR:'<path d="M9 6l6 6-6 6"/>',warn:'<path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/>',play:'<path d="M7 5l12 7-12 7z"/>',pause:'<rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="5" width="4" height="14" rx="1"/>',trash:'<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>',copy:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3"/>',share:'<path d="M12 15V4M7 9l5-5 5 5M5 14v5h14v-5"/>',x:'<path d="M6 6l12 12M18 6L6 18"/>',chat:'<path d="M4 5h16v11H9l-5 4z"/>',api:'<circle cx="8" cy="15" r="4"/><path d="M11 12l8-8M16 7l3 3"/>',term:'<path d="M5 7l5 5-5 5M12 18h7"/>',set:'<path d="M4 8h10M18 8h2M4 16h2M10 16h10"/><circle cx="16" cy="8" r="2"/><circle cx="8" cy="16" r="2"/>',coin:'<circle cx="12" cy="12" r="9"/><path d="M12 7v10M9.5 9.5h4a1.5 1.5 0 010 3h-3a1.5 1.5 0 000 3h4"/>',edit:'<path d="M4 20h4L19 9l-4-4L4 16z"/>',ok:'<path d="M5 12l5 5 9-10"/>',enter:'<path d="M20 5v8a2 2 0 01-2 2H5M9 11l-4 4 4 4"/>',out:'<path d="M10 4H5v16h5M15 8l4 4-4 4M19 12H9"/>'};
P.img='<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M21 16l-5-5-8 8"/>';P.file='<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4"/>';P.cam='<path d="M4 8h3l2-3h6l2 3h3v11H4z"/><circle cx="12" cy="13" r="3.5"/>';
P.brain='<path d="M9 4a3 3 0 00-3 3 3 3 0 00-2 5 3 3 0 002 5 3 3 0 006 0V7a3 3 0 00-3-3zM15 4a3 3 0 013 3 3 3 0 012 5 3 3 0 01-2 5 3 3 0 01-6 0"/>';P.doc='<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h3"/>';P.sun='<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4L7 17M17 7l1.4-1.4"/>';P.info='<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8v.5"/>';P.stop='<rect x="6" y="6" width="12" height="12" rx="2"/>';
const fmt=n=>n<1024?n+' Б':n<1048576?Math.round(n/1024)+' КБ':(n/1048576).toFixed(1)+' МБ';
const ic=n=>`<svg class="i" viewBox="0 0 24 24">${P[n]}</svg>`;
const ill='<svg class="ill" viewBox="0 0 130 110" fill="none" stroke="currentColor" stroke-width="2"><circle cx="65" cy="55" r="38" opacity=".35"/><circle cx="65" cy="55" r="22"/><circle cx="65" cy="55" r="6" fill="currentColor"/><circle cx="108" cy="30" r="5" fill="currentColor" opacity=".6"/><path d="M96 38l-14 10" opacity=".5"/></svg>';
/* ===== ЧАТ: заглушка ответа (заменить на запрос к AI-провайдеру через Api) ===== */
const REPLY='Это демонстрационный ответ. Здесь появится ответ вашего AI-провайдера.';
/* ===== ШАБЛОНЫ: встроенные данные ===== */
const CATS=['Аналитика','Планирование','Стратегия','Объяснение','Проверка','Текст','Анализ','Выбор','Обучение','Код'];
const TPLS=[
{n:'YouTube-аналитика',c:'Аналитика',d:'Разобрать результаты ролика и определить следующие действия.',t:`Проанализируй показатели YouTube-ролика [ССЫЛКА ИЛИ ДАННЫЕ]. Оцени CTR, удержание, источники трафика, вовлечённость и подписки. Отдели сильные сигналы от гипотез, найди 3 узких места и предложи конкретные изменения для следующего ролика: тема, заголовок, обложка, первые 30 секунд и призыв к действию.`},
{n:'Контент-план на неделю',c:'Планирование',d:'Собрать публикации с целью, форматом и измеримым действием.',t:`Составь контент-план на 7 дней для [ПРОДУКТ ИЛИ ТЕМА] и аудитории [АУДИТОРИЯ]. Для каждого дня укажи: площадку, формат, тему, главный тезис, структуру, призыв к действию и метрику успеха. Распредели форматы так, чтобы неделя работала на [ЦЕЛЬ], а не повторяла один и тот же тип публикаций.`},
{n:'Контент-стратегия бренда',c:'Стратегия',d:'Сформировать устойчивую систему тем, рубрик и метрик.',t:`Разработай контент-стратегию для бренда [БРЕНД] в категории [КАТЕГОРИЯ]. Опиши целевую аудиторию, позиционирование, ключевое сообщение, 4–5 контент-рубрик, роли каналов, тон коммуникации, путь пользователя и KPI. Добавь примеры тем, контент-ритм на месяц и правила, по которым команда будет выбирать новые идеи.`},
{n:'Объяснить просто',c:'Объяснение',d:'Короткое понятное объяснение с примером.',t:`Объясни [ТЕМУ] простыми словами. Дай короткое определение, один пример и укажи, что важно не перепутать.`},
{n:'Проверить информацию',c:'Проверка',d:'Отделить подтверждённое от предположений.',t:`Проверь утверждение: [УТВЕРЖДЕНИЕ]. Отдели подтверждённые факты от неопределённости, приведи проверяемые источники и не выдумывай детали.`},
{n:'Отредактировать текст',c:'Текст',d:'Сохранить смысл и улучшить ясность.',t:`Отредактируй текст ниже: [[ТЕКСТ]]. Сохрани смысл, исправь ошибки и верни: 1) улучшенную версию, 2) список ключевых изменений.`},
{n:'Разобрать документ',c:'Анализ',d:'Выделить тезисы, риски и вопросы.',t:`Проанализируй документ: [[ДОКУМЕНТ ИЛИ ВЛОЖЕНИЕ]]. Выдели главные тезисы, важные факты, риски, неясные места и вопросы для уточнения.`},
{n:'Сравнить варианты',c:'Выбор',d:'Таблица плюсов, минусов и условий выбора.',t:`Сравни варианты [[ВАРИАНТ А]] и [[ВАРИАНТ Б]] по критериям: стоимость, риски, сроки, удобство и ограничения. Покажи вывод с условиями, при которых стоит выбрать каждый вариант.`},
{n:'Разобрать тему',c:'Обучение',d:'Объяснение от базы к практике.',t:`Помоги изучить [[ТЕМУ]]. Объясни основу, составь мини-урок на 20 минут, дай 3 контрольных вопроса и короткое практическое задание.`},
{n:'Проверить код',c:'Код',d:'Найти ошибки, риски и улучшения.',t:`Проведи code review этого фрагмента: [[КОД]]. Сначала назови критические проблемы, затем риски и улучшения. Для каждого замечания предложи конкретное исправление.`}];
/* ===== СОСТОЯНИЕ (S) — единый источник данных; позже заполняется с сервера ===== */
const S={userTpls:[],mem:true,auto:true,prof:'',profD:null,web:false,theme:'dark',apiMsgs:[],providers:[],sproviders:[],
p:{name:'',user:'',email:'',lang:0},
memos:[],
tpls:TPLS
};
const T={st:'off',mark:'off',log:[]};let PEND='';let GQ='',FLT=0;
const copy=(t,m)=>{(navigator.clipboard?navigator.clipboard.writeText(t):Promise.reject()).then(()=>toast(m),()=>toast('Не удалось скопировать'))};
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2200)}
const rx=q=>new RegExp(esc(q).replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'gi');
const hl=(t,q)=>q?esc(t).replace(rx(q),m=>`<mark>${m}</mark>`):esc(t);
const av=p=>`<span class="pic">${ic('user')}</span>`;const ini=(p,c='')=>`<span class="ini ${c}">${esc(((p.name||'Гость')[0]).toUpperCase())}</span>`;
function applyTheme(){const l=S.theme==='light'||(S.theme==='auto'&&matchMedia('(prefers-color-scheme:light)').matches),r=document.documentElement;r.dataset.theme=l?'light':'dark';r.dataset.pal=(location.hash.match(/p[123]/)||['p1'])[0];r.dataset.font=(location.hash.match(/f[123]/)||['f1'])[0]}
/* ===== UI-ХЕЛПЕРЫ: подстраницы, шторки, меню, формы ===== */
function sub(){const d=el('<div class="spg"></div>');app.append(d);raf(()=>d.classList.add('on'));d.close=()=>{d.classList.remove('on');setTimeout(()=>d.remove(),400)};return d}
function page(name,title,render,right=''){const d=sub();d.dataset.screen=name;d.innerHTML=`<div class="top"><button class="ib" data-bk aria-label="Назад">${ic('back')}</button><h2>${esc(title)}</h2>${right}</div><div class="scroll"></div>`;$('[data-bk]',d).onclick=d.close;const b=$('.scroll',d);d.r=()=>{render(b,d)};d.r();return d}
function sheet(html){const b=el(`<div class="sheet-bg"><div class="sheet">${html}</div></div>`);app.append(b);raf(()=>b.classList.add('on'));b.close=()=>{b.classList.remove('on');setTimeout(()=>b.remove(),300)};b.onclick=e=>{if(e.target===b)b.close()};return b}
function ask(t,x,ok,fn){const s=sheet(`<h2>${t}</h2><p class="sub" style="margin:8px 0 18px">${x}</p><div class="two"><button class="btn ghost" data-c>Отмена</button><button class="btn danger" data-o>${ok}</button></div>`);$('[data-c]',s).onclick=s.close;$('[data-o]',s).onclick=()=>{s.close();fn()}}
function menu(items){const b=el('<div class="pbg"><div class="pop"></div></div>');items.forEach((it,i)=>{const r=el(`<button class="pi2 ${it.d?'dg':''}" style="--i:${i}">${ic(it.i)}<span>${it.l}</span></button>`);r.onclick=()=>{b.remove();it.f()};$('.pop',b).append(r)});b.onclick=e=>{if(e.target===b)b.remove()};app.append(b)}
function seg(items,idx,cb){const s=el(`<div class="segc">${items.map((x,i)=>`<button class="${i===idx?'on':''}">${x}</button>`).join('')}</div>`);$$('button',s).forEach((b,i)=>b.onclick=()=>{$$('button',s).forEach((z,j)=>z.classList.toggle('on',i===j));cb(i)});return s}
function form(b,rules,btn){const chk=()=>{let ok=1;$$('[data-k]',b).forEach(i=>{const v=rules[i.dataset.k](i.value.trim());i.closest('.fld').classList.toggle('bad',!v&&i.dataset.t==='1');if(!v)ok=0});btn.disabled=!ok};$$('[data-k]',b).forEach(i=>i.addEventListener('input',()=>{i.dataset.t='1';chk()}));chk()}
const fld=(l,k,v,er,type='text',ph='')=>`<div class="fld"><label>${l}</label><input data-k="${k}" type="${type}" value="${esc(v||'')}" placeholder="${ph}" autocomplete="off" autocapitalize="off" spellcheck="false"><div class="er">${er}</div></div>`;
/* ===== ЧАТЫ: сообщения и ответ ИИ ===== */
function msgEl(m,isNew,q){const d=el(`<div class="msg ${m.r} ${isNew?'new':''}">${m.r==='a'?'<span class="mk"></span>':''}<span class="bd"></span></div>`);$('.bd',d).innerHTML=hl(m.t,q);return d}
function paint(box,msgs,q){box.innerHTML='';if(!msgs.length)box.innerHTML='<div class="empty"><p>Диалог пуст. Напишите первое сообщение.</p></div>';msgs.forEach(m=>box.append(msgEl(m,0,q)))}
const scr=b=>b.scrollTop=1e6;
async function respond(msgs,box,tag){const m={r:'a',t:''};msgs.push(m);const d=msgEl(m,1);box.append(d);const bd=$('.bd',d);bd.innerHTML='<span class="typing"><i></i><i></i><i></i></span>';scr(box);
 const pv=S.providers.find(x=>x.ok);
 if(Native.on&&pv){
  const anth=/anthropic\.com/.test(pv.url),last=[...msgs].reverse().find(x=>x.r==='u');
  let src=[],serr='';
  if(S.web&&last){
   const sp=S.sproviders.find(x=>x.ok);
   if(!sp)serr='нет подключённого провайдера поиска';
   else{bd.textContent='Ищу в интернете…';let raw='';
    try{await Native.run('search',[JSON.stringify({id:sp.id,url:sp.url}),(last.q||last.t).slice(0,300)],t=>{raw+=t});src=JSON.parse(raw||'[]')}catch(e){serr=e.message}}}
  const ctx=src.length?'Результаты поиска в интернете ('+new Date().toLocaleDateString('ru-RU')+'):\n'+src.map((s,i)=>'['+(i+1)+'] '+s.title+'\n'+s.url+'\n'+s.snippet).join('\n\n')+'\n\nОтветь на вопрос, опираясь на эти результаты, и ссылайся на источники номерами [1], [2]. Вопрос пользователя: ':'';
  const hist=msgs.filter(x=>x!==m&&!x.err&&x.t).map(x=>({role:x.r==='u'?'user':'assistant',content:toContent(x,anth,x===last?ctx:'')}));
  const tail=(src.length?'\n\nИсточники:\n'+src.map((s,i)=>'['+(i+1)+'] '+s.title+' — '+s.url).join('\n'):'')+(serr?'\n\n⚠ Поиск не сработал: '+serr:'');
  let got=false;
  try{
   await Native.run('chat',[JSON.stringify({id:pv.id,url:pv.url,model:pv.model}),JSON.stringify(hist)],t=>{if(!got){got=true;bd.textContent='';m.t=''}m.t+=t;bd.textContent=m.t;scr(box)});
   if(!got){m.err=1;m.t=bd.textContent='Пустой ответ от провайдера'}
   else if(tail)bd.textContent=m.t+tail
  }catch(e){m.err=1;m.t=bd.textContent='Не удалось получить ответ: '+e.message}
  return}
 await wait(1000);
 const full=L((tag||'')+REPLY+(S.web?' Использованы актуальные данные из интернета.':''));bd.textContent='';
 for(const w of full.split(' ')){bd.textContent+=(bd.textContent?' ':'')+w;scr(box);await wait(reduce?0:30)}m.t=full}
/* ===== NATIVE: мост к Android (ключи в Keystore, запросы к провайдерам) ===== */
const NB=window.KairemaBridge,Native=(()=>{const pend={};let n=0;
 window.KairemaNative={chunk(id,t){const p=pend[id];if(p&&p.on)p.on(t)},done(id,err){const p=pend[id];if(!p)return;delete pend[id];err?p.rej(new Error(err)):p.res()}};
 return{on:!!NB,
  saveKey:(id,k)=>{if(NB)NB.saveKey(id,k)},
  deleteKey:id=>{if(NB)NB.deleteKey(id)},
  run(fn,args,on){return new Promise((res,rej)=>{const id='r'+(++n);pend[id]={res,rej,on};try{NB[fn](id,...args)}catch(e){delete pend[id];rej(e)}})}}})();
const TXT_EXT=/\.(txt|md|markdown|json|jsonl|csv|tsv|xml|html?|css|js|mjs|ts|tsx|jsx|py|kt|kts|java|c|h|cpp|hpp|cs|go|rs|rb|php|sh|bat|ps1|ya?ml|toml|ini|cfg|conf|log|sql|swift|gradle|properties|gitignore|env|vue|svelte|lua|dart|tex|srt|svg)$/i;
const b64=buf=>{let s='';const u=new Uint8Array(buf),n=0x8000;for(let i=0;i<u.length;i+=n)s+=String.fromCharCode.apply(null,u.subarray(i,i+n));return btoa(s)};
async function imgPart(f){
 const bm=await createImageBitmap(f),k=Math.min(1,1568/Math.max(bm.width,bm.height));
 const c=document.createElement('canvas');c.width=Math.max(1,Math.round(bm.width*k));c.height=Math.max(1,Math.round(bm.height*k));
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(bm,0,0,c.width,c.height);
 return{k:'image',name:f.name,mime:'image/jpeg',data:c.toDataURL('image/jpeg',.85).split(',')[1]}}
async function readFiles(list,anth){
 const out=[];
 for(const f of list){
  try{
   if(f.type.startsWith('image/'))out.push(await imgPart(f));
   else if(f.type==='application/pdf'||/\.pdf$/i.test(f.name)){
    if(!anth){toast('PDF поддерживается только провайдером Anthropic: '+f.name);continue}
    if(f.size>8*1048576){toast('Файл больше 8 МБ: '+f.name);continue}
    out.push({k:'pdf',name:f.name,data:b64(await f.arrayBuffer())})}
   else if(f.type.startsWith('text/')||/^application\/(json|xml)/.test(f.type)||TXT_EXT.test(f.name)){
    let t=await f.text();if(t.length>200000)t=t.slice(0,200000)+'\n[… файл обрезан]';
    out.push({k:'text',name:f.name,text:t})}
   else toast('Формат не поддерживается: '+f.name)
  }catch(e){toast('Не удалось прочитать: '+f.name)}
 }
 return out}
const toContent=(m,anth,pre)=>{
 const parts=m.parts||[];let txt=(pre||'')+m.t;
 if(!parts.length)return txt;
 const blocks=[];
 for(const p of parts){
  if(p.k==='text')txt+='\n\n--- Файл «'+p.name+'» ---\n'+p.text+'\n--- конец файла ---';
  else if(p.k==='image')blocks.push(anth?{type:'image',source:{type:'base64',media_type:p.mime,data:p.data}}:{type:'image_url',image_url:{url:'data:'+p.mime+';base64,'+p.data}});
  else if(p.k==='pdf'&&anth)blocks.push({type:'document',source:{type:'base64',media_type:'application/pdf',data:p.data}})}
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
function composer(o){
 const w=el(`<div class="cmp"><div class="att"></div><textarea rows="1" placeholder="${o.ph||'Сообщение'}" aria-label="Сообщение"></textarea><div class="cr"><button class="cb" data-a data-action="composer:attach" aria-label="Прикрепить файл или фото">${ic('clip')}</button><button class="cb" data-t data-action="composer:templates" aria-label="Шаблоны промтов">${ic('tpl')}</button><button class="cb" data-v data-action="composer:voice" aria-label="Голосовой ввод">${ic('mic')}</button><span class="gl" title="Веб-поиск включён">${ic('globe')}</span><button class="chip2" data-c></button><span style="flex:1"></span><button class="send" disabled data-action="composer:send" aria-label="Отправить">${ic('up')}</button></div><input type="file" hidden data-ig accept="image/*" multiple><input type="file" hidden data-if multiple><input type="file" hidden data-ic accept="image/*" capture="environment"></div>`);
 const ta=$('textarea',w),sd=$('.send',w),gl=$('.gl',w),ch=$('.chip2',w);let files=[],busy=0;
 const upd=()=>sd.disabled=busy||(!ta.value.trim()&&!files.length);
 const grow=()=>{const p=ta.offsetHeight;ta.style.height='auto';const h=Math.min(ta.scrollHeight,110);ta.style.height=p+'px';ta.offsetHeight;ta.style.height=h+'px';upd()};
 ta.oninput=grow;ta.onkeydown=e=>{if(e.key==='Enter'&&!e.shiftKey&&matchMedia('(hover:hover)').matches){e.preventDefault();send()}};
 const send=()=>{if(sd.disabled)return;const t=ta.value.trim(),f=files.map(x=>x.f.name),fl=files.map(x=>x.f);files.forEach(x=>x.u&&URL.revokeObjectURL(x.u));ta.value='';files=[];$('.att',w).innerHTML='';ta.style.height='22px';upd();o.onSend(t,f,fl)};sd.onclick=send;
 const addF=list=>{[...list].forEach(f=>{const im=f.type.startsWith('image/'),o2={f,u:im?URL.createObjectURL(f):''};files.push(o2);const c=el(`<div class="ap ${im?'im':''}">${im?'<img alt="">':`${ic('file')}<span><b></b><small></small></span>`}<button class="rm" aria-label="Удалить вложение">${ic('x')}</button></div>`);if(im){$('img',c).src=o2.u}else{$('b',c).textContent=f.name;$('small',c).textContent=fmt(f.size)}$('.rm',c).onclick=()=>{files=files.filter(x=>x!==o2);if(o2.u)URL.revokeObjectURL(o2.u);c.remove();upd()};$('.att',w).append(c)});upd()};
 const ins={g:$('[data-ig]',w),f:$('[data-if]',w),c:$('[data-ic]',w)};Object.values(ins).forEach(i=>i.onchange=()=>{addF(i.files);i.value=''});
 $('[data-a]',w).onclick=()=>{const s=sheet(`<button class="pi2" data-k="g">${ic('img')}<span>Галерея</span></button><button class="pi2" data-k="f">${ic('file')}<span>Файлы</span></button><button class="pi2" data-k="c">${ic('cam')}<span>Камера</span></button><button class="btn ghost" data-x style="width:100%;margin-top:10px">Отмена</button>`);$$('[data-k]',s).forEach(b=>b.onclick=()=>{s.close();ins[b.dataset.k].click()});$('[data-x]',s).onclick=s.close};
 const tpl=()=>{const s=sheet(`<h2 style="margin-bottom:12px">Шаблоны промтов</h2><div id="tl"></div>`);tplList($('#tl',s),t=>{s.close();ta.value=(ta.value?ta.value+'\n':'')+t;grow();ta.focus()})};
 $('[data-t]',w).onclick=tpl;let lp;ta.addEventListener('pointerdown',()=>{lp=setTimeout(tpl,650)});['pointerup','pointermove','pointercancel'].forEach(e=>ta.addEventListener(e,()=>clearTimeout(lp)));
 const mic=$('[data-v]',w);let rec=null;mic.onclick=()=>{const SR=window.SpeechRecognition||window.webkitSpeechRecognition;if(!SR){toast('Голосовой ввод недоступен на этом устройстве');return}if(rec){rec.stop();return}rec=new SR();rec.lang=LANG==='en'?'en-US':'ru-RU';rec.onresult=e=>{ta.value+=(ta.value?' ':'')+e.results[0][0].transcript;grow()};rec.onerror=()=>toast('Нет доступа к микрофону');rec.onend=()=>{rec=null;mic.classList.remove('rec')};try{rec.start();mic.classList.add('rec')}catch(e){rec=null}};
 w.setText=t=>{ta.value=t;grow()};w.chip=()=>{ch.innerHTML=o.chip();ch.onclick=o.onChip||null};w.busy=b=>{busy=b;upd()};const g=()=>gl.style.display=S.web?'grid':'none';bus.push(g);g();w.chip();return w}
/* ===== ЧАТ: единственный чат — с подключённым AI-провайдером ===== */
function apiView(){Chx.load();const v=$('#v-api'),p=S.providers.find(x=>x.ok);v.innerHTML='';
 if(!p){v.innerHTML=`<div class="top"><h1>Чат</h1></div><div class="warn">${ic('warn')}<h2>Подключите AI-провайдера, чтобы начать чат</h2><p class="sub">Чат работает только через вашего AI-провайдера. Добавьте API URL, модель и ключ в настройках.</p><button class="btn big" id="btn-connect-provider" data-action="provider:connect">Подключить AI-провайдера</button></div>`;
  $('#btn-connect-provider',v).onclick=()=>{show('set');provPage()};return}
 v.innerHTML=`<div class="top"><h1>Чат</h1><button class="ib" data-chl aria-label="Список чатов" style="margin-left:auto">${ic('chat')}</button><button class="ib" data-chn aria-label="Новый чат">${ic('plus')}</button></div><button class="prow" id="btn-provider-info" data-action="provider:manage" aria-label="Мои провайдеры"><span class="stt2"></span><span class="pn"></span>${ic('chevR')}</button><div class="msgs"></div>`;
 const pn=$('.pn',v);pn.textContent=p.name;const sm=document.createElement('small');sm.textContent=p.model;pn.append(sm);
 $('#btn-provider-info',v).onclick=()=>{show('set');provPage()};
 const box=$('.msgs',v);paint(box,S.apiMsgs);$('[data-chl]',v).onclick=chatsPage;$('[data-chn]',v).onclick=()=>{if(Chx.busy){toast('Дождитесь ответа');return}if(!S.apiMsgs.length){toast('Это уже новый чат');return}Chx.newChat();apiView()};
 const cmp=composer({ph:'Сообщение',chip:()=>'',onSend:async(t,f,fl)=>{const ch=Chx.cur;const m={r:'u',q:t,t:(f.length?f.join(', ')+'\n':'')+t};S.apiMsgs.push(m);autoFact(t,'');$('.empty',box)?.remove();box.append(msgEl(m,1));scr(box);cmp.busy(1);const pv0=S.providers.find(x=>x.ok);m.parts=await readFiles((fl||[]).slice(0,6),!!pv0&&/anthropic\.com/.test(pv0.url));Chx.busy=1;try{Chx.save(ch);await respond(ch.msgs,box,'['+p.model+'] ')}finally{Chx.busy=0;Chx.save(ch);cmp.busy(0)}}});
 v.append(cmp);if(PEND){cmp.setText(PEND);PEND=''}}
/* ===== СЕССИЯ: терминал ===== */
let termRedraw=()=>{};
function activateSession(){T.st='on';T.mark='on';T.log.push(['o','● демо-сессия (сервера нет)'],['','Введите help для списка команд']);termRedraw()} /* TODO(api): POST /sessions */
function deactivateSession(){T.st='off';T.mark='off';T.log.push(['','— сессия остановлена']);termRedraw()} /* TODO(api): DELETE /sessions/:id */
function clearSession(){const doit=()=>{T.log=[];if(T.st==='err')T.st='off';T.mark='clr';termRedraw();toast('Сессия очищена')};if(T.log.length)ask('Очистить сессию?','Вывод и история команд будут удалены.','Очистить',doit);else doit()}
function termView(){const v=$('#v-term');
 v.innerHTML=`<div class="top"><h1>Терминал</h1></div><p class="sub" style="margin:0 16px 8px">Демо: терминал пока не подключён ни к какому серверу. Команды ничего не выполняют на телефоне.</p><div class="scroll"><div class="ses"><div class="sbtns"><button class="sb" id="btn-session-activate" data-action="session:activate" data-a="on">${ic('play')}Активировать сессию</button><button class="sb" id="btn-session-deactivate" data-action="session:deactivate" data-a="off">${ic('stop')}Выключить сессию</button><button class="sb" id="btn-session-clear" data-action="session:clear" data-a="clr">${ic('trash')}Очистить сессию</button></div><div class="stt"><span class="sd"></span><b></b></div></div>
 <div class="tp"><div><div class="term"><div class="tout"></div><div class="tin"><span style="color:#9AA0A6">›</span><input autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="введите help" aria-label="Команда"><button class="send sm" aria-label="Enter">${ic('enter')}</button></div></div></div></div><p class="sub idle" style="margin-top:8px">Сессия не запущена. Нажмите «Активировать сессию», чтобы попробовать демо.</p></div>`;
 const out=$('.tout',v),inp=$('.tin input',v),draw=()=>{const s=T.st;$('.ses',v).dataset.mark=T.mark;$('.stt b',v).textContent=s==='err'?'Ошибка':{on:'Сессия активна',off:'Сессия выключена',clr:'Сессия очищена'}[T.mark];$('.tp',v).classList.toggle('open',s!=='off');$('.idle',v).style.display=s==='off'?'block':'none';$('[data-a=on]',v).disabled=T.mark==='on';$('[data-a=off]',v).disabled=T.mark==='off';$('[data-a=clr]',v).disabled=T.mark==='clr';inp.disabled=s!=='on';$('.tin .send',v).disabled=s!=='on';out.innerHTML='';T.log.forEach(([c,x])=>{const e=document.createElement('div');e.className=c;e.textContent=x;out.append(e)});scr(out)};
 const run=c=>{T.log.push(['c','› '+c]);const A={help:'Демо-терминал: сервера нет. Команды: help, date, clear',date:new Date().toLocaleString(LANG==='en'?'en-US':'ru-RU')};if(c==='clear')T.log=[];else T.log.push(A[c]?['o',A[c]]:['e','Неизвестная команда. Введите help']);if(T.st==='on')T.mark='on'};
 const go=()=>{const c=inp.value.trim();if(!c)return;inp.value='';run(c);draw()};$('.tin .send',v).onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go()};
 termRedraw=draw;
 $$('[data-a]',v).forEach(b=>b.onclick=()=>({on:activateSession,off:deactivateSession,clr:clearSession})[b.dataset.a]());draw()}
/* ===== НАСТРОЙКИ: провайдеры ===== */
function provPage(){return page('providers','Мои провайдеры',(b,d)=>{
 b.innerHTML='';
 const sec=(ttl,arr,kind)=>{b.insertAdjacentHTML('beforeend',`<div class="lbl" style="margin-top:${b.children.length?20:4}px">${ttl}</div>`);if(!arr.length)b.insertAdjacentHTML('beforeend','<p class="hint" style="margin:0 4px 10px">Пока нет подключённых.</p>');
  arr.forEach((p,i)=>{const c=el(`<div class="card pv in" style="--i:${i}"><span class="m"><b></b><small></small><span class="stat"></span></span><button class="cb" data-e aria-label="Редактировать">${ic('edit')}</button><button class="cb" data-d aria-label="Удалить">${ic('trash')}</button></div>`);$('b',c).textContent=p.name;$('small',c).textContent=kind==='chat'?p.model:p.url;const s=$('.stat',c);s.classList.add(p.ok?'ok':'bad');s.textContent=p.ok?'✓ Подключено':'✗ Ошибка';
   $('[data-e]',c).onclick=()=>provForm(i,()=>d.r(),kind);$('[data-d]',c).onclick=()=>ask('Удалить провайдера?','Ключ будет удалён с устройства.','Удалить',()=>{Native.deleteKey(p.id);arr.splice(i,1);saveProviders();d.r();toast('Провайдер удалён')});b.append(c)})};
 sec('Провайдеры ИИ',S.providers,'chat');sec('Провайдеры поиска в сети',S.sproviders,'search');
 b.insertAdjacentHTML('beforeend','<button class="btn big" data-a1>Добавить обычного провайдера</button><button class="btn ghost big" data-a2 style="margin-top:10px">Добавить провайдера поиска в сети</button>');
 $('[data-a1]',b).onclick=()=>provForm(-1,()=>d.r(),'chat');$('[data-a2]',b).onclick=()=>provForm(-1,()=>d.r(),'search')})}
function provForm(i,done,kind='chat'){const ch=kind==='chat',arr=ch?S.providers:S.sproviders,e=arr[i]||{};const d=page('provider-form',i<0?(ch?'Новый провайдер':'Новый провайдер поиска'):'Провайдер',(b)=>{
 b.innerHTML=(ch?fld('Название','name',e.name,'Минимум 2 символа','text','Например, MyProvider')+fld('Модель','model',e.model,'Укажите модель','text','gpt-4o')+fld('API URL','url',e.url,'Адрес вида https://api.example.com/v1','url','https://api.example.com/v1'):fld('Название провайдера','name',e.name,'Минимум 2 символа','text','Например, Tavily')+fld('API URL для поиска','url',e.url,'Адрес вида https://api.tavily.com/search','url','https://api.tavily.com/search'))+fld('API Key','key','','Минимум 8 символов','password',i<0?'sk-…':'••••••••')+(ch?'':'<p style="font-size:12px;opacity:.65;margin:4px 2px 12px">Поддерживаются: Tavily (https://api.tavily.com/search), Brave Search (https://api.search.brave.com/res/v1/web/search), Serper (https://google.serper.dev/search).</p>')+`<div class="stat"></div><button class="btn" data-s style="width:100%">Проверить и сохранить</button>`;
 const sv=$('[data-s]',b),stt=$('.stat',b),R={name:v=>v.length>=2,url:v=>/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v),key:v=>v.length>=8||(i>=0&&!v)};if(ch)R.model=v=>v.length>0;form(b,R,sv);
 sv.onclick=async()=>{const g=k=>$(`[data-k=${k}]`,b).value.trim();sv.disabled=true;sv.innerHTML='<span class="spin"></span>Проверяем…';stt.className='stat';stt.textContent='';const id=e.id||pid(),kv=g('key');if(kv)Native.saveKey(id,kv);let err='';
 if(!Native.on){await wait(1200);err=/bad|fail/i.test(kv)?'ошибка (ключ отклонён, 401)':''}
 else{try{await(ch?Native.run('verify',[JSON.stringify({id,url:g('url'),model:g('model')})]):Native.run('search',[JSON.stringify({id,url:g('url')}),'test'],()=>{}))}catch(x){err=x.message}}
  const bad=!!err,p=ch?{id,name:g('name'),model:g('model'),url:g('url'),ok:!bad}:{id,name:g('name'),url:g('url'),ok:!bad};if(i<0)arr.push(p);else arr[i]=p;saveProviders();
  stt.className='stat '+(bad?'bad':'ok');stt.textContent=bad?'✗ '+err:'✓ Подключено';sv.innerHTML='Проверить и сохранить';sv.disabled=false;done();toast(bad?'Провайдер сохранён с ошибкой':'Провайдер подключён');if(!bad)setTimeout(()=>d.close(),900)}})}
/* ===== ПАМЯТЬ ===== */
function autoFact(t,src){if(!S.mem||!S.auto||!t)return;const m=t.match(/(меня зовут|мне нравится|my name is|i like)\s+[^.!?\n]+/i);if(m&&!S.memos.some(x=>x[0]===m[0])){S.memos.push([m[0],src?'Чат «'+src+'»':'']);toast('Факт добавлен в память')}}
function factSheet(init,ok){const s=sheet(`<h2 style="margin-bottom:12px">${init===null?'Новый факт':'Редактировать факт'}</h2><textarea class="ta" placeholder="Введите факт" style="margin-bottom:14px"></textarea><div class="two"><button class="btn" data-ok>Сохранить</button><button class="btn ghost" data-c>Отмена</button></div>`);const x=$('textarea',s),sv=$('[data-ok]',s),chk=()=>sv.disabled=!x.value.trim();x.value=init||'';x.oninput=chk;chk();$('[data-c]',s).onclick=s.close;sv.onclick=()=>{ok(x.value.trim());s.close()}}
function memPage(){page('memory','',(b,d)=>{
 const opt=(k,ttl,x)=>`<div class="mr"><button class="orow" data-t="${k}"><span>${ttl}</span><span class="sw ${S[k]?'on':''}"></span></button><p>${x}</p></div>`;
 b.classList.add('mem-pg');
 b.innerHTML=`<div class="mh"><div class="eb">ПЕРСОНАЛИЗАЦИЯ</div><h1>Память</h1><p class="sub" style="margin:6px 0 0">Управляйте фактами и темами, которые Kairema может учитывать в дальнейших разговорах.</p></div>
 <div class="mstat"><div class="ms big"><span class="n" data-n></span><span class="l">Сохранённых фактов</span></div><div class="ms"><span class="n s" data-s></span><span class="l">Память</span></div></div>
 <div class="sh">Настройки памяти</div>
 <div>${opt('mem','Использовать память в ответах','Разрешить учитывать сохранённые факты и профиль при формировании ответов. Выключение не удаляет записи.')}${opt('auto','Автоматически находить новые факты','Включить локальное распознавание простых фраз о себе, например «меня зовут…» или «мне нравится…». Выключение останавливает только автоматическое добавление.')}</div>
 <div class="sh">Профиль памяти</div>
 <div class="mp"><div class="fld"><label>Что Kairema важно знать о вас?</label><small class="d">Краткое описание о вас, ваши цели и предпочтения.</small><textarea class="ta" placeholder="Например: я учусь на дизайнера и предпочитаю короткие ответы с примерами."></textarea><p class="hint">Не добавляйте пароли, ключи API и другую секретную информацию.</p></div><div class="two"><button class="btn" data-sv>Сохранить</button><button class="btn ghost" data-cn>Отмена</button></div></div>
 <div class="sh">Список сохранённых фактов:</div><div class="ml"></div><button class="addf" data-add>${ic('plus')}Добавить новый факт</button>`;
 [...b.children].forEach((c,k)=>c.style.setProperty('--i',k));
 const nEl=$('[data-n]',b),sEl=$('[data-s]',b),ml=$('.ml',b);
 const stat=bump=>{nEl.textContent=String(S.memos.length).padStart(2,'0');sEl.textContent=S.mem?'Вкл':'Выкл';sEl.classList.toggle('on',S.mem);if(bump){nEl.classList.add('bump');setTimeout(()=>nEl.classList.remove('bump'),260)}};
 $$('[data-t]',b).forEach(e=>e.onclick=()=>{const k=e.dataset.t;S[k]=!S[k];$('.sw',e).classList.toggle('on',S[k]);stat();toast(k==='mem'?(S.mem?'Память включена':'Память выключена'):(S.auto?'Автоматическое добавление включено':'Автоматическое добавление выключено'))});
 const ta=$('.ta',b),mp=$('.mp',b);ta.value=S.profD===null?S.prof:S.profD;ta.oninput=()=>S.profD=ta.value;
 $('[data-sv]',b).onclick=()=>{S.prof=ta.value.trim();S.profD=S.prof;ta.value=S.prof;mp.classList.remove('ok');void mp.offsetWidth;mp.classList.add('ok');toast('Профиль памяти сохранён')};
 $('[data-cn]',b).onclick=()=>{S.profD=S.prof;ta.value=S.prof};
 const facts=(fl,init)=>{ml.innerHTML='';if(!S.memos.length)ml.innerHTML='<p class="hint" style="margin:0 4px 10px">Сохранённых фактов пока нет.</p>';
  S.memos.forEach((x,i)=>{const r=el(`<div class="ft ${init?'in':''} ${i===fl?'fl':''}" style="--i:${i}"><span class="n">${String(i+1).padStart(2,'0')}</span><p></p><div class="fa2"><button class="fbtn" data-e data-action="memory:edit">${ic('edit')}Редактировать</button><button class="fbtn fdel" data-d data-action="memory:delete">${ic('trash')}Удалить</button></div></div>`);$('p',r).textContent=x[0];if(x[1]){const s=document.createElement('small');s.textContent=x[1];$('p',r).after(s)}
   $('[data-e]',r).onclick=()=>factSheet(x[0],v=>{x[0]=v;facts(i);toast('Факт обновлён')});
   $('[data-d]',r).onclick=()=>ask('Удалить факт?','Факт будет удалён из памяти без возможности восстановления.','Удалить',()=>{r.style.maxHeight=r.offsetHeight+'px';void r.offsetHeight;r.classList.add('rm');setTimeout(()=>{S.memos.splice(S.memos.indexOf(x),1);facts();stat(1);toast('Факт удалён')},320)});ml.append(r)})};
 $('[data-add]',b).onclick=()=>factSheet(null,v=>{S.memos.push([v,'']);facts(S.memos.length-1);stat(1);ml.lastElementChild?.scrollIntoView({behavior:'smooth',block:'nearest'});toast('Факт добавлен')});
 facts(-1,1);stat()})}
/* ===== ШАБЛОНЫ ПРОМПТОВ: встроенные + свои (хранение через Api.templates) ===== */
const TPL_VIEWS=new Set();
async function syncTemplates(){S.userTpls=await Api.templates.list();[...TPL_VIEWS].forEach(f=>f())}
function tplItems(){return[...S.userTpls.map(u=>({id:u.id,own:1,n:u.name,c:u.category,d:u.description,t:u.prompt})),...TPLS.map((x,k)=>({id:'b'+k,own:0,c:x.c,...(LANG==='en'?TPLE[k]:x)}))]}
function tplCats(){return['Все',...(S.userTpls.length?['Мои']:[]),...CATS,...new Set(S.userTpls.map(u=>u.category).filter(c=>c&&!CATS.includes(c)&&c!=='Мои'&&c!=='Все'))]}
function tplList(box,onIns,manage){let cat='Все';
 box.innerHTML=(manage?`<button class="btn big tnew" id="btn-new-template" data-action="template:create">${ic('plus')}Новый шаблон</button>`:'')+'<div class="seg sc"></div><div class="tls"></div>';
 const sg=$('.seg',box),ls=$('.tls',box);if(manage)$('#btn-new-template',box).onclick=createPromptTemplate;
 const draw=()=>{const cats=tplCats();if(!cats.includes(cat))cat='Все';const sx=sg.scrollLeft;sg.innerHTML='';
  cats.forEach(k=>{const b=el('<button class="chip"></button>');b.dataset.c=k;b.textContent=k;b.classList.toggle('on',k===cat);b.onclick=()=>{cat=k;draw()};sg.append(b)});sg.scrollLeft=sx;
  ls.innerHTML='';
  tplItems().filter(x=>cat==='Все'||(cat==='Мои'?x.own:x.c===cat)).forEach((x,i)=>{
   const c=el(`<div class="tc in ${x.own?'own':''}" style="--i:${i}"><div class="th"><b></b><span class="tgs"></span></div><p class="td"></p><p class="tt"></p><div class="two"><button class="btn ghost" data-cp data-action="template:copy">Копировать</button><button class="btn" data-in data-action="template:insert">Вставить в запрос</button></div>${x.own?'<div class="two tm"><button class="btn ghost" data-ed data-action="template:edit">Редактировать</button><button class="btn ghost danger-t" data-rm data-action="template:delete">Удалить</button></div>':''}</div>`);
   c.dataset.templateId=x.id;$('b',c).textContent=x.n;
   const tg=$('.tgs',c);if(x.own)tg.insertAdjacentHTML('beforeend','<span class="tg me">Мой</span>');
   if(x.c){const t=document.createElement('span');t.className='tg';t.textContent=x.c;tg.append(t)}
   const td=$('.td',c);if(x.d)td.textContent=x.d;else td.remove();
   $('.tt',c).textContent=x.t;
   $('[data-cp]',c).onclick=()=>copy(x.t,'Шаблон скопирован');$('[data-in]',c).onclick=()=>onIns(x.t);
   if(x.own){$('[data-ed]',c).onclick=()=>editPromptTemplate(x.id);$('[data-rm]',c).onclick=()=>deletePromptTemplate(x.id)}
   ls.append(c)})};
 const redraw=()=>{if(!box.isConnected){TPL_VIEWS.delete(redraw);return}draw()};TPL_VIEWS.add(redraw);draw()}
function tplPage(){page('templates','Шаблоны промтов',(b,d)=>{tplList(b,t=>{if(!S.providers.some(x=>x.ok)){toast('Сначала подключите AI-провайдера');return}PEND=t;d.close();show('api')},true)})}
function createPromptTemplate(){templateSheet(null)}
function editPromptTemplate(id){const t=S.userTpls.find(x=>x.id===id);if(t)templateSheet(t)}
async function savePromptTemplate(d,id){
 const v={name:String(d.name||'').trim().slice(0,60),prompt:String(d.prompt||'').trim(),description:String(d.description||'').trim().slice(0,120),category:String(d.category||'').trim().slice(0,24)};
 if(!v.name||!v.prompt)return false;
 try{if(id)await Api.templates.update(id,v);else await Api.templates.create(v);await syncTemplates()}catch(e){toast('Не удалось сохранить шаблон');return false}
 toast(id?'Шаблон обновлён':'Шаблон сохранён');
 if(!Api.templates.persistent)setTimeout(()=>toast('Хранилище браузера недоступно: шаблон исчезнет после перезагрузки'),2400);
 return true}
function deletePromptTemplate(id){const t=S.userTpls.find(x=>x.id===id);if(!t)return;
 ask('Удалить шаблон?',`Шаблон «${esc(t.name)}» будет удалён без возможности восстановления.`,'Удалить',async()=>{try{await Api.templates.remove(id);await syncTemplates();toast('Шаблон удалён')}catch(e){toast('Не удалось удалить шаблон')}})}
function templateSheet(t){
 const s=sheet(`<h2 style="margin-bottom:14px">${t?'Редактировать шаблон':'Новый шаблон'}</h2><div class="tpf">
 <div class="fld"><label for="tpl-name">Название шаблона</label><input id="tpl-name" data-k="name" maxlength="60" placeholder="Например, Пост для блога" autocomplete="off"><div class="er">Введите название шаблона</div></div>
 <div class="fld"><label for="tpl-prompt">Текст промпта</label><textarea class="ta" id="tpl-prompt" data-k="prompt" maxlength="4000" placeholder="Что должен сделать ИИ. Переменные пишите в [КВАДРАТНЫХ СКОБКАХ]"></textarea><div class="er">Введите текст промпта</div></div>
 <div class="fld"><label for="tpl-desc">Описание (необязательно)</label><input id="tpl-desc" data-k="description" maxlength="120" placeholder="Краткое описание" autocomplete="off"><div class="er"></div></div>
 <div class="fld"><label for="tpl-cat">Категория (необязательно)</label><input id="tpl-cat" data-k="category" list="tpl-cats" maxlength="24" placeholder="Например, Маркетинг" autocomplete="off"><datalist id="tpl-cats">${tplCats().filter(k=>k!=='Все'&&k!=='Мои').map(k=>`<option value="${esc(k)}"></option>`).join('')}</datalist><div class="er"></div></div></div>
 <div class="two"><button class="btn ghost" data-cn data-action="template:cancel">Отмена</button><button class="btn" id="btn-save-template" data-ok data-action="template:save">Сохранить</button></div>`);
 const g=k=>$(`[data-k=${k}]`,s);
 if(t){g('name').value=t.name;g('prompt').value=t.prompt;g('description').value=t.description||'';g('category').value=t.category||''}
 const sv=$('[data-ok]',s);form(s,{name:v=>v.length>0,prompt:v=>v.length>0,description:()=>true,category:()=>true},sv);
 $('[data-cn]',s).onclick=s.close;
 sv.onclick=async()=>{sv.disabled=true;const ok=await savePromptTemplate({name:g('name').value,prompt:g('prompt').value,description:g('description').value,category:g('category').value},t&&t.id);if(ok)s.close();else sv.disabled=false};
 setTimeout(()=>g('name').focus(),350)}
function aboutPage(){page('about','О приложении',b=>{b.innerHTML=`<div class="ab"><h2>О Kairema AI</h2><p>Kairema AI — персональный ИИ-ассистент для общения, обучения, работы и решения повседневных задач.</p><p>Приложение помогает получать ответы на вопросы, разбираться в сложных темах, писать и редактировать тексты, работать с кодом и находить новые идеи.</p><p>Kairema AI объединяет возможности искусственного интеллекта в одном удобном интерфейсе. Пользователь может подключать собственных AI-провайдеров, вести диалоги и настраивать приложение под свои потребности.</p><p>Наша цель — создать удобного, быстрого и доступного ИИ-ассистента, который даёт пользователю больше возможностей и контроля.</p><p>Версия: 1.0.0</p><p>Разработчик: Kairema AI Team</p></div>`})}
/* ===== ПРОФИЛЬ ===== */
function profPage(){page('profile','Мой профиль',(b,d)=>{const p=S.p;b.innerHTML=`<div class="phd in">${ini(p,'big')}<span class="m"><b>${esc(p.name||'Гость')}</b><small>${esc(p.email||'Почта не указана')}</small></span></div>
 <div class="sh">Данные профиля</div><div class="pfld">${fld('Имя','name',p.name,'Введите имя')}${fld('Username','user',p.user,'3–20 символов: латиница, цифры, _')}${fld('Email','email',p.email,'Введите корректный email','email')}</div>
 <div class="sh">Язык интерфейса</div><div id="lg" style="margin:14px 0 4px"></div><button class="btn big" id="btn-save-profile" data-action="profile:save" data-s>Сохранить</button>`;
 let lang=p.lang;$('#lg',b).replaceWith(seg(['Русский','English'],lang,i=>{lang=i;S.p.lang=i;saveProfile();applyLang(i)}));const sv=$('[data-s]',b);form(b,{name:v=>v.length>0,user:v=>!v||/^[a-z0-9_]{3,20}$/i.test(v),email:v=>!v||/^\S+@\S+\.\S+$/.test(v)},sv);
 sv.onclick=()=>{const g=k=>$(`[data-k=${k}]`,b).value.trim();Object.assign(S.p,{name:g('name'),user:g('user'),email:g('email'),lang});saveProfile();toast('Профиль сохранён');d.close();setView()}})}
function logout(){ask('Выйти из аккаунта?','Чаты останутся на сервере. Войти можно в любой момент.','Выйти',()=>{const f=el(`<div class="full out"><svg class="logo" viewBox="0 0 96 96"><path class="ring" d="M70 22 A34 34 0 1 0 82 48"/><circle class="eye" cx="48" cy="48" r="9"/></svg><h1 style="margin:22px 0 6px">Вы вышли</h1><p class="sub" style="margin-bottom:24px">Войдите, чтобы продолжить</p><button class="btn" style="width:100%;max-width:320px">Войти</button></div>`);app.append(f);raf(()=>f.classList.remove('out'));$('.btn',f).onclick=()=>{f.classList.add('out');setTimeout(()=>f.remove(),500);$$('.spg').forEach(x=>x.remove());show('api')}})}
/* ===== НАСТРОЙКИ ===== */
function setView(){const v=$('#v-set'),p=S.p,TN=['Тёмная','Светлая','Авто'],TK=['dark','light','auto'],ok=[...S.providers,...S.sproviders].filter(x=>x.ok).length;let i=0;
 const row=(ic1,ttl,sb,att,circ,end)=>`<button class="sr" style="--i:${i++}" ${att}><span class="si ${circ?'c':''}">${ic(ic1)}</span><span class="m"><b>${ttl}</b><small>${sb}</small></span>${end===undefined?ic('chevR'):end}</button>`;
 v.innerHTML=`<div class="top"><h1>Настройки</h1></div><div class="scroll st">
 <button class="card pf" style="--i:0" data-go="prof">${ini(p)}<span class="m"><b>${esc(p.name||'Гость')}</b><small>${esc(p.user?'@'+p.user:'Нажмите, чтобы указать имя')}</small></span>${ic('chevR')}</button>
 <div class="sh">ИИ и персонализация</div>
 ${row('brain','Память ИИ','Ваши данные и контекст','data-go="mem"')}${row('doc','Шаблоны промтов','Быстрые команды для ИИ','data-go="tpl"')}
 <div class="sh">Провайдеры</div>
 <button class="pill" style="--i:${i++}" data-go="prov"><span>Подключено: ${ok}</span>${ic('chevR')}</button>
 ${row('plus','Добавить обычного провайдера','Модель, API URL и ключ','data-go="add"',1)}${row('plus','Добавить провайдера поиска в сети','Для поиска в интернете','data-go="adds"',1)}
 <div class="sh">Поиск в сети</div>
 ${row('globe','Включить поиск в интернете','Позволяет ИИ искать актуальную информацию в интернете через API-провайдер.','data-tg="web"',1,`<span class="sw ${S.web?'on':''}"></span>`)}
 <div class="sh">Интерфейс</div>
 ${row('sun','Тема',TN[TK.indexOf(S.theme)],'data-theme',1)}${row('info','О приложении','Версия: 1.0.0','data-go="about"',1)}
 <button class="sr out" style="--i:${i++}" data-act="out"><span class="si">${ic('out')}</span><span class="m"><b>Выйти из аккаунта</b></span></button></div>`;
 $$('[data-go]',v).forEach(b=>b.onclick=()=>({prof:()=>openScreen('profile'),mem:()=>openScreen('memory'),prov:()=>openScreen('providers'),tpl:()=>openScreen('templates'),add:()=>provForm(-1,setView,'chat'),adds:()=>provForm(-1,setView,'search'),about:()=>openScreen('about')})[b.dataset.go]());
 $$('[data-tg]',v).forEach(b=>b.onclick=()=>{S.web=!S.web;$('.sw',b).classList.toggle('on',S.web);bus.forEach(f=>f());toast(S.web?'Поиск в интернете включён':'Поиск в интернете выключен')});
 $('[data-theme]',v).onclick=()=>{const s=sheet(`<h2 style="margin-bottom:8px">Тема</h2><div id="tl2"></div>`);TK.forEach((k,j)=>{const b=el(`<button class="sr in" style="--i:${j}"><span class="m"><b>${TN[j]}</b></span>${S.theme===k?ic('ok'):''}</button>`);b.onclick=()=>{S.theme=k;applyTheme();s.close();setView();toast('Сохранено')};$('#tl2',s).append(b)})};
 $('[data-act=out]',v).onclick=logout}
/* ===== НАВИГАЦИЯ ===== */
const TAB_SCREEN={api:'api',term:'terminal',set:'settings'};
const TABS=[['api','chat','Чат'],['term','term','Терминал'],['set','set','Настройки']];
$('#nav').innerHTML=TABS.map(([k,i,n],j)=>`<button class="tab ${j?'':'on'}" id="tab-${k}" data-action="nav:open" data-screen-target="${TAB_SCREEN[k]}" data-v="${k}">${ic(i)}${n}</button>`).join('');
let CUR='api';
function show(v){if(v===CUR)return;const ks=TABS.map(x=>x[0]),dir=ks.indexOf(v)>ks.indexOf(CUR)?1:-1,nv=$('#v-'+v),ov=$('#v-'+CUR);$$('.tab').forEach(t=>t.classList.toggle('on',t.dataset.v===v));({api:apiView,term:termView,set:setView})[v]?.();
 nv.style.transition='none';nv.style.setProperty('--x',dir*24+'px');void nv.offsetWidth;nv.style.transition='';ov.style.setProperty('--x',-dir*24+'px');ov.classList.remove('on');nv.classList.add('enter','on');setTimeout(()=>nv.classList.remove('enter'),1000);CUR=v}
$$('.tab').forEach(t=>t.onclick=()=>openScreen(t.dataset.screenTarget));
/* ===== ОНБОРДИНГ ===== */
const ONBOARD_ONCE=false; /* true — показывать только при первом запуске */
const OB_ART=[
`<svg viewBox="0 0 320 320" fill="none" stroke="currentColor" stroke-width="1.5"><circle class="dr" pathLength="1" style="--d:100" cx="160" cy="160" r="134" stroke-opacity=".14"/><circle class="dr" pathLength="1" style="--d:220" cx="160" cy="160" r="100" stroke-opacity=".24"/><circle class="dr" pathLength="1" style="--d:340" cx="160" cy="160" r="66" stroke-opacity=".4"/>
<g class="sp1"><g class="e" style="--d:600"><circle class="fc" cx="294" cy="160" r="6" fill-opacity=".85"/><circle class="fc" cx="60" cy="160" r="3.5" fill-opacity=".5"/></g></g>
<g class="sp2"><g class="e" style="--d:720"><circle class="fc" cx="160" cy="60" r="5" fill-opacity=".7"/><circle class="fa" cx="160" cy="260" r="4"/></g></g>
<g class="e" style="--d:420"><circle class="fa br" cx="160" cy="160" r="46" fill-opacity=".1"/><circle class="fa" cx="160" cy="160" r="22"/></g>
<g class="e" style="--d:640" stroke-opacity=".55" stroke-width="1.5" stroke-linecap="round"><path d="M160 104v-14M160 216v14M104 160h-14M216 160h14M120 120l-10-10M200 200l10 10M200 120l10-10M120 200l-10 10"/></g></svg>`,
`<svg viewBox="0 0 320 320" fill="none" stroke="currentColor" stroke-width="1.5"><g class="e" style="--d:0"><g class="fl" style="--p:0s"><rect x="58" y="62" width="188" height="128" rx="26" stroke-opacity=".18"/></g></g>
<g class="e" style="--d:140"><g class="fl" style="--p:-2s"><rect class="fb" x="74" y="92" width="188" height="128" rx="26" stroke-opacity=".34"/></g></g>
<g class="e" style="--d:280"><g class="fl" style="--p:-4s"><rect class="fs" x="90" y="122" width="188" height="128" rx="26" stroke-opacity=".75"/><path d="M116 156h92M116 180h128M116 204h70" stroke-opacity=".5" stroke-width="2" stroke-linecap="round"/><circle class="fa" cx="252" cy="150" r="8"/></g></g>
<g class="e" style="--d:560"><path d="M226 54a32 32 0 0 1 32 32" stroke-opacity=".5" stroke-linecap="round"/><circle class="fa" cx="268" cy="50" r="4"/></g></svg>`,
`<svg viewBox="0 0 320 320" fill="none" stroke="currentColor" stroke-width="1.5"><path class="fw" d="M160 52L160 160M253.5 106L160 160M253.5 214L160 160M160 268L160 160M66.5 214L160 160M66.5 106L160 160" stroke-opacity=".38" stroke-linecap="round"/>
<g class="e" style="--d:120"><circle class="fs" cx="160" cy="52" r="12" stroke-opacity=".7"/><circle class="fa" cx="160" cy="52" r="4"/></g><g class="e" style="--d:200"><circle class="fs" cx="253.5" cy="106" r="12" stroke-opacity=".55"/><circle class="fc" cx="253.5" cy="106" r="3.5" fill-opacity=".8"/></g><g class="e" style="--d:280"><circle class="fs" cx="253.5" cy="214" r="12" stroke-opacity=".55"/><circle class="fc" cx="253.5" cy="214" r="3.5" fill-opacity=".8"/></g><g class="e" style="--d:360"><circle class="fs" cx="160" cy="268" r="12" stroke-opacity=".55"/><circle class="fc" cx="160" cy="268" r="3.5" fill-opacity=".8"/></g><g class="e" style="--d:440"><circle class="fs" cx="66.5" cy="214" r="12" stroke-opacity=".55"/><circle class="fc" cx="66.5" cy="214" r="3.5" fill-opacity=".8"/></g><g class="e" style="--d:520"><circle class="fs" cx="66.5" cy="106" r="12" stroke-opacity=".55"/><circle class="fc" cx="66.5" cy="106" r="3.5" fill-opacity=".8"/></g>
<g class="e" style="--d:600"><rect class="fs" x="124" y="124" width="72" height="72" rx="22" stroke-opacity=".85"/><circle class="fa br" cx="160" cy="160" r="9"/></g></svg>`,
`<svg viewBox="0 0 320 320" fill="none" stroke="currentColor" stroke-width="1.5"><g style="transform:rotate(-8deg);transform-origin:160px 160px"><rect class="dr" pathLength="1" style="--d:0" x="46" y="46" width="228" height="228" rx="56" stroke-opacity=".16"/><rect class="dr" pathLength="1" style="--d:160" x="78" y="78" width="164" height="164" rx="42" stroke-opacity=".3"/><rect class="dr" pathLength="1" style="--d:320" x="110" y="110" width="100" height="100" rx="28" stroke-opacity=".62"/></g>
<g class="e" style="--d:640"><path class="sa" d="M160 138v44" stroke-width="3" stroke-linecap="round"/></g><g class="sp1"><g class="e" style="--d:760"><circle class="fa" cx="160" cy="44" r="5"/></g></g>
<g class="e" style="--d:700" stroke-opacity=".5" stroke-linecap="round"><path d="M34 66V34h32M254 34h32v32M286 254v32h-32M66 286H34v-32"/></g></svg>`];
const OB_SLIDES=[
{h:{ru:['Твои идеи.','Твой ИИ.'],en:['Your ideas.','Your AI.']},p:{ru:'Открой новые возможности с Kairema AI. Пространство, где технологии помогают воплощать твои идеи.',en:'Unlock new possibilities with Kairema AI. A space where technology helps bring your ideas to life.'},g1:['0px','-38vh'],g2:['30vw','30vh']},
{h:{ru:['Больше, чем ответы'],en:['More than answers']},p:{ru:'Изучай новое, решай задачи, создавай идеи и находи решения в одном приложении.',en:'Learn new things, solve tasks, create ideas and find solutions in one app.'},g1:['35vw','-10vh'],g2:['-30vw','34vh']},
{h:{ru:['Всё в одном месте'],en:['Everything in one place']},p:{ru:'Общайся, работай с идеями и возвращайся к своим задачам в удобном для тебя ритме.',en:'Chat, work with ideas and return to your tasks at a pace that suits you.'},g1:['-32vw','22vh'],g2:['28vw','-28vh']},
{h:{ru:['Твоё пространство.','Твои правила.'],en:['Your space.','Your rules.']},p:{ru:'Начни с простого вопроса. Исследуй, экспериментируй и создавай собственный путь.',en:'Start with a simple question. Explore, experiment and create your own path.'},g1:['0px','0px'],g2:['0px','36vh']}];
function onboarding(){let i=0,busy=0;const N=OB_SLIDES.length,lg=()=>LANG==='en'?'en':'ru';
 const o=el(`<div class="full ob out" data-screen="onboarding"><div class="bg"><i class="gl g1"><b></b></i><i class="gl g2"><b></b></i><i class="gd"></i></div>
  <header class="obt"><div class="obp">${'<i><b></b></i>'.repeat(N)}</div><button class="skip" id="ob-skip" data-action="onboarding:skip" data-ob="skip">Пропустить</button></header>
  <main class="stage"><div class="slide"><div class="art"></div><div class="txt"></div></div></main>
  <footer class="obf"><button class="btn ghost back hid" id="ob-back" data-action="onboarding:back" data-ob="back">Назад</button><button class="btn next" id="ob-next" data-action="onboarding:next" data-ob="next"><span>Далее</span>${ic('chevR')}</button></footer></div>`);
 app.append(o);
 const sl=$('.slide',o),art=$('.art',o),txt=$('.txt',o),segs=$$('.obp i',o),nx=$('.next span',o),bk=$('.back',o),sk=$('.skip',o);
 const paint=(dir,first)=>{const s=OB_SLIDES[i],L=lg(),h=s.h[L];let k=0;
  sl.style.setProperty('--ex',(first?0:dir*64)+'px');sl.style.setProperty('--ey',first?'14px':'0px');sl.style.setProperty('--es',first?'.96':'.97');
  art.innerHTML=OB_ART[i];
  txt.innerHTML=`<div class="no">0${i+1} / 0${N}</div><h1>${h.map(l=>`<span class="ln">${l.split(' ').map(w=>`<span class="w"><span style="--k:${k++}">${w}</span></span>`).join(' ')}</span>`).join('')}</h1><p>${s.p[L]}</p>`;
  segs.forEach((e,j)=>{e.classList.toggle('on',j===i);e.classList.toggle('done',j<i)});
  o.style.setProperty('--gp',-i*40+'px');[['g1',s.g1],['g2',s.g2]].forEach(([c,v])=>{const g=$('.'+c,o);g.style.setProperty('--x',v[0]);g.style.setProperty('--y',v[1])});
  const last=i===N-1;nx.textContent=last?'Начать':'Далее';nx.classList.remove('nt');void nx.offsetWidth;nx.classList.add('nt');bk.classList.toggle('hid',i===0);sk.classList.toggle('hid',last)};
 const finish=()=>{if(ONBOARD_ONCE)st.set('ko','1');o.classList.add('out');setTimeout(()=>o.remove(),500);setTimeout(askName,600)};
 const go=n=>{if(busy||n<0)return;if(n>=N){finish();return}const dir=n>i?1:-1;busy=1;sl.style.setProperty('--dx',dir*56+'px');sl.classList.add('lv');setTimeout(()=>{i=n;sl.classList.remove('lv');paint(dir);busy=0},300)};
 $('[data-ob=next]',o).onclick=()=>go(i+1);bk.onclick=()=>go(i-1);sk.onclick=finish;
 let x0=null;const stg=$('.stage',o);stg.addEventListener('touchstart',e=>x0=e.touches[0].clientX,{passive:true});stg.addEventListener('touchend',e=>{if(x0===null)return;const dx=e.changedTouches[0].clientX-x0;x0=null;if(Math.abs(dx)>50)go(i+(dx<0?1:-1))});
 const kd=e=>{if(!o.isConnected)return document.removeEventListener('keydown',kd);if(e.key==='ArrowRight')go(i+1);if(e.key==='ArrowLeft')go(i-1)};document.addEventListener('keydown',kd);
 raf(()=>{o.classList.remove('out');paint(1,1)})}
let ended=0;function endSplash(){if(ended)return;ended=1;$('#splash').classList.add('out');setTimeout(()=>$('#splash').remove(),600);if(!ONBOARD_ONCE||!st.get('ko'))onboarding()}
/* ===== FUTURE API: единая точка подключения backend ===== */
/* Сейчас данные шаблонов лежат в localStorage. Для перехода на сервер замените тела методов Api.templates.*
   на fetch(`${Api.base}/templates`, {headers:{Authorization:'Bearer '+Api.token}}) — UI-код менять не нужно.
   TODO(auth): вход и токен; TODO(api): /messages (чат с провайдером), /sessions, /providers, /memory, /profile — аналогично. */
const Api={base:'',token:null,
 templates:{KEY:'kairema.templates.v1',_mem:[],persistent:true,
  _read(){try{const a=JSON.parse(localStorage.getItem(this.KEY)||'[]');return Array.isArray(a)?a.filter(x=>x&&typeof x.id==='string'&&typeof x.name==='string'&&typeof x.prompt==='string'):[]}catch(e){return this._mem.slice()}},
  _write(a){this._mem=a.slice();try{localStorage.setItem(this.KEY,JSON.stringify(a));this.persistent=true}catch(e){this.persistent=false}},
  async list(){return this._read()},
  async create(d){const a=this._read(),t={id:'t_'+Date.now().toString(36)+Math.random().toString(36).slice(2,6),...d,createdAt:Date.now(),updatedAt:Date.now()};a.unshift(t);this._write(a);return t},
  async update(id,d){const a=this._read(),i=a.findIndex(x=>x.id===id);if(i<0)throw new Error('not found');a[i]={...a[i],...d,updatedAt:Date.now()};this._write(a);return a[i]},
  async remove(id){this._write(this._read().filter(x=>x.id!==id))}}};
/* ===== НАВИГАЦИЯ: реестр экранов (точки расширения) ===== */
const SCREENS={onboarding:()=>onboarding(),api:()=>show('api'),terminal:()=>show('term'),settings:()=>show('set'),memory:()=>memPage(),profile:()=>profPage(),templates:()=>tplPage(),providers:()=>provPage(),about:()=>aboutPage()};
function openScreen(name,...a){const f=SCREENS[name];if(!f){console.warn('Неизвестный экран:',name);return}return f(...a)}
const Kairema={state:S,screens:SCREENS,open:openScreen,api:Api,actions:{activateSession,deactivateSession,clearSession,createPromptTemplate,savePromptTemplate,deletePromptTemplate}};
window.Kairema=Kairema;

/* i18n */
let LANG='ru';
const TPLE=[
{n:"YouTube analytics",d:"Review the video's results and decide next actions.",t:"Analyze the performance of the YouTube video [LINK OR DATA]. Assess CTR, retention, traffic sources, engagement and subscriptions. Separate strong signals from hypotheses, find 3 bottlenecks and suggest specific changes for the next video: topic, title, thumbnail, first 30 seconds and call to action."},
{n:"Weekly content plan",d:"Build posts with a goal, format and measurable action.",t:"Create a 7-day content plan for [PRODUCT OR TOPIC] and the audience [AUDIENCE]. For each day specify: platform, format, topic, main thesis, structure, call to action and success metric. Distribute formats so the week works toward [GOAL] instead of repeating the same type of post."},
{n:"Brand content strategy",d:"Build a sustainable system of topics, series and metrics.",t:"Develop a content strategy for the brand [BRAND] in the category [CATEGORY]. Describe the target audience, positioning, key message, 4–5 content series, channel roles, tone of voice, user journey and KPIs. Add example topics, a monthly content rhythm and rules the team will use to choose new ideas."},
{n:"Explain simply",d:"A short, clear explanation with an example.",t:"Explain [TOPIC] in simple words. Give a short definition, one example and point out what is important not to confuse."},
{n:"Verify information",d:"Separate what is confirmed from assumptions.",t:"Verify the claim: [CLAIM]. Separate confirmed facts from uncertainty, provide verifiable sources and do not invent details."},
{n:"Edit text",d:"Keep the meaning and improve clarity.",t:"Edit the text below: [[TEXT]]. Keep the meaning, fix errors and return: 1) the improved version, 2) a list of key changes."},
{n:"Review document",d:"Highlight key points, risks and questions.",t:"Analyze the document: [[DOCUMENT OR ATTACHMENT]]. Highlight the main points, important facts, risks, unclear areas and questions for clarification."},
{n:"Compare options",d:"A table of pros, cons and conditions for choosing.",t:"Compare options [[OPTION A]] and [[OPTION B]] by criteria: cost, risks, timing, convenience and constraints. Give a conclusion with the conditions under which each option should be chosen."},
{n:"Break down a topic",d:"An explanation from basics to practice.",t:"Help me study [[TOPIC]]. Explain the basics, build a 20-minute mini-lesson, give 3 review questions and a short practical task."},
{n:"Review code",d:"Find bugs, risks and improvements.",t:"Do a code review of this snippet: [[CODE]]. First name the critical problems, then risks and improvements. For each remark suggest a specific fix."}];
const EN={
"Чат":"Chat","Подключите AI-провайдера, чтобы начать чат":"Connect an AI provider to start chatting","Чат работает только через вашего AI-провайдера. Добавьте API URL, модель и ключ в настройках.":"Chat works only through your AI provider. Add the API URL, model and key in settings.","Подключить AI-провайдера":"Connect AI provider","Сначала подключите AI-провайдера":"Connect an AI provider first","Удалить факт?":"Delete fact?","Факт будет удалён из памяти без возможности восстановления.":"The fact will be permanently deleted from memory.","Это демонстрационный ответ. Здесь появится ответ вашего AI-провайдера.":"This is a demo reply. Your AI provider's answer will appear here.","Команды: status, whoami, date, fail, clear":"Commands: status, whoami, date, fail, clear",
"Новый шаблон":"New template","Редактировать шаблон":"Edit template","Название шаблона":"Template name","Текст промпта":"Prompt text","Описание (необязательно)":"Description (optional)","Категория (необязательно)":"Category (optional)","Введите название шаблона":"Enter a template name","Введите текст промпта":"Enter the prompt text","Например, Пост для блога":"For example, Blog post","Что должен сделать ИИ. Переменные пишите в [КВАДРАТНЫХ СКОБКАХ]":"What the AI should do. Write variables in [SQUARE BRACKETS]","Краткое описание":"Short description","Например, Маркетинг":"For example, Marketing","Шаблон сохранён":"Template saved","Шаблон обновлён":"Template updated","Шаблон удалён":"Template deleted","Не удалось сохранить шаблон":"Could not save the template","Не удалось удалить шаблон":"Could not delete the template","Удалить шаблон?":"Delete template?","Мои":"Mine","Мой":"Mine","Активный чат":"Active chat","Неактивный чат":"Inactive chat","Хранилище браузера недоступно: шаблон исчезнет после перезагрузки":"Browser storage is unavailable: the template will disappear after reload",
"Все":"All","Аналитика":"Analytics","Планирование":"Planning","Стратегия":"Strategy","Объяснение":"Explanation","Проверка":"Verification","Текст":"Text","Анализ":"Analysis","Выбор":"Choice","Обучение":"Learning","Код":"Code",
"Чаты":"Chats","Терминал":"Terminal","Настройки":"Settings","Активные":"Active","История":"History","Новый чат":"New chat","Поиск во всех чатах…":"Search all chats…",
"Профиль":"Profile","Мой профиль":"My profile","Память ИИ":"AI memory","Мои провайдеры":"My providers","Выйти из аккаунта":"Sign out","Назад":"Back","Меню чата":"Chat menu","Поиск в чате":"Search in chat","Поиск в этом чате":"Search in this chat","Предыдущее":"Previous","Следующее":"Next","Нет совпадений":"No matches",
"Переименовать чат":"Rename chat","Переименовать":"Rename","Экспорт в Markdown":"Export to Markdown","Экспорт в PDF":"Export to PDF","Очистить весь чат":"Clear entire chat","Удалить чат полностью":"Delete chat permanently","Название не может быть пустым":"Name cannot be empty","Сохранить":"Save","Чат переименован":"Chat renamed","Markdown скопирован в буфер":"Markdown copied to clipboard","Выберите «Сохранить как PDF»":"Choose “Save as PDF”",
"Очистить весь чат?":"Clear entire chat?","Все сообщения будут удалены. Это действие нельзя отменить.":"All messages will be deleted. This cannot be undone.","Очистить":"Clear","Чат очищен":"Chat cleared","Удалить чат?":"Delete chat?","Удалить":"Delete","Чат удалён":"Chat deleted","Отмена":"Cancel",

"Пустой чат":"Empty chat","Ничего не найдено":"Nothing found","Попробуйте другое слово.":"Try a different word.","История пуста":"History is empty","Пока нет чатов":"No chats yet","Нажмите «Новый чат», чтобы начать.":"Tap “New chat” to start.","Диалог пуст. Напишите первое сообщение.":"The chat is empty. Write the first message.",
"Сообщение":"Message","Сообщение модели":"Message to model","Прикрепить файл или фото":"Attach file or photo","Шаблоны промтов":"Prompt templates","Голосовой ввод":"Voice input","Веб-поиск включён":"Web search on","Отправить":"Send","Удалить вложение":"Remove attachment","Галерея":"Gallery","Файлы":"Files","Камера":"Camera","Голосовой ввод недоступен на этом устройстве":"Voice input is not available on this device","Нет доступа к микрофону":"No microphone access",
"Использованы актуальные данные из интернета.":"Up-to-date data from the internet was used.",












"Предпочитает краткие ответы с примерами":"Prefers short answers with examples","Работает над мобильным приложением":"Working on a mobile app","Не ест глютен":"Does not eat gluten",
"Искусственный интеллект":"Artificial intelligence","Подключённые провайдеры":"Connected providers","Добавить обычного провайдера":"Add a regular provider","Добавить провайдера поиска в сети":"Add a web search provider","Поиск в сети":"Web search","Включить поиск в интернете":"Enable internet search",
"Позволяет ИИ искать актуальную информацию в интернете через API-провайдер.":"Lets the AI search the internet for up-to-date information via an API provider.",
"Приложение":"App","Тема":"Theme","Тёмная":"Dark","Светлая":"Light","Авто":"Auto","Данные":"Data","Экспорт данных":"Export data","Импорт данных":"Import data","О приложении":"About","Сохранено":"Saved","Поиск в интернете включён":"Internet search enabled","Поиск в интернете выключен":"Internet search disabled","Данные скопированы в буфер":"Data copied to clipboard","Данные импортированы":"Data imported","Не удалось скопировать":"Could not copy",
"Провайдеры ИИ":"AI providers","Провайдеры поиска в сети":"Web search providers","Пока нет подключённых.":"None connected yet.","Редактировать":"Edit","✓ Подключено":"✓ Connected","✗ Ошибка":"✗ Error","Удалить провайдера?":"Delete provider?","Ключ будет удалён с устройства.":"The key will be removed from this device.","Провайдер удалён":"Provider deleted","Новый провайдер":"New provider","Новый провайдер поиска":"New search provider","Провайдер":"Provider",
"Название":"Name","Модель":"Model","Название провайдера":"Provider name","API URL для поиска":"Search API URL","Минимум 2 символа":"At least 2 characters","Укажите модель":"Specify a model","Адрес вида https://api.example.com/v1":"Address like https://api.example.com/v1","Адрес вида https://search.example.com/v1":"Address like https://search.example.com/v1","Минимум 8 символов":"At least 8 characters","Например, MyProvider":"For example, MyProvider","Например, MySearch":"For example, MySearch",
"Проверить и сохранить":"Verify and save","Проверяем…":"Verifying…","✗ Ошибка (ключ отклонён, 401)":"✗ Error (key rejected, 401)","Провайдер сохранён с ошибкой":"Provider saved with an error","Провайдер подключён":"Provider connected","Провайдеров пока нет":"No providers yet",
"Подключите свой API-ключ — тогда заработает чат «Мой API».":"Connect your API key — then the “My API” chat will work.","API-провайдер не подключён":"API provider is not connected","Чтобы использовать этот чат, подключите собственный API-провайдер в настройках":"To use this chat, connect your own API provider in settings","Подключить провайдер":"Connect provider",
"Имя":"Name","Введите имя":"Enter a name","3–20 символов: латиница, цифры, _":"3–20 characters: Latin letters, digits, _","Введите корректный email":"Enter a valid email","Язык интерфейса":"Interface language","Профиль сохранён":"Profile saved",
"Активировать сессию":"Start session","Выключить сессию":"Stop session","Очистить сессию":"Clear session","Активна":"Active","Неактивна":"Inactive","Ошибка":"Error","Копировать вывод":"Copy output","Экспорт лога":"Export log","Команда":"Command","введите help":"type help",
"Сессия не запущена. Нажмите «Активировать сессию», чтобы попробовать демо.":"The session is not running. Tap “Start session” to try the demo.",
"● сервер онлайн · задержка 42 мс":"● server online · latency 42 ms","Ошибка: соединение с сервером потеряно":"Error: connection to server lost","Неизвестная команда. Введите help":"Unknown command. Type help","● сессия запущена":"● session started","Введите help для списка команд":"Type help for the list of commands","— сессия остановлена":"— session stopped",
"Вывод скопирован":"Output copied","Лог скопирован в буфер":"Log copied to clipboard","Лог сессии":"Session log","Очистить активную сессию?":"Clear active session?","Вывод и история команд будут удалены.":"Output and command history will be deleted.","Сессия очищена":"Session cleared",
"Выйти из аккаунта?":"Sign out?","Чаты останутся на сервере. Войти можно в любой момент.":"Chats will stay on the server. You can sign in at any time.","Выйти":"Sign out","Вы вышли":"You are signed out","Войдите, чтобы продолжить":"Sign in to continue","Войти":"Sign in",
"Дальше":"Next","Начать":"Start",
"Удалить все чаты":"Delete all chats","Удалить все чаты?":"Delete all chats?","Все чаты и сообщения будут удалены безвозвратно.":"All chats and messages will be permanently deleted.","Удалить все":"Delete all","Все чаты удалены":"All chats deleted","ИИ и персонализация":"AI and personalization","Провайдеры":"Providers","Интерфейс":"Interface","Ваши данные и контекст":"Your data and context","Быстрые команды для ИИ":"Quick commands for the AI","Модель, API URL и ключ":"Model, API URL and key","Для поиска в интернете":"For internet search","Данные профиля":"Profile details","Сессия активна":"Session active","Сессия выключена":"Session off","Очистить сессию?":"Clear session?","Удалить чат":"Delete chat","Далее":"Next","Пропустить":"Skip","Сохранённых фактов":"Saved facts","Вкл":"On","Выкл":"Off","Настройки памяти":"Memory settings","Копировать":"Copy","Вставить в запрос":"Insert into prompt","Шаблон скопирован":"Template copied",
"ПЕРСОНАЛИЗАЦИЯ":"PERSONALIZATION","Память":"Memory","Управляйте фактами и темами, которые Kairema может учитывать в дальнейших разговорах.":"Manage the facts and topics Kairema can take into account in future conversations.",
"Использовать память в ответах":"Use memory in answers","Разрешить учитывать сохранённые факты и профиль при формировании ответов. Выключение не удаляет записи.":"Allow saved facts and profile to be taken into account when forming answers. Turning off does not delete entries.",
"Автоматически находить новые факты":"Automatically find new facts","Включить локальное распознавание простых фраз о себе, например «меня зовут…» или «мне нравится…». Выключение останавливает только автоматическое добавление.":"Enable local recognition of simple phrases about yourself, for example “my name is…” or “I like…”. Turning off stops only automatic adding.",
"Профиль памяти":"Memory profile","Краткое описание о вас, ваши цели и предпочтения.":"A short description of you, your goals and preferences.","Что Kairema важно знать о вас?":"What is important for Kairema to know about you?","Например: я учусь на дизайнера и предпочитаю короткие ответы с примерами.":"For example: I am studying design and prefer short answers with examples.","Не добавляйте пароли, ключи API и другую секретную информацию.":"Do not add passwords, API keys or other secret information.","Список сохранённых фактов:":"Saved facts:","Добавить новый факт":"Add new fact","Сохранённых фактов пока нет.":"No saved facts yet.",
"Новый факт":"New fact","Редактировать факт":"Edit fact","Введите факт":"Enter a fact","Факт добавлен":"Fact added","Факт обновлён":"Fact updated","Факт удалён":"Fact deleted","Факт добавлен в память":"Fact added to memory","Профиль памяти сохранён":"Memory profile saved","Память включена":"Memory on","Память выключена":"Memory off","Автоматическое добавление включено":"Automatic adding on","Автоматическое добавление выключено":"Automatic adding off",
"О Kairema AI":"About Kairema AI","Kairema AI — персональный ИИ-ассистент для общения, обучения, работы и решения повседневных задач.":"Kairema AI is a personal AI assistant for communication, learning, work and everyday tasks.","Приложение помогает получать ответы на вопросы, разбираться в сложных темах, писать и редактировать тексты, работать с кодом и находить новые идеи.":"The app helps you get answers to questions, understand complex topics, write and edit texts, work with code and find new ideas.","Kairema AI объединяет возможности искусственного интеллекта в одном удобном интерфейсе. Пользователь может подключать собственных AI-провайдеров, вести диалоги и настраивать приложение под свои потребности.":"Kairema AI brings the capabilities of artificial intelligence together in one convenient interface. Users can connect their own AI providers, hold conversations and customize the app to their needs.","Наша цель — создать удобного, быстрого и доступного ИИ-ассистента, который даёт пользователю больше возможностей и контроля.":"Our goal is to create a convenient, fast and accessible AI assistant that gives users more possibilities and control.","Версия: 1.0.0":"Version: 1.0.0","Разработчик: Kairema AI Team":"Developer: Kairema AI Team"};
const EN2={"Гость":"Guest","Почта не указана":"Email not set","Нажмите, чтобы указать имя":"Tap to set your name","Как вас зовут?":"What is your name?","Имя можно изменить позже в настройках. Пока имени нет, показывается «Гость».":"You can change the name later in settings. Until then, “Guest” is shown.","Ваше имя":"Your name","Введите имя":"Enter your name","Демо-терминал: сервера нет. Команды: help, date, clear":"Demo terminal: there is no server. Commands: help, date, clear","● демо-сессия (сервера нет)":"● demo session (no server)","Демо: терминал пока не подключён ни к какому серверу. Команды ничего не выполняют на телефоне.":"Demo: the terminal is not connected to any server yet. Commands do nothing on the phone."};
[CHATS_EN,EN2].forEach(D=>Object.keys(D).forEach(k=>{if(EN[k]===undefined)EN[k]=D[k]}));
const PHK=Object.keys(EN).filter(k=>k.length>=12).sort((a,b)=>b.length-a.length);
const RXS=[[/Шаблон «(.+?)» будет удалён без возможности восстановления\./g,(m,a)=>'Template “'+a+'” will be permanently deleted.'],[/Чат «(.+?)»( исчезнет навсегда\.)?/g,(m,a,b)=>b?'Chat “'+tr(a)+'” will be gone forever.':'Chat “'+tr(a)+'”'],[/(\d+) из (\d+) совпадений/g,'$1 of $2 matches'],[/^Подключено: /,'Connected: '],[/· выкл\./,'· off']];
function tr(s){if(!/[А-Яа-яЁё]/.test(s))return s;const m=s.match(/^(\s*)([\s\S]*?)(\s*)$/);if(EN[m[2]]!==undefined)return m[1]+EN[m[2]]+m[3];let r=s;RXS.forEach(([a,b])=>r=r.replace(a,b));PHK.forEach(k=>{if(r.includes(k))r=r.split(k).join(EN[k])});return r}
const L=s=>LANG==='en'?tr(s):s;
const OT=new WeakMap(),TT=new WeakMap(),AT=['placeholder','aria-label','title'];
function trText(n){const p=n.parentNode;if(p&&/^(SCRIPT|STYLE|TEXTAREA)$/.test(p.nodeName))return;const v=n.nodeValue;if(TT.get(n)===v){if(LANG==='ru'){n.nodeValue=OT.get(n);TT.delete(n)}return}OT.set(n,v);if(LANG==='en'){const r=tr(v);if(r!==v){TT.set(n,r);n.nodeValue=r}}}
function trAttr(e,a){const v=e.getAttribute(a);if(v==null)return;const q=e.__t||(e.__t={}),o=e.__o||(e.__o={});if(q[a]===v){if(LANG==='ru'){e.setAttribute(a,o[a]);delete q[a]}return}o[a]=v;if(LANG==='en'){const r=tr(v);if(r!==v){q[a]=r;e.setAttribute(a,r)}}}
function trTree(root){if(root.nodeType===3){trText(root);return}if(root.nodeType!==1)return;const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),a=[];let n;while(n=w.nextNode())a.push(n);a.forEach(trText);[root,...root.querySelectorAll('[placeholder],[aria-label],[title]')].forEach(e=>AT.forEach(x=>e.hasAttribute(x)&&trAttr(e,x)))}
new MutationObserver(ms=>ms.forEach(m=>{if(m.type==='childList')m.addedNodes.forEach(trTree);else if(m.type==='characterData')trText(m.target);else trAttr(m.target,m.attributeName)})).observe(app,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:AT});
function applyLang(i){LANG=i?'en':'ru';document.documentElement.lang=LANG;trTree(app)}
/* ===== ИНИЦИАЛИЗАЦИЯ ===== */
async function initApp(){loadProviders();loadProfile();
 try{S.userTpls=await Api.templates.list()}catch(e){S.userTpls=[]}
 if(/en$/.test(location.hash))S.p.lang=1;
 applyTheme();apiView();applyLang(S.p.lang);
 $('#v-api').classList.add('enter');setTimeout(()=>$('#v-api').classList.remove('enter'),1000);
 $('#splash').onclick=endSplash;setTimeout(endSplash,reduce?600:2000);
 /* TODO(auth): проверить сессию пользователя; TODO(api): загрузить чаты и профиль с сервера */
}
initApp();
