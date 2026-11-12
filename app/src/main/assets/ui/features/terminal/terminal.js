/* ===== ТЕРМИНАЛ: настоящая оболочка Android и запуск команд из ответов ИИ =====
   Команды выполняет Kotlin (Shell.kt, /system/bin/sh). В ответах ИИ у блоков ```bash появляется кнопка «Выполнить»;
   команда запускается только после вашего подтверждения, результат можно отправить ИИ одной кнопкой.
   Убрать модуль: удалить папку features/terminal и её строки в index.html (вкладка Терминал тогда пустая). */
i18nAdd({"▶ Выполнить":"▶ Run","Выполнить":"Run","Всё равно выполнить":"Run anyway","Выполнить команду?":"Run the command?","Диагностика":"Diagnostics","Остановить":"Stop","Очистить":"Clear","Это настоящая оболочка Android на вашем телефоне. Python и git здесь нет, зато работают системные команды. Нажмите «Диагностика», чтобы увидеть, что доступно.":"This is the real Android shell on your phone. There is no python or git here, but system commands work. Tap “Diagnostics” to see what is available.","Демо: вне приложения команды не выполняются.":"Demo: commands do not run outside the app.","команда, например ls":"command, e.g. ls","Команда может удалить или изменить файлы. Проверьте её внимательно.":"The command may delete or change files. Check it carefully.","Команда выполнится в песочнице приложения на этом телефоне.":"The command will run in the app sandbox on this phone.","Отправить результат ИИ":"Send the result to AI","Исправить с ИИ":"Fix with AI","Выполняется…":"Running…","Дождитесь ответа":"Wait for the reply","Результат отправлен":"Result sent"});
const Term=(()=>{
 const KH='kairema.term.hist.v1',MARK='\u0001',CAP=30000;
 let log=[],cur=null,redraw=null,hist=[];
 try{hist=JSON.parse(localStorage.getItem(KH)||'[]')||[]}catch(e){}
 const saveH=()=>{try{localStorage.setItem(KH,JSON.stringify(hist.slice(-50)))}catch(e){}};
 const view=r=>{const i=r.indexOf(MARK);return i<0?r:r.slice(0,i).replace(/\n$/,'')};
 const danger=c=>/(^|[\s;&|])(rm\s+(-\w*[rR]|-\w*f)|dd\s|mkfs|chmod\s+-\w*R|chown\s+-\w*R|mv\s+.*\s\/|>\s*\/dev\/)|\/data\/data|\/sdcard|\/storage|:\(\)\s*\{/i.test(c);
 /* Запуск команды. Возвращает {code,out,err?}. onChunk получает весь вывод к этому моменту. */
 async function exec(cmd,o={}){
  if(!Native.on){await wait(250);return{code:0,out:'(демо: вне приложения команды не выполняются)',demo:true}}
  let raw='';
  const p=Native.run('shell',[cmd,o.timeout||60],t=>{raw+=t;if(o.onChunk)o.onChunk(view(raw))});
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
  if(cur)return;
  hist.push(cmd);saveH();
  add('c','› '+(label||cmd));const e=add('o','');
  cur={};tick();
  const r=await exec(cmd,{onStart:id=>{cur.id=id},onChunk:t=>{e.t=t.slice(-CAP);upd(e)},timeout:label?30:60});
  cur=null;e.t=(r.out||'').slice(-CAP);
  if(!e.t)log.splice(log.indexOf(e),1);
  if(r.err||r.code!==0)add('e',exitText(r));
  tick()}
  /* Записать в терминал то, что выполнено из чата. */
 function record(cmd,r){add('c','› '+cmd+(LANG==='en'?'  (from chat)':'  (из чата)'));if(r.out)add('o',r.out.slice(-CAP));if(r.err||r.code!==0)add('e',exitText(r))}
 const stop=()=>{if(cur&&cur.id)Native.cancel(cur.id)};
 const clear=()=>{if(cur)return;log=[];tick()};
 const DIAG=`echo "== Система"; getprop ro.product.model; getprop ro.build.version.release; getprop ro.build.version.sdk; uname -m; id
echo "== Команды"; for c in ls cat grep sed awk tar gzip curl wget ping nc ssh python python3 git node busybox toybox; do if command -v $c >/dev/null 2>&1; then echo "есть: $c"; else echo "нет:  $c"; fi; done
echo "== Запуск файла из папки приложения"; printf '#!/system/bin/sh\\necho ok\\n' > t.sh; chmod 755 t.sh; ./t.sh 2>&1 | head -2; echo "через sh:"; sh t.sh
echo "== Папка"; pwd; echo "Папка библиотек: $KAIREMA_LIB"; ls $KAIREMA_LIB 2>&1 | head -5
echo "== Сеть"; ping -c 1 -W 2 1.1.1.1 2>&1 | tail -2
echo "== Место"; df -h . 2>&1 | tail -2`;
 return{exec,run,record,stop,clear,danger,DIAG,get busy(){return!!cur},bind(f){redraw=f},drawLog(out){out.innerHTML='';log.slice(-300).forEach(e=>{const d=document.createElement('div');d.className=e.c;d.textContent=e.t;e.el=d;out.append(d)});scr(out)},hist:()=>hist}})();
function termView(){
 const v=$('#v-term');
 v.innerHTML=`<div class="top"><h1>Терминал</h1></div><p class="sub" style="margin:0 16px 8px" data-tn></p><div class="scroll"><div class="tm-bar"><button class="sb" data-diag>${ic('play')}Диагностика</button><button class="sb" data-stop>${ic('stop')}Остановить</button><button class="sb" data-clr>${ic('trash')}Очистить</button></div><div class="tp open"><div><div class="term"><div class="tout"></div><div class="tin"><span style="color:#9AA0A6">›</span><input autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="команда, например ls" aria-label="Команда"><button class="send sm" aria-label="Enter">${ic('enter')}</button></div></div></div></div></div>`;
 $('[data-tn]',v).textContent=Native.on?'Это настоящая оболочка Android на вашем телефоне. Python и git здесь нет, зато работают системные команды. Нажмите «Диагностика», чтобы увидеть, что доступно.':'Демо: вне приложения команды не выполняются.';
 const out=$('.tout',v),inp=$('.tin input',v),send=$('.tin .send',v);
 const ui=()=>{const r=Term.busy;$('[data-stop]',v).disabled=!r;$('[data-diag]',v).disabled=r;$('[data-clr]',v).disabled=r;inp.disabled=r;send.disabled=r};
 const draw=()=>{if(!v.isConnected||!out.isConnected){Term.bind(null);return}Term.drawLog(out);ui()};
 Term.bind(draw);draw();
 const go=()=>{const c=inp.value.trim();if(!c)return;inp.value='';Term.run(c)};
 send.onclick=go;inp.onkeydown=e=>{if(e.key==='Enter')go()};
 $('[data-diag]',v).onclick=()=>Term.run(Term.DIAG,'Диагностика');
 $('[data-stop]',v).onclick=Term.stop;$('[data-clr]',v).onclick=Term.clear}
/* Подсказка для ИИ: как предлагать команды. */
function terminalPrompt(){
 if(!Native.on)return'';
 return"\n\nThe app has a real Android shell terminal (/system/bin/sh with toybox; no root; no python, git or apt; working directory is the app's private folder). When you suggest commands the user can run, put them in a fenced ```bash block (one short command or script per block) so the app shows a Run button, and say briefly what the command does. If the user sends you a command result, read the output and the exit code and suggest a fix if it failed."}
/* Кнопка «Выполнить» под блоками кода в ответах ИИ. */
function termConfirm(cmd,onOk){
 const dg=Term.danger(cmd);
 const s=sheet(`<h2 style="margin-bottom:10px">Выполнить команду?</h2><pre class="tm-cmd"></pre><p class="ac-note" data-w style="${dg?'color:var(--err)':''}"></p><div class="two"><button class="btn ghost" data-c>Отмена</button><button class="btn" data-o></button></div>`);
 $('.tm-cmd',s).textContent=cmd.length>1500?cmd.slice(0,1500)+'…':cmd;
 $('[data-w]',s).textContent=dg?'Команда может удалить или изменить файлы. Проверьте её внимательно.':'Команда выполнится в песочнице приложения на этом телефоне.';
 $('[data-o]',s).textContent=dg?'Всё равно выполнить':'Выполнить';
 $('[data-c]',s).onclick=s.close;
 $('[data-o]',s).onclick=()=>{s.close();onOk()}}
Hooks.on('md:code',(pre,code,lang)=>{
 if(!Native.on||!/^(sh|bash|shell|zsh|console|terminal)$/.test(lang))return;
 const cmd=code.split('\n').map(l=>l.replace(/^\s*\$\s+/,'')).join('\n').trim();
 if(!cmd)return;
 const bar=document.createElement('div');bar.className='runbar';
 const b=document.createElement('button');b.className='rb';b.textContent='▶ Выполнить';
 const res=document.createElement('div');res.className='runout';res.hidden=true;
 bar.append(b);pre.after(bar,res);
 b.onclick=()=>termConfirm(cmd,async()=>{
  if(Term.busy){toast('Дождитесь ответа');return}
  b.disabled=true;res.hidden=false;res.textContent='Выполняется…';
  const r=await Term.exec(cmd,{onChunk:t=>{res.textContent=t.slice(-4000)||'…'}});
  const shown=((r.out||'').slice(-4000)||'(пусто)')+(r.err||r.code!==0?'\n'+(r.err?'['+r.err+']':'[код выхода: '+r.code+']'):'');
  res.textContent=shown;b.disabled=false;
  Term.record(cmd,r);
  const sb=document.createElement('button');sb.className='rb';
  const failed=!!r.err||r.code!==0;
  sb.textContent=failed?'Исправить с ИИ':'Отправить результат ИИ';
  sb.onclick=()=>{
   const body='```bash\n$ '+cmd+'\n'+(r.out||'').slice(-3000)+'\n```\n'+(r.err?r.err:('exit code: '+r.code));
   const msg=(failed?'The command failed. Explain the error and suggest a fix.\n\n':'Result of the command I ran:\n\n')+body;
   if(Chat.send(msg)){sb.disabled=true;toast('Результат отправлен')}else toast('Дождитесь ответа')};
  bar.append(sb)})});
