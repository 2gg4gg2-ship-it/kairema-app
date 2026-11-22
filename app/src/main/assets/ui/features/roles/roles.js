/* ===== РОЛИ И КОМАНДЫ «/» =====
   В поле ввода набираете «/» и появляется список команд. Два вида:
   • Роль: системная инструкция, привязана к ЭТОМУ чату (над полем ввода плашка с названием, крестик снимает роль).
   • Шаблон: готовый текст вставляется в поле ввода, дописываете своё и отправляете.
   Свои шаблоны из «Шаблоны промтов» тоже доступны по «/название». Свои роли и команды: Настройки → «Роли и команды».
   Привязка роли к чату хранится на телефоне (kairema.roles.chat.v1), собственные команды в kairema.roles.v1.
   В запрос роль попадает через реестр window.SYSX (core/app.js: sysExtra). Убрать модуль: удалить папку и строки в index.html. */
const Roles=(()=>{
 const KC='kairema.roles.v1',KA='kairema.roles.chat.v1';
 /* n/d/t: [русский, английский]. sys и text для модели пишутся по-английски там, где это инструкция. */
 const B=[
  {id:'fix',cmd:'fix',kind:'prompt',n:['Исправить код','Fix code'],d:['Найти и исправить ошибки','Find and fix bugs'],t:['Найди и исправь ошибки в этом коде. Сначала кратко перечисли, что было не так, потом дай исправленный код целиком:\n\n','Find and fix the bugs in this code. First list briefly what was wrong, then give the full corrected code:\n\n']},
  {id:'explain',cmd:'explain',kind:'prompt',n:['Объяснить','Explain'],d:['Простыми словами, с примером','In plain words, with an example'],t:['Объясни простыми словами и с коротким примером:\n\n','Explain in plain words with a short example:\n\n']},
  {id:'summary',cmd:'summary',kind:'prompt',n:['Резюме текста','Summarize'],d:['Главное в 5 пунктах','Key points in 5 bullets'],t:['Сделай краткое резюме в 5 пунктах:\n\n','Summarize in 5 bullet points:\n\n']},
  {id:'edit',cmd:'edit',kind:'prompt',n:['Улучшить текст','Polish text'],d:['Исправить стиль и ошибки','Fix style and mistakes'],t:['Отредактируй текст: исправь ошибки и улучши стиль, смысл не меняй. Выведи только результат:\n\n','Edit the text: fix mistakes and improve style without changing the meaning. Output only the result:\n\n']},
  {id:'translate',cmd:'translate',kind:'role',n:['Переводчик','Translator'],d:['Русский ⇄ английский, только перевод','Russian ⇄ English, translation only'],sys:'You are a translator. If the user text is in Russian, translate it into English; otherwise translate it into Russian. Output only the translation, keep the formatting, add no comments.'},
  {id:'short',cmd:'short',kind:'role',n:['Коротко','Brief'],d:['Не больше 3 предложений','At most 3 sentences'],sys:'Answer as briefly as possible: at most 3 sentences, no preamble, no repetition of the question.'},
  {id:'teacher',cmd:'teacher',kind:'role',n:['Учитель','Teacher'],d:['Шаг за шагом, с примерами','Step by step, with examples'],sys:'Act as a patient teacher. Explain step by step, use simple words and concrete examples, and finish with one short question that checks understanding.'},
  {id:'code',cmd:'code',kind:'role',n:['Программист','Programmer'],d:['Рабочий код и краткие пояснения','Working code, brief notes'],sys:'You are a senior software engineer. Give working, minimal code in fenced blocks with the language tag, mention edge cases in one or two lines, and avoid long theory.'},
  {id:'termux',cmd:'termux',kind:'role',n:['Помощник по Termux','Termux helper'],d:['Команды для оболочки по шагам','Shell commands step by step'],sys:'You are an assistant for the Termux terminal on Android. Prefer pkg and standard POSIX tools, give one short command per ```bash block, say what it does in one line, and never suggest commands that need root.'}];
 const rd=(k,d)=>{try{return JSON.parse(localStorage.getItem(k)||'null')||d}catch(e){return d}};
 const wr=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
 let custom=rd(KC,[]).filter(x=>x&&typeof x.id==='string'&&typeof x.cmd==='string'&&typeof x.name==='string'&&typeof x.text==='string');
 let byChat=rd(KA,{});
 const en=()=>LANG==='en';
 const nm=x=>x.n?(en()?x.n[1]:x.n[0]):x.name;
 const ds=x=>x.d?(en()?x.d[1]:x.d[0]):(x.kind==='role'?L('Своя роль'):L('Свой шаблон'));
 const body=x=>x.t?(en()?x.t[1]:x.t[0]):(x.kind==='role'?x.text:x.text);
 const sysOf=x=>x.sys||x.text;
 i18nAdd({"Шаблоны и роли":"Templates and roles","Шаблоны":"Templates","Поиск шаблона":"Search templates","Роли":"Roles","Действия":"Actions","Роли и команды":"Roles and commands","Набирайте «/» в поле ввода":"Type “/” in the message box","Своя роль":"Custom role","Свой шаблон":"Custom template","Роль":"Role","Шаблон":"Template","Роль для этого чата снята":"Role removed for this chat","Роль включена для этого чата":"Role enabled for this chat","Встроенные":"Built-in","Мои":"Mine","Пока нет своих команд.":"No custom commands yet.","Новая команда":"New command","Название":"Name","Команда после «/» (буквы, цифры, - и _)":"Command after “/” (letters, digits, - and _)","Текст":"Text","Инструкция для модели или текст для вставки":"Instruction for the model or text to insert","Сохранить":"Save","Отмена":"Cancel","Такая команда уже есть":"This command already exists","Заполните название, команду и текст":"Fill in the name, command and text","Добавить команду":"Add command","Удалить":"Delete","Роль действует во всём чате: модель следует инструкции в каждом ответе. Шаблон вставляет готовый текст в поле ввода.":"A role applies to the whole chat: the model follows the instruction in every answer. A template inserts ready-made text into the message box."});
 B.forEach(x=>{const o={};o[x.n[0]]=x.n[1];o[x.d[0]]=x.d[1];if(x.t)o[x.t[0]]=x.t[1];i18nAdd(o)});
 const all=()=>{
  const own=(typeof S!=='undefined'&&Array.isArray(S.userTpls)?S.userTpls:[]).map(u=>({id:'t:'+u.id,cmd:String(u.name||'').toLowerCase().replace(/\s+/g,'-').replace(/[^\p{L}\p{N}_-]/gu,'').slice(0,24),name:u.name,kind:'prompt',text:String(u.prompt||''),tpl:1}));
  return[...actions,...custom.map(x=>({...x,own:1})),...own.filter(x=>x.cmd),...B]};
 const find=id=>all().find(x=>x.id===id);
 const chatId=()=>Chx&&Chx.cur?Chx.cur.id:'';
 const cur=()=>{const id=byChat[chatId()];return id?find(id):null};
 const set=(cid,id)=>{if(!cid)return;if(id)byChat[cid]=id;else delete byChat[cid];wr(KA,byChat)};
 (window.SYSX=window.SYSX||[]).push(()=>{const r=cur();return r&&r.kind==='role'?'\n\nThe user selected this role for the whole chat, follow it in every answer: '+sysOf(r):''});
 const actions=[];
 const api={all,cur,set,builtin:B,actions};
 let pop=null;
 const closePop=()=>{if(pop){pop.remove();pop=null}};
 const chip=(v,cmp)=>{
  $$('.rlc',v).forEach(x=>x.remove());
  const r=cur();if(!r)return;
  const c=el('<div class="rlc"><span class="rl-i">🎭</span><b></b><button type="button" class="rl-x" aria-label="×">×</button></div>');
  $('b',c).textContent=nm(r);
  $('.rl-x',c).onclick=()=>{set(chatId(),null);c.remove();toast(L('Роль для этого чата снята'))};
  const ta=$('textarea',cmp);ta.before(c)};
 const choose=(v,cmp,ta,x)=>{
  closePop();
  if(x.kind==='action'){ta.value='';cmp.setText('');x.run();return}
  if(x.kind==='role'){set(chatId(),x.id);ta.value='';cmp.setText('');chip(v,cmp);toast(L('Роль включена для этого чата'))}
  else{cmp.setText(body(x));try{ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}catch(e){}}};
 const show=(v,cmp,ta)=>{
  const m=/^\/([^\s]*)$/.exec(ta.value);
  if(!m){closePop();return}
  const q=m[1].toLowerCase();
  const list=all().filter(x=>!q||x.cmd.toLowerCase().includes(q)||nm(x).toLowerCase().includes(q)).slice(0,6);
  if(!list.length){closePop();return}
  closePop();
  pop=el('<div class="slc" role="listbox"></div>');
  list.forEach(x=>{
   const b=el('<button type="button" class="sl-i" role="option"><span class="sl-c"></span><span class="sl-m"><b></b><small></small></span><span class="sl-k"></span></button>');
   $('.sl-c',b).textContent='/'+x.cmd;$('b',b).textContent=nm(x);$('small',b).textContent=ds(x);$('.sl-k',b).textContent=x.kind==='role'?L('Роль'):x.kind==='action'?L('Действие'):L('Шаблон');
   b.onmousedown=e=>e.preventDefault();
   b.onclick=()=>choose(v,cmp,ta,x);pop.append(b)});
  v.append(pop);
  pop.style.bottom=Math.max(0,v.clientHeight-cmp.offsetTop+6)+'px'};
 Hooks.on('chat:rendered',v=>{
  const cmp=$('.cmp',v),ta=cmp&&$('textarea',cmp);if(!ta)return;
  chip(v,cmp);
  ta.addEventListener('input',()=>show(v,cmp,ta));
  ta.addEventListener('blur',()=>setTimeout(closePop,200));
  /* Набрали команду целиком (например /compact) и нажали отправить: выполняем действие, а не шлём текст модели */
  const sd=$('.send',cmp);
  if(sd)sd.addEventListener('click',e=>{
   const m=/^\/([\p{L}\p{N}_-]+)$/u.exec(ta.value.trim());if(!m)return;
   const x=actions.find(a=>a.cmd===m[1].toLowerCase());if(!x)return;
   e.preventDefault();e.stopImmediatePropagation();ta.value='';cmp.setText('');closePop();x.run()},true)});
 /* --- экран «Роли и команды» --- */
 const addSheet=done=>{
  const s=sheet(`<h2 style="margin-bottom:10px">${esc(L('Новая команда'))}</h2><div data-seg></div><div class="fld" style="margin-top:12px"><label>${esc(L('Название'))}</label><input data-n type="text" maxlength="40" autocomplete="off"></div><div class="fld"><label>${esc(L('Команда после «/» (буквы, цифры, - и _)'))}</label><input data-c type="text" maxlength="24" autocomplete="off" autocapitalize="off" spellcheck="false"></div><div class="fld"><label>${esc(L('Текст'))}</label><textarea class="ta" data-t rows="4" maxlength="4000" placeholder="${esc(L('Инструкция для модели или текст для вставки'))}"></textarea></div><div class="two"><button class="btn ghost" data-x type="button">${esc(L('Отмена'))}</button><button class="btn" data-o type="button">${esc(L('Сохранить'))}</button></div>`);
  let kind='role';
  $('[data-seg]',s).append(seg([L('Роль'),L('Шаблон')],0,i=>{kind=i?'prompt':'role'}));
  $('[data-x]',s).onclick=s.close;
  $('[data-o]',s).onclick=()=>{
   const name=$('[data-n]',s).value.trim(),cmd=$('[data-c]',s).value.trim().replace(/^\//,'').toLowerCase(),text=$('[data-t]',s).value.trim();
   if(!name||!text||!/^[\p{L}\p{N}_-]{1,24}$/u.test(cmd)){toast(L('Заполните название, команду и текст'));return}
   if(all().some(x=>x.cmd.toLowerCase()===cmd)){toast(L('Такая команда уже есть'));return}
   custom.push({id:'u'+Date.now().toString(36),cmd,name,kind,text});wr(KC,custom);s.close();done()}};
 const screen=()=>page('roles','Роли и команды',(b,d)=>{
  const draw=()=>{
   b.innerHTML='';
   b.append(el(`<p class="sub" style="margin:0 2px 14px">${esc(L('Роль действует во всём чате: модель следует инструкции в каждом ответе. Шаблон вставляет готовый текст в поле ввода.'))}</p>`));
   const sec=(t,arr)=>{
    b.append(el(`<div class="lbl" style="margin-top:14px">${esc(t)}</div>`));
    if(!arr.length){b.append(el(`<p class="hint" style="margin:0 4px 10px">${esc(L('Пока нет своих команд.'))}</p>`));return}
    arr.forEach(x=>{
     const c=el('<div class="card pv in rl-row"><span class="m"><b></b><small></small></span></div>');
     $('b',c).textContent='/'+x.cmd+' · '+nm(x);$('small',c).textContent=(x.kind==='role'?L('Роль'):L('Шаблон'))+' · '+ds(x);
     if(x.own&&!x.tpl){const del=el(`<button class="cb" type="button" aria-label="${esc(L('Удалить'))}">${ic('trash')}</button>`);del.onclick=()=>{custom=custom.filter(z=>z.id!==x.id);wr(KC,custom);Object.keys(byChat).forEach(k=>{if(byChat[k]===x.id)delete byChat[k]});wr(KA,byChat);draw()};c.append(del)}
     b.append(c)})};
   sec(L('Мои'),all().filter(x=>x.own));sec(L('Встроенные'),B);
   const add=el(`<button class="btn big" type="button" style="margin-top:16px">${esc(L('Добавить команду'))}</button>`);add.onclick=()=>addSheet(draw);b.append(add)};
  draw()});
 /* --- окно «Шаблоны и роли» (кнопка слева от «Отправить» в поле ввода) ---
    Список: роли, шаблоны (встроенные и свои из app.js: tplItems) и действия. Поиск появляется, если пунктов больше 8.
    Шаблон подставляется в поле ввода, роль включается для этого чата, действие выполняется. */
 api.pick=(cmp,ta)=>{
  const v=cmp.closest('.view')||document;
  const own=typeof tplItems==='function'?tplItems():[];
  const items=[
   ...all().filter(x=>x.kind==='role').map(x=>({k:'role',n:nm(x),d:ds(x),x})),
   ...own.map(x=>({k:'prompt',n:x.n,d:x.d||x.c||'',text:x.t,mine:!!x.own})),
   ...all().filter(x=>x.kind==='prompt'&&!x.tpl).map(x=>({k:'prompt',n:nm(x),d:ds(x),text:body(x),mine:!!x.own})),
   ...all().filter(x=>x.kind==='action').map(x=>({k:'action',n:nm(x),d:ds(x),x}))];
  const s=sheet(`<h2 class="tpk-h">${esc(L('Шаблоны и роли'))}</h2>${items.length>8?`<div class="tpk-s"><input type="search" data-q autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="${esc(L('Поиск шаблона'))}" aria-label="${esc(L('Поиск шаблона'))}"></div>`:''}<div class="tpk" role="listbox"></div>`);
  const box=$('.tpk',s),q=$('[data-q]',s);
  const tag=it=>it.k==='role'?L('Роль'):it.k==='action'?L('Действие'):L('Шаблон');
  const pickIt=it=>{
   s.close();
   setTimeout(()=>{
    if(it.k==='role'){set(chatId(),it.x.id);chip(v,cmp);toast(L('Роль включена для этого чата'))}
    else if(it.k==='action'){it.x.run()}
    else{cmp.setText(ta.value.trim()?ta.value.replace(/\s*$/,'\n')+it.text:it.text);try{ta.focus();ta.setSelectionRange(ta.value.length,ta.value.length)}catch(e){}}},140)};
  const draw=()=>{
   const f=q?q.value.trim().toLowerCase():'';
   box.innerHTML='';let i=0,shown=0;
   [['role','Роли'],['prompt','Шаблоны'],['action','Действия']].forEach(([k,title])=>{
    const arr=items.filter(it=>it.k===k&&(!f||(it.n+' '+it.d+' '+(it.text||'')).toLowerCase().includes(f)));
    if(!arr.length)return;
    box.append(el(`<div class="tpk-g">${esc(L(title))}</div>`));
    arr.forEach(it=>{
     const b=el(`<button type="button" class="tpk-i" role="option" style="--i:${Math.min(i++,12)}"><span class="tpk-m"><b></b><small></small></span><span class="tpk-k"></span></button>`);
     $('b',b).textContent=it.n;const sm=$('small',b);if(it.d)sm.textContent=it.d;else sm.remove();
     $('.tpk-k',b).textContent=it.mine?L('Мой'):tag(it);
     b.onclick=()=>pickIt(it);box.append(b);shown++})});
   if(!shown)box.append(el(`<p class="hint" style="margin:8px 4px">${esc(L('Ничего не найдено'))}</p>`))};
  if(q)q.oninput=draw;draw()};
 Hooks.on('app:ready',()=>{SCREENS.roles=screen});
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-roles]',v))return;
  const r=el(`<button class="sr" style="--i:1" data-roles><span class="si c">${ic('tpl')}</span><span class="m"><b>${esc(L('Роли и команды'))}</b><small>${esc(L('Набирайте «/» в поле ввода'))}</small></span>${ic('chevR')}</button>`);
  r.onclick=()=>openScreen('roles');ab.insertAdjacentElement('beforebegin',r)});
 return api})();
