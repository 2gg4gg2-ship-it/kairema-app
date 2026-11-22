/* ===== ТЕРМИНАЛ: настоящая оболочка Android и запуск команд из ответов ИИ =====
   Команды выполняет Kotlin (Shell.kt, /system/bin/sh). В ответах ИИ у блоков ```bash появляется кнопка «Выполнить»;
   команда запускается только после вашего подтверждения, результат можно отправить ИИ одной кнопкой.
   Убрать модуль: удалить папку features/terminal и её строки в index.html (вкладка Терминал тогда пустая). */
i18nAdd({"Отправить ошибку ИИ на разбор":"Send the error to the AI","Ошибка отправлена ИИ":"Error sent to the AI","Дождитесь ответа":"Wait for the answer","Всё":"All","Последний вывод":"Last output","Выделить":"Select","Отправить":"Send","Нечего копировать":"Nothing to copy","Последний вывод скопирован":"Last output copied","Весь вывод скопирован":"Whole output copied","▶ Выполнить":"▶ Run","Выполнить":"Run","Всё равно выполнить":"Run anyway","Выполнить команду?":"Run the command?","Диагностика":"Diagnostics","Остановить":"Stop","Очистить":"Clear","Выберите оболочку: Android (встроенная, без python и git) или Termux (полноценный Linux, нужна установка Termux). «Диагностика» показывает, что доступно.":"Choose the shell: Android (built-in, no python or git) or Termux (a full Linux, Termux must be installed). “Diagnostics” shows what is available.","Демо: вне приложения команды не выполняются.":"Demo: commands do not run outside the app.","команда, например ls":"command, e.g. ls","Команда может удалить или изменить файлы. Проверьте её внимательно.":"The command may delete or change files. Check it carefully.","Команда выполнится в песочнице приложения на этом телефоне.":"The command will run in the app sandbox on this phone.","Отправить результат ИИ":"Send the result to AI","Исправить с ИИ":"Fix with AI","Выполняется…":"Running…","Дождитесь ответа":"Wait for the reply","Результат отправлен":"Result sent","Сессия не запущена. Нажмите «Активировать сессию», чтобы выполнять команды.":"The session is not running. Tap “Start session” to run commands.","● сессия запущена":"● session started","— сессия остановлена":"— session stopped","Оболочка":"Shell","Проверить Termux":"Check Termux","Выполнить и продолжать сам":"Run and continue automatically","Стоп":"Stop","Агент":"Agent","Запустить":"Start","Выключить":"Turn off","Что доступно на этом телефоне":"What is available on this phone","Сессия не запущена. Нажмите «Запустить», чтобы выполнять команды.":"The session is not running. Tap “Start” to run commands."});
let TERMUX_WAIT=25;
const Term=(()=>{
 const KH='kairema.term.hist.v1',MARK='\u0001',CAP=30000;
 let fail=null,log=[],cur=null,redraw=null,hist=[],st='off',mark='off',backend='android',probing=0;
 const KB='kairema.term.backend.v1';
 try{if(localStorage.getItem(KB)==='termux')backend='termux'}catch(e){}
 const T2=(a,b)=>LANG==='en'?b:a;
 try{hist=JSON.parse(localStorage.getItem(KH)||'[]')||[]}catch(e){}
 const saveH=()=>{try{localStorage.setItem(KH,JSON.stringify(hist.slice(-50)))}catch(e){}};
 /* Служебные пути обёртки (Shell.kt) в сообщениях оболочки не нужны ни человеку, ни модели. */
 const noise=s=>s.replace(/\S*\.kcmd_\w+\.sh(?::\s*\d+)?:\s*/g,'').replace(/\S*\.kwrap\.sh(?::\s*\d+)?:\s*/g,'');
 const view=r=>{const i=r.indexOf(MARK);return noise(i<0?r:r.slice(0,i).replace(/\n$/,''))};
 const DG2=/(^|[\s;&|])(sudo\s|su(\s|$)|reboot|shutdown|killall|pm\s+(uninstall|clear|disable)|(curl|wget)\b[^|;\n]*\|\s*(sudo\s+)?(sh|bash))/i;
 const danger=c=>DG2.test(c)||/(^|[\s;&|])(rm\s+(-\w*[rR]|-\w*f)|dd\s|mkfs|chmod\s+-\w*R|chown\s+-\w*R|mv\s+.*\s\/|>\s*\/dev\/)|\/data\/data|\/sdcard|\/storage|:\(\)\s*\{/i.test(c);
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
  return{code:isNaN(code)?-1:code,out:noise(i<0?raw:raw.slice(0,i))}}
 const add=(c,t)=>{const e={c,t};log.push(e);if(log.length>400)log.shift();if(redraw)redraw();return e};
 const upd=e=>{if(e.el&&e.el.isConnected){e.el.textContent=e.t;const o=e.el.parentNode;if(o)scr(o)}};
 /* Что отправляем модели после команды: сама команда, вывод (сжатый), код выхода и подсказка при «не найдено». */
 const feedback=(cmd,r)=>{const tc=typeof TermCompat!=='undefined',h=tc?TermCompat.hint(cmd,r,backend):'',o=tc?TermCompat.compact(r.out||'',2500):(r.out||'').slice(-2500);return '```bash\n$ '+cmd+'\n'+o+'\n```\n'+(r.err?r.err:'exit code: '+r.code)+(h?'\n'+h:'')};
 /* Один раз узнаём, какие команды есть в оболочке Android, и говорим об этом модели. */
 async function probe(){if(typeof TermCompat==='undefined'||!Native.on||backend!=='android'||probing||!TermCompat.stale(backend))return;probing=1;try{const r=await exec(TermCompat.probeCmd,{timeout:20});TermCompat.saveCaps(backend,r.out)}catch(e){}probing=0}
 const exitText=r=>r.err?'['+r.err+']':(LANG==='en'?'[exit code: ':'[код выхода: ')+r.code+']';
 const tick=()=>{if(redraw)redraw()};
 /* Запуск из терминала. */
 async function run(cmd,label){
  if(cur||st!=='on')return;
  hist.push(cmd);saveH();mark='on';
  add('c','› '+(label||cmd));const e=add('o','');
  const me=cur={};tick();
  const r=await exec(cmd,{onStart:id=>{me.id=id},onChunk:t=>{if(!me.gone){e.t=t.slice(-CAP);upd(e)}},timeout:label?30:60});
  if(me.gone)return; /* запуск уже освобождён принудительно (см. stop) */
  cur=null;e.t=(r.out||'').slice(-CAP);
  fail=(!label&&(r.err||r.code!==0))?{cmd,r}:null;
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
  if(!sx.permission){
   add('o',T2('Сейчас Android покажет окно с вопросом. Нажмите «Разрешить».','Android will show a question now. Tap “Allow”.'));
   Native.sync('termuxRequestPermission');
   for(let i=0;i<TERMUX_WAIT&&!sx.permission;i++){await wait(1000);try{sx=JSON.parse(Native.sync('termuxStatus')||'{}')}catch(e){}}
   add(sx.permission?'o':'e',(sx.permission?'✓ ':'✗ ')+T2('Разрешение «Run commands in Termux environment»','Permission “Run commands in Termux environment”'));
   if(!sx.permission){add('o',T2('Окно не появилось или вы отказали. Попробуйте ещё раз нажать «Проверить Termux». Если окна нет и в настройках Kairema нет этого разрешения, напишите об этом в чат: есть запасной способ.','The window did not appear or you denied it. Tap “Check Termux” again. If there is no window and no such permission in Kairema settings, tell the assistant: there is a fallback.'));return}}
  add('c','› '+T2('Пробный запуск в Termux','Test run in Termux'));
  const r=await exec('echo termux-ok; python --version 2>&1 | head -1; git --version 2>&1 | head -1; curl --version 2>&1 | head -1',{backend:'termux',timeout:60});
  if(r.out)add('o',r.out);
  if(r.err){
   add('e',r.err);
   add('o',T2('Если Termux не отвечает, откройте Termux и выполните одну команду:','If Termux does not respond, open Termux and run one command:'));
   add('o','mkdir -p ~/.termux && echo "allow-external-apps=true" >> ~/.termux/termux.properties');
   add('o',T2('Если ошибка про «app is in background»: в настройках Android для Termux выберите батарея «Без ограничений», включите «Автозапуск» и «Поверх других приложений», потом откройте Termux один раз. Если ошибки нет, полностью закройте Termux (смахните из списка приложений) и откройте снова.','If the error mentions “app is in background”: in Android settings set Termux battery to “Unrestricted”, enable “Autostart” and “Draw over other apps”, then open Termux once. Otherwise fully close Termux (swipe it away) and open it again.'))}
  else if(!/termux-ok/.test(r.out||''))add('e',exitText(r));
  else add('o','✓ '+T2('Termux отвечает. Если python или git не нашлись, в Termux выполните: pkg install python git curl','Termux responds. If python or git are missing, run in Termux: pkg install python git curl'));
  tick()}
 /* Самопроверка: короткий набор команд на выбранной оболочке; каждая строка в терминале показывает ✓ или ✗. */
 async function selfTest(){
  if(cur||st!=='on')return;
  const tm=backend==='termux',L2=T2,Q=[];
  const q=(a,b,cmd,ok,o)=>Q.push({n:L2(a,b),cmd,ok,o:o||{}});
  q('Вывод команды','Command output','echo kairema-ok',r=>/kairema-ok/.test(r.out)&&r.code===0);
  q('Код выхода передаётся','Exit code is passed','sh -c "exit 7"',r=>r.code===7);
  q('Неизвестная команда даёт ошибку','Unknown command fails','nonexistent_kai_cmd',r=>r.code!==0);
  q('Ошибки попадают в вывод','Errors reach the output','ls /no/such/dir_kai 2>&1',r=>r.code!==0&&r.out.trim().length>0);
  q('Конвейер и перенаправление','Pipe and redirect',"printf 'b\\na\\n' | sort > kt_t.txt; cat kt_t.txt",r=>r.out.trim()==='a\nb');
  q('Русские буквы','Cyrillic text','echo привет',r=>/привет/.test(r.out));
  q('Запись и чтение файла','Write and read a file','echo kai-data > kt_f.txt && cat kt_f.txt',r=>/kai-data/.test(r.out));
  q('Многострочная команда','Multi-line command','a=5\nb=6\necho $((a*b))',r=>r.out.trim()==='30');
  q('Ввод закрыт, команда не зависает','Input closed, no hanging','cat',(r,ms)=>ms<8000,{timeout:10});
  q('Большой вывод','Large output','seq 1 3000 | tail -1',r=>r.out.trim()==='3000');
  if(!tm){
   q('Папка запоминается (шаг 1)','Folder is remembered (step 1)','mkdir -p kt_dir && cd kt_dir',r=>r.code===0);
   q('Папка запоминается (шаг 2)','Folder is remembered (step 2)','pwd',r=>/kt_dir\s*$/.test(r.out));
   q('Остановка по времени','Stop on timeout','sleep 30',(r,ms)=>ms<12000&&r.code!==0,{timeout:3})}
  add('c','› '+L2('Самопроверка терминала','Terminal self-test'));
  cur={};tick();let pass=0;
  for(const c of Q){
   const t0=Date.now();let r;
   try{r=await exec(c.cmd,{timeout:c.o.timeout||20,onStart:id=>{cur.id=id}})}catch(e){r={code:-1,out:'',err:e.message}}
   let good=false;try{good=!!c.ok(r,Date.now()-t0)}catch(e){}
   if(good)pass++;
   add(good?'o':'e',(good?'✓ ':'✗ ')+c.n+(good?'':'   → '+((r.err||r.out||'').trim().replace(/\s+/g,' ').slice(0,90)||('код '+r.code))))}
  try{await exec('cd .. 2>/dev/null; rm -rf kt_dir kt_t.txt kt_f.txt',{timeout:10})}catch(e){}
  cur=null;
  add(pass===Q.length?'o':'e',L2('Пройдено ','Passed ')+pass+L2(' из ',' of ')+Q.length+(pass===Q.length?'':L2('. Пришлите этот вывод ИИ или разработчику.','. Send this output to the AI or the developer.')));
  tick();return{pass,total:Q.length}}
 /* Остановка. Если оболочка не ответила на отмену (внучатый процесс держит вывод), через 2,5 с запуск освобождается принудительно,
    чтобы ввод и кнопка не оставались заблокированными навсегда. */
 const stop=()=>{const c=cur;if(!c)return;if(c.id)Native.cancel(c.id);
  setTimeout(()=>{if(cur===c){c.gone=1;cur=null;add('e',T2('[остановлено: команда не ответила, сеанс освобождён]','[stopped: the command did not respond, session released]'));tick()}},2500)};
 /* Сессия: зелёная = работает, красная = выключена, жёлтая = очищена. */
 const activate=quiet=>{const was=st;st='on';mark='on';if(!quiet&&was!=='on')add('o','● сессия запущена');tick();probe()};
 const deactivate=()=>{stop();st='off';mark='off';add('','— сессия остановлена');tick()};
 const clear=()=>{log=[];mark='clr';tick();toast('Сессия очищена')};
 const DIAG=`echo "== Система"; getprop ro.product.model; getprop ro.build.version.release; getprop ro.build.version.sdk; uname -m; id
echo "== Команды"; for c in ls cat grep sed awk tar gzip curl wget ping nc ssh python python3 git node busybox toybox; do if command -v $c >/dev/null 2>&1; then echo "есть: $c"; else echo "нет:  $c"; fi; done
echo "== Запуск файла из папки приложения"; printf '#!/system/bin/sh\\necho ok\\n' > t.sh; chmod 755 t.sh; ./t.sh 2>&1 | head -2; echo "через sh:"; sh t.sh
echo "== Папка"; pwd; echo "Папка библиотек: $KAIREMA_LIB"; ls $KAIREMA_LIB 2>&1 | head -5
echo "== Сеть"; ping -c 1 -W 2 1.1.1.1 2>&1 | tail -2
echo "== Место"; df -h . 2>&1 | tail -2`;
 /* Ошибка последней команды из терминала → готовое сообщение для ИИ (null, если последняя команда прошла) */
 const failMsg=()=>fail?'The command failed (I ran it in the terminal). Explain what the error means and suggest a fix.\n\n'+feedback(fail.cmd,fail.r):null;
 return{exec,run,record,feedback,failMsg,dismiss(){fail=null},get fail(){return fail},probe,selfTest,stop,clear,activate,deactivate,setBackend,checkTermux,get backend(){return backend},get st(){return st},get mark(){return mark},danger,DIAG,get busy(){return!!cur},bind(f){redraw=f},text(last){let a=log;if(last){const i=log.map(e=>e.c).lastIndexOf('c');if(i>=0)a=log.slice(i)}return a.map(e=>e.t).join('\n')},drawLog(out){out.innerHTML='';log.slice(-300).forEach(e=>{const d=document.createElement('div');d.className=e.c;d.textContent=e.t;e.el=d;out.append(d)});scr(out)},hist:()=>hist}})();
function termView(){
 const v=$('#v-term');
 if(!P.diag)P.diag='<path d="M3 12h4l2.5-6 4 12 2.5-6H21"/>';
 v.innerHTML=`<div class="top"><h1 style="flex:1">Терминал</h1><button class="ib tm-q" data-help aria-label="Что такое терминал" ${typeof Help==='undefined'?'hidden':''}>?</button></div><p class="sub" style="margin:0 16px 8px" data-tn></p><div class="scroll"><div class="ses"><div class="tm-st"><div class="stt"><span class="sd"></span><b></b></div><span class="tm-chip" data-chip></span></div><div class="tm-ctl"><button class="sb" data-a="on">${ic('play')}<span>Запустить</span></button><button class="sb" data-a="off">${ic('stop')}<span>Выключить</span></button><button class="sb" data-a="clr">${ic('trash')}<span>Очистить</span></button></div><button class="tm-diag" data-diag><span class="ti">${ic('diag')}</span><span class="m"><b>Диагностика</b><small>Что доступно на этом телефоне</small></span>${ic('chevR')}</button><button class="tm-diag" data-self><span class="ti">${ic('ok')}</span><span class="m"><b>Самопроверка терминала</b><small>Проверка команд, папки, вывода и времени</small></span>${ic('chevR')}</button><div class="tm-bk"><span class="sub" data-bkl>Оболочка</span><div data-bk></div><button class="sb tm-chk" data-tchk>${ic('ok')}<span>Проверить Termux</span></button></div></div><div class="tp"><div><div class="term"><div class="tcp"><button type="button" data-cp="all">${ic('cpy')}<span>Всё</span></button><button type="button" data-cp="last">${ic('cpy')}<span>Последний вывод</span></button><button type="button" data-cp="sel">${ic('sel')}<span>Выделить</span></button><button type="button" data-cp="shr">${ic('shr')}<span>Отправить</span></button></div><div class="tout"></div><div class="tin"><span style="color:#9AA0A6">›</span><input autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="команда, например ls" aria-label="Команда"><button class="send sm" aria-label="Enter"></button></div></div></div></div><p class="sub idle" style="margin-top:8px">Сессия не запущена. Нажмите «Запустить», чтобы выполнять команды.</p></div>`;
 $('[data-tn]',v).textContent=Native.on?'Выберите оболочку: Android (встроенная, без python и git) или Termux (полноценный Linux, нужна установка Termux). «Диагностика» показывает, что доступно.':'Демо: вне приложения команды не выполняются.';
 if(typeof Sx!=='undefined')Sx.icons();
 $$('[data-cp]',v).forEach(b=>b.onclick=()=>{
  const k=b.dataset.cp,t=Term.text(k==='last');
  if(!t.trim()){toast('Нечего копировать');return}
  if(typeof Sx==='undefined'){copy(t);return}
  if(k==='sel')Sx.selectSheet(t);else if(k==='shr')Sx.text('Terminal',t);else Sx.copyToast(t,k==='last'?'Последний вывод скопирован':'Весь вывод скопирован')});
 const out=$('.tout',v),inp=$('.tin input',v),send=$('.tin .send',v);
 const fx=document.createElement('button');fx.type='button';fx.className='btn ghost tm-fix';fx.setAttribute('data-fix','');fx.hidden=true;fx.textContent=L('Отправить ошибку ИИ на разбор');
 $('.tin',v).after(fx);
 fx.onclick=()=>{const m=Term.failMsg();if(!m){fx.hidden=true;return}if(typeof show==='function')show('api');setTimeout(()=>{if(Chat.send(m)){Term.dismiss();toast(L('Ошибка отправлена ИИ'))}else toast(L('Дождитесь ответа'))},400)};
 const ui=()=>{
  const r=Term.busy,s=Term.st,m=Term.mark;
  $('.ses',v).dataset.mark=m;
  $('.stt b',v).textContent={on:'Сессия активна',off:'Сессия выключена',clr:'Сессия очищена'}[m];
  $('.tp',v).classList.toggle('open',s==='on');
  $('.idle',v).style.display=s==='on'?'none':'block';
  $('[data-a=on]',v).disabled=m==='on';$('[data-a=off]',v).disabled=m==='off';$('[data-a=clr]',v).disabled=m==='clr';
  $('[data-diag]',v).disabled=s!=='on'||r;$('[data-self]',v).disabled=s!=='on'||r;
  $('[data-chip]',v).textContent=Term.backend==='termux'?'Termux':'Android';
  $('[data-tchk]',v).style.display=Term.backend==='termux'?'':'none';
  $('[data-tchk]',v).disabled=r;
  inp.disabled=s!=='on'||r;
  fx.hidden=!(Term.fail&&!r&&s==='on');
  send.innerHTML=r?ic('stop'):ic('enter');send.setAttribute('aria-label',r?'Stop':'Enter');send.disabled=!(r||s==='on')};
 $('[data-bk]',v).append(seg(['Android','Termux'],Term.backend==='termux'?1:0,i=>Term.setBackend(i?'termux':'android')));
 $('[data-tchk]',v).onclick=()=>Term.checkTermux();
 const draw=()=>{if(!v.isConnected||!out.isConnected){Term.bind(null);return}Term.drawLog(out);ui()};
 Term.bind(draw);draw();
 const go=()=>{const c=inp.value.trim();if(!c)return;inp.value='';Term.run(c)};
 send.onclick=()=>Term.busy?Term.stop():go();
 inp.onkeydown=e=>{if(e.key==='Enter')go()};
 $('[data-diag]',v).onclick=()=>Term.run(Term.DIAG,'Диагностика');
 $('[data-self]',v).onclick=()=>Term.selfTest();
 $('[data-help]',v).onclick=()=>{if(typeof Help!=='undefined')Help.open('terminal')};
 $$('[data-a]',v).forEach(b=>b.onclick=()=>({on:()=>Term.activate(),off:Term.deactivate,clr:Term.clear})[b.dataset.a]())}
/* Подсказка для ИИ: как предлагать команды. */
function terminalPrompt(){
 if(!Native.on)return'';
 if(typeof TermCompat!=='undefined')return TermCompat.prompt(Term.backend);
 const where=Term.backend==='termux'
  ?"a real Linux environment in Termux (bash; python, git, curl, node and other packages may be installed with pkg install; home is ~)"
  :"Android's built-in shell (/system/bin/sh with toybox; no root; no python, git, curl or apt; working directory is the app's private folder)";
 return"\n\nThe app has a terminal connected to "+where+". When you suggest commands the user can run, put them in a fenced ```bash block (one short command or script per block) so the app shows a Run button, and say briefly what the command does. For multi-step tasks give only the commands for the next step, then wait: the app may run them and send you the output and exit code. When you get a result, read it and either continue with the next step, fix the error, or finish with a short summary and no command block."}
/* Режим агента: после одного подтверждения ИИ сам ведёт задачу по шагам (лимит шагов, стоп, опасное только вручную). */
const Agent=(()=>{
 const MAX=8,T2=(a,b)=>LANG==='en'?b:a;
 let left=0,busy=false,bar=null,redo=0,seen={};
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
 function start(){left=MAX;redo=0;seen={};paint()}
 const waitChat=async()=>{for(let i=0;i<50&&Chx.busy;i++)await wait(100)};
 const report=(cmd,r)=>Term.feedback(cmd,r)+'\n\n';
 const cmdsOf=t=>typeof TermCompat!=='undefined'?TermCompat.extract(t):blocks(t).map(c=>({cmd:c,notes:[],open:false}));
 /* Вызывается после каждого ответа ИИ в чате. */
 async function onAnswer(m,bd){
  if(!left||busy)return;
  if(m.err){stop(T2('Агент остановлен: ошибка ответа','Agent stopped: answer error'));return}
  const ex=cmdsOf(m.t||''),cmds=ex.filter(x=>!x.open).map(x=>x.cmd);
  if(!cmds.length){
   if(ex.some(x=>x.open)&&redo<2){redo++;await waitChat();Chat.send('Your last command block was not closed (the answer was cut off), so nothing was run. Send the command again in a complete block.');return}
   stop(T2('Агент закончил','Agent finished'));return}
  if(cmds.some(Term.danger)){stop(T2('Агент остановлен: в плане есть опасная команда, запустите вручную','Agent stopped: a dangerous command, run it manually'));return}
  busy=true;Term.activate(true);
  const log=document.createElement('div');log.className='runout';bd.append(log);
  let rep=ex.filter(x=>!x.open&&x.notes&&x.notes.length).map(x=>'Note: '+x.notes.join('; ')).join('\n'),looped=false;if(rep)rep+='\n\n';
  for(const c of cmds){
   if(!left)break;
   log.textContent+=(log.textContent?'\n':'')+'▶ '+c.split('\n')[0].slice(0,120)+'\n';
   const r=await Term.exec(c,{onChunk:t=>{log.dataset.live=t.slice(-600)}});
   log.textContent+=((r.out||'').slice(-600)||'(пусто)')+(r.err||r.code!==0?'\n['+(r.err||('код '+r.code))+']':'')+'\n';
   Term.record(c,r);if(r.fd&&typeof FileDiff!=='undefined')FileDiff.chip(log,r.fd);rep+=report(c,r);
   const key=c+'|'+r.code+'|'+(r.out||'').slice(0,200);seen[key]=(seen[key]||0)+1;if(seen[key]>=3)looped=true}
  busy=false;
  if(looped){stop(T2('Агент остановлен: одна и та же команда снова даёт тот же результат','Agent stopped: the same command keeps giving the same result'));return}
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
 if(!Native.on)return;
 const tc=typeof TermCompat!=='undefined';
 if(tc?!TermCompat.runnable(lang,code):!/^(sh|bash|shell|zsh|console|terminal)$/.test(lang))return;
 const cmd=tc?TermCompat.clean(code).cmd:code.split('\n').map(l=>l.replace(/^\s*\$\s+/,'')).join('\n').trim();
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
  Term.record(cmd,r);if(r.fd&&typeof FileDiff!=='undefined')FileDiff.chip(res,r.fd);
  const failed=!!r.err||r.code!==0;
  const body=Term.feedback(cmd,r);
  const msg=(failed?'The command failed. Explain the error and suggest a fix.\n\n':'Result of the command I ran:\n\n')+body;
  if(auto){await wait(50);for(let i=0;i<50&&Chx.busy;i++)await wait(100);Chat.send(msg);return}
  const sb=document.createElement('button');sb.className='rb';
  sb.textContent=failed?'Исправить с ИИ':'Отправить результат ИИ';
  sb.onclick=()=>{if(Chat.send(msg)){sb.disabled=true;toast('Результат отправлен')}else toast('Дождитесь ответа')};
  bar.append(sb)})});
