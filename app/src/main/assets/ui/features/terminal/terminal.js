/* ===== ТЕРМИНАЛ: настоящая оболочка Android и запуск команд из ответов ИИ =====
   Команды выполняет Kotlin (Shell.kt, /system/bin/sh). В ответах ИИ у блоков ```bash появляется кнопка «Выполнить»;
   команда запускается только после вашего подтверждения, результат можно отправить ИИ одной кнопкой.
   Убрать модуль: удалить папку features/terminal и её строки в index.html (вкладка Терминал тогда пустая). */
i18nAdd({"▶ Выполнить":"▶ Run","Выполнить":"Run","Всё равно выполнить":"Run anyway","Выполнить команду?":"Run the command?","Диагностика":"Diagnostics","Остановить":"Stop","Очистить":"Clear","Выберите оболочку: Android (встроенная, без python и git) или Termux (полноценный Linux, нужна установка Termux). «Диагностика» показывает, что доступно.":"Choose the shell: Android (built-in, no python or git) or Termux (a full Linux, Termux must be installed). “Diagnostics” shows what is available.","Демо: вне приложения команды не выполняются.":"Demo: commands do not run outside the app.","команда, например ls":"command, e.g. ls","Команда может удалить или изменить файлы. Проверьте её внимательно.":"The command may delete or change files. Check it carefully.","Команда выполнится в песочнице приложения на этом телефоне.":"The command will run in the app sandbox on this phone.","Отправить результат ИИ":"Send the result to AI","Исправить с ИИ":"Fix with AI","Выполняется…":"Running…","Дождитесь ответа":"Wait for the reply","Результат отправлен":"Result sent","Сессия не запущена. Нажмите «Активировать сессию», чтобы выполнять команды.":"The session is not running. Tap “Start session” to run commands.","● сессия запущена":"● session started","— сессия остановлена":"— session stopped","Оболочка":"Shell","Проверить Termux":"Check Termux","Выполнить и продолжать сам":"Run and continue automatically","Стоп":"Stop","Агент":"Agent","Запустить":"Start","Выключить":"Turn off","Что доступно на этом телефоне":"What is available on this phone","Сессия не запущена. Нажмите «Запустить», чтобы выполнять команды.":"The session is not running. Tap “Start” to run commands."});
const Term=(()=>{
 const KH='kairema.term.hist.v1',MARK='\u0001',CAP=30000;
 let log=[],cur=null,redraw=null,hist=[],st='off',mark='off',backend='android';
 const KB='kairema.term.backend.v1';
 try{if(localStorage.getItem(KB)==='termux')backend='termux'}catch(e){}
 const T2=(a,b)=>LANG==='en'?b:a;
 try{hist=JSON.parse(localStorage.getItem(KH)||'[]')||[]}catch(e){}
 const saveH=()=>{try{localStorage.setItem(KH,JSON.stringify(hist.slice(-50)))}catch(e){}};
 const view=r=>{const i=r.indexOf(MARK);return i<0?r:r.slice(0,i).replace(/\n$/,'')};
 const danger=c=>/(^|[\s;&|])(rm\s+(-\w*[rR]|-\w*f)|dd\s|mkfs|chmod\s+-\w*R|chown\s+-\w*R|mv\s+.*\s\/|>\s*\/dev\/)|\/data\/data|\/sdcard|\/storage|:\(\)\s*\{/i.test(c);
 /* Запуск команды. Возвращает {code,out,err?}. onChunk получает весь вывод к этому моменту. */
 async function exec(cmd,o={}){
  if(!Native.on){await wait(250);return{code:0,out:'(демо: вне приложения команды не выполняются)',demo:true}}
  const tm=(o.backend||backend)==='termux';
  let raw='';
  const p=Native.run(tm?'termux':'shell',[cmd,o.timeout||(tm?120:60)],t=>{raw+=t;if(o.onChunk)o.onChunk(view(raw))});
  if(o.onStart)o.onStart(p.id);
  try{await p}catch(e){return{code:-1,out:view(raw),err:e.message}}
  const i=raw.indexOf('\n'+MARK+'exit:');
  const code=i<0?-1:parseInt(raw.slice(i+7),10);
  return{code:isNaN(code)?-1:code,out:i<0?raw:raw.slice(0,i)}}
 const add=(c,t)=>{const e={c,t};log.push(e);if(log.length>400)log.shift();if(redraw)redraw();return e};
 const upd=e=>{if(e.el&&e.el.isConnected){e.el.textContent=e.t;const o=e.el.parentNode;if(o)scr(o)}};
 const exitText=r=>r.err?'['+r.err+']':(LANG==='en'?'[exit code: ':'[код выхода: ')+r.code+']';
 const tick=()=>{if(redraw)redraw()};
 /* Запуск из терминала. */
 async function run(cmd,label){
  if(cur||st!=='on')return;
  hist.push(cmd);saveH();mark='on';
  add('c','› '+(label||cmd));const e=add('o','');
  cur={};tick();
  const r=await exec(cmd,{onStart:id=>{cur.id=id},onChunk:t=>{e.t=t.slice(-CAP);upd(e)},timeout:label?30:60});
  cur=null;e.t=(r.out||'').slice(-CAP);
  if(!e.t){const k=log.indexOf(e);if(k>=0)log.splice(k,1)}
  if(r.err||r.code!==0)add('e',exitText(r));
  tick()}
  /* Записать в терминал то, что выполнено из чата. */
 function record(cmd,r){add('c','› '+cmd+(LANG==='en'?'  (from chat)':'  (из чата)'));if(r.out)add('o',r.out.slice(-CAP));if(r.err||r.code!==0)add('e',exitText(r))}
 const setBackend=b=>{backend=b==='termux'?'termux':'android';try{localStorage.setItem(KB,backend)}catch(e){}tick()};
 async function checkTermux(){
  add('c','› '+T2('Проверка Termux','Termux check'));
  if(!Native.on){add('o',T2('Демо: вне приложения проверить нельзя','Demo: cannot check outside the app'));return}
  let sx={};try{sx=JSON.parse(Native.sync('termuxStatus')||'{}')}catch(e){}
  add(sx.installed?'o':'e',(sx.installed?'✓ ':'✗ ')+T2('Termux установлен','Termux is installed'));
  add(sx.permission?'o':'e',(sx.permission?'✓ ':'✗ ')+T2('Разрешение «Run commands in Termux environment» выдано','Permission “Run commands in Termux environment” is granted'));
  if(!sx.installed){add('o',T2('Установите Termux с GitHub (github.com/termux/termux-app/releases) или F-Droid. Версию из Google Play не берите.','Install Termux from GitHub (github.com/termux/termux-app/releases) or F-Droid. Do not use the Google Play version.'));return}
  if(!sx.permission){add('o',T2('Выдайте: Настройки Android, Приложения, Kairema, Разрешения, Дополнительные разрешения, «Run commands in Termux environment».','Grant it: Android Settings, Apps, Kairema, Permissions, Additional permissions, “Run commands in Termux environment”.'));return}
  add('c','› '+T2('Пробный запуск в Termux','Test run in Termux'));
  const r=await exec('echo termux-ok; python --version 2>&1 | head -1; git --version 2>&1 | head -1; curl --version 2>&1 | head -1',{backend:'termux',timeout:25});
  if(r.out)add('o',r.out);
  if(r.err){
   add('e',r.err);
   add('o',T2('Если Termux не отвечает, откройте Termux и выполните одну команду:','If Termux does not respond, open Termux and run one command:'));
   add('o','mkdir -p ~/.termux && echo "allow-external-apps=true" >> ~/.termux/termux.properties');
   add('o',T2('Потом полностью закройте Termux (смахните из списка приложений) и откройте снова. Также отключите для Termux экономию батареи.','Then fully close Termux (swipe it away) and open it again. Also disable battery optimization for Termux.'))}
  else if(!/termux-ok/.test(r.out||''))add('e',exitText(r));
  else add('o','✓ '+T2('Termux отвечает. Если python или git не нашлись, в Termux выполните: pkg install python git curl','Termux responds. If python or git are missing, run in Termux: pkg install python git curl'));
  tick()}
 const stop=()=>{if(cur&&cur.id)Native.cancel(cur.id)};
 /* Сессия: зелёная = работает, красная = выключена, жёлтая = очищена. */
 const activate=quiet=>{const was=st;st='on';mark='on';if(!quiet&&was!=='on')add('o','● сессия запущена');tick()};
 const deactivate=()=>{stop();st='off';mark='off';add('','— сессия остановлена');tick()};
 const clear=()=>{log=[];mark='clr';tick();toast('Сессия очищена')};
 const DIAG=`echo "== Система"; getprop ro.product.model; getprop ro.build.version.release; getprop ro.build.version.sdk; uname -m; id
echo "== Команды"; for c in ls cat grep sed awk tar gzip curl wget ping nc ssh python python3 git node busybox toybox; do if command -v $c >/dev/null 2>&1; then echo "есть: $c"; else echo "нет:  $c"; fi; done
echo "== Запуск файла из папки приложения"; printf '#!/system/bin/sh\\necho ok\\n' > t.sh; chmod 755 t.sh; ./t.sh 2>&1 | head -2; echo "через sh:"; sh t.sh
echo "== Папка"; pwd; echo "Папка библиотек: $KAIREMA_LIB"; ls $KAIREMA_LIB 2>&1 | head -5
echo "== Сеть"; ping -c 1 -W 2 1.1.1.1 2>&1 | tail -2
echo "== Место"; df -h . 2>&1 | tail -2`;
 return{exec,run,record,stop,clear,activate,deactivate,setBackend,checkTermux,get backend(){return backend},get st(){return st},get mark(){return mark},danger,DIAG,get busy(){return!!cur},bind(f){redraw=f},drawLog(out){out.innerHTML='';log.slice(-300).forEach(e=>{const d=document.createElement('div');d.className=e.c;d.textContent=e.t;e.el=d;out.append(d)});scr(out)},hist:()=>hist}})();
function termView(){
 const v=$('#v-term');
 if(!P.diag)P.diag='<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>';
 v.innerHTML=`<div class="top"><h1>Терминал</h1></div><p class="sub" style="margin:0 16px 8px" data-tn></p><div class="scroll"><div class="ses"><div class="tm-st"><div class="stt"><span class="sd"></span><b></b></div><span class="tm-chip" data-chip></span></div><div class="tm-ctl"><button class="sb" data-a="on">${ic('play')}<span>Запустить</span></button><button class="sb" data-a="off">${ic('stop')}<span>Выключить</span></button><button class="sb" data-a="clr">${ic('trash')}<span>Очистить</span></button></div><button class="tm-diag" data-diag><span class="ti">${ic('diag')}</span><span class="m"><b>Диагностика</b><small>Что доступно на этом телефоне</small></span>${ic('chevR')}</button><div class="tm-bk"><span class="sub" data-bkl>Оболочка</span><div data-bk></div><button class="sb tm-chk" data-tchk>${ic('ok')}<span>Проверить Termux</span></button></div></div><div class="tp"><div><div class="term"><div class="tout"></div><div class="tin"><span style="color:#9AA0A6">›</span><input autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="команда, например ls" aria-label="Команда"><button class="send sm" aria-label="Enter"></button></div></div></div></div><p class="sub idle" style="margin-top:8px">Сессия не запущена. Нажмите «Запустить», чтобы выполнять команды.</p></div>`;
 $('[data-tn]',v).textContent=Native.on?'Выберите оболочку: Android (встроенная, без python и git) или Termux (полноценный Linux, нужна установка Termux). «Диагностика» показывает, что доступно.':'Демо: вне приложения команды не выполняются.';
 const out=$('.tout',v),inp=$('.tin input',v),send=$('.tin .send',v);
 const ui=()=>{
  const r=Term.busy,s=Term.st,m=Term.mark;
  $('.ses',v).dataset.mark=m;
  $('.stt b',v).textContent={on:'Сессия активна',off:'Сессия выключена',clr:'Сессия очищена'}[m];
  $('.tp',v).classList.toggle('open',s==='on');
  $('.idle',v).style.display=s==='on'?'none':'block';
  $('[data-a=on]',v).disabled=m==='on';$('[data-a=off]',v).disabled=m==='off';$('[data-a=clr]',v).disabled=m==='clr';
  $('[data-diag]',v).disabled=s!=='on'||r;
  $('[data-chip]',v).textContent=Term.backend==='termux'?'Termux':'Android';
  $('[data-tchk]',v).style.display=Term.backend==='termux'?'':'none';
  $('[data-tchk]',v).disabled=r;
  inp.disabled=s!=='on'||r;
  send.innerHTML=r?ic('stop'):ic('enter');send.setAttribute('aria-label',r?'Stop':'Enter');send.disabled=!(r||s==='on')};
 $('[data-bk]',v).append(seg(['Android','Termux'],Term.backend==='termux'?1:0,i=>Term.setBackend(i?'termux':'android')));
 $('[data-tchk]',v).onclick=()=>Term.checkTermux();
 const draw=()=>{if(!v.isConnected||!out.isConnected){Term.bind(null);return}Term.drawLog(out);ui()};
 Term.bind(draw);draw();
 const go=()=>{const c=inp.value.trim();if(!c)return;inp.value='';Term.run(c)};
 send.onclick=()=>Term.busy?Term.stop():go();
 inp.onkeydown=e=>{if(e.key==='Enter')go()};
 $('[data-diag]',v).onclick=()=>Term.run(Term.DIAG,'Диагностика');
 $$('[data-a]',v).forEach(b=>b.onclick=()=>({on:()=>Term.activate(),off:Term.deactivate,clr:Term.clear})[b.dataset.a]())}
/* Подсказка для ИИ: как предлагать команды. */
function terminalPrompt(){
 if(!Native.on)return'';
 const where=Term.backend==='termux'
  ?"a real Linux environment in Termux (bash; python, git, curl, node and other packages may be installed with pkg install; home is ~)"
  :"Android's built-in shell (/system/bin/sh with toybox; no root; no python, git, curl or apt; working directory is the app's private folder)";
 return"\n\nThe app has a terminal connected to "+where+". When you suggest commands the user can run, put them in a fenced ```bash block (one short command or script per block) so the app shows a Run button, and say briefly what the command does. For multi-step tasks give only the commands for the next step, then wait: the app may run them and send you the output and exit code. When you get a result, read it and either continue with the next step, fix the error, or finish with a short summary and no command block."}
/* Режим агента: после одного подтверждения ИИ сам ведёт задачу по шагам (лимит шагов, стоп, опасное только вручную). */
const Agent=(()=>{
 const MAX=8,T2=(a,b)=>LANG==='en'?b:a;
 let left=0,busy=false,bar=null;
 const active=()=>left>0;
 const blocks=t=>{const r=[],re=/```(?:sh|bash|shell|zsh|console|terminal)[^\n]*\n([\s\S]*?)```/gi;let m;while((m=re.exec(t)))r.push(m[1].split('\n').map(l=>l.replace(/^\s*\$\s+/,'')).join('\n').trim());return r.filter(Boolean)};
 const paint=()=>{
  if(!left){if(bar){bar.remove();bar=null}return}
  const v=$('#v-api');if(!v)return;
  if(!bar||!bar.isConnected){
   bar=el('<div class="agbar"><b></b><button class="rb" data-st>Стоп</button></div>');
   $('[data-st]',bar).onclick=()=>stop(T2('Агент остановлен','Agent stopped'));
   const c=$('.cmp',v);c?v.insertBefore(bar,c):v.append(bar)}
  $('b',bar).textContent=T2('Агент работает. Осталось шагов: ','Agent is working. Steps left: ')+left};
 function stop(msg){const was=left>0;left=0;Term.stop();paint();if(was&&msg)toast(msg)}
 function start(){left=MAX;paint()}
 const waitChat=async()=>{for(let i=0;i<50&&Chx.busy;i++)await wait(100)};
 const report=(cmd,r)=>'```bash\n$ '+cmd+'\n'+(r.out||'').slice(-2500)+'\n```\n'+(r.err?r.err:'exit code: '+r.code)+'\n\n';
 /* Вызывается после каждого ответа ИИ в чате. */
 async function onAnswer(m,bd){
  if(!left||busy)return;
  if(m.err){stop(T2('Агент остановлен: ошибка ответа','Agent stopped: answer error'));return}
  const cmds=blocks(m.t||'');
  if(!cmds.length){stop(T2('Агент закончил','Agent finished'));return}
  if(cmds.some(Term.danger)){stop(T2('Агент остановлен: в плане есть опасная команда, запустите вручную','Agent stopped: a dangerous command, run it manually'));return}
  busy=true;Term.activate(true);
  const log=document.createElement('div');log.className='runout';bd.append(log);
  let rep='';
  for(const c of cmds){
   if(!left)break;
   log.textContent+=(log.textContent?'\n':'')+'▶ '+c.split('\n')[0].slice(0,120)+'\n';
   const r=await Term.exec(c,{onChunk:t=>{log.dataset.live=t.slice(-600)}});
   log.textContent+=((r.out||'').slice(-600)||'(пусто)')+(r.err||r.code!==0?'\n['+(r.err||('код '+r.code))+']':'')+'\n';
   Term.record(c,r);rep+=report(c,r)}
  busy=false;
  if(!left)return;
  left--;paint();
  if(!left){toast(T2('Агент: лимит шагов исчерпан','Agent: step limit reached'))}
  await waitChat();
  Chat.send((left?'Command results:\n\n':'Command results (this was the last allowed step, finish with a summary):\n\n')+rep)}
 Hooks.on('chat:answer',onAnswer);
 return{start,stop,active,onAnswer}})();
/* Кнопка «Выполнить» под блоками кода в ответах ИИ. */
function termConfirm(cmd,onOk,onAuto){
 const dg=Term.danger(cmd);
 const s=sheet(`<h2 style="margin-bottom:10px">Выполнить команду?</h2><pre class="tm-cmd"></pre><p class="ac-note" data-w style="${dg?'color:var(--err)':''}"></p><div class="two"><button class="btn ghost" data-c>Отмена</button><button class="btn" data-o></button></div>${dg?'':'<button class="btn ghost" data-a style="width:100%;margin-top:10px">Выполнить и продолжать сам</button>'}`);
 $('.tm-cmd',s).textContent=cmd.length>1500?cmd.slice(0,1500)+'…':cmd;
 $('[data-w]',s).textContent=dg?'Команда может удалить или изменить файлы. Проверьте её внимательно.':'Команда выполнится в песочнице приложения на этом телефоне.';
 $('[data-o]',s).textContent=dg?'Всё равно выполнить':'Выполнить';
 $('[data-c]',s).onclick=s.close;
 $('[data-o]',s).onclick=()=>{s.close();onOk(false)};
 const a=$('[data-a]',s);if(a)a.onclick=()=>{s.close();onOk(true)}}
Hooks.on('md:code',(pre,code,lang)=>{
 if(!Native.on||!/^(sh|bash|shell|zsh|console|terminal)$/.test(lang))return;
 const cmd=code.split('\n').map(l=>l.replace(/^\s*\$\s+/,'')).join('\n').trim();
 if(!cmd)return;
 const bar=document.createElement('div');bar.className='runbar';
 const b=document.createElement('button');b.className='rb';b.textContent='▶ Выполнить';
 const res=document.createElement('div');res.className='runout';res.hidden=true;
 bar.append(b);pre.after(bar,res);
 b.onclick=()=>termConfirm(cmd,async auto=>{
  if(Term.busy){toast('Дождитесь ответа');return}
  Term.activate(true);
  if(auto)Agent.start();
  b.disabled=true;res.hidden=false;res.textContent='Выполняется…';
  const r=await Term.exec(cmd,{onChunk:t=>{res.textContent=t.slice(-4000)||'…'}});
  const shown=((r.out||'').slice(-4000)||'(пусто)')+(r.err||r.code!==0?'\n'+(r.err?'['+r.err+']':'[код выхода: '+r.code+']'):'');
  res.textContent=shown;b.disabled=false;
  Term.record(cmd,r);
  const failed=!!r.err||r.code!==0;
  const body='```bash\n$ '+cmd+'\n'+(r.out||'').slice(-3000)+'\n```\n'+(r.err?r.err:('exit code: '+r.code));
  const msg=(failed?'The command failed. Explain the error and suggest a fix.\n\n':'Result of the command I ran:\n\n')+body;
  if(auto){await wait(50);for(let i=0;i<50&&Chx.busy;i++)await wait(100);Chat.send(msg);return}
  const sb=document.createElement('button');sb.className='rb';
  sb.textContent=failed?'Исправить с ИИ':'Отправить результат ИИ';
  sb.onclick=()=>{if(Chat.send(msg)){sb.disabled=true;toast('Результат отправлен')}else toast('Дождитесь ответа')};
  bar.append(sb)})});
