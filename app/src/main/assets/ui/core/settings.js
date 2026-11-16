/* core/settings.js: ПРОВАЙДЕРЫ, ПАМЯТЬ, ШАБЛОНЫ, ПРОФИЛЬ, НАСТРОЙКИ, ВКЛАДКИ. Часть бывшего большого app.js (разрезан в 0.28.0 без смены поведения; порядок подключения в index.html важен). */
/* ===== ТЕРМИНАЛ: модуль features/terminal (вкладка рисуется функцией termView) ===== */
/* ===== НАСТРОЙКИ: провайдеры ===== */
function provPage(){return page('providers','Мои провайдеры',(b,d)=>{
 b.innerHTML='';
 const sec=(ttl,arr,kind)=>{b.insertAdjacentHTML('beforeend',`<div class="lbl" style="margin-top:${b.children.length?20:4}px">${ttl}</div>`);if(!arr.length)b.insertAdjacentHTML('beforeend','<p class="hint" style="margin:0 4px 10px">Пока нет подключённых.</p>');
  arr.forEach((p,i)=>{const c=el(`<div class="card pv in" style="--i:${i}"><span class="m"><b></b><small></small><span class="stat"></span></span><button class="cb" data-e aria-label="Редактировать">${ic('edit')}</button><button class="cb" data-d aria-label="Удалить">${ic('trash')}</button></div>`);$('b',c).textContent=p.name;$('small',c).textContent=kind==='chat'?p.model:p.url;const s=$('.stat',c);s.classList.add(p.ok?'ok':'bad');s.textContent=p.ok?'✓ Подключено':'✗ Ошибка';
   $('[data-e]',c).onclick=()=>provForm(i,()=>d.r(),kind);$('[data-d]',c).onclick=()=>ask('Удалить провайдера?','Ключ будет удалён с устройства.','Удалить',()=>{Native.deleteKey(p.id);arr.splice(i,1);saveProviders();d.r();toast('Провайдер удалён')});b.append(c)})};
 sec('Провайдеры ИИ',S.providers,'chat');sec('Провайдеры поиска в сети',S.sproviders,'search');
 b.insertAdjacentHTML('beforeend','<button class="btn big" data-a1>Добавить обычного провайдера</button><button class="btn ghost big" data-a2 style="margin-top:10px">Добавить провайдера поиска в сети</button>');
 $('[data-a1]',b).onclick=()=>provForm(-1,()=>d.r(),'chat');$('[data-a2]',b).onclick=()=>provForm(-1,()=>d.r(),'search')})}
function provForm(i,done,kind='chat'){if(kind==='chat')return chatProvForm(i,done);const ch=kind==='chat',arr=ch?S.providers:S.sproviders,e=arr[i]||{};const d=page('provider-form',i<0?(ch?'Новый провайдер':'Новый провайдер поиска'):'Провайдер',(b)=>{
 b.innerHTML=(ch?fld('Название','name',e.name,'Минимум 2 символа','text','Например, MyProvider')+fld('Модель','model',e.model,'Укажите модель','text','gpt-4o')+fld('API URL','url',e.url,'Адрес вида https://api.example.com/v1','url','https://api.example.com/v1'):fld('Название провайдера','name',e.name,'Минимум 2 символа','text','Например, Tavily')+fld('API URL для поиска','url',e.url,'Адрес вида https://api.tavily.com/search','url','https://api.tavily.com/search'))+fld('API Key','key','','Минимум 8 символов','password',i<0?'sk-…':'••••••••')+(ch?'':'<p style="font-size:12px;opacity:.65;margin:4px 2px 12px">Поддерживаются: Tavily (https://api.tavily.com/search), Brave Search (https://api.search.brave.com/res/v1/web/search), Serper (https://google.serper.dev/search).</p>')+`<div class="stat"></div><button class="btn" data-s style="width:100%">Проверить и сохранить</button>`;
 const sv=$('[data-s]',b),stt=$('.stat',b),R={name:v=>v.length>=2,url:v=>/^https?:\/\/[^\s.]+\.[^\s]+$/.test(v),key:v=>v.length>=8||(i>=0&&!v)};if(ch)R.model=v=>v.length>0;form(b,R,sv);
 sv.onclick=async()=>{const g=k=>$(`[data-k=${k}]`,b).value.trim();sv.disabled=true;sv.innerHTML='<span class="spin"></span>Проверяем…';stt.className='stat';stt.textContent='';const id=e.id||pid(),kv=g('key');if(kv)Native.saveKey(id,kv);let err='';
 if(!Native.on){await wait(1200);err=/bad|fail/i.test(kv)?'ошибка (ключ отклонён, 401)':''}
 else{try{await(ch?Native.run('verify',[JSON.stringify({id,url:g('url'),model:g('model')})]):Native.run('search',[JSON.stringify({id,url:g('url')}),'test'],()=>{}))}catch(x){err=x.message}}
  const bad=!!err,p=ch?{id,name:g('name'),model:g('model'),url:g('url'),ok:!bad}:{id,name:g('name'),url:g('url'),ok:!bad};if(i<0){if(bad)Native.deleteKey(id);else arr.push(p)}else arr[i]=p;saveProviders();
  stt.className='stat '+(bad?'bad':'ok');stt.textContent=bad?'✗ '+err:'✓ Подключено';sv.innerHTML='Проверить и сохранить';sv.disabled=false;done();toast(bad?(i<0?'Ключ не принят, провайдер не сохранён':'Провайдер сохранён с ошибкой'):'Провайдер подключён');if(!bad)setTimeout(()=>d.close(),900)}})}
/* ===== ПАМЯТЬ ===== */
function autoFact(t,src){if(typeof Mem!=='undefined'&&Mem.local)return Mem.local(t,src);if(!S.mem||!S.auto||!t)return;const m=t.match(/(меня зовут|мне нравится|my name is|i like)\s+[^.!?\n]+/i);if(m&&!S.memos.some(x=>x[0]===m[0])){S.memos.push([m[0],src?'Чат «'+src+'»':'']);Hooks.run('memory:changed');toast('Факт добавлен в память')}}
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
 <div class="sh">Список сохранённых фактов:</div><div class="ml"></div><button class="addf" data-add>${ic('plus')}Добавить новый факт</button><button class="addf dng" data-clr>${ic('trash')}Удалить все факты</button>`;
 [...b.children].forEach((c,k)=>c.style.setProperty('--i',k));
 const nEl=$('[data-n]',b),sEl=$('[data-s]',b),ml=$('.ml',b);
 const stat=bump=>{nEl.textContent=String(S.memos.length).padStart(2,'0');sEl.textContent=S.mem?'Вкл':'Выкл';sEl.classList.toggle('on',S.mem);if(bump){nEl.classList.add('bump');setTimeout(()=>nEl.classList.remove('bump'),260)}};
 $$('[data-t]',b).forEach(e=>e.onclick=()=>{const k=e.dataset.t;S[k]=!S[k];Hooks.run('memory:changed');$('.sw',e).classList.toggle('on',S[k]);stat();toast(k==='mem'?(S.mem?'Память включена':'Память выключена'):(S.auto?'Автоматическое добавление включено':'Автоматическое добавление выключено'))});
 const ta=$('.ta',b),mp=$('.mp',b);ta.value=S.profD===null?S.prof:S.profD;ta.oninput=()=>S.profD=ta.value;
 $('[data-sv]',b).onclick=()=>{S.prof=ta.value.trim();S.profD=S.prof;ta.value=S.prof;mp.classList.remove('ok');void mp.offsetWidth;mp.classList.add('ok');toast('Профиль памяти сохранён')};
 $('[data-cn]',b).onclick=()=>{S.profD=S.prof;ta.value=S.prof};
 const clr=$('[data-clr]',b);const facts=(fl,init)=>{ml.innerHTML='';clr.style.display=S.memos.length?'':'none';if(!S.memos.length)ml.innerHTML='<p class="hint" style="margin:0 4px 10px">Сохранённых фактов пока нет.</p>';
  S.memos.forEach((x,i)=>{const r=el(`<div class="ft ${init?'in':''} ${i===fl?'fl':''}" style="--i:${i}"><span class="n">${String(i+1).padStart(2,'0')}</span><p></p><div class="fa2"><button class="fbtn" data-e data-action="memory:edit">${ic('edit')}Редактировать</button><button class="fbtn fdel" data-d data-action="memory:delete">${ic('trash')}Удалить</button></div></div>`);$('p',r).textContent=x[0];if(x[1]){const s=document.createElement('small');s.textContent=x[1];$('p',r).after(s)}
   $('[data-e]',r).onclick=()=>factSheet(x[0],v=>{x[0]=v;Hooks.run('memory:changed');facts(i);toast('Факт обновлён')});
   $('[data-d]',r).onclick=()=>ask('Удалить факт?','Факт будет удалён из памяти без возможности восстановления.','Удалить',()=>{r.style.maxHeight=r.offsetHeight+'px';void r.offsetHeight;r.classList.add('rm');setTimeout(()=>{S.memos.splice(S.memos.indexOf(x),1);Hooks.run('memory:changed');facts();stat(1);toast('Факт удалён')},320)});ml.append(r)})};
 clr.onclick=()=>ask('Удалить все факты?','Все сохранённые факты (' +S.memos.length+') будут удалены без возможности восстановления.','Удалить всё',()=>{S.memos.length=0;Hooks.run('memory:changed');facts();stat(1);toast('Все факты удалены')});
 $('[data-add]',b).onclick=()=>factSheet(null,v=>{S.memos.push([v,'']);Hooks.run('memory:changed');facts(S.memos.length-1);stat(1);ml.lastElementChild?.scrollIntoView({behavior:'smooth',block:'nearest'});toast('Факт добавлен')});
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
function aboutPage(){page('about','О приложении',b=>{b.innerHTML=`<div class="ab"><h2>О Kairema AI</h2><p>Kairema AI — персональный ИИ-ассистент для общения, обучения, работы и решения повседневных задач.</p><p>Приложение помогает получать ответы на вопросы, разбираться в сложных темах, писать и редактировать тексты, работать с кодом и находить новые идеи.</p><p>Kairema AI объединяет возможности искусственного интеллекта в одном удобном интерфейсе. Пользователь может подключать собственных AI-провайдеров, вести диалоги и настраивать приложение под свои потребности.</p><p>Наша цель — создать удобного, быстрого и доступного ИИ-ассистента, который даёт пользователю больше возможностей и контроля.</p><p>Версия: ${APP_VERSION}</p><p>Разработчик: Kairema AI Team</p></div>`})}
/* ===== ПРОФИЛЬ ===== */
function profPage(){page('profile','Мой профиль',(b,d)=>{const p=S.p;b.innerHTML=`<div class="phd in">${ini(p,'big')}<span class="m"><b>${esc(p.name||'Гость')}</b><small>${esc(typeof Auth!=='undefined'&&Auth.user()?Auth.user().email:'')}</small></span></div>
 <div class="sh">Данные профиля</div><div class="pfld">${fld('Имя','name',p.name,'Введите имя')}</div>
 <div class="sh">Язык интерфейса</div><div id="lg" style="margin:14px 0 4px"></div><button class="btn big" id="btn-save-profile" data-action="profile:save" data-s>Сохранить</button>`;
 let lang=p.lang;$('#lg',b).replaceWith(seg(['Русский','English'],lang,i=>{lang=i;S.p.lang=i;saveProfile();applyLang(i)}));const sv=$('[data-s]',b);form(b,{name:v=>v.length>0},sv);
 sv.onclick=()=>{const g=k=>$(`[data-k=${k}]`,b).value.trim();Object.assign(S.p,{name:g('name'),lang});saveProfile();toast('Профиль сохранён');d.close();setView()}})}
function logout(){ask('Выйти из аккаунта?','Чаты останутся на сервере. Войти можно в любой момент.','Выйти',()=>{const f=el(`<div class="full out"><img class="brandimg logo-img" src="core/brand/logo.png" alt="Kairema"><h1 style="margin:22px 0 6px">Вы вышли</h1><p class="sub" style="margin-bottom:24px">Войдите, чтобы продолжить</p><button class="btn" style="width:100%;max-width:320px">Войти</button></div>`);app.append(f);raf(()=>f.classList.remove('out'));$('.btn',f).onclick=()=>{f.classList.add('out');setTimeout(()=>f.remove(),500);$$('.spg').forEach(x=>x.remove());show('api')}})}
/* ===== НАСТРОЙКИ ===== */
function setView(){const v=$('#v-set'),p=S.p,TN=['Тёмная','Светлая','Авто'],TK=['dark','light','auto'],ok=[...S.providers,...S.sproviders].filter(x=>x.ok).length;let i=0;
 const row=(ic1,ttl,sb,att,circ,end)=>`<button class="sr" style="--i:${i++}" ${att}><span class="si ${circ?'c':''}">${ic(ic1)}</span><span class="m"><b>${ttl}</b><small>${sb}</small></span>${end===undefined?ic('chevR'):end}</button>`;
 v.innerHTML=`<div class="top"><h1>Настройки</h1></div><div class="scroll st">
 <button class="card pf" style="--i:0" data-go="prof">${ini(p)}<span class="m"><b>${esc(p.name||'Гость')}</b><small>${esc(p.name?'Мой профиль':'Нажмите, чтобы указать имя')}</small></span>${ic('chevR')}</button>
 <div class="sh">ИИ и персонализация</div>
 ${row('brain','Память ИИ','Ваши данные и контекст','data-go="mem"')}${row('doc','Шаблоны промтов','Быстрые команды для ИИ','data-go="tpl"')}
 <div class="sh">Провайдеры</div>
 <button class="pill" style="--i:${i++}" data-go="prov"><span>Подключено: ${ok}</span>${ic('chevR')}</button>
 ${row('plus','Добавить обычного провайдера','Название, API URL и ключ','data-go="add"',1)}${row('plus','Добавить провайдера поиска в сети','Для поиска в интернете','data-go="adds"',1)}
 <div class="sh">Поиск в сети</div>
 ${row('globe','Включить поиск в интернете','Позволяет ИИ искать актуальную информацию в интернете через API-провайдер.','data-tg="web"',1,`<span class="sw ${S.web?'on':''}"></span>`)}
 <div class="sh">Интерфейс</div>
 ${row('sun','Тема',TN[TK.indexOf(S.theme)],'data-theme',1)}${row('info','О приложении','Версия: '+APP_VERSION,'data-go="about"',1)}
 <button class="sr out" style="--i:${i++}" data-act="out"><span class="si">${ic('out')}</span><span class="m"><b>Выйти из аккаунта</b></span></button></div>`;
 $$('[data-go]',v).forEach(b=>b.onclick=()=>({prof:()=>openScreen('profile'),mem:()=>openScreen('memory'),prov:()=>openScreen('providers'),tpl:()=>openScreen('templates'),add:()=>provForm(-1,setView,'chat'),adds:()=>provForm(-1,setView,'search'),about:()=>openScreen('about')})[b.dataset.go]());
 $$('[data-tg]',v).forEach(b=>b.onclick=()=>toggleWeb());
 $('[data-theme]',v).onclick=()=>{const s=sheet(`<h2 style="margin-bottom:8px">Тема</h2><div id="tl2"></div>`);TK.forEach((k,j)=>{const b=el(`<button class="sr in" style="--i:${j}"><span class="m"><b>${TN[j]}</b></span>${S.theme===k?ic('ok'):''}</button>`);b.onclick=()=>{S.theme=k;st.set('kth',k);applyTheme();s.close();setView();toast('Сохранено')};$('#tl2',s).append(b)})};
 $('[data-act=out]',v).onclick=logout;Hooks.run('settings:rendered',v);groupRows($('.st',v))}
/* Строки настроек подряд складываются в скруглённую карточку, чтобы ничего не «висело» в воздухе. */
function groupRows(box){if(!box)return;let g=null;[...box.children].forEach(c=>{if(c.matches('.sr,.pill')){if(!g){g=el('<div class="grp"></div>');c.before(g)}g.append(c)}else g=null})}
/* ===== НАВИГАЦИЯ ===== */
const TAB_SCREEN={api:'api',term:'terminal',set:'settings'};
const TABS=[['api','chat','Чат'],['term','term','Терминал'],['set','set','Настройки']];
$('#nav').innerHTML=TABS.map(([k,i,n],j)=>`<button class="tab ${j?'':'on'}" id="tab-${k}" data-action="nav:open" data-screen-target="${TAB_SCREEN[k]}" data-v="${k}">${ic(i)}${n}</button>`).join('');
let CUR='api';
function show(v){if(v===CUR)return;const ks=TABS.map(x=>x[0]),dir=ks.indexOf(v)>ks.indexOf(CUR)?1:-1,nv=$('#v-'+v),ov=$('#v-'+CUR);$$('.tab').forEach(t=>t.classList.toggle('on',t.dataset.v===v));({api:apiView,term:()=>typeof termView==='function'&&termView(),set:setView})[v]?.();
 nv.style.transition='none';nv.style.setProperty('--x',dir*24+'px');void nv.offsetWidth;nv.style.transition='';ov.style.setProperty('--x',-dir*24+'px');ov.classList.remove('on');nv.classList.add('enter','on');setTimeout(()=>nv.classList.remove('enter'),1000);CUR=v}
$$('.tab').forEach(t=>t.onclick=()=>openScreen(t.dataset.screenTarget));
