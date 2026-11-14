/* ===== ВОЗМОЖНОСТИ МОДЕЛЕЙ: что умеет выбранная модель (авто-определение) =====
   Источник 1: данные провайдера (OpenRouter сообщает выходные форматы и параметр reasoning), приходят вместе со списком моделей.
   Источник 2: эвристика по имени модели, если провайдер ничего не сообщил (OpenAI, Anthropic, свои адреса).
   Что узнали, запоминается в localStorage (kairema.mcaps.v1), чтобы меню «+» знало возможности и без запроса списка.
   API: Caps.learn(providerId,list), Caps.think(p), Caps.image(p).
   Убрать модуль: удалить папку и строку в index.html, в tools.js проверки Caps защищены typeof. */
const Caps=(()=>{
 const KEY='kairema.mcaps.v1';
 let db={};try{db=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){db={}}
 const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(db))}catch(e){}};
 const THINK=/(^|[\/:\-_ ])(o[1-9](-|$)|r1|qwq|qvq)|reason|think|gpt-5|deepseek-r|claude-(3-7|3\.7|(opus|sonnet|haiku)-[4-9]|[4-9])|gemini-(2\.5|[3-9])|grok-(3-mini|[4-9])|magistral|kimi-k2|glm-4\.[5-9]|glm-[5-9]|minimax-m[1-9]|qwen3|hunyuan-t1/i;
 const IMG=/image|dall-e|imagen|flux|stable-diffusion|sdxl|sd3|midjourney|nano-banana|seedream|ideogram|recraft|cogview/i;
 const VIS=/gpt-4o|gpt-4\.1|gpt-5|gpt-4-turbo|claude|gemini|vision|[-_]vl\b|llava|pixtral|qwen.*vl|llama-3\.2.*(11|90)b|llama-4|grok-(2-vision|4)|mistral-(small|medium)-3|gemma-3|nova-(lite|pro|premier)|internvl|minicpm-v/i;
 const NOTCHAT=/embed|whisper|tts|moderation|rerank/i;
 const api={};
 api.learn=(pid,list)=>{
  if(!pid||!Array.isArray(list))return;
  if(typeof Cost!=='undefined')Cost.learn(pid,list);
  const r={img:[],think:[],vis:[],ki:0,kt:0};
  list.forEach(m=>{
   if(m.vis)r.vis.push(m.id);
   if(typeof m.img==='boolean'){r.ki=1;if(m.img)r.img.push(m.id)}
   if(typeof m.think==='boolean'){r.kt=1;if(m.think)r.think.push(m.id)}});
  if(!r.ki&&!r.kt){/* провайдер ничего не сообщил: эвристика по именам */
   list.forEach(m=>{if(IMG.test(m.id)&&!NOTCHAT.test(m.id))r.img.push(m.id)})}
  db[pid]=r;save()};
 const rec=p=>(p&&db[p.id])||null;
 /* Умеет ли выбранная модель размышлять (Thinking / Instant) */
 api.think=p=>{
  if(!p||!p.model)return false;
  const r=rec(p);
  if(r&&r.kt)return r.think.includes(p.model);
  return THINK.test(p.model)&&!NOTCHAT.test(p.model)&&!IMG.test(p.model)};
 /* Есть ли у провайдера модель для картинок */
 /* Возможности одной модели из списка: true или false. Данные провайдера точнее имени; имя используется, когда провайдер молчит. */
 api.of=m=>{
  const id=String(m.id||''),chat=!NOTCHAT.test(id);
  return{
   img:typeof m.img==='boolean'?m.img:(IMG.test(id)&&chat),
   think:typeof m.think==='boolean'?m.think:(THINK.test(id)&&chat&&!IMG.test(id)),
   vis:typeof m.vis==='boolean'?m.vis:(VIS.test(id)&&chat&&!IMG.test(id))}};
 api.image=p=>{
  if(!p||/anthropic\.com/.test(p.url||''))return false;
  if(p.imgModel)return true;
  const r=rec(p);
  if(r&&(r.ki||r.img.length))return r.img.length>0;
  if(r)return false;
  return /openrouter\.ai|openai\.com/.test(p.url||'')};
 return api})();
