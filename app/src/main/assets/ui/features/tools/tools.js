/* ===== ФУНКЦИИ ЧАТА: меню «+», режимы ответа, создание изображений, глубокое исследование =====
   Кнопка «+» в поле ввода открывает список: вложения (галерея, камера, файлы) и функции.
   Функции-режимы: «Создать изображение» и «Глубокое исследование» действуют на одно следующее сообщение
   (в поле ввода появляется синяя метка), «Думать» и «Быстрый ответ» (Thinking / Instant) действуют, пока включены.
   Нативная часть: Bridge.image (картинки), Bridge.chat (параметры размышления).
   Убрать модуль: удалить папку features/tools и строки в index.html; «+» вернётся к обычному списку вложений. */
i18nAdd({"симв.":"chars"});
i18nAdd({"шагов":"steps","Функции и вложения":"Features and attachments","Прикрепить":"Attach","Функции":"Features","Фото из галереи":"Photo from gallery","Камера":"Camera","Файлы":"Files","Создать изображение":"Create an image","Опишите картинку, она создаётся сразу":"Describe the picture, it is created right away","Глубокое исследование":"Deep research","Несколько поисков и подробный отчёт с источниками":"Several searches and a detailed report with sources","Думать":"Think","Размышление перед ответом (Thinking)":"Reasoning before the answer (Thinking)","Быстрый ответ":"Quick answer","Без долгих размышлений (Instant)":"No long reasoning (Instant)","Поиск в интернете":"Web search","Шаблоны промтов":"Prompt templates","Опишите изображение":"Describe the image","О чём провести исследование?":"What should be researched?","Думает…":"Thinking…","Размышления":"Reasoning","Создаю изображение…":"Creating the image…","Не удалось создать изображение: ":"Could not create the image: ","Модель для картинок":"Image model","Укажите модель, которая умеет создавать изображения. Её можно изменить, нажав на метку «Создать изображение».":"Enter a model that can create images. You can change it by tapping the “Create an image” label.","Название модели":"Model name","Сохранить":"Save","Сохранено в «Загрузки»":"Saved to Downloads","Поделиться":"Share","Планирую исследование…":"Planning the research…","Для глубокого исследования подключите провайдера поиска (Настройки)":"Connect a search provider (Settings) for deep research","Создание изображений работает только в приложении":"Image creation works only in the app","Anthropic не создаёт изображения. Подключите другого провайдера, например OpenRouter или OpenAI":"Anthropic does not create images. Connect another provider, for example OpenRouter or OpenAI","Эта модель не создаёт изображения. Выберите модель с меткой «Картинки»":"This model does not create images. Choose a model tagged “Images”","Модель сама не размышляет: к запросу добавится просьба рассуждать по шагам":"The model does not reason natively: the request will ask it to think step by step","Модель сама не размышляет: к запросу добавится просьба ответить сразу и кратко":"The model does not reason natively: the request will ask for a short, direct answer"});
i18nAdd({"Think есть у модели":"Model has Think","Своего Think нет, просим по шагам":"No own Think, asked step by step","Своего Think нет, просим кратко":"No own Think, asked to be brief","Свой поиск у модели есть":"Model has its own search","Своего поиска у модели нет":"Model has no own search","Поиск":"Search","Режим":"Mode","Фото":"Photo","Из галереи":"From gallery","Снять сейчас":"Take a photo","Файл":"File","PDF, текст, таблица":"PDF, text, spreadsheet","Изображение":"Image","Нарисовать по описанию":"Draw from a description","Отчёт с источниками":"Report with sources","Рассуждает перед ответом":"Reasons before answering","Попросим рассуждать по шагам":"We will ask it to reason step by step","Без долгих раздумий":"No long reasoning","Попросим ответить кратко":"We will ask for a short answer","Свежие данные из сети":"Fresh data from the web","Эта модель не рисует":"This model cannot draw","Нужен провайдер поиска":"Search provider needed","Эта модель не рисует. Выберите модель с меткой «Картинки»":"This model cannot draw. Pick a model tagged “Images”","Для исследования подключите провайдера поиска (Настройки)":"Connect a search provider (Settings) for research","Для поиска подключите провайдера поиска (Настройки)":"Connect a search provider (Settings) for search"});
const Tools=(()=>{
 /* P (набор значков) создаётся в core/app.js позже модулей, поэтому дописываем значки при первом использовании */
 const icons=()=>{P.bolt=P.bolt||'<path d="M13 3L5 14h6l-1 7 8-11h-6z"/>';P.wand=P.wand||'<path d="M5 19L15 9M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 12l.7 1.3L21 14l-1.3.7L19 16l-.7-1.3L17 14l1.3-.7z"/>'};
 const api={mode:null,thinkMode:'auto',binds:[]};
 try{api.thinkMode=st.get('kthink')||'auto'}catch(e){}
 /* Возможности выбранной модели (features/caps): Thinking/Instant только если модель размышляет, картинки если есть модель для них */
 /* Встроенное размышление у модели (меняет подпись в меню и параметры запроса). Сами режимы доступны у любой модели. */
 const canThink=()=>typeof Caps==='undefined'||Caps.think(actProv());
 /* Картинки: только если ВЫБРАННАЯ модель их создаёт (Caps.image проверяет модель, а не провайдера) */
 const canImg=()=>typeof Caps!=='undefined'&&Caps.image(actProv());
 const canSearch=()=>S.sproviders.some(x=>x.ok);
 const tm=()=>api.thinkMode;
 api.can={think:canThink,image:canImg,search:canSearch};
 const blue=()=>api.mode==='image'||api.mode==='deep';
 /* Метки в поле ввода */
 api.paint=w=>{
  icons();
  if(api.mode==='image'&&!canImg())api.mode=null;
  const box=$('.modes',w.el),ta=$('textarea',w.el);if(!box)return;box.innerHTML='';
  const add=(cls,icon,txt,off,body)=>{const c=el(`<span class="mchip ${cls}"><button type="button" class="mc-b">${ic(icon)}<b></b></button><button type="button" class="mc-x" aria-label="Убрать">${ic('x')}</button></span>`);$('b',c).textContent=L(txt);$('.mc-x',c).onclick=off;if(body)$('.mc-b',c).onclick=body;box.append(c)};
  if(api.mode==='image'&&canImg())add('blue','img','Создать изображение',()=>api.set(null));
  if(api.mode==='deep')add('blue','search','Глубокое исследование',()=>api.set(null));
  if(api.mwebOn())add('plain','globe','Поиск модели',()=>api.setMweb(false));
  if(tm()==='think')add('plain','brain','Думать',()=>api.setThink('auto'));
  if(tm()==='instant')add('plain','bolt','Быстрый ответ',()=>api.setThink('auto'));
  w.el.classList.toggle('mb',blue());
  ta.placeholder=api.mode==='image'?L('Опишите изображение'):api.mode==='deep'?L('О чём провести исследование?'):(w.ph||'Сообщение')};
 api.bind=(el_,ph)=>{const w={el:el_,ph};api.binds.push(w);el_._tw=w;api.paint(w)};
 const repaint=()=>{api.binds=api.binds.filter(w=>w.el.isConnected);api.binds.forEach(api.paint)};
 api.refresh=()=>repaint();
 api.set=m=>{api.mode=(api.mode===m?null:m);repaint()};
 api.setThink=v=>{api.thinkMode=v;try{st.set('kthink',v)}catch(e){}repaint()};
 /* Режим одного сообщения: берётся при отправке и сбрасывается */
 api.take=()=>{const m=api.mode;api.mode=null;repaint();return m};
 /* Меню «+»: плитки по 2 в ряд, три группы (Прикрепить, Создать, Режим). Окно в половину высоты, дальше прокрутка внутри.
    Любой выбор (в том числе «Думать», «Быстрый ответ», «Поиск») сразу закрывает окно, включённое видно по метке в поле ввода
    и по галочке при следующем открытии. Пункты, которых модель не умеет, серые с причиной и окно не закрывают.
    Окно строится один раз (без перерисовок): так оно не подлагивает. */
 api.open=c=>{
  icons();
  if(typeof Sx!=='undefined')Sx.icons();
  const s=sheet('<div class="tm-grab"></div><div class="tm"></div>');s.classList.add('tmw');
  const box=$('.tm',s);
  const groups=()=>[
   ['Прикрепить',[
    {i:'img',n:'Фото',h:'Из галереи',run:()=>c.pick('g')},
    {i:'cam',n:'Камера',h:'Снять сейчас',run:()=>c.pick('c')},
    {i:'file',n:'Файл',h:'PDF, текст, таблица',run:()=>c.pick('f')}]],
   ['Создать',[
    {i:'wand',n:'Изображение',h:'Нарисовать по описанию',run:()=>api.set('image'),on:api.mode==='image',off:canImg()?'':'Эта модель не рисует',why:'Эта модель не рисует. Выберите модель с меткой «Картинки»'},
    {i:'search',n:'Глубокое исследование',h:'Отчёт с источниками',run:()=>api.set('deep'),on:api.mode==='deep',off:(canSearch()||api.webKind())?'':'Нужен провайдер поиска',why:'Для исследования подключите провайдера поиска (Настройки) или выберите модель со встроенным поиском'}]],
   ['Режим',[
    {i:'brain',n:'Думать',h:canThink()?'Think есть у модели':'Своего Think нет, просим по шагам',run:()=>api.setThink(api.thinkMode==='think'?'auto':'think'),on:api.thinkMode==='think',tg:1},
    {i:'bolt',n:'Быстрый ответ',h:canThink()?'Без долгих раздумий':'Своего Think нет, просим кратко',run:()=>api.setThink(api.thinkMode==='instant'?'auto':'instant'),on:api.thinkMode==='instant',tg:1},
    {i:'globe',n:'Поиск в интернете',h:'Свежие данные из сети',run:()=>toggleWeb(),on:!!S.web,tg:1,off:canSearch()?'':'Нужен провайдер поиска',why:'Для поиска подключите провайдера поиска (Настройки)'},
    {i:'globe',n:'Поиск модели',h:api.webKind()?'Свой поиск у модели есть':'Своего поиска у модели нет',run:()=>api.setMweb(!api.mwebOn()),on:api.mwebOn(),tg:1,off:api.webKind()?'':'У этой модели нет',why:'У этой модели нет встроенного поиска. Он есть у моделей через OpenRouter, у Claude (Anthropic) и у моделей OpenAI с «search» в названии'}]]];
  const draw=()=>{
   box.innerHTML='';let i=0;
   groups().forEach(([title,tiles])=>{
    const g=el('<div class="tm-g"></div>');g.textContent=L(title);box.append(g);
    const grid=el('<div class="tm-grid"></div>');
    tiles.forEach(x=>{
     const b=el(`<button type="button" class="tm-tile ${x.on?'on':''} ${x.off?'off':''}"><span class="tm-i">${ic(x.i)}</span><span class="tm-n"></span><small class="tm-h"></small>${x.on?`<span class="tm-ck">${ic('ok')}</span>`:''}</button>`);
     $('.tm-n',b).textContent=L(x.n);$('.tm-h',b).textContent=L(x.off||x.h);
     if(x.tg)b.setAttribute('aria-pressed',x.on?'true':'false');
     if(x.off)b.setAttribute('aria-disabled','true');
     b.onclick=()=>{
      if(x.off){toast(L(x.why||x.off));return}
      s.close();setTimeout(x.run,120)};
     grid.append(b)});
    box.append(grid)})};
  draw()};
 /* Параметры для провайдера: 1 думать, -1 быстро, 0 как есть */
 api.think=()=>!canThink()?0:tm()==='think'?1:tm()==='instant'?-1:0;
 api.sysx=last=>{let s='';
  if(last&&last.deep)s+='\n\nDeep research mode. Write a thorough, well-structured report in the language of the question, 500-900 words: a title (#), a 2-3 sentence summary, sections with ## headings, key findings in **bold**, a comparison table when it helps (follow the table rules), a short conclusion, and a section "Что осталось неясным" (or "Open questions" in English) for gaps and conflicts between sources. Use ONLY facts from the provided search results (or from your own web search) and cite them as [1], [2]; never invent sources, numbers or quotes. If the sources disagree or are weak, say so. Be specific and avoid filler.';
  if(tm()==='think')s+='\n\nThink carefully and reason step by step before giving the final answer.';
  if(tm()==='instant')s+='\n\nInstant mode: answer right away and concisely, without long reasoning.';
  return s};
 /* Размышления модели (приходят отдельно от ответа) */
 /* Размышления показываются шагами, как у Claude: заголовок каждого абзаца («Разбор списка пунктов из запроса»), полный текст по нажатию.
    Заголовок берётся из **жирной строки** или «# заголовка» в начале абзаца, иначе это первая фраза абзаца (до 70 символов). Модель не вызывается. */
 api.steps=text=>{
  const paras=String(text||'').split(/\n\s*\n/).map(x=>x.trim()).filter(Boolean),out=[];
  for(const p of paras){
   let title='',body=p,m=p.match(/^(?:\*\*|__)(.{3,90}?)(?:\*\*|__)\s*(?:\n|$)/)||p.match(/^#{1,4}\s+(.{3,90}?)\s*(?:\n|$)/);
   if(m){title=m[1];body=p.slice(m[0].length).trim()}
   else{const f=p.replace(/\s+/g,' ').match(/^(.{12,70}?)(?:[.!?:;]\s|$)/);title=f?f[1]:p.replace(/\s+/g,' ').slice(0,70);if(title.length>=70)title=title.replace(/\s+\S*$/,'')+'…'}
   title=title.replace(/[*_`#]+/g,'').replace(/[.:;,\s]+$/,'').trim();if(!title)continue;
   if(out.length&&!m&&p.length<20){out[out.length-1].body+='\n\n'+p;continue}
   out.push({t:title,b:body===p&&!m?p:body})}
  return out};
 api.thought=(d,m,t)=>{
  let e=d._th;
  if(!e){e=el(`<details class="think"><summary><span class="tk-sp"></span><span class="tk-t">${L('Думает…')}</span><span class="tk-s"></span><span class="tk-n"></span></summary><div class="tbody"></div></details>`);d.insertBefore(e,$('.bd',d));d._th=e;m.thinkOpen=m.thinkOpen||{}}
  m.think=(m.think||'')+t;
  if(!e._drawn){e._drawn=1;api.drawThink(d,m);return}
  if(e._raf)return;
  e._raf=requestAnimationFrame(()=>{e._raf=0;api.drawThink(d,m)})};
 api.drawThink=(d,m)=>{
  const e=d._th;if(!e)return;const st=api.steps(m.think),tb=$('.tbody',e),op=m.thinkOpen=m.thinkOpen||{};
  const last=st[st.length-1];
  $('.tk-s',e).textContent=last?last.t:'';
  $('.tk-n',e).textContent=st.length+' '+L('шагов')+' · '+m.think.length+' '+L('симв.');
  /* перерисовываем только список: открытые шаги запоминаем по номеру */
  tb.textContent='';
  st.forEach((x,i)=>{const r=el('<div class="tk-st"><button type="button" class="tk-h"><i class="tk-d"></i><span></span></button><div class="tk-b"></div></div>');
   $('.tk-h span',r).textContent=x.t;const bd=$('.tk-b',r);bd.textContent=x.b;
   const cur=i===st.length-1&&!e._done;if(cur)r.classList.add('cur');
   if(op[i])r.classList.add('open');
   $('.tk-h',r).onclick=ev=>{ev.preventDefault();op[i]=!op[i];r.classList.toggle('open',!!op[i])};
   if(!x.b||x.b===x.t)r.classList.add('nob');
   tb.append(r)});
  if(e.open)tb.scrollTop=1e6;
  const b=d.parentNode;if(b&&b._stk!==false&&!b._tch&&b.scrollHeight-b.scrollTop-b.clientHeight<160)b.scrollTop=1e6};
 api.thoughtDone=d=>{const e=d._th;if(!e)return;e._done=true;e.open=false;$('.tk-t',e).textContent=L('Размышления');e.classList.add('done');$$('.tk-st.cur',e).forEach(x=>x.classList.remove('cur'))};
 /* ---- Встроенный поиск модели (у провайдера свой интернет-поиск) ----
    or: OpenRouter, плагин web (подходит любой модели OpenRouter); anthropic: инструмент web_search у Claude; oai: модели OpenAI *search*.
    Определяется по адресу и названию модели. Реальные запросы уходят в Kotlin (поля web, webmax у провайдера). */
 api.webKind=pv=>{pv=pv||actProv();if(!pv)return'';const u=String(pv.url||''),m=String(pv.model||'').toLowerCase();
  if(/openrouter\.ai/.test(u))return'or';
  if(/anthropic\.com/.test(u))return'anthropic';
  if(/api\.openai\.com/.test(u)&&/search/.test(m))return'oai';
  return''};
 api.mwebOn=()=>{let v='';try{v=st.get('kmweb')}catch(e){}return v==='1'&&!!api.webKind()};
 api.setMweb=on=>{try{st.set('kmweb',on?'1':'0')}catch(e){}repaint()};
 /* Параметры встроенного поиска для запроса к провайдеру: при включённой кнопке или когда исследование идёт без провайдера поиска */
 api.webArg=force=>{const k=api.webKind();return k&&(force||api.mwebOn())?{web:k,webmax:force?8:3}:{}};
 /* ---- Глубокое исследование ----
    1) план запросов (модель, до 20 с; иначе запросы строятся сами), 2) поиск параллельно по 3, источники чередуются и без повторов,
    3) отчёт по источникам. Без провайдера поиска ищет сама модель (если у неё есть встроенный поиск).
    Ход показан списком шагов, «Стоп» работает на любом шаге (window.GEN создаётся здесь). Возвращает {src,serr,native,stopped}. */
 api.research=async(pv,sp,question,bd)=>{
  const STEPS=[['plan','Планирую запросы'],['search','Ищу в интернете'],['pick','Отбираю источники'],['write','Пишу отчёт']];
  bd.textContent='';bd.classList.remove('md');
  const ui=el('<div class="dr"></div>'),row={};
  STEPS.forEach(([k,t])=>{const r=el('<div class="dr-s"><i></i><b></b><small></small></div>');$('b',r).textContent=L(t);ui.append(r);row[k]=r});
  bd.append(ui);
  const mark=(k,state,detail)=>{const r=row[k];if(!r)return;r.className='dr-s '+state;if(detail!=null)$('small',r).textContent=detail};
  const prs=[];const G=window.GEN={stopped:0,pr:null,stop(){this.stopped=1;prs.forEach(p=>{try{Native.cancel(p&&p.id)}catch(e){}})}};
  if(Chat.cmp&&Chat.cmp.upd)Chat.cmp.upd();
  const stop=()=>!!(window.GEN&&window.GEN.stopped);
  const track=pr=>{prs.push(pr);return pr};
  const lim=(pr,ms)=>new Promise((res,rej)=>{const t=setTimeout(()=>{try{Native.cancel(pr&&pr.id)}catch(e){}rej(new Error('timeout'))},ms);pr.then(v=>{clearTimeout(t);res(v)},e=>{clearTimeout(t);rej(e)})});
  const native=!sp&&!!api.webKind(pv);
  if(!sp&&!native){
   [...STEPS].forEach(([k])=>mark(k,'bad'));
   return{src:[],serr:'для исследования нужен провайдер поиска (Tavily, Brave, Serper, Exa, You.com, Firecrawl) или модель со встроенным поиском (OpenRouter, Claude)',native:false}}
  const yr=new Date().getFullYear(),q0=question.replace(/\s+/g,' ').trim().slice(0,240);
  let qs=[];
  if(native){mark('plan','done','');mark('search','active',L('Модель ищет сама'));mark('pick','pending','')}
  else{
   mark('plan','active','');
   try{let raw='';
    const pr=track(Native.run('chat',[JSON.stringify({id:pv.id,url:pv.url,model:pv.model,think:-1,system:'Return ONLY a JSON array of 4 to 6 short, diverse web search queries (strings) in the language of the question that together cover it from different angles (facts, numbers, comparison, recent news). No explanations, no markdown.'}),JSON.stringify([{role:'user',content:q0}])],t=>{if(t.charCodeAt(0)>2)raw+=t}));
    await lim(pr,20000);
    const a=raw.match(/\[[\s\S]*\]/);if(a)qs=JSON.parse(a[0]).filter(x=>typeof x==='string'&&x.trim().length>2).map(x=>x.trim().slice(0,200)).slice(0,6)}catch(e){}
   if(stop())return{src:[],serr:'',stopped:true};
   const base=[q0,q0+(LANG==='en'?' overview':' обзор'),q0+(LANG==='en'?' comparison':' сравнение'),q0+' '+yr];
   const seenQ=new Set();qs=[...qs,...base].filter(x=>{const k=x.toLowerCase();if(seenQ.has(k))return false;seenQ.add(k);return true}).slice(0,Math.max(4,Math.min(qs.length,6)));
   mark('plan','done',qs.length+' '+L('запросов'));
  }
  const lists=[];let serr='',okN=0,doneN=0;
  if(!native){
   mark('search','active','0/'+qs.length);
   const one=async q=>{
    try{let raw='';const pr=track(Native.run('search',[JSON.stringify({id:sp.id,url:sp.url,deep:true}),q.slice(0,300)],t=>{raw+=t}));
     await lim(pr,15000);const l=JSON.parse(raw||'[]');if(Array.isArray(l)){lists.push(l);okN++}}
    catch(e){if(!stop())serr=e.message||'ошибка поиска'}
    doneN++;mark('search','active',doneN+'/'+qs.length)};
   const q=qs.slice();const worker=async()=>{while(q.length&&!stop()){await one(q.shift())}};
   await Promise.all([worker(),worker(),worker()]);
   if(stop())return{src:[],serr:'',stopped:true};
   mark('search',okN?'done':'bad',okN+'/'+qs.length);
  }
  /* Источники: чередуем результаты разных запросов, повторы по адресу убираем */
  mark('pick','active','');
  const seen=new Set(),src=[];
  for(let i=0;src.length<12;i++){let any=false;for(const l of lists){const s=l[i];if(!s)continue;any=true;const k=String(s.url||'').replace(/[#?].*$/,'').replace(/\/$/,'');if(s.url&&!seen.has(k)){seen.add(k);src.push(s)}if(src.length>=12)break}if(!any)break}
  mark('pick',native||src.length?'done':'bad',native?'':src.length+' '+L('источников'));
  mark('write','active','');
  return{src,serr:native||src.length?'':(serr||'поиск не вернул результатов'),native}};
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
  if(!canImg()){toast('Эта модель не создаёт изображения. Выберите модель с меткой «Картинки»');return}
  const model=pv.model;
  const m={r:'a',t:prompt};ch.msgs.push(m);
  const d=msgEl(m,1);box.append(d);const bd=$('.bd',d);bd.innerHTML=`<span class="imgload"><i></i>${L('Создаю изображение…')}</span>`;scr(box);
  try{let raw='';await Native.run('image',[JSON.stringify({id:pv.id,url:pv.url,model}),prompt],t=>{raw+=t});
   m.img=JSON.parse(raw);api.paintImg(d,m);Hooks.run('chat:answer',m,bd)}
  catch(e){m.err=1;m.t=bd.textContent=L('Не удалось создать изображение: ')+e.message}
  scr(box)};
 api.paintImg=(d,m)=>{
  if(!m.img)return;
  if(!m.img.b64&&m.img.path)m.img.b64=Media.load(m.img.path);
  const bd=$('.bd',d);bd.textContent='';bd.classList.add('imgmsg');
  const im=new Image();im.className='genimg';im.alt=m.t||'';im.decoding='async';im.src='data:'+m.img.mime+';base64,'+m.img.b64;bd.append(im);
  if(typeof Sx!=='undefined')Sx.icons();
  const row=el(`<div class="img-act"><button type="button" data-s>${ic('dwn')}<span>${L('Сохранить')}</span></button><button type="button" data-h>${ic('shr')}<span>${L('Поделиться')}</span></button></div>`);
  const ext=(m.img.mime.split('/')[1]||'png').replace('jpeg','jpg'),name='kairema_'+Date.now()+'.'+ext;
  $('[data-s]',row).onclick=()=>{const ok=Native.sync('saveImage',name,m.img.mime,m.img.b64);toast(ok?L('Сохранено в «Загрузки»'):'Не удалось сохранить')};
  $('[data-h]',row).onclick=()=>Native.sync('shareImage',name,m.img.mime,m.img.b64);
  bd.append(row)};
 Hooks.on('msg:render',(d,m)=>{if(m.img)api.paintImg(d,m)});
 return api})();
