/* ===== ПРОВАЙДЕРЫ ИИ: название, адрес, ключ → проверка ключа → выбор модели из списка ===== */
/* Загружается раньше app.js; использует его функции при вызове (page, fld, form, Native, S ...). */
const PROV_EN={"Проверить ключ":"Verify key","Проверяем ключ…":"Checking key…","Проверяем модель…":"Checking model…","✓ Ключ принят. Выберите модель":"✓ Key accepted. Choose a model","Выберите модель":"Choose a model","Выбрать модель":"Choose model","Поиск по названию":"Search by name","Текущая модель":"Current model","Например, OpenRouter":"E.g. OpenRouter","провайдер не вернул моделей":"the provider returned no models","Ключ не принят, провайдер не сохранён":"Key rejected, provider not saved","Все":"All","Бесплатные":"Free","Платные":"Paid","Показать ещё":"Show more","Источники":"Sources","Провайдер и модель":"Provider and model","Выбрать другую модель":"Choose another model","Управление провайдерами":"Manage providers","Загружаю модели…":"Loading models…"};
const PROV_ACT='kact',MCACHE={};
function actProv(){const ok=S.providers.filter(x=>x.ok);return ok.find(x=>x.id===st.get(PROV_ACT))||ok[0]}
/* Системная инструкция: язык ответа как у вопроса и оформление в Markdown. */
function sysPrompt(){
 return "You are the assistant inside the Kairema mobile app. Always answer in the same language as the user's latest message (for example, if the user writes in Russian, answer in Russian; if unsure, use "+(LANG==='en'?'English':'Russian')+"). Format answers with Markdown: short paragraphs, **bold** for key terms, bullet or numbered lists, tables for comparisons, fenced code blocks for code. Keep answers compact because they are read on a phone screen. About the app: Kairema is an Android AI chat app: the user connects their own API key of an AI provider (OpenAI-compatible or Anthropic) and chats with the model they selected; it has chat history and search, memory, web search, a terminal (Android shell or Termux), sharing and file export. You are that selected model, not a Kairema product, and you do not know who created the app or its company, so never invent a creator, company, team, ratings, reviews or financial facts about it. If web search results are included in the user's message, they come from an automatic search and may be irrelevant: use them only when they directly answer the question, cite sources as [1], [2], and otherwise ignore them silently and never invent sources. Never repeat facts from earlier answers that were not supported by real sources. Today is "+new Date().toISOString().slice(0,10)+"."+(typeof stylePrompt==='function'?stylePrompt():'')+(typeof memoryPrompt==='function'?memoryPrompt():'')+(typeof terminalPrompt==='function'?terminalPrompt():'')+(typeof artifactPrompt==='function'?artifactPrompt():'')}
function normModels(raw){
 return (Array.isArray(raw)?raw:[]).map(x=>typeof x==='string'?{id:x,name:''}:{id:String((x&&x.id)||''),name:(x&&x.name)?String(x.name):'',free:(x&&typeof x.free==='boolean')?x.free:undefined}).filter(x=>x.id)}
async function fetchModelList(p){
 const c=MCACHE[p.id];if(c&&Date.now()-c.t<600000)return c.l;
 let l;
 if(!Native.on){await wait(600);l=[{id:'demo-free',name:'Demo free',free:true},{id:'demo-paid',name:'Demo paid',free:false}]}
 else{let raw='';await Native.run('models',[JSON.stringify({id:p.id,url:p.url})],t=>{raw+=t});l=normModels(JSON.parse(raw||'[]'))}
 MCACHE[p.id]={t:Date.now(),l};return l}
/* Выбор модели: вкладки «Все / Бесплатные / Платные» с плавным переключением в обе стороны,
   поиск, читаемые строки (название, id, метка цены). Стили: features/providers/providers.css */
const mdlShort=id=>{const p=String(id).split('/');return p[p.length-1]||id};
function mdlRow(o){
 const r=el('<button type="button" class="mdl-row"><span class="mdl-t"><b class="mdl-n"></b><small class="mdl-id"></small></span><span class="mdl-e"></span></button>');
 const t=o.name||mdlShort(o.id);
 $('.mdl-n',r).textContent=t;
 const idEl=$('.mdl-id',r);if(t!==o.id)idEl.innerHTML=esc(o.id).replace(/([\/:_-])/g,'$1<wbr>');else idEl.remove();
 const e=$('.mdl-e',r);
 if(o.free!==undefined){const g=document.createElement('em');g.className='mdl-tag '+(o.free?'free':'paid');g.textContent=o.free?'Бесплатная':'Платная';e.append(g)}
 if(o.on){r.classList.add('on');e.insertAdjacentHTML('beforeend',ic('ok'))}
 if(!e.children.length)e.remove();
 if(o.i!==undefined)r.style.setProperty('--i',Math.min(o.i,9));
 return r}
/* Вкладки с «ползунком»: cb(индекс, предыдущий индекс). */
function mdlTabs(labels,cb){
 const w=el(`<div class="mdl-seg" role="tablist" style="--n:${labels.length};--k:0"><i class="mdl-th"></i>${labels.map(()=>'<button type="button" role="tab"><span></span><em>0</em></button>').join('')}</div>`);
 const bs=$$('button',w);let cur=0;
 bs.forEach((b,i)=>{$('span',b).textContent=labels[i];b.onclick=()=>{if(i===cur)return;const p=cur;cur=i;w.style.setProperty('--k',i);bs.forEach((z,j)=>{z.classList.toggle('on',j===i);z.setAttribute('aria-selected',j===i)});cb(i,p)}});
 bs[0].classList.add('on');
 w.count=(i,n)=>{$('em',bs[i]).textContent=n};
 return w}
function pickModel(rawList,cur,onPick){
 const list=normModels(rawList),en=LANG==='en',priced=list.some(x=>x.free!==undefined);
 let mode=0,lim=60;
 const s=sheet(`<h2 class="mdl-h">Выберите модель</h2><div data-mseg></div><div class="fld mdl-s"><input data-ms type="text" placeholder="Поиск по названию" autocomplete="off" autocapitalize="off" spellcheck="false"></div><p class="hint mdl-c" data-mc></p><div class="mdl-list" data-ml></div>`);
 $('.sheet',s).classList.add('mdl');
 const inp=$('[data-ms]',s),box=$('[data-ml]',s),cnt=$('[data-mc]',s),byId=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
 let tabs=null;
 if(priced){tabs=mdlTabs(['Все','Бесплатные','Платные'],(k,p)=>{mode=k;lim=60;draw(k>p?'r':'l')});$('[data-mseg]',s).append(tabs)}
 else $('[data-mseg]',s).remove();
 function draw(dir){
  const q=inp.value.trim().toLowerCase();
  const base=list.filter(x=>!q||x.id.toLowerCase().includes(q)||x.name.toLowerCase().includes(q));
  if(tabs){tabs.count(0,base.length);tabs.count(1,base.filter(x=>x.free).length);tabs.count(2,base.filter(x=>!x.free).length)}
  let f=base;
  if(priced&&mode===1)f=f.filter(x=>x.free);
  if(priced&&mode===2)f=f.filter(x=>!x.free);
  const fr=priced?f.filter(x=>x.free).sort(byId):[],pd=(priced?f.filter(x=>!x.free):f).sort(byId);
  box.dataset.d=dir||'n';if(dir&&dir!=='n')box.scrollTop=0;
  box.innerHTML='';let shown=0;
  const sect=(title,arr)=>{
   if(!arr.length||shown>=lim)return;
   if(title){const h=el('<p class="mdl-sec"></p>');h.style.setProperty('--i',Math.min(shown,9));h.textContent=title+' ('+arr.length+')';box.append(h)}
   for(const m of arr){if(shown>=lim)break;const r=mdlRow({id:m.id,name:m.name,free:priced?!!m.free:undefined,on:m.id===cur,i:shown});r.onclick=()=>{s.close();onPick(m.id)};box.append(r);shown++}};
  sect(priced&&mode===0?(en?'Free':'Бесплатные'):'',fr);sect(priced&&mode===0?(en?'Paid':'Платные'):'',pd);
  if(!f.length){const e=el('<p class="mdl-empty"></p>');e.textContent='Ничего не найдено';box.append(e)}
  cnt.textContent=(en?'Models found: ':'Найдено моделей: ')+f.length;
  if(shown<f.length){const mb=el('<button type="button" class="btn ghost mdl-more">Показать ещё</button>');mb.onclick=()=>{lim+=60;draw('n')};box.append(mb)}}
 inp.oninput=()=>{lim=60;draw('n')};draw('u');return s}
/* Переключение провайдера и модели прямо в чате. */
function modelMenu(){
 if(Chx.busy){toast('Дождитесь ответа');return}
 const ok=S.providers.filter(x=>x.ok),cur=actProv();
 if(!cur)return;
 const s=sheet(`<h2 class="mdl-h">Провайдер и модель</h2><div class="mdl-list mdl-pl" data-pl></div><div class="stat" style="margin:8px 0"></div><button class="btn" data-mm style="width:100%">Выбрать другую модель</button><button class="btn ghost" data-mp style="width:100%;margin-top:10px">Управление провайдерами</button>`);
 $('.sheet',s).classList.add('mdl','mdl-menu');
 $('[data-pl]',s).dataset.d='u';
 ok.forEach((p,i)=>{
  const r=mdlRow({id:p.model,name:p.name,on:p.id===cur.id,i});
  r.onclick=()=>{st.set(PROV_ACT,p.id);s.close();apiView()};
  $('[data-pl]',s).append(r)});
 $('[data-mp]',s).onclick=()=>{s.close();show('set');provPage()};
 $('[data-mm]',s).onclick=async()=>{
  const b=$('[data-mm]',s),stt=$('.stat',s);
  b.disabled=true;b.innerHTML='<span class="spin"></span>Загружаю модели…';stt.className='stat';stt.textContent='';
  try{
   const l=await fetchModelList(cur);s.close();
   pickModel(l,cur.model,m=>{cur.model=m;saveProviders();apiView();toast(m)})
  }catch(x){stt.className='stat bad';stt.textContent='✗ '+x.message;b.disabled=false;b.textContent='Выбрать другую модель'}}}
function chatProvForm(i,done){
 const e=S.providers[i]||{},id=e.id||pid();
 let okList=null,saved=false,keyPut=false,sv,stt,url0='',nm0='';
 const d=page('provider-form',i<0?'Новый провайдер':'Провайдер',(b)=>{
  b.innerHTML=fld('Название','name',e.name,'Минимум 2 символа','text','Например, OpenRouter')
   +fld('API URL','url',e.url,'Адрес вида https://api.example.com/v1','url','https://api.example.com/v1')
   +fld('API Key','key','','Минимум 8 символов','password',i<0?'sk-…':'••••••••')
   +(e.model?'<p class="hint" style="margin:0 2px 12px"><span>Текущая модель</span>: <b data-cm></b></p>':'')
   +'<div class="stat"></div><button class="btn" data-s style="width:100%">Проверить ключ</button>';
  if(e.model)$('[data-cm]',b).textContent=e.model;
  sv=$('[data-s]',b);stt=$('.stat',b);
  const R={name:v=>v.length>=2,url:v=>/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v),key:v=>v.length>=8||(i>=0&&!v)};
  form(b,R,sv);
  /* Если поменяли адрес или ключ, список моделей устарел: проверяем ключ заново. */
  $$('[data-k=url],[data-k=key]',b).forEach(x=>x.addEventListener('input',()=>{okList=null;delete MCACHE[id];sv.innerHTML='Проверить ключ'}));
  sv.onclick=async()=>{
   const g=k=>$(`[data-k=${k}]`,b).value.trim(),kv=g('key'),url=g('url'),name=g('name');
   const reset=()=>{sv.disabled=false};
   const choose=()=>pickModel(okList,e.model,async m=>{
    sv.disabled=true;sv.innerHTML='<span class="spin"></span>Проверяем модель…';stt.className='stat';stt.textContent='';
    let err='';
    if(!Native.on)await wait(900);
    else{try{await Native.run('verify',[JSON.stringify({id,url,model:m})])}catch(x){err=x.message}}
    sv.innerHTML='Выбрать модель';reset();
    if(err){stt.className='stat bad';stt.textContent='✗ '+err+' ('+m+')';return}
    const p={id,name,model:m,url,ok:true};
    if(i<0)S.providers.push(p);else S.providers[i]=p;
    saved=true;saveProviders();done();toast('Провайдер подключён');
    stt.className='stat ok';stt.textContent='✓ Подключено';setTimeout(()=>d.close(),700)});
   if(okList){choose();return}
   sv.disabled=true;sv.innerHTML='<span class="spin"></span>Проверяем ключ…';stt.className='stat';stt.textContent='';
   if(kv){Native.saveKey(id,kv);keyPut=true}
   let list=[],err='';
   if(!Native.on){await wait(900);if(/bad|fail/i.test(kv))err='ключ отклонён (401)';else list=['demo-model-a','demo-model-b']}
   else{try{let raw='';await Native.run('models',[JSON.stringify({id,url})],t=>{raw+=t});list=JSON.parse(raw||'[]')}catch(x){err=x.message}}
   if(!err&&!list.length)err='провайдер не вернул моделей';
   if(err){
    stt.className='stat bad';stt.textContent='✗ '+err;sv.innerHTML='Проверить ключ';reset();
    if(i>=0&&kv){S.providers[i].ok=false;saveProviders();done()}
    return}
   okList=normModels(list);MCACHE[id]={t:Date.now(),l:okList};stt.className='stat ok';stt.textContent='✓ Ключ принят. Выберите модель'+(okList.some(x=>x.free!==undefined)?' · '+(LANG==='en'?'Free: ':'Бесплатных: ')+okList.filter(x=>x.free).length+', '+(LANG==='en'?'paid: ':'платных: ')+okList.filter(x=>x.free===false).length:'');sv.innerHTML='Выбрать модель';reset();choose()}
 });
 /* Закрыли форму, а новый провайдер не сохранён: ключ с устройства удаляем. */
 const oc=d.close;
 d.close=()=>{if(i<0&&keyPut&&!saved)Native.deleteKey(id);oc()};
 $('[data-bk]',d).onclick=d.close;
 return d}
i18nAdd(PROV_EN);
i18nAdd({"Бесплатная":"Free","Платная":"Paid","Ничего не найдено":"Nothing found"});
