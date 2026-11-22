/* ===== ТЕРМИНАЛ: совместимость с любыми моделями (от самых слабых до лучших) =====
   Слабые модели не всегда оформляют команды правильно: забывают язык у блока, пишут «$ ls» вместе с выводом, ставят sudo,
   оборачивают команду в теги или JSON, не закрывают блок. Этот файл превращает такие ответы в список настоящих команд
   (TermCompat.extract), чистит команду (TermCompat.clean), сжимает длинный вывод для модели (TermCompat.compact),
   подсказывает модели, что делать при ошибке «команда не найдена» (TermCompat.hint), хранит список доступных команд
   (TermCompat.caps) и строит инструкцию для модели (TermCompat.prompt). Всё чистый JS: проверяется тестом docs/tests/term027.test.py.
   Убрать: удалить файл и строку в index.html (terminal.js сам вернётся к простому разбору). */
const TermCompat=(()=>{
 const SH=/^(sh|bash|shell|zsh|console|terminal|shell-session|shellsession|sh-session|bash-session|shellscript|command|cli|termux|adb|ash|dash)$/;
 const NEVER=/^(output|result|results|json|yaml|yml|xml|html|css|js|javascript|ts|typescript|python|py|kotlin|java|c|cpp|csharp|go|rust|sql|diff|patch|md|markdown|csv|ini|toml|properties|powershell|ps1|bat|cmd|batch|php|ruby|swift|dockerfile|jsonc|log|stdout|stderr)$/;
 const WEAK=/^(|text|plaintext|txt|plain|none)$/;
 const KNOWN=new Set('ls cd pwd cat echo grep find sed awk head tail wc sort uniq cut tr mkdir rmdir rm cp mv touch chmod chown ln stat file du df ps top kill uname id whoami date env export printf test tar gzip gunzip zip unzip curl wget ping nc python python3 pip pip3 node npm git ssh scp apt apt-get pkg pm am getprop setprop logcat dumpsys settings ip ifconfig netstat which type command sleep xargs tee diff cmp basename dirname readlink realpath md5sum sha1sum sha256sum base64 hexdump od strings less more man busybox toybox sh bash source time yes seq expr nohup timeout free uptime hostname mount dd cal clear'.split(' '));
 const first=c=>{const l=String(c).split('\n').map(x=>x.trim()).find(x=>x&&!x.startsWith('#'));return l?l.replace(/^[$>❯›]\s*/,'').split(/\s+/)[0].replace(/^.*\//,m=>m):''};
 const looks=c=>{const w=first(c);return !!w&&(KNOWN.has(w)||/^\.\.?\//.test(w)||/^[A-Za-z_]\w*=/.test(w))};
 const PROMPT=/^\s*[$❯›]\s+\S/;
 /* Привести текст команды в порядок. Возвращает {cmd, notes}. */
 function clean(code,lang){
  const notes=[];
  let t=String(code||'').replace(/\r\n?/g,'\n').replace(/ /g,' ').replace(/[​-‏⁠﻿]/g,'')
   .replace(/[“”„]/g,'"').replace(/[‘’]/g,"'");
  let ls=t.split('\n');
  if(ls.length&&/^(bash|sh|shell|zsh|console|terminal)$/i.test(ls[0].trim()))ls.shift();
  /* Сеанс вида «$ команда» + вывод: оставляем только строки с приглашением (и продолжения через \). */
  if(ls.some(l=>PROMPT.test(l))){
   const keep=[];let cont=false;
   for(const l of ls){
    if(PROMPT.test(l)){keep.push(l.replace(/^\s*[$❯›]\s+/,''));cont=/\\\s*$/.test(l)}
    else if(cont&&l.trim()){keep.push(l);cont=/\\\s*$/.test(l)}
    else cont=false}
   ls=keep}
  ls=ls.filter((l,i,a)=>!/^\s*[$❯›]\s*$/.test(l));
  t=ls.join('\n').trim();
  if(/(^|[;&|(]\s*|\n\s*)sudo\s/.test(t)){t=t.replace(/(^|[;&|(]\s*|\n\s*)sudo\s+(-\w+\s+)*/g,'$1');notes.push('sudo removed: there is no root here')}
  if(!t||t.split('\n').every(l=>!l.trim()||/^\s*#/.test(l)))return{cmd:'',notes};
  return{cmd:t,notes}}
 /* Блок кода с таким языком и текстом можно выполнить? */
 function runnable(lang,code){
  lang=String(lang||'').toLowerCase();
  if(NEVER.test(lang))return false;
  if(SH.test(lang))return !!clean(code).cmd;
  if(WEAK.test(lang)){const c=clean(code).cmd;return !!c&&(String(code).split('\n').some(l=>PROMPT.test(l))||looks(c))}
  return false}
 /* Все команды из ответа по порядку: блоки кода, теги <command>, JSON {"command":"…"}.
    Незакрытый блок (ответ оборвался) помечается open:true, его выполнять нельзя. */
 function extract(text){
  text=String(text||'');
  const out=[],ranges=[];
  const fr=/^[ \t]*(`{3,}|~{3,})[ \t]*([\w.+-]*)[^\n]*\n([\s\S]*?)(?:^[ \t]*(\1)[`~]*[ \t]*$|(?![\s\S]))/gm;
  let m;
  while((m=fr.exec(text))){
   const closed=!!m[4];
   const lang=m[2].toLowerCase(),code=m[3];
   ranges.push([m.index,m.index+m[0].length]);
   if(runnable(lang,code)){const c=clean(code);out.push({i:m.index,cmd:c.cmd,notes:c.notes,open:!closed,src:'fence'})}
   if(m[0].length===0)fr.lastIndex++}
  const inFence=i=>ranges.some(r=>i>=r[0]&&i<r[1]);
  const tr=/<(command|bash|sh|shell|terminal|cmd)>([\s\S]*?)<\/\1>/gi;
  while((m=tr.exec(text))){if(inFence(m.index))continue;const c=clean(m[2].replace(/^\s*<!\[CDATA\[|\]\]>\s*$/g,''));if(c.cmd)out.push({i:m.index,cmd:c.cmd,notes:c.notes,open:false,src:'tag'})}
  const jr=/"(?:command|cmd)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  while((m=jr.exec(text))){
   let v;try{v=JSON.parse('"'+m[1]+'"')}catch(e){continue}
   const c=clean(v);if(!c.cmd)continue;
   if(ranges.some(r=>m.index>=r[0]&&m.index<r[1])){const f=out.find(o=>o.src==='fence'&&o.cmd.includes(c.cmd));if(f)continue}
   out.push({i:m.index,cmd:c.cmd,notes:c.notes,open:false,src:'json'})}
  return out.sort((a,b)=>a.i-b.i)}
 /* Длинный вывод для модели: начало и конец, середина заменена пометкой. */
 function compact(s,max){
  s=String(s||'');max=max||2500;
  if(s.length<=max)return s;
  const a=Math.floor(max*0.35),b=max-a;
  return s.slice(0,a)+'\n…['+(s.length-max)+' characters skipped]…\n'+s.slice(-b)}
 /* ---- доступные команды (результат пробы), по оболочкам ---- */
 const CK='kairema.term.caps.v1',PROBE='ls cat grep sed awk find tar gzip curl wget ping python python3 pip git node npm ssh busybox toybox nano vi';
 const load=()=>{try{return JSON.parse(localStorage.getItem(CK)||'{}')||{}}catch(e){return{}}};
 const caps=b=>load()[b]||null;
 const saveCaps=(b,out)=>{const ok=[],no=[];String(out||'').split('\n').forEach(l=>{const m=l.match(/^([+-])(\S+)$/);if(m)(m[1]==='+'?ok:no).push(m[2])});if(!ok.length&&!no.length)return null;const d=load();d[b]={ok,no,t:Date.now()};try{localStorage.setItem(CK,JSON.stringify(d))}catch(e){}return d[b]};
 const probeCmd='for c in '+PROBE+'; do if command -v $c >/dev/null 2>&1; then echo "+$c"; else echo "-$c"; fi; done';
 const stale=b=>{const c=caps(b);return !c||Date.now()-(c.t||0)>7*864e5};
 /* ---- подсказка модели при ошибке ---- */
 function hint(cmd,r,backend){
  const o=String(r&&r.out||'')+' '+String(r&&r.err||'');
  const m=o.match(/(?:^|\n)(?:\S+: )?(\S+): (?:inaccessible or )?not found/)||o.match(/sh: (\S+): not found/);
  const name=(m&&m[1])||(r&&r.code===127?first(cmd):'');
  if(!name&&!(r&&r.code===126))return'';
  if(r&&r.code===126||/Permission denied|exec format|Text file busy/i.test(o)&&/\.\//.test(cmd))
   return'Hint: files in the app folder cannot be run directly (Android forbids it). Run scripts through the interpreter: sh script.sh';
  const c=caps(backend),ok=c?c.ok.join(', '):'';
  let h='Hint: the command "'+name+'" is not available in this shell.';
  if(backend!=='termux'&&/^(python|python3|pip|pip3|git|node|npm|apt|apt-get|ssh|nano|vim)$/.test(name))h+=' The built-in Android shell has no '+name+'; use only basic commands (ls, cat, grep, sed, awk, find, tar, echo) or tell the user to switch to Termux in the Terminal tab.';
  else if(name==='sudo'||name==='su')h+=' There is no root; run the command without sudo.';
  else h+=' Do not retry it; use another approach.';
  if(ok)h+=' Available here: '+ok+'.';
  return h}
 /* ---- инструкция для модели ---- */
 function prompt(backend){
  const tm=backend==='termux',c=caps(backend);
  const env=tm
   ?"Environment: a real Linux shell (bash) inside Termux on the user's Android phone. Home is ~. Packages install with: pkg install <name>. No sudo, no root."
   :"Environment: Android's built-in shell (/system/bin/sh, toybox). No root, no sudo. Working directory is the app's private folder and it is remembered between commands (cd works). There is NO python, git, pip, apt or ssh. Use only simple commands.";
  const av=c&&c.ok.length?(" Available commands: "+c.ok.join(', ')+"."+(c.no.length?" Not available: "+c.no.join(', ')+".":"")):"";
  return "\n\nTERMINAL. The app can run shell commands for the user. "+env+av
   +"\nHow to use it (follow exactly):"
   +"\n1. To run something, write ONE fenced block with the language bash and ONLY commands inside, like:\n```bash\nls -la\n```\n"
   +"2. No explanations, comments with $ prompts, or example output inside the block. Put words outside the block. One block per step; each line is one command.\n"
   +"3. Do not use sudo, interactive programs (nano, vim, top, less) or commands that wait for input. Prefer short commands whose output is small (use head, tail, grep).\n"
   +"4. For a multi-step task give only the next step and wait. After the user runs it you receive the output and exit code. Exit code 0 means success. Read the output, then either give the next block, fix the error, or finish with a short summary and NO block.\n"
   +"5. Never invent output. Never claim a command ran unless you got its result.\n"
   +"6. If a command is not found, do not repeat it: use an available one or explain the limit."}
 return{extract,clean,runnable,compact,hint,prompt,caps,saveCaps,probeCmd,stale,looks}})();
