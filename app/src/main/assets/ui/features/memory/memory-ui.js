/* ===== ПАМЯТЬ: экран (заменяет старую страницу из core/app.js через SCREENS.memory) =====
   Переключатели (память, быстрые правила, умное извлечение), профиль с сохранением, что именно видит модель, разбор старых чатов,
   поиск и фильтры по категориям, закрепление, правка, удаление. Данные и правила: memory.js. */
i18nAdd({"ПЕРСОНАЛИЗАЦИЯ":"PERSONALIZATION","Память":"Memory","Управляйте фактами и темами, которые Kairema может учитывать в дальнейших разговорах.":"Manage the facts and topics Kairema can take into account in future conversations.","Сохранённых фактов":"Saved facts","Найдено ИИ":"Found by AI","Использовать память в ответах":"Use memory in answers","Разрешить учитывать профиль и сохранённые факты. Выключение не удаляет записи.":"Allow using the profile and saved facts. Turning it off does not delete anything.","Быстрые правила":"Quick rules","Мгновенно ловят фразы «меня зовут…», «я живу в…», «запомни…» без обращения к модели.":"Instantly catch phrases like \"my name is…\", \"I live in…\", \"remember…\" without asking the model.","Умное извлечение (ИИ)":"Smart extraction (AI)","После ответа модель сама находит новые факты о вас и обновляет старые. Тратит немного токенов вашего провайдера, только когда вы рассказываете о себе.":"After a reply the model finds new facts about you and updates old ones. Uses a few tokens of your provider, only when you talk about yourself.","Профиль":"Profile","Что Kairema важно знать о вас?":"What should Kairema know about you?","Краткое описание о вас, ваши цели и предпочтения. Отправляется модели всегда.":"A short description, your goals and preferences. Always sent to the model.","Сохранить":"Save","Отмена":"Cancel","Профиль памяти сохранён":"Memory profile saved","Что видит модель":"What the model sees","Разобрать старые чаты":"Scan old chats","Поиск по фактам":"Search facts","Все":"All","Закреплённые":"Pinned","Авто":"Auto","авто":"auto","Фактов нет":"No facts","Добавить новый факт":"Add a new fact","Удалить все факты":"Delete all facts","Новый факт":"New fact","Редактировать факт":"Edit fact","Введите факт":"Enter a fact","Категория":"Category","Закрепить":"Pin","Открепить":"Unpin","Править":"Edit","Удалить":"Delete","Факт удалён":"Fact deleted","Факт обновлён":"Fact updated","Факт добавлен":"Fact added","Все факты удалены":"All facts deleted","Память включена":"Memory on","Память выключена":"Memory off","Подсказка для модели пуста: память выключена или нет данных":"The model prompt is empty: memory is off or there is no data","Удалить факт?":"Delete fact?","Удалить все факты?":"Delete all facts?","Удалить всё":"Delete all","Разбираю чаты…":"Scanning chats…","Не добавляйте пароли, ключи API и другую секретную информацию.":"Do not add passwords, API keys or other secrets."});
(()=>{
 const TG=[['mem','Использовать память в ответах','Разрешить учитывать профиль и сохранённые факты. Выключение не удаляет записи.'],
  ['auto','Быстрые правила','Мгновенно ловят фразы «меня зовут…», «я живу в…», «запомни…» без обращения к модели.'],
  ['smart','Умное извлечение (ИИ)','После ответа модель сама находит новые факты о вас и обновляет старые. Тратит немного токенов вашего провайдера, только когда вы рассказываете о себе.']];
 const on=k=>k==='smart'?S.smart!==false:!!S[k];
 function factSheet2(init,cat0,done){
  let c=Mem.cat(cat0||'other');
  const s=sheet('<h2 style="margin-bottom:12px"></h2><textarea class="ta" style="margin-bottom:12px"></textarea><div class="fld"><label></label></div><div class="mcats"></div><div class="two" style="margin-top:14px"><button class="btn ghost" data-c></button><button class="btn" data-o></button></div>');
  $('h2',s).textContent=L(init===null?'Новый факт':'Редактировать факт');
  const ta=$('.ta',s);ta.placeholder=L('Введите факт');ta.value=init||'';
  $('label',s).textContent=L('Категория');
  const cc=$('.mcats',s);
  const draw=()=>{cc.innerHTML='';Mem.CATS.forEach(k=>{const b=el('<button class="mchip"></button>');b.textContent=Mem.label(k);b.classList.toggle('on',k===c);b.onclick=()=>{c=k;draw()};cc.append(b)})};draw();
  $('[data-c]',s).textContent=L('Отмена');$('[data-o]',s).textContent=L('Сохранить');
  const ok=$('[data-o]',s);ok.disabled=!ta.value.trim();ta.oninput=()=>ok.disabled=!ta.value.trim();
  $('[data-c]',s).onclick=s.close;
  ok.onclick=()=>{const v=ta.value.trim();if(!v)return;s.close();done(v,c)};
  setTimeout(()=>ta.focus(),350)}
 function preview(){
  const t=Mem.prompt('');
  const s=sheet('<h2 style="margin-bottom:10px"></h2><pre class="mpre"></pre><button class="btn" data-c style="width:100%;margin-top:14px"></button>');
  $('h2',s).textContent=L('Что видит модель');
  $('.mpre',s).textContent=t.trim()||L('Подсказка для модели пуста: память выключена или нет данных');
  $('[data-c]',s).textContent=L('Закрыть');$('[data-c]',s).onclick=s.close}
 function screen(){
  return page('memory','',(b,d)=>{
   b.classList.add('mem-pg');
   let q='',flt='all';
   b.innerHTML=`<div class="mh"><div class="eb"></div><h1></h1><p class="sub" style="margin:6px 0 0"></p></div>
   <div class="mstat"><div class="ms big"><span class="n" data-n></span><span class="l"></span></div><div class="ms"><span class="n s" data-s></span><span class="l" data-al></span></div></div>
   <div class="sh" data-t1></div><div data-tg></div>
   <div class="sh" data-t2></div>
   <div class="mp"><div class="fld"><label data-pl></label><small class="d" data-pd></small><textarea class="ta" maxlength="1200"></textarea><p class="hint" data-ph></p></div><div class="two"><button class="btn" data-sv></button><button class="btn ghost" data-cn></button></div></div>
   <div class="mtools"><button class="addf" data-pv></button><button class="addf" data-sc></button></div>
   <div class="sh" data-t3></div>
   <input class="msrch" type="search" data-q autocomplete="off"><div class="mcats" data-fl></div><div class="ml"></div>
   <button class="addf" data-add></button><button class="addf dng" data-clr></button>`;
   [...b.children].forEach((c,k)=>c.style.setProperty('--i',k));
   const T=(sel,t)=>{$(sel,b).textContent=L(t)};
   T('.eb','ПЕРСОНАЛИЗАЦИЯ');T('h1','Память');T('.mh .sub','Управляйте фактами и темами, которые Kairema может учитывать в дальнейших разговорах.');
   T('.ms.big .l','Сохранённых фактов');T('[data-al]','Найдено ИИ');
   T('[data-t1]','Настройки памяти');T('[data-t2]','Профиль');T('[data-t3]','Список сохранённых фактов:');
   T('[data-pl]','Что Kairema важно знать о вас?');T('[data-pd]','Краткое описание о вас, ваши цели и предпочтения. Отправляется модели всегда.');T('[data-ph]','Не добавляйте пароли, ключи API и другую секретную информацию.');
   T('[data-sv]','Сохранить');T('[data-cn]','Отмена');T('[data-pv]','Что видит модель');T('[data-sc]','Разобрать старые чаты');
   T('[data-add]','Добавить новый факт');T('[data-clr]','Удалить все факты');
   $('[data-q]',b).placeholder=L('Поиск по фактам');
   const nEl=$('[data-n]',b),aEl=$('[data-s]',b),ml=$('.ml',b),clr=$('[data-clr]',b);
   const stat=bump=>{nEl.textContent=String(S.memos.length).padStart(2,'0');aEl.textContent=String(S.memos.filter(x=>Mem.M(x).a).length).padStart(2,'0');if(bump){nEl.classList.add('bump');setTimeout(()=>nEl.classList.remove('bump'),260)}};
   const tg=$('[data-tg]',b);
   TG.forEach(([k,ttl,x])=>{
    const r=el('<div class="mr"><button class="orow"><span></span><span class="sw"></span></button><p></p></div>');
    $('.orow span',r).textContent=L(ttl);$('p',r).textContent=L(x);$('.sw',r).classList.toggle('on',on(k));
    $('.orow',r).onclick=()=>{S[k]=!on(k);Mem.save();Hooks.run('memory:changed');$('.sw',r).classList.toggle('on',on(k));
     toast(k==='mem'?L(S.mem?'Память включена':'Память выключена'):L(ttl)+': '+(on(k)?'вкл':'выкл'))};
    tg.append(r)});
   const ta=$('.ta',b),mp=$('.mp',b);ta.value=S.profD===null?S.prof:S.profD;ta.oninput=()=>S.profD=ta.value;
   $('[data-sv]',b).onclick=()=>{Mem.setProfile(ta.value);ta.value=S.prof;mp.classList.remove('ok');void mp.offsetWidth;mp.classList.add('ok');toast(L('Профиль памяти сохранён'))};
   $('[data-cn]',b).onclick=()=>{S.profD=S.prof;ta.value=S.prof};
   $('[data-pv]',b).onclick=preview;
   const sc=$('[data-sc]',b);
   sc.onclick=async()=>{
    if(sc.disabled)return;sc.disabled=true;const t0=sc.textContent;sc.textContent=L('Разбираю чаты…');
    const r=await Mem.ai.scan(p=>{sc.textContent=L('Разбираю чаты…')+' '+p});
    sc.disabled=false;sc.textContent=t0;
    if(r.err){toast(r.err);return}
    toast(r.added?L('Новых фактов')+': '+r.added:L('Ничего нового не найдено'));facts();stat(1)};
   const fl=$('[data-fl]',b);
   const drawFl=()=>{fl.innerHTML='';
    const chips=[['all',L('Все')],['pin',L('Закреплённые')],['auto',L('Авто')]].concat(Mem.CATS.filter(k=>S.memos.some(x=>Mem.M(x).c===k)).map(k=>[k,Mem.label(k)]));
    chips.forEach(([k,t])=>{const c=el('<button class="mchip"></button>');c.textContent=t;c.classList.toggle('on',k===flt);c.onclick=()=>{flt=k;drawFl();facts()};fl.append(c)})};
   const match=x=>{const m=Mem.M(x);
    if(flt==='pin'&&!m.p)return false;if(flt==='auto'&&!m.a)return false;
    if(!['all','pin','auto'].includes(flt)&&m.c!==flt)return false;
    if(q&&!(String(x[0]).toLowerCase().includes(q)))return false;return true};
   const facts=()=>{
    ml.innerHTML='';clr.style.display=S.memos.length?'':'none';
    const list=S.memos.map((x,i)=>[x,i]).filter(([x])=>match(x)).sort((a,c)=>(Mem.M(c[0]).p-Mem.M(a[0]).p)||((c[0][3]||0)-(a[0][3]||0)));
    if(!list.length)ml.innerHTML='<p class="hint" style="margin:0 4px 10px"></p>',ml.firstChild.textContent=L('Фактов нет');
    list.forEach(([x],k)=>{
     const m=Mem.M(x);
     const r=el('<div class="ft"><span class="n"></span><p></p><div class="fa2"><button class="fbtn" data-p></button><button class="fbtn" data-e></button><button class="fbtn fdel" data-d></button></div></div>');
     $('.n',r).textContent=String(k+1).padStart(2,'0');
     $('p',r).textContent=x[0];
     const sm=document.createElement('small');sm.className='mtag';
     sm.textContent=(m.p?'📌 ':'')+Mem.label(m.c)+(m.a?' · '+L('авто'):'')+(x[1]?' · '+x[1]:'');
     $('p',r).after(sm);
     $('[data-p]',r).textContent=L(m.p?'Открепить':'Закрепить');
     $('[data-e]',r).textContent=L('Править');$('[data-d]',r).textContent=L('Удалить');
     $('[data-p]',r).onclick=()=>{Mem.setMeta(x[2],'p',m.p?0:1);facts()};
     $('[data-e]',r).onclick=()=>factSheet2(x[0],m.c,(v,c)=>{Mem.update(x[2],v,c);const mm=Mem.M(x);mm.a=0;Hooks.run('memory:changed');drawFl();facts();toast(L('Факт обновлён'))});
     $('[data-d]',r).onclick=()=>ask(L('Удалить факт?'),L('Факт будет удалён из памяти без возможности восстановления.'),L('Удалить'),()=>{Mem.remove(x[2]);drawFl();facts();stat(1);toast(L('Факт удалён'))});
     ml.append(r)})};
   $('[data-q]',b).oninput=e=>{q=e.target.value.trim().toLowerCase();facts()};
   clr.onclick=()=>ask(L('Удалить все факты?'),'Все сохранённые факты ('+S.memos.length+') будут удалены без возможности восстановления.',L('Удалить всё'),()=>{S.memos.length=0;Hooks.run('memory:changed');drawFl();facts();stat(1);toast(L('Все факты удалены'))});
   $('[data-add]',b).onclick=()=>factSheet2(null,'other',(v,c)=>{const r=Mem.add(v,{c});if(r&&r.k==='add'){Mem.setMeta(r.x[2],'a',0)}drawFl();facts();stat(1);toast(L('Факт добавлен'))});
   drawFl();facts();stat()})}
 Hooks.on('app:ready',()=>{SCREENS.memory=screen});
 /* Метка под ответом: сколько фактов ушло модели (нажать: какие) */
 Hooks.on('chat:answer',(m,bd)=>{
  const ids=(Mem.used||[]).slice();if(!ids.length||!S.mem)return;
  const d=bd&&bd.closest&&bd.closest('.msg');if(!d)return;
  setTimeout(()=>{const row=$('.msg-act',d);if(!row||$('.mem-used',row))return;
   const b=el('<button class="mem-used"></button>');b.textContent='🧠 '+ids.length;
   b.onclick=()=>{
    const s=sheet('<h2 style="margin-bottom:12px"></h2><div class="mn-l"></div><button class="btn" data-c style="width:100%;margin-top:14px"></button>');
    $('h2',s).textContent=L('Что видит модель');
    const l=$('.mn-l',s);ids.forEach(id=>{const x=S.memos.find(y=>y[2]===id);if(!x)return;const r=el('<div class="mn-r"><span></span></div>');$('span',r).textContent=x[0];l.append(r)});
    $('[data-c]',s).textContent=L('Закрыть');$('[data-c]',s).onclick=s.close};
   row.append(b)},0)});
})();
