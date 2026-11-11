/* ===== ПРОВАЙДЕРЫ ИИ: название, адрес, ключ → проверка ключа → выбор модели из списка ===== */
/* Загружается раньше app.js; использует его функции при вызове (page, fld, form, Native, S ...). */
const PROV_EN={"Проверить ключ":"Verify key","Проверяем ключ…":"Checking key…","Проверяем модель…":"Checking model…","✓ Ключ принят. Выберите модель":"✓ Key accepted. Choose a model","Выберите модель":"Choose a model","Выбрать модель":"Choose model","Поиск по названию":"Search by name","Текущая модель":"Current model","Например, OpenRouter":"E.g. OpenRouter","провайдер не вернул моделей":"the provider returned no models","Ключ не принят, провайдер не сохранён":"Key rejected, provider not saved"};
function pickModel(list,cur,onPick){
 const en=LANG==='en';
 const s=sheet(`<h2 style="margin-bottom:10px">Выберите модель</h2><div class="fld"><input data-ms type="text" placeholder="Поиск по названию" autocomplete="off" autocapitalize="off" spellcheck="false"></div><p class="hint" data-mc style="margin:0 2px 8px"></p><div data-ml style="max-height:46vh;overflow-y:auto"></div>`);
 const inp=$('[data-ms]',s),box=$('[data-ml]',s),cnt=$('[data-mc]',s);
 const draw=()=>{
  const q=inp.value.trim().toLowerCase(),f=list.filter(x=>x.toLowerCase().includes(q)),show=f.slice(0,60);
  box.innerHTML='';
  cnt.textContent=f.length>show.length?(en?'Showing the first '+show.length+' of '+f.length+'. Narrow the search.':'Показаны первые '+show.length+' из '+f.length+'. Уточните поиск.'):(en?'Models found: ':'Найдено моделей: ')+f.length;
  show.forEach(m=>{
   const r=el('<button class="opt" style="width:100%;text-align:left;background:none;border:0;border-bottom:1px solid var(--line);color:var(--tx);font-family:var(--mono);font-size:13px"></button>');
   r.textContent=m+(m===cur?'  ✓':'');
   r.onclick=()=>{s.close();onPick(m)};
   box.append(r)})};
 inp.oninput=draw;draw();return s}
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
  $$('[data-k=url],[data-k=key]',b).forEach(x=>x.addEventListener('input',()=>{okList=null;sv.innerHTML='Проверить ключ'}));
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
   okList=list;stt.className='stat ok';stt.textContent='✓ Ключ принят. Выберите модель';sv.innerHTML='Выбрать модель';reset();choose()}
 });
 /* Закрыли форму, а новый провайдер не сохранён: ключ с устройства удаляем. */
 const oc=d.close;
 d.close=()=>{if(i<0&&keyPut&&!saved)Native.deleteKey(id);oc()};
 $('[data-bk]',d).onclick=d.close;
 return d}
