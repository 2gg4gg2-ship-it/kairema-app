/* ===== АГЕНТ-ПРОГРАММИСТ (Coder) =====
   Модель получает настоящие инструменты (tool calling, как у Codex и Claude Code) и сама ведёт работу циклом:
   изучить код → править → запустить проверку → прочитать ошибку → исправить → повторить, пока не заработает.
   Инструменты: list_dir, read_file (с диапазоном строк), search (grep), edit_file (замена точного фрагмента), apply_patch (несколько правок разом,
   всё или ничего), write_file, run_command, update_plan, web_fetch (чтение веб-страниц), task (подагент: читает и ищет в отдельном контексте).
   Инструкции проекта: файл KAIREMA.md, AGENTS.md или CLAUDE.md в корне папки проекта читается и добавляется в системный запрос (опция cfg.instr).
   Хуки (.kairema/hooks.json, выключены по умолчанию), навыки (/init /review /tests /continue и .kairema/skills/*.md), журнал действий прошлых запусков в истории,
   read_image (картинка из проекта, до 400 КБ, если у модели есть зрение).
   Расширения: Coder.register({defs,has,call,meta,ready}) — так подключаются MCP-серверы (features/mcp/mcp.js).
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
 const cfg={on:0,mode:'ask',dir:'kairema-work',steps:40,env:'auto',instr:1,hooks:0};
 const INSTR=['KAIREMA.md','AGENTS.md','CLAUDE.md'];
 /* Правило языка ставится в самый конец системного запроса (последнее слышнее): слабые модели иначе уходят на китайский. */
 const langRule=t=>'\n\n[ЯЗЫК ОТВЕТА] Всегда пиши на языке последнего сообщения пользователя'+(/[а-яёіїєґ]/i.test(String(t||''))?' (русский или украинский, как у пользователя)':'')+': и текст между шагами, и итог. Не переходи на китайский или другой язык, даже если файлы, веб-страницы и ответы инструментов на другом языке. Код, команды и имена файлов не переводи.';
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
  {name:'apply_patch',description:'Несколько правок за один вызов, в одном или нескольких файлах. Правки одного файла применяются по порядку. Всё или ничего: если хоть одна не подходит, ни один файл не меняется. У каждой правки: path, old (точный фрагмент, ровно одно вхождение, либо replace_all), new.',parameters:P({edits:{type:'array',items:{type:'object',properties:{path:{type:'string'},old:{type:'string'},new:{type:'string'},replace_all:{type:'boolean'}},required:['path','old','new']}}},['edits'])},
  {name:'web_fetch',description:'Читает веб-страницу или документацию по адресу и возвращает текст (HTML превращается в читаемый текст со ссылками). Для длинных страниц используй start (смещение в знаках) и max_chars. Только чтение; пользователь подтверждает доступ к новому сайту.',parameters:P({url:{type:'string'},start:{type:'integer'},max_chars:{type:'integer',description:'по умолчанию 15000, максимум 40000'}},['url'])},
  {name:'task',description:'Запускает подагента с чистым контекстом: он сам читает файлы, ищет по проекту и открывает веб-страницы (только чтение, ничего не правит и не запускает) и возвращает краткий отчёт. Используй для исследования большого кода, поиска нужных мест и чтения документации, чтобы не засорять основной контекст. В prompt опиши задачу полностью: подагент не видит этот разговор. Несколько вызовов task в одном ответе выполняются параллельно.',parameters:P({description:{type:'string',description:'короткое название, 3–6 слов'},prompt:{type:'string',description:'полное задание и что именно вернуть в отчёте'}},['description','prompt'])},
  {name:'skill',description:'Загружает инструкцию навыка по имени (список навыков есть в системном запросе). Выполни её задание.',parameters:P({name:{type:'string'}},['name'])},
  {name:'read_image',description:'Показывает тебе изображение из папки проекта (png, jpg, webp, gif, до 400 КБ), например скриншот ошибки. Работает, если у модели есть зрение. Изображение придёт следующим сообщением.',parameters:P({path:{type:'string'}},['path'])},
  {name:'update_plan',description:'Ведёт список задач для пользователя. Для работы из 3 и более шагов сначала составь план и обновляй статусы по ходу (pending, doing, done). Каждый вызов передаёт список целиком.',parameters:P({items:{type:'array',items:{type:'object',properties:{text:{type:'string'},status:{type:'string',enum:['pending','doing','done']}},required:['text','status']}}},['items'])},
  {name:'run_command',description:'Выполняет команду оболочки в папке проекта (каждый вызов в новой оболочке, cd не сохраняется; делай «cd sub && …»). Только неинтерактивные команды, которые завершаются. Возвращает вывод и код выхода.',parameters:P({command:{type:'string'},timeout:{type:'integer',description:'секунд, по умолчанию 120, максимум 600'}},['command'])}];
 const ext=[];
 const register=p=>{if(p&&!ext.includes(p))ext.push(p)};
 const extOf=n=>ext.find(p=>{try{return p.has(n)}catch(e){return false}});
 const allTools=()=>TOOLS.concat(...ext.map(p=>{try{return p.defs()||[]}catch(e){return[]}}));
 const dmap=(list,anth)=>list.map(t=>anth?{name:t.name,description:t.description,input_schema:t.parameters}:{type:'function',function:{name:t.name,description:t.description,parameters:t.parameters}});
 const defs=anth=>dmap(allTools(),anth);
 /* ---- Нейтральная история → формат провайдера ---- */
 const pj=a=>{try{const v=JSON.parse(a||'{}');return v&&typeof v==='object'&&!Array.isArray(v)?v:null}catch(e){return null}};
 const toOAI=conv=>{const o=[];for(const e of conv){
  if(e.role==='assistant'&&e.calls&&e.calls.length)o.push({role:'assistant',content:e.text||'',tool_calls:e.calls.map(c=>({id:c.id,type:'function',function:{name:c.name,arguments:c.args||'{}'}}))});
  else if(e.role==='tool'){e.results.forEach(r=>o.push({role:'tool',tool_call_id:r.id,name:r.name,content:r.content}));
   if(e.imgs&&e.imgs.length)o.push({role:'user',content:[{type:'text',text:'Изображения по твоему запросу read_image: '+e.imgs.map(x=>x.path).join(', ')},...e.imgs.map(x=>({type:'image_url',image_url:{url:'data:'+x.mime+';base64,'+x.data}}))]})}
  else o.push({role:e.role,content:e.content!==undefined?e.content:(e.text||'')})}return o};
 const toAnth=conv=>{const o=[];for(const e of conv){
  if(e.role==='assistant'&&e.calls&&e.calls.length){const c=[];if(e.text)c.push({type:'text',text:e.text});e.calls.forEach(x=>c.push({type:'tool_use',id:x.id,name:x.name,input:pj(x.args)||{}}));o.push({role:'assistant',content:c})}
  else if(e.role==='tool')o.push({role:'user',content:e.results.map(r=>Object.assign({type:'tool_result',tool_use_id:r.id,content:r.content},r.err?{is_error:true}:{})).concat((e.imgs||[]).map(x=>({type:'image',source:{type:'base64',media_type:x.mime,data:x.data}})))});
  else o.push({role:e.role,content:e.content!==undefined?e.content:(e.text||' ')})}return o};
 /* Старые результаты инструментов сжимаются, чтобы цикл не упирался в окно контекста. */
 const shrink=(conv,keep,cap)=>{let n=0;for(let i=conv.length-1;i>=0;i--){const e=conv[i];if(e.role!=='tool')continue;n++;if(n>keep){e.imgs=null;e.results.forEach(r=>{if(r.content.length>cap)r.content=r.content.slice(0,cap)+'\n[…вывод сокращён, чтобы освободить контекст]'})}}};
 const toolChars=conv=>conv.reduce((a,e)=>a+(e.role==='tool'?e.results.reduce((b,r)=>b+r.content.length,0):0),0);

 /* ---- Хуки проекта: .kairema/hooks.json (по умолчанию выключены: cfg.hooks) ----
    {"hooks":[{"event":"after_edit","match":"*.py","run":"python -m pyflakes {file}"},
              {"event":"before_command","match":"git push*","block":true,"message":"push только вручную"},
              {"event":"on_finish","run":"python -m pytest -q"}]}
    after_edit: после edit_file/write_file/apply_patch запускается run для подходящего файла ({file}), вывод попадает в ответ инструмента;
    before_command: run (код выхода не 0 запрещает команду) или block; on_finish: когда модель закончила, run; при ошибке модель получает вывод и исправляет (до 2 раз). */
 const HEV=['before_command','after_edit','on_finish'];
 const gmatch=(g,s,cmd)=>{try{const re=new RegExp('^'+String(g).replace(/[.+^${}()|[\]\\]/g,'\\$&').replace(/\*\*/g,'\u0000').replace(/\*/g,cmd?'.*':'[^/]*').replace(/\u0000/g,'.*').replace(/\?/g,cmd?'.':'[^/]')+'$');return cmd?re.test(s):(re.test(s)||re.test(String(s).split('/').pop()))}catch(e){return false}};
 const parseHooks=t=>{let j;try{j=JSON.parse(t)}catch(e){return{err:'hooks.json: невалидный JSON'}}
  const a=Array.isArray(j)?j:(j&&Array.isArray(j.hooks)?j.hooks:null);if(!a)return{err:'hooks.json: ожидается {"hooks":[…]}'};
  const out=[];for(const h of a.slice(0,20)){if(!h||!HEV.includes(h.event)||(!h.run&&!h.block))continue;
   out.push({event:h.event,match:typeof h.match==='string'?h.match.slice(0,200):'',run:typeof h.run==='string'?h.run.slice(0,500):'',block:!!h.block,message:typeof h.message==='string'?h.message.slice(0,300):''})}
  return{hooks:out}};
 const runHook=async(h,file)=>{const r=await sh(h.run.replace(/\{file\}/g,()=>sq(file||'')),{timeout:60});return{code:r.err?-1:r.code,out:trunc((r.err||r.out||'').trim(),1500)}};
 /* ---- Навыки: встроенные и из .kairema/skills/<имя>.md (первая строка или description: в начале файла — описание) ---- */
 const BUILTIN={
  init:{d:'Создать или обновить AGENTS.md для проекта',b:'Изучи проект (структура, файлы сборки, тесты, стиль кода) и создай в корне файл AGENTS.md: краткое описание проекта, как собирать и запускать тесты, правила стиля, чего нельзя делать. Если файл уже есть, обнови его, не теряя прежних правил. Пиши коротко и по делу.'},
  review:{d:'Проверить последние изменения, ничего не правя',b:'Проверь последние изменения в проекте (если есть git, смотри git status и git diff, иначе файлы, изменённые последними). Найди ошибки, пропущенные случаи и проблемы стиля, читай нужные файлы целиком. Ничего не правь: выдай список замечаний по важности, у каждого файл и строка.'},
  tests:{d:'Запустить тесты и исправить падения',b:'Найди, как в проекте запускаются тесты, запусти их. Если есть падения, исправь причину (не подгоняй тесты), затем запусти снова. В конце коротко: что падало, что исправлено, что осталось.'},
  continue:{d:'Продолжить прерванную работу',b:'Продолжи прерванную работу по журналу действий прошлого запуска (он выше в разговоре). Проверь по файлам, что уже сделано, и доведи оставшееся до конца.'}};
 const skName=n=>/^[A-Za-z0-9_-]{1,32}$/.test(String(n||''));
 const skBody=t=>String(t).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/,'').trim();
 async function getSkill(n){
  if(!skName(n))return null;
  let t=null;try{t=await readRaw('.kairema/skills/'+n+'.md')}catch(e){}
  if(t&&t.trim())return trunc(skBody(t),12000);
  return BUILTIN[n]?BUILTIN[n].b:null}
 /* Один вызов оболочки читает всё, что нужно перед запуском: файл инструкций, хуки и список навыков (на Termux каждый вызов занимает время). */
 async function probeCtx(){
  const res={ins:null,hooks:null,skills:Object.keys(BUILTIN).map(k=>({n:k,d:BUILTIN[k].d}))};
  let o='';try{const r=await sh('for f in '+INSTR.join(' ')+'; do if [ -f "$f" ]; then echo "@@KP:INS:$f"; head -c 14000 "$f"; echo; [ "$(wc -c < "$f")" -gt 14000 ] && echo "…[файл обрезан: показаны первые 14000 байт]"; break; fi; done; if [ -f .kairema/hooks.json ]; then echo "@@KP:HOOKS"; head -c 20000 .kairema/hooks.json; echo; fi; for f in .kairema/skills/*.md; do [ -f "$f" ] || continue; echo "@@KP:SKILL:${f##*/}"; head -c 500 "$f"; echo; done 2>/dev/null',{timeout:30});o=String(r.out||'')}catch(e){}
  o.split('@@KP:').slice(1).forEach(blk=>{const i=blk.indexOf('\n'),h=blk.slice(0,i).trim(),body=blk.slice(i+1);
   if(h.startsWith('INS:')){const t=body.replace(/\n$/,'');if(t.trim())res.ins={f:h.slice(4),t}}
   else if(h==='HOOKS')res.hooks=body;
   else if(h.startsWith('SKILL:')&&res.skills.length<40){const nm=h.slice(6).replace(/\.md$/,'');if(!skName(nm))return;
    const fm=/^description:\s*(.+)$/m.exec(body),first=skBody(body).split('\n').find(l=>l.trim()),d=(fm?fm[1]:(first||'')).replace(/^#+\s*/,'').trim().slice(0,120);
    const k=res.skills.findIndex(x=>x.n===nm);if(k>=0)res.skills[k]={n:nm,d:d||res.skills[k].d};else res.skills.push({n:nm,d})}});
  return res}
 /* Журнал действий прошлого запуска для истории: даёт модели понять, что уже сделано, в том числе после перезапуска или остановки. */
 const stLbl={ok:'ок',err:'ошибка',no:'отклонено',run:'не завершено'};
 const digest=x=>{const ag=(x.ag||[]).filter(s=>s.k==='tool');if(!ag.length)return'';
  const pl=(x.plan||[]).length?'\nПлан: '+x.plan.map(i=>(i.s==='done'?'[x] ':i.s==='doing'?'[>] ':'[ ] ')+i.t).join('; '):'';
  return '\n\n[Журнал действий агента в том запуске (кратко)]\n'+ag.slice(-40).map(s=>'- '+s.h+' ['+(stLbl[s.st]||s.st)+']'+(s.st!=='ok'&&s.o?': '+String(s.o).replace(/\s+/g,' ').slice(0,160):'')).join('\n')+pl};
 const pendImg=[];
 const b64chunks=async p=>{
  const sz=await sh('[ -f '+sq(p)+' ] && wc -c < '+sq(p)+' || echo NOFILE',{timeout:20});const n=String(sz.out||'').trim();
  if(/NOFILE/.test(n)||!/^\d+$/.test(n))throw new Error('файла нет: '+p);
  if(+n>409600)throw new Error('изображение больше 400 КБ ('+Math.round(+n/1024)+' КБ): уменьшите или сожмите его');
  const tot=Math.ceil(+n/3)*4;let b='';
  for(let o=1;o<=tot;o+=60000){const r=await sh('base64 < '+sq(p)+" | tr -d '\\n' | cut -c "+o+'-'+Math.min(tot,o+59999),{timeout:60});if(r.err||r.code!==0)throw new Error('не удалось прочитать изображение: '+(r.err||r.out||'').slice(0,100));b+=String(r.out||'').trim()}
  if(!/^[A-Za-z0-9+\/]+={0,2}$/.test(b)||b.length<16)throw new Error('не удалось прочитать изображение');
  return b};
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
 const sysAgent=()=>'\n\n[РЕЖИМ АГЕНТА-ПРОГРАММИСТА]\nТы автономный агент в приложении Kairema на телефоне. Инструменты: list_dir, read_file, search, edit_file, apply_patch (несколько правок за один вызов), write_file, run_command, update_plan, web_fetch (читать веб-страницы и документацию), task (подагент: исследует код или документацию в отдельном контексте и возвращает краткий отчёт; для широких поисков бери его, чтобы не засорять свой контекст), skill (загрузить навык), read_image (посмотреть картинку из проекта)'+(ext.some(p=>{try{return p.defs().length}catch(e){return 0}})?', а также инструменты внешних MCP-серверов (имена mcp__сервер__инструмент)':'')+'. Если задача из трёх и более шагов, сначала составь план через update_plan и обновляй статусы. Работай циклом: изучи код → внеси минимальные правки → запусти проверку (тесты, сборку, линтер, если есть) → если ошибка, прочитай вывод, исправь, повтори, пока не заработает или не упрёшься в блокер.\nПравила: читай файл перед правкой; edit_file лучше write_file; не выдумывай содержимое файлов, которых не читал; пути относительные к папке проекта; каждая команда идёт в новой оболочке в папке проекта (cd не сохраняется); только неинтерактивные команды, которые завершаются; не читай огромные файлы целиком (диапазоны строк, search); не говори «готово», пока не проверил, а если проверить нельзя, скажи это прямо. Если действие отклонили, не обходи отказ другим способом, спроси пользователя.\nКогда закончишь, напиши коротко: что изменено (файлы), что проверено и с каким результатом, что осталось. Отвечай на языке пользователя.\nСреда: '+(envC?(envC.be==='termux'?'Termux':'песочница приложения (Android sh, без git и python)')+'. '+envC.info:'неизвестна')+'. Папка проекта: '+cfg.dir+'. Режим подтверждений: '+MODES[cfg.mode][0]+'.';
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
  const xp=extOf(n);if(xp)return await xp.call(n,a);
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
  if(n==='apply_patch'){if(!Array.isArray(a.edits)||!a.edits.length)bad('edits');if(a.edits.length>40)throw new Error('слишком много правок за раз (максимум 40)');
   const txt=new Map();
   for(let i=0;i<a.edits.length;i++){const e=a.edits[i]||{},tg='правка '+(i+1)+': ';
    if(!e.path||typeof e.old!=='string'||!e.old||typeof e.new!=='string')throw new Error(tg+'нужны path, old, new. Ни один файл не изменён.');
    const p=rel(e.path);if(!p)throw new Error(tg+'путь вне папки проекта. Ни один файл не изменён.');
    if(!txt.has(p)){const t0=await readRaw(p);if(t0===null)throw new Error(tg+'файла нет: '+p+'. Ни один файл не изменён.');if(t0.length>400000)throw new Error(tg+'файл слишком большой. Ни один файл не изменён.');txt.set(p,t0)}
    const t=txt.get(p),c=t.split(e.old).length-1;
    if(!c)throw new Error(tg+'фрагмент old не найден в '+p+' (с учётом предыдущих правок). Ни один файл не изменён. Прочитай файл заново.');
    if(c>1&&!e.replace_all)throw new Error(tg+'фрагмент old найден '+c+' раз в '+p+'. Добавь соседние строки или поставь replace_all. Ни один файл не изменён.');
    txt.set(p,e.replace_all?t.split(e.old).join(e.new):t.replace(e.old,()=>e.new))}
   for(const[p,t]of txt){await snap(p);await writeRaw(p,t)}
   return 'применено правок: '+a.edits.length+', файлов: '+txt.size+' ('+[...txt.keys()].join(', ')+')'}
  if(n==='skill'){if(!a.name)bad('name');const b=await getSkill(String(a.name).replace(/^\//,''));if(b===null)throw new Error('навык не найден: '+a.name);return b}
  if(n==='read_image'){if(!a.path)bad('path');
   if(typeof Caps!=='undefined'&&Caps.vision&&Caps.vision(actProv())===false)throw new Error('выбранная модель не умеет видеть изображения: выберите модель со значком «Зрение»');
   const p=rel(a.path);if(!p)throw new Error('путь вне папки проекта');
   const mt=/\.(png|jpe?g|webp|gif)$/i.exec(p);if(!mt)throw new Error('поддерживаются png, jpg, webp, gif');
   const mime='image/'+({jpg:'jpeg',jpeg:'jpeg',png:'png',webp:'webp',gif:'gif'})[mt[1].toLowerCase()];
   const b=await b64chunks(p);pendImg.push({path:p,mime,data:b});
   return 'изображение «'+p+'» передано тебе следующим сообщением ('+Math.round(b.length*.75/1024)+' КБ)'}
  if(n==='web_fetch'){if(!a.url)bad('url');return trunc(await Web.page(a),45000)}
  if(n==='write_file'){if(!a.path)bad('path');if(typeof a.content!=='string')bad('content');const p=rel(a.path);if(!p)throw new Error('путь вне папки проекта');
   await snap(p);await writeRaw(p,a.content);return 'записан '+p+' ('+a.content.length+' знаков, строк '+(a.content.split('\n').length)+')'}
  if(n==='update_plan'){if(!Array.isArray(a.items))bad('items');const it=a.items.slice(0,30).map(x=>({t:String(x&&x.text||'').slice(0,160),s:['pending','doing','done'].includes(x&&x.status)?x.status:'pending'})).filter(x=>x.t);if(run)run.m.plan=it;if(run)run.redraw();return 'план обновлён ('+it.filter(x=>x.s==='done').length+'/'+it.length+')'}
  if(n==='run_command'){if(!a.command)bad('command');const tm=Math.min(600,Math.max(5,parseInt(a.timeout)||120));
   const r=await sh('{ '+a.command+'\n} 2>&1',{timeout:tm,onStart:id=>{curCmd=id}});curCmd=null;
   return trunc(r.out||'')+'\n'+(r.err?('['+r.err+']'):'[код выхода: '+r.code+']')}
  throw new Error('неизвестный инструмент '+n)}
 /* ---- Подтверждения ---- */
 let sheetNow=null;const allow={edit:0,run:0};
 const patchPrev=a=>(Array.isArray(a.edits)?a.edits:[]).slice(0,8).map(e=>e?String(e.path)+'\n\n'+prev(e.old||'',e.new||''):'').join('\n\n———\n').slice(0,2400);
 /* Доступ к сайтам и MCP-серверам: вопросы идут по очереди (подагенты работают параллельно), «до конца чата» запоминается по хосту или серверу. */
 const allowNet=new Set();let askTail=Promise.resolve();
 const askNet=(key,title,body)=>{const q=askTail.then(async()=>{if(allowNet.has(key))return{ok:1};if(stopped)return{ok:0,why:'Остановлено пользователем.'};Native.sync('agentNotify','Агент ждёт разрешения',String(body).split('\n')[0]);const v=await ASK(title,body);if(v==='no')return{ok:0,why:'Пользователь отклонил это действие. Не повторяй его, предложи другой путь или спроси, что делать.'};if(v==='always')allowNet.add(key);return{ok:1}});askTail=q.catch(()=>{});return q};
 /* Запросы к модели: общий вызов для главного цикла и подагентов. */
 let stopped=0;const live=new Set();
 async function llm(p,anth,sys,conv,tools,onText){
  let text='',calls=[],cut=0;
  const prov={id:p.id,url:p.url,model:p.model,system:sys,think:0,notify:0};if(tools&&tools.length)prov.tools=dmap(tools,anth);
  const out=anth?toAnth(conv):toOAI(conv);
  const h=Native.run('chat',[JSON.stringify(prov),JSON.stringify(out)],t=>{const c=t.charCodeAt(0);
   if(c===3){cut=1;return}if(c===2||c===1)return;
   if(c===4){try{calls=JSON.parse(t.slice(1))}catch(e){}return}
   text+=t;if(onText)onText(text)});
  live.add(h);try{await h}finally{live.delete(h)}
  return{text,calls,cut}}
 const ASK=(title,body)=>new Promise(res=>{const s=sheet('<h2></h2><pre class="cdp"></pre><div class="two" style="margin-top:12px"><button class="btn ghost" data-n></button><button class="btn" data-y></button></div><button class="btn ghost" data-a style="width:100%;margin-top:8px"></button>');
  $('h2',s).textContent=title;$('pre',s).textContent=body;$('[data-n]',s).textContent=L('Отклонить');$('[data-y]',s).textContent=L('Разрешить');$('[data-a]',s).textContent=L('Разрешать такое до конца чата');
  let done=0;const fin=v=>{if(done)return;done=1;sheetNow=null;s.close();res(v)};sheetNow={fin};
  $('[data-n]',s).onclick=()=>fin('no');$('[data-y]',s).onclick=()=>fin('once');$('[data-a]',s).onclick=()=>fin('always');
  s.addEventListener('click',e=>{if(e.target===s)fin('no')})});
 async function permit(n,a){
  const kind=n==='run_command'?'run':(n==='edit_file'||n==='write_file'||n==='apply_patch')?'edit':n==='web_fetch'?'net':extOf(n)?'ext':'';
  if(!kind)return{ok:1};
  if(kind==='net'||kind==='ext'){
   let key,title,body;
   if(kind==='net'){let h='';try{h=new URL(String(a.url)).hostname}catch(e){return{ok:0,why:'Неверный адрес. Нужен полный адрес с http:// или https://.'}}key='h:'+h;title=L('Открыть сайт?');body=String(a.url)}
   else{const mt=(extOf(n).meta&&extOf(n).meta(n))||{};
    if(cfg.mode==='read'&&!mt.ro)return{ok:0,why:'Включён режим «Только чтение»: этот инструмент MCP может менять данные, вызов запрещён.'};
    key='m:'+(mt.server||n);title=L('Вызвать инструмент MCP?');body=(mt.server||'MCP')+' → '+n+'\n\n'+JSON.stringify(a).slice(0,1200)}
   if(cfg.mode==='auto'||allowNet.has(key))return{ok:1};
   return askNet(key,title,body)}
  if(cfg.mode==='read')return{ok:0,why:'Включён режим «Только чтение»: изменять файлы и запускать команды нельзя. Предложи изменения текстом.'};
  const dng=kind==='run'&&typeof Term!=='undefined'&&Term.danger(String(a.command||''));
  let need=1;
  if(cfg.mode==='auto')need=!!dng;
  else if(cfg.mode==='edit')need=kind==='run'?!safeCmd(a.command):0;
  else if(kind==='run'&&safeCmd(a.command))need=0;
  else if(allow[kind]&&!dng)need=0;
  if(!need)return{ok:1};
  const body=kind==='run'?'$ '+a.command+(dng?'\n\n⚠ Команда выглядит опасной.':''):(n==='edit_file'?a.path+'\n\n'+prev(a.old,a.new):n==='apply_patch'?patchPrev(a):a.path+'\n\n'+String(a.content||'').slice(0,1200)+(String(a.content||'').length>1200?'\n…':''));
  Native.sync('agentNotify','Агент ждёт разрешения',(kind==='run'?'$ '+a.command:a.path)||short(n,a));
  const v=await ASK(kind==='run'?L('Выполнить команду?'):(n==='edit_file'?L('Изменить файл?'):n==='apply_patch'?L('Применить правки?'):L('Записать файл?')),body);
  if(v==='no')return{ok:0,why:'Пользователь отклонил это действие. Не повторяй его, предложи другой путь или спроси, что делать.'};
  if(v==='always'&&!dng)allow[kind]=1;
  return{ok:1}}
 /* ---- Карточки шагов ---- */
 const short=(n,a)=>{const x=a.path||a.command||a.pattern||a.url||a.description||(Array.isArray(a.edits)?a.edits.length+' правок':'');return n+(x?' '+String(x).replace(/\s+/g,' ').slice(0,80):'')};
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
  stopped=0;allowNet.clear();askTail=Promise.resolve();
  window.GEN={stopped:0,stop(){stopped=1;this.stopped=1;live.forEach(h=>Native.cancel(h.id));if(curCmd)Native.cancel(curCmd);if(sheetNow)sheetNow.fin('no')}};
  if(Chat.cmp&&Chat.cmp.upd)Chat.cmp.upd();
  Native.sync('agentKeep',true);
  try{
   await env();
   run={m,redraw};let cpH=null;
   try{if(navigator.getBattery){const bt=await navigator.getBattery();if(bt&&!bt.charging&&bt.level<.15&&!window.__cdBat){window.__cdBat=1;toast(L('Батарея ниже 15%: долгий прогон агента может не завершиться'))}}}catch(e){}
   if(/есть: git/.test(envC.info||''))try{cpH=await checkpoint()}catch(e){}
   const last=msgs.filter(x=>x.r==='u').pop();
   pendImg.length=0;
   const hasAg=x=>!!(x.ag&&x.ag.some(s=>s.k==='tool'));
   const vis=(typeof Ctx!=='undefined'?Ctx.view(msgs):msgs).filter(x=>x!==m&&(!x.err||hasAg(x))&&(x.t||hasAg(x)));
   const dgSet=new Set(vis.filter(x=>x.r!=='u'&&hasAg(x)).slice(-2));
   const base=vis.map(x=>x.r==='u'?{role:'user',content:toContent(x,anth,'')}:{role:'assistant',content:(x.t||'(запуск был прерван, итогового ответа нет)')+(dgSet.has(x)?digest(x):'')});
   const px=await probeCtx(),skList=px.skills;
   let skPre='';
   const sm=/^\/([A-Za-z0-9_-]{1,32})(?:\s|$)/.exec(String(last&&(last.q||last.t)||'').trim());
   if(sm&&skList.some(x=>x.n===sm[1])){const sk=await getSkill(sm[1]);if(sk){skPre='[НАВЫК /'+sm[1]+'. Выполни задание навыка, учитывая то, что пользователь написал после имени]\n'+sk+'\n[конец навыка]\n\n';add({k:'tool',n:'skill',h:'Навык /'+sm[1],st:'ok',d:'',o:''})}}
   if(skPre){for(let i=base.length-1;i>=0;i--)if(base[i].role==='user'){const c=base[i].content;if(typeof c==='string')base[i].content=skPre+c;else{const lb=c[c.length-1];if(lb&&lb.type==='text')lb.text=skPre+lb.text}break}}
   const conv=base.slice();
   let ins='';
   if(cfg.instr!==0&&px.ins){const t=px.ins.t,f=px.ins.f;
    ins='\n\n[ИНСТРУКЦИИ ПРОЕКТА из '+f+'. Их написал владелец проекта. ОБЯЗАТЕЛЬНЫ к выполнению в каждом ответе, включая требования к форме итога, пока они не противоречат прямой просьбе пользователя или правилам безопасности]\n'+trunc(t.trim(),12000)+'\n[конец инструкций проекта]';
    add({k:'tool',n:'instructions',h:'Инструкции проекта: '+f,st:'ok',d:'',o:t.length+' знаков добавлено в контекст'})}
   for(const x of ext){if(x.ready){try{const er=await x.ready();(er||[]).forEach(e=>add({k:'tool',n:'mcp',h:'MCP «'+e.name+'»: недоступен',st:'err',d:'',o:e.msg}))}catch(e){}}}
   let hk=[];
   try{const ht=px.hooks;if(ht&&ht.trim()){const ph=parseHooks(ht);
    if(ph.err)add({k:'tool',n:'hooks',h:'Хуки проекта: ошибка',st:'err',d:'',o:ph.err});
    else if(ph.hooks.length){
     if(cfg.hooks===1){hk=ph.hooks;add({k:'tool',n:'hooks',h:'Хуки проекта: '+hk.length,st:'ok',d:hk.map(h=>h.event+(h.match?' '+h.match:'')+' → '+(h.block?'запрет':h.run)).join('\n'),o:'включены'})}
     else add({k:'tool',n:'hooks',h:'Найдены хуки проекта: '+ph.hooks.length+' (выключены)',st:'no',d:'',o:'Хуки запускают команды без вопросов. Включите «Хуки проекта» в настройках агента, только для своих проектов.'})}}}catch(e){}
   const hookBefore=async cmd=>{for(const h of hk){if(h.event!=='before_command'||(h.match&&!gmatch(h.match,cmd,1)))continue;
     if(h.block)return 'Запрещено хуком проекта'+(h.message?': '+h.message:'.');
     const r=await runHook(h,'');if(r.code!==0)return 'Хук before_command не пропустил команду (код '+r.code+')'+(r.out?':\n'+r.out:'')}return ''};
   const hookAfter=async files=>{let t='',bad=0;for(const f of files)for(const h of hk){if(h.event!=='after_edit'||!h.run||(h.match&&!gmatch(h.match,f)))continue;
     const r=await runHook(h,f);if(r.code!==0)bad=1;t+='\n[хук after_edit «'+h.run.slice(0,60)+'» для '+f+': '+(r.code===0?'ок':'код '+r.code)+']'+(r.out?'\n'+r.out:'')}return{t,bad}};
   const hookFinish=async()=>{let t='';for(const h of hk){if(h.event!=='on_finish'||!h.run)continue;const r=await runHook(h,'');
     add({k:'tool',n:'hook',h:'Хук on_finish: '+h.run.slice(0,50),st:r.code===0?'ok':'err',d:'',o:r.out});if(r.code!==0)t+='\n$ '+h.run+' → код '+r.code+'\n'+r.out}return t};
   const sys=sysPrompt()+sysAgent()+(typeof sysExtra==='function'?sysExtra(msgs):'')+'\n\n[НАВЫКИ] Доступны навыки (пользователь вызывает командой /имя, ты можешь загрузить инструментом skill): '+skList.map(x=>x.n+' — '+x.d).join('; ')+'.'+ins+langRule(last&&(last.q||last.t));
   const turn=async tools=>{bd.textContent='';return llm(p,anth,sys,conv,tools?allTools():null,t=>{bd.textContent=t;scl(box)})};
   /* Подагент: свой контекст, только чтение (list_dir, read_file, search, web_fetch), возвращает отчёт. */
   const SUBT=['list_dir','read_file','search','web_fetch'];
   const runSub=async(a,st)=>{
    if(!a.prompt||typeof a.prompt!=='string')throw new Error('нужен аргумент «prompt»');
    const tl=TOOLS.filter(t=>SUBT.includes(t.name));
    const ssys='[ПОДАГЕНТ-ИССЛЕДОВАТЕЛЬ]\nТы подагент в приложении Kairema. Главный агент дал тебе одно задание. Ты можешь только читать: list_dir, read_file, search, web_fetch. Ничего не правь и не запускай. Изучи нужное и верни подробный, но сжатый отчёт: факты, пути файлов с номерами строк, короткие цитаты кода только когда они нужны. Не выдумывай: чего не нашёл, о том так и скажи. Отвечай на языке задания.\nСреда: '+(envC?envC.info:'')+'. Папка проекта: '+cfg.dir+'.'+ins+langRule(a.prompt);
    const sc=[{role:'user',content:String(a.prompt).slice(0,8000)}];
    const lim=Math.min(20,Math.max(5,Math.round(cfg.steps/3)));let n=0,fin='';
    const log=l=>{st.d=(st.d?st.d+'\n':'')+l;redraw()};
    for(;;){
     if(stopped)break;
     const last=n>=lim;
     const r=await llm(p,anth,ssys,sc,last?null:tl,null);
     if(stopped)break;
     if(!r.calls.length||last){fin=r.text;break}
     sc.push({role:'assistant',text:r.text,calls:r.calls});
     const res=[];
     for(const c of r.calls){
      if(stopped)break;
      const x=pj(c.args);let out,err=0;
      if(!x||!SUBT.includes(c.name)){out='Подагенту недоступно: '+c.name+'. Доступно только чтение.';err=1}
      else{log('→ '+short(c.name,x));try{const pm=await permit(c.name,x);if(!pm.ok){out=pm.why;err=1}else out=await exTool(c.name,x)}catch(e){out='Ошибка: '+e.message;err=1}}
      res.push({id:c.id,name:c.name,content:out,err})}
     if(stopped)break;
     sc.push({role:'tool',results:res});n++;
     if(toolChars(sc)>50000)shrink(sc,4,400);
     if(n>=lim)sc.push({role:'user',content:'Лимит шагов исчерпан. Без новых вызовов инструментов верни отчёт по тому, что нашёл.'})}
    return String(fin||'').trim()?'[отчёт подагента «'+String(a.description||'').slice(0,60)+'», шагов: '+n+']\n'+trunc(String(fin).trim(),8000):'(подагент не вернул отчёта)'};
   let step=0,final='',nudged=0,force=0,hkTry=0;const rep=new Map();
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
     if(hk.length&&hkTry<2&&!r.cut){const hf=await hookFinish();if(hf){hkTry++;conv.push({role:'assistant',text:r.text||'(готово)'});conv.push({role:'user',content:'Хук проекта on_finish сообщил о проблеме. Исправь и закончи снова.'+hf});continue}}
     final=r.text;if(r.cut)m.cut=1;break}
    if(r.text.trim())add({k:'say',t:r.text.trim()});bd.innerHTML='<span class="typing"><i></i><i></i><i></i></span>';
    conv.push({role:'assistant',text:r.text,calls:r.calls});
    const doCall=async c=>{
     const a=pj(c.args),st={k:'tool',n:c.name,h:short(c.name,a||{}),st:'run',d:'',o:''};
     if(c.name==='edit_file'&&a)st.d=prev(a.old||'',a.new||'');else if(c.name==='apply_patch'&&a)st.d=patchPrev(a);else if(c.name==='write_file'&&a)st.d=String(a.content||'').slice(0,600);else if(c.name==='run_command'&&a)st.d='$ '+a.command;else if(c.name==='task'&&a)st.d=String(a.prompt||'').slice(0,500);
     add(st);
     let res,err=0;
     if(!a){res='Аргументы не разобраны: невалидный JSON. Вызови инструмент заново с корректными аргументами.';err=1;st.st='err'}
     else{
      const key=c.name+'|'+c.args,seen=(rep.get(key)||0)+1;rep.set(key,seen);
      try{
       const hb=(hk.length&&c.name==='run_command')?await hookBefore(String(a.command||'')):'';
       const pm=hb?{ok:0,why:hb}:(c.name==='task'?{ok:1}:await permit(c.name,a));
       if(!pm.ok){res=pm.why;err=1;st.st='no'}
       else if(c.name==='task'){res=await runSub(a,st);st.st='ok'}
       else{res=await exTool(c.name,a);st.st=/\[код выхода: (?!0\])/.test(res)&&c.name==='run_command'?'err':'ok';
        if(hk.length&&['edit_file','write_file','apply_patch'].includes(c.name)){const fl=c.name==='apply_patch'?[...new Set((a.edits||[]).map(e=>e&&e.path).filter(Boolean))]:[a.path];const ha=await hookAfter(fl);res+=ha.t;if(ha.bad)st.st='err'}}
      }catch(e){res='Ошибка: '+e.message;err=1;st.st='err'}
      if(seen>=3)res+='\n[Ты уже '+seen+' раза вызвал это же действие с теми же аргументами. Смени подход или остановись и объясни, что мешает.]';
      if(seen>=5)force=1}
     st.o=trunc(res,1500);redraw();
     return{id:c.id,name:c.name,content:res,err:err||st.st==='err'?1:0}};
    let results=[];
    if(r.calls.length>1&&r.calls.every(c=>c.name==='task'))results=await Promise.all(r.calls.map(doCall));
    else for(const c of r.calls){if(stopped)break;results.push(await doCall(c))}
    if(stopped)break;
    conv.push({role:'tool',results});
    if(pendImg.length)conv[conv.length-1].imgs=pendImg.splice(0);
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
  const s=sheet('<h2></h2><p class="sub" style="margin:6px 0 10px"></p><div class="cdm"></div><label class="cdl"></label><input class="cdi" data-d autocomplete="off" autocapitalize="off" spellcheck="false"><button class="btn ghost" data-pd style="width:100%;margin-top:6px"></button><label class="cdl"></label><div class="cdr" data-s></div><label class="cdl"></label><div class="cdr" data-e></div><label class="cdl"></label><div class="cdr" data-n></div><label class="cdl"></label><div class="cdr" data-h></div><div class="cdi2" data-i></div><button class="btn ghost" data-mcp style="width:100%;margin-top:8px"></button><button class="btn ghost" data-ck style="width:100%;margin-top:8px"></button><button class="btn" data-ok style="width:100%;margin-top:8px"></button><button class="btn ghost" data-off style="width:100%;margin-top:8px"></button>');
  $('h2',s).textContent=L('Агент-программист');
  $('.sub',s).textContent=L('Модель сама читает файлы, правит код, запускает команды и повторяет, пока не заработает. Нужна модель с поддержкой вызова инструментов.');
  const L1=$$('.cdl',s);L1[0].textContent=L('Папка проекта (внутри Termux или песочницы)');L1[1].textContent=L('Лимит шагов за запрос');L1[2].textContent=L('Где выполнять команды');L1[3].textContent=L('Читать инструкции проекта (KAIREMA.md, AGENTS.md, CLAUDE.md)');L1[4].textContent=L('Хуки проекта (.kairema/hooks.json): запускают команды без вопросов, включайте только для своих проектов');
  const mm=$('.cdm',s),rm=()=>{mm.innerHTML='';Object.keys(MODES).forEach(k=>{const b=el('<button class="cdo"><b></b><small></small></button>');$('b',b).textContent=L(MODES[k][0]);$('small',b).textContent=L(MODES[k][1]);b.classList.toggle('on',cfg.mode===k);b.onclick=()=>{cfg.mode=k;save();rm()};mm.append(b)})};rm();
  const di=$('[data-d]',s);di.value=cfg.dir;di.onchange=()=>{const v=di.value.trim();cfg.dir=v&&!/\.\./.test(v)?v:'kairema-work';di.value=cfg.dir;envC=null;save()};
  const pd=$('[data-pd]',s);pd.textContent=L('Выбрать папку…');pd.onclick=()=>pickDir(v=>{di.value=v});
  const seg=(box,opts,get,set)=>{const r=()=>{box.innerHTML='';opts.forEach(([v,t])=>{const b=el('<button class="cdg"></button>');b.textContent=t;b.classList.toggle('on',get()===v);b.onclick=()=>{set(v);save();r()};box.append(b)})};r()};
  seg($('[data-s]',s),[[20,'20'],[40,'40'],[80,'80'],[150,'150']],()=>cfg.steps,v=>cfg.steps=v);
  seg($('[data-e]',s),[['auto',L('Авто')],['sandbox',L('Песочница')],['termux','Termux']],()=>cfg.env,v=>{cfg.env=v;envC=null});
  seg($('[data-n]',s),[[1,L('Да')],[0,L('Нет')]],()=>cfg.instr===0?0:1,v=>cfg.instr=v);
  const mb=$('[data-mcp]',s);if(typeof Mcp!=='undefined'){mb.textContent=L('MCP-серверы…')+(Mcp.count()?' ('+Mcp.count()+')':'');mb.onclick=()=>Mcp.panel()}else mb.remove();
  seg($('[data-h]',s),[[0,L('Выкл')],[1,L('Вкл')]],()=>cfg.hooks===1?1:0,v=>cfg.hooks=v);
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
 i18nAdd({"Выкл":"Off","Вкл":"On","Хуки проекта (.kairema/hooks.json): запускают команды без вопросов, включайте только для своих проектов":"Project hooks (.kairema/hooks.json): they run commands without asking, enable only for your own projects","Применить правки?":"Apply the edits?","Открыть сайт?":"Open the site?","Вызвать инструмент MCP?":"Call the MCP tool?","Да":"Yes","Нет":"No","MCP-серверы…":"MCP servers…","Читать инструкции проекта (KAIREMA.md, AGENTS.md, CLAUDE.md)":"Read project instructions (KAIREMA.md, AGENTS.md, CLAUDE.md)","Изменения":"Changes","Изменения агента":"Agent changes","Закрыть":"Close","Загружаю…":"Loading…","Изменений нет":"No changes","Откатить к точке":"Roll back to checkpoint","Откатить к точке?":"Roll back to the checkpoint?","Файлы проекта вернутся к состоянию до этого запуска агента, новые файлы удалятся. Ваши правки после запуска тоже пропадут.":"Project files return to the state before this agent run; new files are deleted. Your own edits made since then are lost too.","Папка проекта":"Project folder","Выбрать папку…":"Choose a folder…","Выбрать эту папку":"Use this folder","Отмена":"Cancel","Папок нет":"No folders","Батарея ниже 15%: долгий прогон агента может не завершиться":"Battery below 15%: a long agent run may not finish","Агент-программист":"Coding agent","Агент":"Agent","Только чтение":"Read only","Спрашивать":"Ask first","Правки сами":"Auto-edit","Полный авто":"Full auto","Читает и ищет, ничего не меняет и не запускает":"Reads and searches only","Читает сам; каждую правку и команду показывает и ждёт разрешения":"Reads on its own; asks before every edit and command","Файлы правит сам; команды (кроме безопасных вроде ls, git status) спрашивает":"Edits files itself; asks before commands (except safe ones like ls, git status)","Правит и запускает всё сам; опасные команды (rm -r, sudo…) всё равно спрашивает":"Edits and runs everything itself; still asks for dangerous commands (rm -r, sudo…)","Отклонить":"Deny","Разрешить":"Allow","Разрешать такое до конца чата":"Allow this kind until the chat ends","Изменить файл?":"Change the file?","Записать файл?":"Write the file?","Откатить правки":"Undo changes","Откатить правки?":"Undo changes?","Откатить":"Undo","Правки откатаны":"Changes undone","Файлы вернутся к состоянию до этого запуска агента.":"Files will return to the state before this agent run.","Готово":"Done","Выключить агента":"Turn the agent off","Проверить окружение":"Check the environment","Проверяю…":"Checking…","Песочница":"Sandbox","Авто":"Auto","Лимит шагов за запрос":"Step limit per request","Где выполнять команды":"Where to run commands","Папка проекта (внутри Termux или песочницы)":"Project folder (inside Termux or the sandbox)","Модель сама читает файлы, правит код, запускает команды и повторяет, пока не заработает. Нужна модель с поддержкой вызова инструментов.":"The model reads files, edits code, runs commands and repeats until it works. Needs a model that supports tool calling.","Авто: Termux, если он установлен и разрешён, иначе песочница приложения (без git и python).":"Auto: Termux if installed and allowed, otherwise the app sandbox (no git or python).","Модель сама правит код и запускает проверки (Termux или песочница)":"The model edits code and runs checks itself (Termux or sandbox)"});
 const toggle=v=>{cfg.on=v===undefined?(cfg.on?0:1):(v?1:0);save();const x=$('#v-api');if(x)bar(x)};
 return{on:()=>!!cfg.on,toggle,respond,cfg,tools:TOOLS,allTools,register,defs,toOAI,toAnth,safeCmd,rel,trunc,shrink,panel,env,MODES,get envC(){return envC},_reset(){envC=null}}})();
