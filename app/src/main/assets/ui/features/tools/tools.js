/* ===== ФУНКЦИИ ЧАТА: меню «+», режимы ответа, создание изображений, глубокое исследование =====
   Кнопка «+» в поле ввода открывает список: вложения (галерея, камера, файлы) и функции.
   Функции-режимы: «Создать изображение» и «Глубокое исследование» действуют на одно следующее сообщение
   (в поле ввода появляется синяя метка), «Думать» и «Быстрый ответ» (Thinking / Instant) действуют, пока включены.
   Нативная часть: Bridge.image (картинки), Bridge.chat (параметры размышления).
   Убрать модуль: удалить папку features/tools и строки в index.html; «+» вернётся к обычному списку вложений. */
i18nAdd({"Функции и вложения":"Features and attachments","Прикрепить":"Attach","Функции":"Features","Фото из галереи":"Photo from gallery","Камера":"Camera","Файлы":"Files","Создать изображение":"Create an image","Опишите картинку, она создаётся сразу":"Describe the picture, it is created right away","Глубокое исследование":"Deep research","Несколько поисков и подробный отчёт с источниками":"Several searches and a detailed report with sources","Думать":"Think","Размышление перед ответом (Thinking)":"Reasoning before the answer (Thinking)","Быстрый ответ":"Quick answer","Без долгих размышлений (Instant)":"No long reasoning (Instant)","Поиск в интернете":"Web search","Шаблоны промтов":"Prompt templates","Опишите изображение":"Describe the image","О чём провести исследование?":"What should be researched?","Думает…":"Thinking…","Размышления":"Reasoning","Создаю изображение…":"Creating the image…","Не удалось создать изображение: ":"Could not create the image: ","Модель для картинок":"Image model","Укажите модель, которая умеет создавать изображения. Её можно изменить, нажав на метку «Создать изображение».":"Enter a model that can create images. You can change it by tapping the “Create an image” label.","Название модели":"Model name","Сохранить":"Save","Сохранено в «Загрузки»":"Saved to Downloads","Поделиться":"Share","Планирую исследование…":"Planning the research…","Для глубокого исследования подключите провайдера поиска (Настройки)":"Connect a search provider (Settings) for deep research","Создание изображений работает только в приложении":"Image creation works only in the app","Anthropic не создаёт изображения. Подключите другого провайдера, например OpenRouter или OpenAI":"Anthropic does not create images. Connect another provider, for example OpenRouter or OpenAI"});
const Tools=(()=>{
 /* P (набор значков) создаётся в core/app.js позже модулей, поэтому дописываем значки при первом использовании */
 const icons=()=>{P.bolt=P.bolt||'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>';P.wand=P.wand||'<path d="M5 19L15 9M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7z"/>'};
 const api={mode:null,thinkMode:'auto',binds:[]};
 try{api.thinkMode=st.get('kthink')||'auto'}catch(e){}
 const blue=()=>api.mode==='image'||api.mode==='deep';
 /* Метки в поле ввода */
 api.paint=w=>{
  icons();
  const box=$('.modes',w.el),ta=$('textarea',w.el);if(!box)return;box.innerHTML='';
  const add=(cls,icon,txt,off,body)=>{const c=el(`<span class="mchip ${cls}"><button type="button" class="mc-b">${ic(icon)}<b></b></button><button type="button" class="mc-x" aria-label="Убрать">${ic('x')}</button></span>`);$('b',c).textContent=L(txt);$('.mc-x',c).onclick=off;if(body)$('.mc-b',c).onclick=body;box.append(c)};
  if(api.mode==='image')add('blue','img','Создать изображение',()=>api.set(null),()=>api.askImgModel(actProv()));
  if(api.mode==='deep')add('blue','search','Глубокое исследование',()=>api.set(null));
  if(api.thinkMode==='think')add('plain','brain','Думать',()=>api.setThink('auto'));
  if(api.thinkMode==='instant')add('plain','bolt','Быстрый ответ',()=>api.setThink('auto'));
  w.el.classList.toggle('mb',blue());
  ta.placeholder=api.mode==='image'?L('Опишите изображение'):api.mode==='deep'?L('О чём провести исследование?'):(w.ph||'Сообщение')};
 api.bind=(el_,ph)=>{const w={el:el_,ph};api.binds.push(w);el_._tw=w;api.paint(w)};
 const repaint=()=>{api.binds=api.binds.filter(w=>w.el.isConnected);api.binds.forEach(api.paint)};
 api.set=m=>{api.mode=(api.mode===m?null:m);repaint()};
 api.setThink=v=>{api.thinkMode=v;try{st.set('kthink',v)}catch(e){}repaint()};
 /* Режим одного сообщения: берётся при отправке и сбрасывается */
 api.take=()=>{const m=api.mode;api.mode=null;repaint();return m};
 /* Меню «+» */
 api.open=c=>{
  icons();
  if(typeof Sx!=='undefined')Sx.icons();
  const rows=[
   ['h','Прикрепить'],
   ['img','Фото из галереи','',()=>c.pick('g')],
   ['cam','Камера','',()=>c.pick('c')],
   ['file','Файлы','',()=>c.pick('f')],
   ['h','Функции'],
   ['wand','Создать изображение','Опишите картинку, она создаётся сразу',()=>api.set('image'),api.mode==='image'],
   ['search','Глубокое исследование','Несколько поисков и подробный отчёт с источниками',()=>{if(!S.sproviders.some(x=>x.ok)){toast('Для глубокого исследования подключите провайдера поиска (Настройки)');return}api.set('deep')},api.mode==='deep'],
   ['brain','Думать','Размышление перед ответом (Thinking)',()=>api.setThink(api.thinkMode==='think'?'auto':'think'),api.thinkMode==='think'],
   ['bolt','Быстрый ответ','Без долгих размышлений (Instant)',()=>api.setThink(api.thinkMode==='instant'?'auto':'instant'),api.thinkMode==='instant'],
   ['globe','Поиск в интернете','',()=>toggleWeb(),!!S.web],
   ['tpl','Шаблоны промтов','',()=>c.tpl()]];
  const s=sheet('<div class="tl-list"></div>');const box=$('.tl-list',s);let i=0;
  rows.forEach(r=>{
   if(r[0]==='h'){box.append(el(`<div class="tl-h">${L(r[1])}</div>`));return}
   const b=el(`<button type="button" class="sx-row tl-row ${r[4]?'on':''}" style="--i:${i++}"><span class="sx-i">${ic(r[0])}</span><span class="sx-t"><b></b><small></small></span><span class="tl-ck">${r[4]?ic('ok'):''}</span></button>`);
   $('b',b).textContent=L(r[1]);const sm=$('small',b);if(r[2])sm.textContent=L(r[2]);else sm.remove();
   b.onclick=()=>{s.close();setTimeout(r[3],120)};box.append(b)})};
 /* Параметры для провайдера: 1 думать, -1 быстро, 0 как есть */
 api.think=()=>api.thinkMode==='think'?1:api.thinkMode==='instant'?-1:0;
 api.sysx=last=>{let s='';
  if(last&&last.deep)s+='\n\nDeep research mode: write a thorough, well-structured report: a title, a short summary, sections with ## headings, key findings in **bold**, a comparison table when useful, and a conclusion. Cite sources as [1], [2] using the provided search results. Be specific and avoid filler.';
  if(api.thinkMode==='think')s+='\n\nThink carefully and reason step by step before giving the final answer.';
  if(api.thinkMode==='instant')s+='\n\nInstant mode: answer right away and concisely, without long reasoning.';
  return s};
 /* Размышления модели (приходят отдельно от ответа) */
 api.thought=(d,m,t)=>{
  let e=d._th;if(!e){e=el(`<details class="think" open><summary>${L('Думает…')}</summary><div class="tbody"></div></details>`);d.insertBefore(e,$('.bd',d));d._th=e}
  m.think=(m.think||'')+t;$('.tbody',e).textContent=m.think;const b=d.parentNode;if(b&&b.scrollHeight-b.scrollTop-b.clientHeight<160)b.scrollTop=1e6};
 api.thoughtDone=d=>{const e=d._th;if(!e)return;e.open=false;$('summary',e).textContent=L('Размышления')};
 /* Глубокое исследование: план запросов, несколько поисков, общий список источников */
 api.research=async(pv,sp,question,bd)=>{
  let qs=[];bd.textContent=L('Планирую исследование…');
  try{let raw='';
   await Native.run('chat',[JSON.stringify({id:pv.id,url:pv.url,model:pv.model,system:'Return ONLY a JSON array of 4 to 6 short, diverse web search queries (strings) that together cover the user question. No explanations.'}),JSON.stringify([{role:'user',content:question}])],t=>{if(t.charCodeAt(0)!==1)raw+=t});
   const a=raw.match(/\[[\s\S]*\]/);if(a)qs=JSON.parse(a[0]).filter(x=>typeof x==='string'&&x.trim()).slice(0,6)}catch(e){}
  if(!qs.length)qs=[question.slice(0,200)];
  const seen=new Set(),src=[];let serr='';
  for(let i=0;i<qs.length;i++){
   bd.textContent=(LANG==='en'?'Searching ':'Ищу ')+(i+1)+(LANG==='en'?' of ':' из ')+qs.length+': '+qs[i];
   try{let raw='';await Native.run('search',[JSON.stringify({id:sp.id,url:sp.url}),qs[i].slice(0,300)],t=>{raw+=t});
    JSON.parse(raw||'[]').forEach(s=>{if(s&&s.url&&!seen.has(s.url)){seen.add(s.url);src.push(s)}})}catch(e){serr=e.message}}
  return{src:src.slice(0,14),serr:src.length?'':serr}};
 /* Создание изображения */
 api.askImgModel=pv=>new Promise(res=>{
  if(!pv){res('');return}
  const sug=/openrouter\.ai/.test(pv.url)?'google/gemini-2.5-flash-image':/openai\.com/.test(pv.url)?'gpt-image-1':'';
  const s=sheet(`<h2>${L('Модель для картинок')}</h2><p class="sub" style="margin:8px 0 14px">${L('Укажите модель, которая умеет создавать изображения. Её можно изменить, нажав на метку «Создать изображение».')}</p><div class="fld"><label for="im-m">${L('Название модели')}</label><input id="im-m" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(sug)}"></div><div class="two"><button class="btn ghost" data-c type="button">Отмена</button><button class="btn" data-o type="button">${L('Сохранить')}</button></div>`);
  const i=$('#im-m',s);i.value=pv.imgModel||sug;let done=0;
  const fin=v=>{if(done)return;done=1;res(v)};
  $('[data-c]',s).onclick=()=>{s.close();fin('')};
  $('[data-o]',s).onclick=()=>{const v=i.value.trim();if(!v){toast('Укажите модель');return}pv.imgModel=v;saveProviders();s.close();fin(v)};
  const obs=new MutationObserver(()=>{if(!s.isConnected){obs.disconnect();fin('')}});obs.observe(app,{childList:true})});
 api.image=async(ch,box,prompt)=>{
  const pv=actProv();
  if(!Native.on){toast('Создание изображений работает только в приложении');return}
  if(/anthropic\.com/.test(pv.url)){toast('Anthropic не создаёт изображения. Подключите другого провайдера, например OpenRouter или OpenAI');return}
  let model=pv.imgModel;if(!model){model=await api.askImgModel(pv);if(!model)return}
  const m={r:'a',t:'🖼 '+prompt};ch.msgs.push(m);
  const d=msgEl(m,1);box.append(d);const bd=$('.bd',d);bd.innerHTML=`<span class="imgload"><i></i>${L('Создаю изображение…')}</span>`;scr(box);
  try{let raw='';await Native.run('image',[JSON.stringify({id:pv.id,url:pv.url,model}),prompt],t=>{raw+=t});
   m.img=JSON.parse(raw);api.paintImg(d,m);Hooks.run('chat:answer',m,bd)}
  catch(e){m.err=1;m.t=bd.textContent=L('Не удалось создать изображение: ')+e.message}
  scr(box)};
 api.paintImg=(d,m)=>{
  if(!m.img)return;const bd=$('.bd',d);bd.textContent='';bd.classList.add('imgmsg');
  const im=new Image();im.className='genimg';im.alt=m.t||'';im.src='data:'+m.img.mime+';base64,'+m.img.b64;bd.append(im);
  if(typeof Sx!=='undefined')Sx.icons();
  const row=el(`<div class="img-act"><button type="button" data-s>${ic('dwn')}<span>${L('Сохранить')}</span></button><button type="button" data-h>${ic('shr')}<span>${L('Поделиться')}</span></button></div>`);
  const ext=(m.img.mime.split('/')[1]||'png').replace('jpeg','jpg'),name='kairema_'+Date.now()+'.'+ext;
  $('[data-s]',row).onclick=()=>{const ok=Native.sync('saveImage',name,m.img.mime,m.img.b64);toast(ok?L('Сохранено в «Загрузки»'):'Не удалось сохранить')};
  $('[data-h]',row).onclick=()=>Native.sync('shareImage',name,m.img.mime,m.img.b64);
  bd.append(row)};
 Hooks.on('msg:render',(d,m)=>{if(m.img)api.paintImg(d,m)});
 return api})();
