/* ===== ПРОВАЙДЕРЫ ИИ: название, адрес, ключ → проверка ключа → выбор модели из списка ===== */
/* Загружается раньше app.js; использует его функции при вызове (page, fld, form, Native, S ...). */
const PROV_EN={"Проверить ключ":"Verify key","Проверяем ключ…":"Checking key…","Проверяем модель…":"Checking model…","✓ Ключ принят. Выберите модель":"✓ Key accepted. Choose a model","Выберите модель":"Choose a model","Выбрать модель":"Choose model","Поиск по названию":"Search by name","Текущая модель":"Current model","Например, OpenRouter":"E.g. OpenRouter","провайдер не вернул моделей":"the provider returned no models","Ключ не принят, провайдер не сохранён":"Key rejected, provider not saved","Все":"All","Бесплатные":"Free","Платные":"Paid","Показать ещё":"Show more","Источники":"Sources","Провайдер и модель":"Provider and model","Выбрать другую модель":"Choose another model","Управление провайдерами":"Manage providers","Загружаю модели…":"Loading models…"};
const PROV_ACT='kact',MCACHE={};
function actProv(){const ok=S.providers.filter(x=>x.ok);return ok.find(x=>x.id===st.get(PROV_ACT))||ok[0]}
/* Системная инструкция: язык ответа как у вопроса и оформление в Markdown. */
function sysPrompt(){
 return "You are the assistant inside the Kairema mobile app. Always answer in the same language as the user's latest message (for example, if the user writes in Russian, answer in Russian; if unsure, use "+(LANG==='en'?'English':'Russian')+"). Format answers with Markdown: short paragraphs, **bold** for key terms, bullet or numbered lists, tables for comparisons, fenced code blocks for code. Keep answers compact because they are read on a phone screen. If web search results are included in the user's message, base the answer on them and cite sources as [1], [2]. Today is "+new Date().toISOString().slice(0,10)+"."}
function normModels(raw){
 return (Array.isArray(raw)?raw:[]).map(x=>typeof x==='string'?{id:x,name:''}:{id:String((x&&x.id)||''),name:(x&&x.name)?String(x.name):'',free:(x&&typeof x.free==='boolean')?x.free:undefined}).filter(x=>x.id)}
async function fetchModelList(p){
 const c=MCACHE[p.id];if(c&&Date.now()-c.t<600000)return c.l;
 let l;
 if(!Native.on){await wait(600);l=[{id:'demo-free',name:'Demo free',free:true},{id:'demo-paid',name:'Demo paid',free:false}]}
 else{let raw='';await Native.run('models',[JSON.stringify({id:p.id,url:p.url})],t=>{raw+=t});l=normModels(JSON.parse(raw||'[]'))}
 MCACHE[p.id]={t:Date.now(),l};return l}
/* Выбор модели: сверху бесплатные, ниже платные (если провайдер сообщает цены), поиск и фильтр. */
function pickModel(rawList,cur,onPick){
 const list=normModels(rawList),en=LANG==='en',priced=list.some(x=>x.free!==undefined);
 let mode=0,lim=60;
 const s=sheet(`<h2 style="margin-bottom:10px">Выберите модель</h2><div data-mseg></div><div class="fld" style="margin-top:10px"><input data-ms type="text" placeholder="Поиск по названию" autocomplete="off" autocapitalize="off" spellcheck="false"></div><p class="hint" data-mc style="margin:0 2px 8px"></p><div data-ml style="max-height:44vh;overflow-y:auto"></div>`);
 const inp=$('[data-ms]',s),box=$('[data-ml]',s),cnt=$('[data-mc]',s),byId=(a,b)=>a.id<b.id?-1:a.id>b.id?1:0;
 if(priced)$('[data-mseg]',s).append(seg(['Все','Бесплатные','Платные'],0,k=>{mode=k;lim=60;draw()}));
 const row=m=>{
  const r=el('<button class="opt" style="display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);color:var(--tx)"><span class="mn" style="display:block;font-size:14px"></span><small class="mi" style="display:block;font-family:var(--mono);font-size:12px;color:var(--tx2);margin-top:2px"></small></button>');
  $('.mn',r).textContent=(m.name||m.id)+(m.id===cur?'  ✓':'');
  $('.mi',r).textContent=m.name?m.id:'';
  r.onclick=()=>{s.close();onPick(m.id)};
  box.append(r)};
 function draw(){
  const q=inp.value.trim().toLowerCase();
  let f=list.filter(x=>!q||x.id.toLowerCase().includes(q)||x.name.toLowerCase().includes(q));
  if(priced&&mode===1)f=f.filter(x=>x.free);
  if(priced&&mode===2)f=f.filter(x=>!x.free);
  const fr=priced?f.filter(x=>x.free).sort(byId):[],pd=(priced?f.filter(x=>!x.free):f).sort(byId);
  box.innerHTML='';let shown=0;
  const sect=(title,arr)=>{
   if(!arr.length||shown>=lim)return;
   if(title){const h=el('<p class="lbl" style="margin:12px 2px 4px"></p>');h.textContent=title+' ('+arr.length+')';box.append(h)}
   for(const m of arr){if(shown>=lim)break;row(m);shown++}};
  sect(priced?(en?'Free':'Бесплатные'):'',fr);sect(priced?(en?'Paid':'Платные'):'',pd);
  cnt.textContent=(en?'Models found: ':'Найдено моделей: ')+f.length;
  if(shown<f.length){const mb=el('<button class="btn ghost" style="width:100%;margin-top:10px">Показать ещё</button>');mb.onclick=()=>{lim+=60;draw()};box.append(mb)}}
 inp.oninput=()=>{lim=60;draw()};draw();return s}
/* Переключение провайдера и модели прямо в чате. */
function modelMenu(){
 if(Chx.busy){toast('Дождитесь ответа');return}
 const ok=S.providers.filter(x=>x.ok),cur=actProv();
 if(!cur)return;
 const s=sheet(`<h2 style="margin-bottom:12px">Провайдер и модель</h2><div data-pl></div><div class="stat" style="margin:8px 0"></div><button class="btn" data-mm style="width:100%">Выбрать другую модель</button><button class="btn ghost" data-mp style="width:100%;margin-top:10px">Управление провайдерами</button>`);
 ok.forEach(p=>{
  const r=el('<button class="opt" style="display:block;width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);color:var(--tx)"><span class="mn" style="display:block;font-size:14px"></span><small class="mi" style="display:block;font-family:var(--mono);font-size:12px;color:var(--tx2);margin-top:2px"></small></button>');
  $('.mn',r).textContent=p.name+(p.id===cur.id?'  ✓':'');$('.mi',r).textContent=p.model;
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
   okList=normModels(list);MCACHE[id]={t:Date.now(),l:okList};stt.className='stat ok';stt.textContent='✓ Ключ принят. Выберите модель';sv.innerHTML='Выбрать модель';reset();choose()}
 });
 /* Закрыли форму, а новый провайдер не сохранён: ключ с устройства удаляем. */
 const oc=d.close;
 d.close=()=>{if(i<0&&keyPut&&!saved)Native.deleteKey(id);oc()};
 $('[data-bk]',d).onclick=d.close;
 return d}
i18nAdd(PROV_EN);
