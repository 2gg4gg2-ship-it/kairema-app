/* ===== АГЕНТ-ПРОГРАММИСТ (Coder) =====
   Модель получает настоящие инструменты (tool calling, как у Codex и Claude Code) и сама ведёт работу циклом:
   изучить код → править → запустить проверку → прочитать ошибку → исправить → повторить, пока не заработает.
   Инструменты: list_dir, read_file (с диапазоном строк), search (grep), edit_file (замена точного фрагмента), write_file, run_command.
   Где выполняется: Termux, если он установлен и разрешён (git, python, node…), иначе песочница приложения (Shell.kt, без git и python).
   Подтверждения (как у Codex): «Только чтение» · «Спрашивать» · «Правки сами» · «Полный авто». Опасные команды спрашиваются всегда.
   Файловые инструменты работают только внутри папки проекта; команды ограничить папкой нельзя (это оболочка телефона), поэтому
   режим «Полный авто» стоит включать осознанно. Откат: перед первой правкой файла в запуске его исходный текст запоминается
   (кнопка «Откатить правки», пока приложение открыто).
   Мост: Kotlin Bridge.chat принимает provider.tools и присылает вызовы куском с \u0004 + JSON [{id,name,args}] (ToolCalls.kt).
   Историю чата получает только итог агента (текст), а не весь ход работы.
   API: Coder.on(), Coder.respond(msgs,box,tag), Coder.cfg, Coder.tools, Coder.toOAI/toAnth (чистые, для тестов), Coder.safeCmd, Coder.rel.
   Убрать модуль: удалить папку и строки в index.html (в core/messages.js вызов защищён typeof). Тест: docs/tests/coder039.test.py */
const Coder=(()=>{
 const KS='kairema.coder.v1',MAXOUT=12000;
 const cfg={on:0,mode:'ask',dir:'kairema-work',steps:40,env:'auto'};
 try{Object.assign(cfg,JSON.parse(localStorage.getItem(KS)||'{}'))}catch(e){}
 const save=()=>{try{localStorage.setItem(KS,JSON.stringify(cfg))}catch(e){}};
 const MODES={
  read:['Только чтение','Читает и ищет, ничего не меняет и не запускает'],
  ask:['Спрашивать','Читает сам; каждую правку и команду показывает и ждёт разрешения'],
  edit:['Правки сами','Файлы правит сам; команды (кроме безопасных вроде ls, git status) спрашивает'],
  auto:['Полный авто','Правит и запускает всё сам; опасные команды (rm -r, sudo…) всё равно спрашивает']};
 const sq=s=>"'"+String(s).replace(/'/g,"'\\''")+"'";
 /* Путь внутри проекта: относительный, без «..»; иначе null. */
 const rel=p=>{p=String(p==null?'.':p).trim().replace(/^\.\//,'');if(!p)p='.';if(p[0]==='/'||p[0]==='~'||/^[A-Za-z]:/.test(p)||p.split('/').some(x=>x==='..'))return null;return p};
 const dirq=dd=>{let d=String(dd||cfg.dir||'kairema-work').trim();if(d.startsWith('~/'))return'"$HOME"/'+sq(d.slice(2));if(d==='~')return'"$HOME"';return sq(d)};
 const trunc=(s,n=MAXOUT)=>{s=String(s==null?'':s);if(s.length<=n)return s;const h=Math.round(n*.35),t=n-h;return s.slice(0,h)+'\n…[пропущено '+(s.length-n)+' знаков]…\n'+s.slice(-t)};
 const SAFE1=new Set('ls cat pwd head tail wc grep egrep fgrep echo which whoami date uname df du stat file tree sort uniq cut basename dirname'.split(' '));
 const SAFEGIT=new Set('status diff log show branch rev-parse remote ls-files blame'.split(' '));
 /* Команда только читает (без перенаправлений, подстановок и цепочек): не требует вопроса в режимах «Правки сами». */
 const safeCmd=c=>{c=String(c).trim();if(!c||/[;&|><`\n]|\$\(/.test(c))return false;const w=c.split(/\s+/);if(w[0]==='git')return SAFEGIT.has(w[1]||'')&&!/--output|-o\b/.test(c);if(w[0]==='find')return!/-(delete|exec|ok|fprint)/.test(c);if(/^(python3?|node|java|git|gradle|npm)$/.test(w[0]))return/^--?version$|^-v$/.test(w[1]||'')&&w.length===2;return SAFE1.has(w[0])};
 /* ---- Инструменты (описание для модели) ---- */
 const P=(props,req)=>({type:'object',properties:props,required:req||[]});
 const TOOLS=[
  {name:'list_dir',description:'Список файлов и папок (папки с «/»). path относительно папки проекта, по умолчанию «.».',parameters:P({path:{type:'string'}})},
  {name:'read_file',description:'Читает текстовый файл с номерами строк. По умолчанию первые 400 строк; для больших файлов читай диапазонами start/end.',parameters:P({path:{type:'string'},start:{type:'integer',description:'первая строка (с 1)'},end:{type:'integer',description:'последняя строка'}},['path'])},
  {name:'search',description:'Поиск по файлам (grep -rn, регулярное выражение). Возвращает до 100 совпадений вида файл:строка:текст.',parameters:P({pattern:{type:'string'},path:{type:'string',description:'где искать, по умолчанию весь проект'},glob:{type:'string',description:'маска файлов, например *.kt'},literal:{type:'boolean',description:'искать как обычный текст'}},['pattern'])},
  {name:'edit_file',description:'Заменяет точный фрагмент old на new в существующем файле. old должен встречаться ровно один раз (или поставь replace_all). Сначала прочитай файл.',parameters:P({path:{type:'string'},old:{type:'string'},new:{type:'string'},replace_all:{type:'boolean'}},['path','old','new'])},
  {name:'write_file',description:'Создаёт файл или полностью перезаписывает его. Для небольших правок используй edit_file.',parameters:P({path:{type:'string'},content:{type:'string'}},['path','content'])},
  {name:'update_plan',description:'Ведёт список задач для пользователя. Для работы из 3 и более шагов сначала составь план и обновляй статусы по ходу (pending, doing, done). Каждый вызов передаёт список целиком.',parameters:P({items:{type:'array',items:{type:'object',properties:{text:{type:'string'},status:{type:'string',enum:['pending','doing','done']}},required:['text','status']}}},['items'])},
  {name:'run_command',description:'Выполняет команду оболочки в папке проекта (каждый вызов в новой оболочке, cd не сохраняется; делай «cd sub && …»). Только неинтерактивные команды, которые завершаются. Возвращает вывод и код выхода.',parameters:P({command:{type:'string'},timeout:{type:'integer',description:'секунд, по умолчанию 120, максимум 600'}},['command'])}];
 const defs=anth=>TOOLS.map(t=>anth?{name:t.name,description:t.description,input_schema:t.parameters}:{type:'function',function:{name:t.name,description:t.description,parameters:t.parameters}});
 /* ---- Нейтральная история → формат провайдера ---- */
 const pj=a=>{try{const v=JSON.parse(a||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch(e){return null}};
 const toOAI=conv=>{const o=[];for(const e of conv){
  if(e.role==='assistant'&&e.calls&&e.calls.length)o.push({role:'assistant',content:e.text||'',tool_calls:e.calls.map(c=>({id:c.id,type:'function',function:{name:c.name,arguments:c.args||'{}'}}))});
  else if(e.role==='tool')e.results.forEach(r=>o.push({role:'tool',tool_call_id:r.id,name:r.name,content:r.content}));
  else o.push({role:e.role,content:e.content!==undefined?e.content:(e.text||'')})}return o};
 const toAnth=conv=>{const o=[];for(const e of conv){
  if(e.role==='assistant'&&e.calls&&e.calls.length){const c=[];if(e.text)c.push({type:'text',text:e.text});e.calls.forEach(x=>c.push({type:'tool_use',id:x.id,name:x.name,input:pj(x.args)||{}}));o.push({role:'assistant',content:c})}
  else if(e.role==='tool')o.push({role:'user',content:e.results.map(r=>Object.assign({type:'tool_result',tool_use_id:r.id,content:r.content},r.err?{is_error:true}:{}))});
  else o.push({role:e.role,content:e.content!==undefined?e.content:(e.text||' ')})}return o};
 /* Старые результаты инструментов сжимаются, чтобы цикл не упирался в окно контекста. */
 const shrink=(conv,keep,cap)=>{let n=0;for(let i=conv.length-1;i>=0;i--){const e=conv[i];if(e.role!=='tool')continue;n++;if(n>keep)e.results.forEach(r=>{if(r.content.length>cap)r.content=r.content.slice(0,cap)+'\n[…вывод сокращён, чтобы освободить контекст]'})}};
 const toolChars=conv=>conv.reduce((a,e)=>a+(e.role==='tool'?e.results.reduce((b,r)=>b+r.content.length,0):0),0);
 /* ---- Среда выполнения ---- */
 let envC=null;
 const sh=async(cmd,o={},dd)=>{if(typeof Term==='undefined')return{code:-1,out:'',err:'терминал недоступен'};const be=envC&&envC.be||'android';return Term.exec('mkdir -p '+dirq(dd)+' && cd '+dirq(dd)+' || exit 1\n'+cmd,Object.assign({backend:be,nodiff:1},o))};
 const shRaw=async(cmd,o={})=>{if(typeof Term==='undefined')return{code:-1,out:'',err:'терминал недоступен'};const be=envC&&envC.be||'android';return Term.exec(cmd,Object.assign({backend:be,nodiff:1},o))};
 async function env(force){
  if(envC&&!force)return envC;
  let be='android';
  if(cfg.env==='termux')be='termux';
  else if(cfg.env!=='sandbox'&&Native.on){try{const r=await Term.exec('echo termux-ok',{backend:'termux',timeout:15});if(r.code===0&&/termux-ok/.test(r.out||''))be='termux'}catch(e){}}
  envC={be,info:''};
  try{const r=await sh('echo "cwd: $PWD"; uname -sm 2>/dev/null; for c in git python python3 pip node npm java gradle make gcc cargo go; do command -v $c >/dev/null 2>&1 && echo "есть: $c"; done',{timeout:30});envC.info=(r.out||'').trim().replace(/\n+/g,'; ')}catch(e){}
  return envC}
 const sysAgent=()=>'\n\n[РЕЖИМ АГЕНТА-ПРОГРАММИСТА]\nТы автономный агент в приложении Kairema на телефоне. Инструменты: list_dir, read_file, search, edit_file, write_file, run_command, update_plan. Если задача из трёх и более шагов, сначала составь план через update_plan и обновляй статусы. Работай циклом: изучи код → внеси минимальные правки → запусти проверку (тесты, сборку, линтер, если есть) → если ошибка, прочитай вывод, исправь, повтори, пока не заработает или не упрёшься в блокер.\nПравила: читай файл перед правкой; edit_file лучше write_file; не выдумывай содержимое файлов, которых не читал; пути относительные к папке проекта; каждая команда идёт в новой оболочке в папке проекта (cd не сохраняется); только неинтерактивные команды, которые завершаются; не читай огромные файлы целиком (диапазоны строк, search); не говори «готово», пока не проверил, а если проверить нельзя, скажи это прямо. Если действие отклонили, не обходи отказ другим способом, спроси пользователя.\nКогда закончишь, напиши коротко: что изменено (файлы), что проверено и с каким результатом, что осталось. Отвечай на языке пользователя.\nСреда: '+(envC?(envC.be==='termux'?'Termux':'песочница приложения (Android sh, без git и python)')+'. '+envC.info:'неизвестна')+'. Папка проекта: '+cfg.dir+'. Режим подтверждений: '+MODES[cfg.mode][0]+'.';
 /* ---- Выполнение инструментов ---- */
 const dec=b=>{const bin=atob(b.replace(/\s+/g,''));const u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);return new TextDecoder().decode(u)};
 const enc=t=>{const u=new TextEncoder().encode(t);let s='';for(let i=0;i<u.length;i+=0x8000)s+=String.fromCharCode.apply(null,u.subarray(i,i+0x8000));return btoa(s)};
 async function readRaw(p){const r=await sh('if [ -f '+sq(p)+' ]; then base64 < '+sq(p)+" | tr -d '\\n'; else echo __NOFILE__; fi",{timeout:30});const o=(r.out||'').trim();if(r.code!==0&&!o)throw new Error(r.err||'не удалось прочитать файл');if(o==='__NOFILE__')return null;try{return dec(o)}catch(e){throw new Error('файл не текстовый или повреждён')}}
 async function writeRaw(p,text){const b=enc(text),CH=40000;let first=1;
  if(!b.length){const r=await sh('mkdir -p "$(dirname '+sq(p)+')" && : > '+sq(p),{timeout:30});if(r.code!==0)throw new Error(trunc(r.out||r.err,500));return}
  for(let i=0;i<b.length;i+=CH){const r=await sh((first?'mkdir -p "$(dirname '+sq(p)+')" && ':'')+'printf %s '+sq(b.slice(i,i+CH))+' | base64 -d '+(first?'>':'>>')+' '+sq(p),{timeout:60});first=0;if(r.code!==0)throw new Error(trunc(r.out||r.err||('код '+r.code),500))}}
 let snaps=new Map(),curCmd=null,run=null;
 const GENV='GIT_AUTHOR_NAME=kairema GIT_AUTHOR_EMAIL=kairema@local GIT_COMMITTER_NAME=kairema GIT_COMMITTER_EMAIL=kairema@local';
 const hexOk=h=>/^[0-9a-f]{7,40}$/.test(String(h));
 /* Контрольная точка: снимок всех файлов проекта (без игнорируемых) как коммит-объект на ссылке refs/kairema/…, не трогая ветки, индекс и историю. */
 async function checkpoint(){
  const r=await sh('command -v git >/dev/null 2>&1 || { echo NOGIT; exit 0; }; [ -d .git ] || git init -q 2>&1; export GIT_INDEX_FILE=.git/kairema-idx; rm -f "$GIT_INDEX_FILE"; git add -A >/dev/null 2>&1; T=$(git write-tree) && C=$(echo "kairema checkpoint" | env '+GENV+' git commit-tree $T) && git update-ref refs/kairema/cp-$(date +%s) $C && echo "CP:$C"; rm -f "$GIT_INDEX_FILE"',{timeout:90});
  const mm=/CP:([0-9a-f]{7,40})/.exec(r.out||'');return mm?mm[1]:null}
 async function restoreCp(h,dd){
  if(!hexOk(h))throw new Error('неверная контрольная точка');
  const r=await sh('export GIT_INDEX_FILE=.git/kairema-idx; rm -f "$GIT_INDEX_FILE"; git read-tree '+h+' && git checkout-index -a -f && git ls-files -o --exclude-standard | while IFS= read -r f; do rm -f -- "$f"; done; rm -f "$GIT_INDEX_FILE"; echo RESTORED',{timeout:120},dd);
  if(!/RESTORED/.test(r.out||''))throw new Error(trunc(r.out||r.err||'не удалось',400))}
 async function changesCp(h,dd,full){
  if(!hexOk(h))return'';
  const r=await sh('export GIT_INDEX_FILE=.git/kairema-idx; rm -f "$GIT_INDEX_FILE"; git read-tree '+h+' && git add -A >/dev/null 2>&1; git diff --cached --stat '+h+' 2>&1 | tail -40; '+(full?'echo; git diff --cached --no-color -U2 '+h+' 2>&1 | head -600;':'')+' rm -f "$GIT_INDEX_FILE"',{timeout:90},dd);return(r.out||'').trim()}

 const snap=async p=>{if(!snaps.has(p))snaps.set(p,await readRaw(p))};
 const prev=(o,n)=>'− '+String(o).slice(0,500).split('\n').join('\n− ')+'\n+ '+String(n).slice(0,500).split('\n').join('\n+ ');
 async function exTool(n,a){
  const bad=k=>{throw new Error('нужен аргумент «'+k+'»')};
  if(n==='list_dir'){const p=rel(a.path);if(!p)throw new Error('путь вне папки проекта');const r=await sh('ls -1Ap -- '+sq(p)+' 2>&1 | head -300',{timeout:30});return trunc(r.out||'(пусто)')}
  if(n==='read_file'){if(!a.path)bad('path');const p=rel(a.path);if(!p)throw new Error('путь вне папки проекта');
   const s=Math.max(1,parseInt(a.start)||1),e=Math.max(s,parseInt(a.end)||s+399);
   const r=await sh('if [ ! -f '+sq(p)+" ]; then echo '__NOFILE__'; exit 2; fi; echo \"[всего строк: $(wc -l < "+sq(p)+")]\"; awk -v s="+s+' -v e='+e+" 'NR>=s&&NR<=e{printf \"%d\\t%s\\n\",NR,$0}' "+sq(p),{timeout:30});
   if(/__NOFILE__/.test(r.out||''))throw new Error('файла нет: '+p);return trunc(r.out)}
  if(n==='search'){if(!a.pattern)bad('pattern');const p=rel(a.path||'.');if(!p)throw new Error('путь вне папки проекта');
   const r=await sh('grep -rnI '+(a.literal?'-F ':'-E ')+'--exclude-dir=.git --exclude-dir=node_modules --exclude-dir=build '+(a.glob?'--include='+sq(a.glob)+' ':'')+'-e '+sq(a.pattern)+' -- '+sq(p)+' 2>&1 | head -100',{timeout:60});return trunc(r.out||'(совпадений нет)')}
  if(n==='edit_file'){if(!a.path)bad('path');if(typeof a.old!=='string'||!a.old)bad('old');if(typeof a.new!=='string')bad('new');const p=rel(a.path);if(!p)throw new Error('путь вне папки проекта');
   const t=await readRaw(p);if(t===null)throw new Error('файла нет: '+p+' (для нового файла используй write_file)');if(t.length>400000)throw new Error('файл слишком большой для edit_file');
   const c=t.split(a.old).length-1;if(!c)throw new Error('фрагмент old не найден в '+p+'. Прочитай файл заново и скопируй текст точно, с пробелами и переносами.');
   if(c>1&&!a.replace_all)throw new Error('фрагмент old найден '+c+' раз. Добавь соседние строки для однозначности или поставь replace_all.');
   await snap(p);await writeRaw(p,a.replace_all?t.split(a.old).join(a.new):t.replace(a.old,()=>a.new));return 'изменён '+p+(c>1?' ('+c+' замен)':'')}
  if(n==='write_file'){if(!a.path)bad('path');if(typeof a.content!=='string')bad('content');const p=rel(a.path);if(!p)throw new Error('путь вне папки проекта');
   await snap(p);await writeRaw(p,a.content);return 'записан '+p+' ('+a.content.length+' знаков, строк '+(a.content.split('\n').length)+')'}
  if(n==='update_plan'){if(!Array.isArray(a.items))bad('items');const it=a.items.slice(0,30).map(x=>({t:String(x&&x.text||'').slice(0,160),s:['pending','doing','done'].includes(x&&x.status)?x.status:'pending'})).filter(x=>x.t);if(run)run.m.plan=it;if(run)run.redraw();return 'план обновлён ('+it.filter(x=>x.s==='done').length+'/'+it.length+')'}
  if(n==='run_command'){if(!a.command)bad('command');const tm=Math.min(600,Math.max(5,parseInt(a.timeout)||120));
   const r=await sh('{ '+a.command+'\n} 2>&1',{timeout:tm,onStart:id=>{curCmd=id}});curCmd=null;
   return trunc(r.out||'')+'\n'+(r.err?('['+r.err+']'):'[код выхода: '+r.code+']')}
  throw new Error('неизвестный инструмент '+n)}
 /* ---- Подтверждения ---- */
 let sheetNow=null;const allow={edit:0,run:0};
 const ASK=(title,body)=>new Promise(res=>{const s=sheet('<h2></h2><pre class="cdp"></pre><div class="two" style="margin-top:12px"><button class="btn ghost" data-n></button><button class="btn" data-y></button></div><button class="btn ghost" data-a style="width:100%;margin-top:8px"></button>');
  $('h2',s).textContent=title;$('pre',s).textContent=body;$('[data-n]',s).textContent=L('Отклонить');$('[data-y]',s).textContent=L('Разрешить');$('[data-a]',s).textContent=L('Разрешать такое до конца чата');
  let done=0;const fin=v=>{if(done)return;done=1;sheetNow=null;s.close();res(v)};sheetNow={fin};
  $('[data-n]',s).onclick=()=>fin('no');$('[data-y]',s).onclick=()=>fin('once');$('[data-a]',s).onclick=()=>fin('always');
  s.addEventListener('click',e=>{if(e.target===s)fin('no')})});
 async function permit(n,a){
  const kind=n==='run_command'?'run':(n==='edit_file'||n==='write_file')?'edit':'';
  if(!kind)return{ok:1};
  if(cfg.mode==='read')return{ok:0,why:'Включён режим «Только чтение»: изменять файлы и запускать команды нельзя. Предложи изменения текстом.'};
  const dng=kind==='run'&&typeof Term!=='undefined'&&Term.danger(String(a.command||''));
  let need=1;
  if(cfg.mode==='auto')need=!!dng;
  else if(cfg.mode==='edit')need=kind==='run'?!safeCmd(a.command):0;
  else if(kind==='run'&&safeCmd(a.command))need=0;
  else if(allow[kind]&&!dng)need=0;
  if(!need)return{ok:1};
  const body=kind==='run'?'$ '+a.command+(dng?'\n\n⚠ Команда выглядит опасной.':''):(n==='edit_file'?a.path+'\n\n'+prev(a.old,a.new):a.path+'\n\n'+String(a.content||'').slice(0,1200)+(String(a.content||'').length>1200?'\n…':''));
  Native.sync('agentNotify','Агент ждёт разрешения',(kind==='run'?'$ '+a.command:a.path)||'');
  const v=await ASK(kind==='run'?L('Выполнить команду?'):(n==='edit_file'?L('Изменить файл?'):L('Записать файл?')),body);
  if(v==='no')return{ok:0,why:'Пользователь отклонил это действие. Не повторяй его, предложи другой путь или спроси, что делать.'};
  if(v==='always'&&!dng)allow[kind]=1;
  return{ok:1}}
 /* ---- Карточки шагов ---- */
 const short=(n,a)=>{const x=a.path||a.command||a.pattern||'';return n+(x?' '+String(x).replace(/\s+/g,' ').slice(0,80):'')};
 const stepEl=s=>{const d=document.createElement('details');d.className='cds '+(s.k==='say'?'say':s.st||'');const u=document.createElement('summary');u.textContent=s.k==='say'?'💬 '+String(s.t).replace(/\s+/g,' ').slice(0,90):({run:'⏳ ',ok:'✓ ',err:'✗ ',no:'⊘ '}[s.st]||'')+s.h;d.append(u);const b=document.createElement('pre');b.textContent=s.k==='say'?s.t:(s.d||'')+(s.o?(s.d?'\n\n':'')+s.o:'');if(b.textContent)d.append(b);return d};
 const cardsFor=(d,m)=>{let c=$('.cdc',d);if(!c){c=document.createElement('div');c.className='cdc';const bd=$('.bd',d);d.insertBefore(c,bd)}c.innerHTML='';if(m.plan&&m.plan.length){const pl=document.createElement('div');pl.className='cdpl';m.plan.forEach(x=>{const r=document.createElement('div');r.className='cdpi '+x.s;r.textContent=({done:'☑ ',doing:'▶ ',pending:'☐ '}[x.s]||'☐ ')+x.t;pl.append(r)});c.append(pl)}(m.ag||[]).forEach(s=>c.append(stepEl(s)));return c};
 const colorDiff=(pre,t)=>{pre.textContent='';String(t).split('\n').forEach(l=>{const r=document.createElement('div');r.textContent=l||' ';if(/^\+(?!\+\+)/.test(l))r.className='dp';else if(/^-(?!--)/.test(l))r.className='dm';else if(/^@@/.test(l))r.className='dh';pre.append(r)})};
 /* Кнопки под ответом агента: «Изменения» и откат (по контрольной точке git или по снимкам файлов этого запуска). */
 function actions(d,m,mine){
  const old=$('.cda',d);if(old)old.remove();
  if(!m.cp&&!(mine&&mine.size))return;
  const w=document.createElement('div');w.className='cda';
  const btn=(t,fn)=>{const b=el('<button class="more-old"></button>');b.textContent=t;b.onclick=fn;w.append(b);return b};
  if(m.cp){
   btn(L('Изменения'),async()=>{const s=sheet('<h2></h2><pre class="cdp cdd"></pre><button class="btn ghost" data-x style="width:100%;margin-top:10px"></button>');$('h2',s).textContent=L('Изменения агента');$('[data-x]',s).textContent=L('Закрыть');$('[data-x]',s).onclick=()=>s.close();const pre=$('.cdd',s);pre.textContent=L('Загружаю…');try{envC=envC||await env();const t=await changesCp(m.cp.h,m.cp.dir,1);colorDiff(pre,t||L('Изменений нет'))}catch(e){pre.textContent=e.message}});
   btn(L('Откатить к точке')+' '+m.cp.h.slice(0,7),()=>ask(L('Откатить к точке?'),L('Файлы проекта вернутся к состоянию до этого запуска агента, новые файлы удалятся. Ваши правки после запуска тоже пропадут.'),L('Откатить'),async()=>{try{envC=envC||await env();await restoreCp(m.cp.h,m.cp.dir);toast(L('Правки откатаны'))}catch(e){toast(e.message)}}));
  }else{
   const keep=new Map(mine);btn(L('Откатить правки')+' ('+keep.size+')',()=>ask(L('Откатить правки?'),L('Файлы вернутся к состоянию до этого запуска агента.'),L('Откатить'),async()=>{w.remove();envC=envC||await env();for(const[f,o]of keep){try{if(o===null)await sh('rm -f '+sq(f),{timeout:20});else await writeRaw(f,o)}catch(e){}}toast(L('Правки откатаны'))}))}
  d.append(w)}

 Hooks.on('msg:render',(d,m)=>{if(m&&((m.ag&&m.ag.length)||(m.plan&&m.plan.length)))cardsFor(d,m);if(m&&m.cp&&!$('.cda',d))actions(d,m)});
 /* ---- Основной цикл ---- */
 async function respond(msgs,box,tag){
  const p=actProv(),anth=/anthropic\.com/.test(p.url);
  const m={r:'a',t:'',ag:[]};msgs.push(m);const d=msgEl(m,1);box.append(d);const bd=$('.bd',d);bd.innerHTML='<span class="typing"><i></i><i></i><i></i></span>';scr(box);
  const redraw=()=>{cardsFor(d,m);scl(box)};
  const add=s=>{m.ag.push(s);redraw();return s};
  const fail=(txt)=>{m.err=1;m.t=bd.textContent=txt;try{Log.add('chat',txt)}catch(e){}};
  if(!Native.on){fail('Агент работает только в приложении на телефоне.');return}
  snaps=new Map();allow.edit=0;allow.run=0;
  let stopped=0,pr=null;
  window.GEN={stopped:0,pr:null,stop(){stopped=1;this.stopped=1;if(pr)Native.cancel(pr.id);if(curCmd)Native.cancel(curCmd);if(sheetNow)sheetNow.fin('no')}};
  if(Chat.cmp&&Chat.cmp.upd)Chat.cmp.upd();
  Native.sync('agentKeep',true);
  try{
   await env();
   run={m,redraw};let cpH=null;
   try{if(navigator.getBattery){const bt=await navigator.getBattery();if(bt&&!bt.charging&&bt.level<.15&&!window.__cdBat){window.__cdBat=1;toast(L('Батарея ниже 15%: долгий прогон агента может не завершиться'))}}}catch(e){}
   if(/есть: git/.test(envC.info||''))try{cpH=await checkpoint()}catch(e){}
   const last=msgs.filter(x=>x.r==='u').pop();
   const base=(typeof Ctx!=='undefined'?Ctx.view(msgs):msgs).filter(x=>x!==m&&!x.err&&x.t).map(x=>({role:x.r==='u'?'user':'assistant',content:toContent(x,anth,'')}));
   const conv=base.slice();
   const sys=sysPrompt()+sysAgent()+(typeof sysExtra==='function'?sysExtra(msgs):'');
   const turn=async tools=>{
    let text='',calls=[],cut=0;bd.textContent='';
    const prov={id:p.id,url:p.url,model:p.model,system:sys,think:0,notify:0};if(tools)prov.tools=defs(anth);
    const out=anth?toAnth(conv):toOAI(conv);
    pr=Native.run('chat',[JSON.stringify(prov),JSON.stringify(out)],t=>{const c=t.charCodeAt(0);
     if(c===3){cut=1;return}if(c===2)return;if(c===1)return;
     if(c===4){try{calls=JSON.parse(t.slice(1))}catch(e){}return}
     text+=t;bd.textContent=text;scl(box)});
    window.GEN.pr=pr;
    await pr;pr=null;return{text,calls,cut}};
   let step=0,final='',nudged=0,force=0;const rep=new Map();
   for(;;){
    if(stopped)break;
    let r;
    try{r=await turn(!force)}
    catch(e){
     if(stopped)break;
     if(/слишком большой/.test(String(e.message))&&!r&&!m._shr){m._shr=1;shrink(conv,3,200);continue}
     const hint=/400|tool|function/i.test(e.message)?' Возможно, эта модель или провайдер не поддерживает вызов инструментов: выберите другую модель.':'';
     throw new Error(e.message+hint)}
    if(stopped)break;
    if(!r.calls.length){
     if(!r.text.trim()&&step>0&&!nudged){nudged=1;conv.push({role:'user',content:'Подведи итог: что изменено, что проверено и с каким результатом, что осталось.'});continue}
     final=r.text;if(r.cut)m.cut=1;break}
    if(r.text.trim())add({k:'say',t:r.text.trim()});bd.innerHTML='<span class="typing"><i></i><i></i><i></i></span>';
    conv.push({role:'assistant',text:r.text,calls:r.calls});
    const results=[];
    for(const c of r.calls){
     if(stopped)break;
     const a=pj(c.args),st={k:'tool',n:c.name,h:short(c.name,a||{}),st:'run',d:'',o:''};
     if(c.name==='edit_file'&&a)st.d=prev(a.old||'',a.new||'');else if(c.name==='write_file'&&a)st.d=String(a.content||'').slice(0,600);else if(c.name==='run_command'&&a)st.d='$ '+a.command;
     add(st);
     let res,err=0;
     if(!a){res='Аргументы не разобраны: невалидный JSON. Вызови инструмент заново с корректными аргументами.';err=1;st.st='err'}
     else{
      const key=c.name+'|'+c.args,seen=(rep.get(key)||0)+1;rep.set(key,seen);
      try{
       const pm=await permit(c.name,a);
       if(!pm.ok){res=pm.why;err=1;st.st='no'}
       else{res=await exTool(c.name,a);st.st=/\[код выхода: (?!0\])/.test(res)&&c.name==='run_command'?'err':'ok'}
      }catch(e){res='Ошибка: '+e.message;err=1;st.st='err'}
      if(seen>=3)res+='\n[Ты уже '+seen+' раза вызвал это же действие с теми же аргументами. Смени подход или остановись и объясни, что мешает.]';
      if(seen>=5)force=1}
     st.o=trunc(res,1500);redraw();
     results.push({id:c.id,name:c.name,content:res,err:err||st.st==='err'?1:0})}
    if(stopped)break;
    conv.push({role:'tool',results});
    step++;
    if(toolChars(conv)>60000)shrink(conv,6,400);
    if(force||step>=cfg.steps){conv.push({role:'user',content:'Лимит шагов исчерпан или действия зациклились. Без новых вызовов инструментов кратко скажи, что сделано, что проверено и что осталось.'});const f=await turn(0);final=f.text||'';break}
   }
   if(stopped){m.stopped=1;final=final||'⏹ Остановлено.'}
   m.t=final||'(агент закончил без текста)';
   mdRender(bd,m.t,m);
   if(cpH)m.cp={h:cpH,dir:cfg.dir};
   actions(d,m,snaps.size?new Map(snaps):null);
   if(!m.stopped)Hooks.run('chat:answer',m,bd);
  }catch(e){
   if(stopped){m.stopped=1;m.t=m.t||'⏹ Остановлено.';mdRender(bd,m.t,m)}
   else fail('Агент остановился: '+e.message)
  }finally{run=null;Native.sync('agentNotify','Kairema',m.stopped?'Агент остановлен':(m.err?'Агент остановился с ошибкой':'Агент закончил: '+String(m.t||'').slice(0,120)));Native.sync('agentKeep',false);window.GEN=null;if(Chat.cmp&&Chat.cmp.upd)Chat.cmp.upd()}
 }
 /* ---- Интерфейс: кнопка в композере и окно настроек ---- */
 const fold=()=>(cfg.dir||'kairema-work');
 function bar(v){
  const cmp=Chat&&Chat.cmp;if(!cmp)return;
  const old=$('.cdb',v);if(old)old.remove();
  let b=$('[data-coder]',cmp);
  if(!b){const tb=$('[data-tb]',cmp);if(!tb)return;b=el('<button class="cb cdt" data-coder aria-label="Агент-программист" title="Агент-программист">'+ic('term')+'</button>');tb.before(b);b.onclick=()=>{cfg.on=cfg.on?0:1;save();if(cfg.on&&!localStorage.getItem('kairema.coder.seen')){try{localStorage.setItem('kairema.coder.seen','1')}catch(e){}panel()}bar(v)}}
  b.classList.toggle('on',!!cfg.on);b.setAttribute('aria-pressed',cfg.on?'true':'false');
  if(cfg.on){const x=el('<button class="cdb"></button>');x.textContent='🤖 '+L('Агент')+' · '+L(MODES[cfg.mode][0])+' · '+fold();x.onclick=panel;cmp.before(x)}}
 /* Выбор папки проекта: обзор каталогов в Termux или песочнице. */
 async function pickDir(done){
  const s=sheet('<h2></h2><div class="cdwd" data-w></div><div class="cdls" data-l></div><div class="two" style="margin-top:10px"><button class="btn ghost" data-x></button><button class="btn" data-ok></button></div>');
  $('h2',s).textContent=L('Папка проекта');$('[data-x]',s).textContent=L('Отмена');$('[data-ok]',s).textContent=L('Выбрать эту папку');
  let cur=null;const wd=$('[data-w]',s),ls=$('[data-l]',s);
  const go=async p=>{ls.textContent=L('Загружаю…');try{await env();const r=await shRaw((p?'cd '+sq(p)+' 2>/dev/null || cd "$HOME" 2>/dev/null; ':'cd "$HOME" 2>/dev/null; ')+'echo "__PWD__$PWD"; ls -1Ap 2>/dev/null | grep "/$" | head -200',{timeout:30});const o=String(r.out||'').split('\n');const pw=o.find(x=>x.startsWith('__PWD__'));cur=pw?pw.slice(7).trim():'';wd.textContent=cur;ls.innerHTML='';
   const row=(t,fn)=>{const b=el('<button class="cdo"></button>');b.textContent=t;b.onclick=fn;ls.append(b)};
   if(cur&&cur!=='/')row('↑ ..',()=>go(cur.replace(/\/[^\/]*$/,'')||'/'));
   o.filter(x=>x&&!x.startsWith('__PWD__')&&x.endsWith('/')&&x!=='./'&&x!=='../').forEach(x=>row(x,()=>go((cur==='/'?'':cur)+'/'+x.slice(0,-1))));
   if(!ls.children.length)ls.textContent=L('Папок нет')}catch(e){ls.textContent=e.message}};
  $('[data-x]',s).onclick=()=>s.close();$('[data-ok]',s).onclick=()=>{if(cur){cfg.dir=cur;envC=null;save();done&&done(cur)}s.close()};
  go('')}
 function panel(){
  const s=sheet('<h2></h2><p class="sub" style="margin:6px 0 10px"></p><div class="cdm"></div><label class="cdl"></label><input class="cdi" data-d autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn ghost" data-pd style="width:100%;margin-top:6px"></button><label class="cdl"></label><div class="cdr" data-s></div><label class="cdl"></label><div class="cdr" data-e></div><div class="cdi2" data-i></div><button class="btn ghost" data-ck style="width:100%;margin-top:8px"></button><button class="btn" data-ok style="width:100%;margin-top:8px"></button><button class="btn ghost" data-off style="width:100%;margin-top:8px"></button>');
  $('h2',s).textContent=L('Агент-программист');
  $('.sub',s).textContent=L('Модель сама читает файлы, правит код, запускает команды и повторяет, пока не заработает. Нужна модель с поддержкой вызова инструментов.');
  const L1=$$('.cdl',s);L1[0].textContent=L('Папка проекта (внутри Termux или песочницы)');L1[1].textContent=L('Лимит шагов за запрос');L1[2].textContent=L('Где выполнять команды');
  const mm=$('.cdm',s),rm=()=>{mm.innerHTML='';Object.keys(MODES).forEach(k=>{const b=el('<button class="cdo"><b></b><small></small></button>');$('b',b).textContent=L(MODES[k][0]);$('small',b).textContent=L(MODES[k][1]);b.classList.toggle('on',cfg.mode===k);b.onclick=()=>{cfg.mode=k;save();rm()};mm.append(b)})};rm();
  const di=$('[data-d]',s);di.value=cfg.dir;di.onchange=()=>{const v=di.value.trim();cfg.dir=v&&!/\.\./.test(v)?v:'kairema-work';di.value=cfg.dir;envC=null;save()};
  const pd=$('[data-pd]',s);pd.textContent=L('Выбрать папку…');pd.onclick=()=>pickDir(v=>{di.value=v});
  const seg=(box,opts,get,set)=>{const r=()=>{box.innerHTML='';opts.forEach(([v,t])=>{const b=el('<button class="cdg"></button>');b.textContent=t;b.classList.toggle('on',get()===v);b.onclick=()=>{set(v);save();r()};box.append(b)})};r()};
  seg($('[data-s]',s),[[20,'20'],[40,'40'],[80,'80'],[150,'150']],()=>cfg.steps,v=>cfg.steps=v);
  seg($('[data-e]',s),[['auto',L('Авто')],['sandbox',L('Песочница')],['termux','Termux']],()=>cfg.env,v=>{cfg.env=v;envC=null});
  const inf=$('[data-i]',s);inf.textContent=L('Авто: Termux, если он установлен и разрешён, иначе песочница приложения (без git и python).');
  const ck=$('[data-ck]',s);ck.textContent=L('Проверить окружение');ck.onclick=async()=>{inf.textContent=L('Проверяю…');try{const e=await env(1);inf.textContent=(e.be==='termux'?'Termux':L('Песочница'))+(e.info?': '+e.info:'')}catch(x){inf.textContent=x.message}};
  const ok=$('[data-ok]',s);ok.textContent=L('Готово');ok.onclick=()=>{cfg.on=1;save();s.close();bar($('#v-api'))};
  const off=$('[data-off]',s);off.textContent=L('Выключить агента');off.onclick=()=>{cfg.on=0;save();s.close();bar($('#v-api'))}}
 Hooks.on('chat:rendered',v=>bar(v));
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-coder-s]',v))return;
  const r=el('<button class="sr" data-coder-s><span class="si c">'+ic('term')+'</span><span class="m"><b></b><small></small></span>'+ic('chevR')+'</button>');
  $('b',r).textContent=L('Агент-программист');$('small',r).textContent=L('Модель сама правит код и запускает проверки (Termux или песочница)');
  r.onclick=panel;ab.before(r)});
 i18nAdd({"Изменения":"Changes","Изменения агента":"Agent changes","Закрыть":"Close","Загружаю…":"Loading…","Изменений нет":"No changes","Откатить к точке":"Roll back to checkpoint","Откатить к точке?":"Roll back to the checkpoint?","Файлы проекта вернутся к состоянию до этого запуска агента, новые файлы удалятся. Ваши правки после запуска тоже пропадут.":"Project files return to the state before this agent run; new files are deleted. Your own edits made since then are lost too.","Папка проекта":"Project folder","Выбрать папку…":"Choose a folder…","Выбрать эту папку":"Use this folder","Отмена":"Cancel","Папок нет":"No folders","Батарея ниже 15%: долгий прогон агента может не завершиться":"Battery below 15%: a long agent run may not finish","Агент-программист":"Coding agent","Агент":"Agent","Только чтение":"Read only","Спрашивать":"Ask first","Правки сами":"Auto-edit","Полный авто":"Full auto","Читает и ищет, ничего не меняет и не запускает":"Reads and searches only","Читает сам; каждую правку и команду показывает и ждёт разрешения":"Reads on its own; asks before every edit and command","Файлы правит сам; команды (кроме безопасных вроде ls, git status) спрашивает":"Edits files itself; asks before commands (except safe ones like ls, git status)","Правит и запускает всё сам; опасные команды (rm -r, sudo…) всё равно спрашивает":"Edits and runs everything itself; still asks for dangerous commands (rm -r, sudo…)","Отклонить":"Deny","Разрешить":"Allow","Разрешать такое до конца чата":"Allow this kind until the chat ends","Изменить файл?":"Change the file?","Записать файл?":"Write the file?","Откатить правки":"Undo changes","Откатить правки?":"Undo changes?","Откатить":"Undo","Правки откатаны":"Changes undone","Файлы вернутся к состоянию до этого запуска агента.":"Files will return to the state before this agent run.","Готово":"Done","Выключить агента":"Turn the agent off","Проверить окружение":"Check the environment","Проверяю…":"Checking…","Песочница":"Sandbox","Авто":"Auto","Лимит шагов за запрос":"Step limit per request","Где выполнять команды":"Where to run commands","Папка проекта (внутри Termux или песочницы)":"Project folder (inside Termux or the sandbox)","Модель сама читает файлы, правит код, запускает команды и повторяет, пока не заработает. Нужна модель с поддержкой вызова инструментов.":"The model reads files, edits code, runs commands and repeats until it works. Needs a model that supports tool calling.","Авто: Termux, если он установлен и разрешён, иначе песочница приложения (без git и python).":"Auto: Termux if installed and allowed, otherwise the app sandbox (no git or python).","Модель сама правит код и запускает проверки (Termux или песочница)":"The model edits code and runs checks itself (Termux or sandbox)"});
 const toggle=v=>{cfg.on=v===undefined?(cfg.on?0:1):(v?1:0);save();const x=$('#v-api');if(x)bar(x)};
 return{on:()=>!!cfg.on,toggle,respond,cfg,tools:TOOLS,defs,toOAI,toAnth,safeCmd,rel,trunc,shrink,panel,env,MODES,get envC(){return envC},_reset(){envC=null}}})();
