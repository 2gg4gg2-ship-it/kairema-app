/* ===== ГОТОВЫЕ СЕРВИСЫ: выбрал в списке, адрес (API URL) подставился сам =====
   В форме нового провайдера (чат или поиск) сверху список сервисов. Нажатие подставляет название и адрес, поле адреса скрывается.
   «Другой сервис» открывает поле адреса для ручного ввода. Ключ нужен всегда, адрес нужен только для «другого» сервиса.
   Список PRESETS_AI / PRESETS_SEARCH правится здесь: {id, n название, u адрес, k где взять ключ, t подсказка}.
   Адреса сверены с документацией сервисов (ZenMux, CometAPI, TeamoRouter, BazaarLink, Kimi, You.com, Exa), остальные общеизвестные.
   Сервисы, чьи адреса не удалось проверить (GoRouter, NaraRouter, Token Harbor, Keirolabs, Haimarker), берутся как «Другой сервис».
   Убрать: удалить папку features/presets и строки в index.html (формы вернутся к ручному вводу адреса). Тест: docs/tests/presets030.test.py */
i18nAdd({"Сервис":"Service","Другой сервис":"Other service","Адрес подставлен":"Address filled in","Ключ можно получить":"Get a key at","Укажите адрес сервиса из личного кабинета. Он обычно заканчивается на /v1":"Enter the service address from its dashboard. It usually ends with /v1","Выберите сервис из списка: адрес вписывать не нужно":"Pick a service from the list: no address needed","Для поиска выберите сервис":"Pick a search service"});
const PRESETS_AI=[
 {id:'openrouter',n:'OpenRouter',u:'https://openrouter.ai/api/v1',k:'openrouter.ai/keys',t:'Много моделей, есть бесплатные'},
 {id:'openai',n:'OpenAI',u:'https://api.openai.com/v1',k:'platform.openai.com/api-keys'},
 {id:'anthropic',n:'Anthropic (Claude)',u:'https://api.anthropic.com',k:'console.anthropic.com'},
 {id:'google',n:'Google Gemini',u:'https://generativelanguage.googleapis.com/v1beta/openai',k:'aistudio.google.com/apikey',t:'Есть бесплатный лимит'},
 {id:'deepseek',n:'DeepSeek',u:'https://api.deepseek.com',k:'platform.deepseek.com'},
 {id:'kimi',n:'Kimi (Moonshot)',u:'https://api.moonshot.ai/v1',k:'platform.kimi.ai'},
 {id:'groq',n:'Groq',u:'https://api.groq.com/openai/v1',k:'console.groq.com/keys',t:'Очень быстрый, есть бесплатный лимит'},
 {id:'sambanova',n:'SambaNova',u:'https://api.sambanova.ai/v1',k:'cloud.sambanova.ai'},
 {id:'cerebras',n:'Cerebras',u:'https://api.cerebras.ai/v1',k:'cloud.cerebras.ai'},
 {id:'together',n:'Together AI',u:'https://api.together.xyz/v1',k:'api.together.ai'},
 {id:'mistral',n:'Mistral',u:'https://api.mistral.ai/v1',k:'console.mistral.ai'},
 {id:'codestral',n:'Mistral Codestral',u:'https://codestral.mistral.ai/v1',k:'console.mistral.ai',t:'Для кода, отдельный ключ Codestral'},
 {id:'xai',n:'xAI (Grok)',u:'https://api.x.ai/v1',k:'console.x.ai'},
 {id:'comet',n:'CometAPI',u:'https://api.cometapi.com/v1',k:'cometapi.com'},
 {id:'zenmux',n:'ZenMux',u:'https://zenmux.ai/api/v1',k:'zenmux.ai'},
 {id:'teamo',n:'TeamoRouter',u:'https://api.teamorouter.com/v1',k:'teamorouter.com'},
 {id:'bazaar',n:'BazaarLink',u:'https://api.bazaarlink.ai/v1',k:'bazaarlink.ai'},
 {id:'tokenharbor',n:'Token Harbor',u:'https://tokenharbor.ai/v1',k:'tokenharbor.ai'},
 {id:'nara',n:'NaraRouter',u:'https://router.bynara.id/v1',k:'router.bynara.id',t:'Ключи начинаются с sk-nry-'},
 {id:'haimaker',n:'Haimaker',u:'https://api.haimaker.ai/v1',k:'haimaker.ai'},
 {id:'keiro',n:'Keiro (модели)',u:'https://api.keirolabs.ai/v1',k:'keirolabs.ai'},
 {id:'gurouter',n:'GoRouter',u:'https://api.gurouter.com/v1',k:'gurouter.com',t:'Адрес не подтверждён: если не работает, «Другой сервис» и адрес из docs.gurouter.com'}];
const PRESETS_SEARCH=[
 {id:'tavily',n:'Tavily',u:'https://api.tavily.com/search',k:'app.tavily.com',t:'Лучший для ИИ, есть бесплатный лимит'},
 {id:'brave',n:'Brave Search',u:'https://api.search.brave.com/res/v1/web/search',k:'brave.com/search/api'},
 {id:'serper',n:'Serper',u:'https://google.serper.dev/search',k:'serper.dev',t:'Результаты Google'},
 {id:'exa',n:'Exa',u:'https://api.exa.ai/search',k:'dashboard.exa.ai'},
 {id:'you',n:'You.com',u:'https://ydc-index.io/v1/search',k:'you.com/platform'},
 {id:'firecrawl',n:'Firecrawl',u:'https://api.firecrawl.dev/v1/search',k:'firecrawl.dev'},
 {id:'keirosearch',n:'Keiro (поиск)',u:'https://api.keirolabs.cloud/api/v2/search/lite',k:'keirolabs.cloud',t:'Есть дневной лимит без ключа'}];
const Presets=(()=>{
 const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
 const set=(inp,v)=>{inp.value=v;inp.dispatchEvent(new Event('input',{bubbles:true}))};
 const byUrl=(kind,u)=>(kind==='search'?PRESETS_SEARCH:PRESETS_AI).find(p=>p.u===String(u||'').trim());
 /* Вставляет выбор сервиса в начало формы b. kind: 'chat' или 'search'. */
 function mount(b,kind){
  const list=kind==='search'?PRESETS_SEARCH:PRESETS_AI;
  const nm=$('[data-k=name]',b),ur=$('[data-k=url]',b);if(!nm||!ur)return;
  const uf=ur.closest('.fld'),first=$('.fld',b);
  const w=mk('div','pre');
  w.append(mk('label','pre-l',L('Сервис')));
  const chips=mk('div','pre-c');w.append(chips);
  const info=mk('p','pre-i');w.append(info);
  let autoName='';
  const pick=p=>{
   $$('.pre-b',chips).forEach(x=>x.classList.toggle('on',x.dataset.id===(p?p.id:'')));
   if(p){
    if(!nm.value.trim()||nm.value===autoName){set(nm,p.n);autoName=p.n}
    set(ur,p.u);uf.hidden=true;
    info.textContent='';info.append(mk('b','',L('Адрес подставлен')),document.createTextNode(': '+p.u.replace(/^https?:\/\//,'')+(p.t?' · '+L(p.t):'')+' · '+L('Ключ можно получить')+': '+p.k))}
   else{set(ur,'');uf.hidden=false;info.textContent=L('Укажите адрес сервиса из личного кабинета. Он обычно заканчивается на /v1');ur.focus()}};
  list.forEach(p=>{const x=mk('button','pre-b',p.n);x.type='button';x.dataset.id=p.id;x.onclick=()=>pick(p);chips.append(x)});
  const o=mk('button','pre-b other',L('Другой сервис'));o.type='button';o.dataset.id='';o.onclick=()=>pick(null);chips.append(o);
  info.textContent=L(kind==='search'?'Для поиска выберите сервис':'Выберите сервис из списка: адрес вписывать не нужно');
  first.before(w);
  /* Пока ничего не выбрано, поле адреса скрыто: оно нужно только для «другого» сервиса */
  uf.hidden=true;return w}
 return{mount,byUrl,ai:PRESETS_AI,search:PRESETS_SEARCH}})();
