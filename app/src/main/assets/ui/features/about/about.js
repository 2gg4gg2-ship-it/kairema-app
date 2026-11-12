/* ===== О ПРИЛОЖЕНИИ: логотип, версия, карточки возможностей =====
   Модуль подменяет экран 'about' (SCREENS.about) после запуска приложения: core/app.js не правится.
   Убрать модуль: удалить папку features/about и её строки в index.html, вернётся простой текстовый экран. */
i18nAdd({"Персональный ИИ-ассистент":"Personal AI assistant","Для общения, обучения, работы и решения повседневных задач. Отвечает на вопросы, помогает разобраться в сложном, писать тексты и код, находить идеи.":"For conversation, learning, work and everyday tasks. Answers questions, helps with complex topics, writing and code, and finding ideas.","Возможности":"Features","Свой провайдер":"Your own provider","OpenAI-совместимые API и Anthropic. Ключи хранятся в Keystore.":"OpenAI-compatible APIs and Anthropic. Keys are kept in Keystore.","Терминал":"Terminal","Android и Termux. Команды из ответов ИИ запускаются в один тап.":"Android and Termux. Commands from AI answers run in one tap.","Память":"Memory","Факты о вас сохраняются на устройстве и учитываются в ответах.":"Facts about you are kept on the device and used in answers.","Поиск в сети":"Web search","Tavily, Brave Search и Serper дополняют вопрос свежими данными.":"Tavily, Brave Search and Serper add fresh data to your question.","О проекте":"About","Версия":"Version","Разработчик":"Developer","Ключи API":"API keys","Только на этом устройстве":"Only on this device","Наша цель — создать удобного, быстрого и доступного ИИ-ассистента, который даёт пользователю больше возможностей и контроля.":"Our goal is to build a convenient, fast and accessible AI assistant that gives users more possibilities and control."});
function aboutScreen(){
 return page('about','О приложении',b=>{
  const feats=[['api','Свой провайдер','OpenAI-совместимые API и Anthropic. Ключи хранятся в Keystore.'],['term','Терминал','Android и Termux. Команды из ответов ИИ запускаются в один тап.'],['brain','Память','Факты о вас сохраняются на устройстве и учитываются в ответах.'],['globe','Поиск в сети','Tavily, Brave Search и Serper дополняют вопрос свежими данными.']];
  b.innerHTML=`<div class="abt">
   <div class="abt-hero"><svg class="abt-logo" viewBox="0 0 96 96" fill="none" stroke="currentColor" stroke-width="5" stroke-linecap="round"><path class="rg" pathLength="1" d="M70 22 A34 34 0 1 0 82 48"/><circle class="ey" cx="48" cy="48" r="9" fill="currentColor" stroke="none"/></svg>
    <h2 class="abt-name">Kairema <span>AI</span></h2><p class="abt-tag">Персональный ИИ-ассистент</p><span class="abt-ver"></span></div>
   <p class="abt-lead">Для общения, обучения, работы и решения повседневных задач. Отвечает на вопросы, помогает разобраться в сложном, писать тексты и код, находить идеи.</p>
   <div class="sh abt-sh">Возможности</div>
   <div class="abt-grid">${feats.map((f,i)=>`<div class="abt-card" style="--i:${i}"><span class="abt-ic">${ic(f[0])}</span><b>${f[1]}</b><small>${f[2]}</small></div>`).join('')}</div>
   <div class="sh abt-sh">О проекте</div>
   <div class="abt-list">
    <div class="abt-row" style="--i:0"><span>Версия</span><b class="abt-v"></b></div>
    <div class="abt-row" style="--i:1"><span>Разработчик</span><b>Kairema AI Team</b></div>
    <div class="abt-row" style="--i:2"><span>Ключи API</span><b>Только на этом устройстве</b></div>
   </div>
   <p class="abt-goal">Наша цель — создать удобного, быстрого и доступного ИИ-ассистента, который даёт пользователю больше возможностей и контроля.</p></div>`;
  const v=(LANG==='en'?'Version ':'Версия ')+APP_VERSION;
  $('.abt-ver',b).textContent=v;$('.abt-v',b).textContent=APP_VERSION})}
Hooks.on('app:ready',()=>{SCREENS.about=aboutScreen});
