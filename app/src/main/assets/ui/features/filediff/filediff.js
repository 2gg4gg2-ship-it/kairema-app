/* ===== ДИФФЫ И ОТКАТ ФАЙЛОВ АГЕНТА =====
   Когда команда из чата (кнопка «Выполнить» или агент) явно пишет в файлы (> и >>, tee, sed -i, mv, cp, rm, touch, truncate),
   модуль до запуска запоминает их содержимое, после запуска сравнивает и показывает плашку «Изменено файлов: N».
   Нажатие открывает дифф (красное удалено, зелёное добавлено) и кнопку «Откатить» (вернуть как было, созданный файл удаляется).
   Список прошлых изменений: Настройки → «Изменения файлов агента» (последние 15).
   Честные границы: видны только файлы, которые названы в команде простым путём (без $, * и подстановок); изменения от скриптов
   (python, git, npm) не видны; файлы больше 60 КБ и двоичные не запоминаются (в диффе пометка, откат недоступен).
   Подключается к Term.exec (terminal.js): FileDiff.wrap() подменяет Term.exec при app:ready; терминал руками (Term.run) не затрагивается.
   Убрать модуль: удалить папку и строки в index.html; в terminal.js строки с FileDiff защищены typeof. */
const FileDiff=(()=>{
 const KEY='kairema.fdiff.v1',MAXF=61440,MAXE=15,MAXCH=1500000;
 i18nAdd({"Изменено файлов":"Files changed","Изменения файлов":"File changes","Изменения файлов агента":"Agent file changes","Дифф и откат изменений, сделанных командами из чата":"Diff and rollback of changes made by chat commands","Пока нет изменений.":"No changes yet.","Откатить":"Roll back","Откатить изменения?":"Roll back the changes?","Файлы вернутся к состоянию до команды. Созданные командой файлы будут удалены.":"Files will return to their state before the command. Files created by the command will be deleted.","Откат выполнен":"Rolled back","Откат не удался":"Rollback failed","Файл новый":"New file","Файл удалён":"File deleted","Без изменений":"No changes","Слишком большой или двоичный файл: дифф и откат недоступны":"Too large or binary file: no diff or rollback","Файл менялся после команды, откат перезапишет его":"The file was changed after the command, rollback will overwrite it","Откат уже выполнен":"Already rolled back","Показать":"Show","Закрыть":"Close"});
 let hist=[];try{hist=(JSON.parse(localStorage.getItem(KEY)||'[]')||[]).filter(e=>e&&Array.isArray(e.files))}catch(e){hist=[]}
 const save=()=>{
  while(hist.length>MAXE)hist.shift();
  const sz=()=>hist.reduce((n,e)=>n+e.files.reduce((k,f)=>k+(f.b?f.b.length:0)+(f.a?f.a.length:0),0),0);
  while(hist.length>1&&sz()>MAXCH)hist.shift();
  try{localStorage.setItem(KEY,JSON.stringify(hist))}catch(e){}};
 const q=p=>p.startsWith('~/')?'"$HOME"\''+p.slice(1).replace(/'/g,"'\\''")+'\'':'\''+p.replace(/'/g,"'\\''")+'\'';
 const b64e=s=>{const u=new TextEncoder().encode(s);let r='';for(let i=0;i<u.length;i+=8192)r+=String.fromCharCode.apply(null,u.subarray(i,i+8192));return btoa(r)};
 const b64d=s=>{const r=atob(s),u=new Uint8Array(r.length);for(let i=0;i<r.length;i++)u[i]=r.charCodeAt(i);return new TextDecoder('utf-8',{fatal:true}).decode(u)};
 /* --- какие файлы назвала команда --- */
 const strip=c=>{const out=[];let end=null;String(c).split('\n').forEach(l=>{if(end!==null){if(l.trim()===end)end=null;return}out.push(l);const m=/<<-?\s*(['"]?)([A-Za-z_]\w*)\1/.exec(l);if(m)end=m[2]});return out.join('\n')};
 const unq=w=>{w=String(w);if(w.length>1&&((w[0]==="'"&&w.endsWith("'"))||(w[0]==='"'&&w.endsWith('"'))))w=w.slice(1,-1);return w};
 const okp=p=>p&&p.length<200&&!/[$*?`{}()\\!\n]/.test(p)&&!/^\/dev\//.test(p)&&!/^-/.test(p);
 const targets=cmd=>{
  const c=strip(cmd),set=[];const add=w=>{const p=unq(w);if(okp(p)&&!set.includes(p))set.push(p)};
  let m;const re=/(?:^|[^\d&>])>>?\s*('[^']*'|"[^"]*"|[^\s;|&<>()]+)/g;
  while((m=re.exec(c)))add(m[1]);
  c.split(/[;&|\n]+/).forEach(seg=>{
   const t=seg.match(/'[^']*'|"[^"]*"|[^\s<>]+/g)||[];
   while(t.length&&/^(sudo|env|command|\w+=\S*)$/.test(t[0]))t.shift();
   const n=t.shift();if(!n)return;
   const nf=t.filter(x=>!/^-/.test(x)&&x!=='>'&&x!=='>>'),fl=t.filter(x=>/^-/.test(x));
   if(n==='tee'||n==='rm'||n==='touch'||n==='mv'||n==='unlink')nf.forEach(add);
   else if(n==='cp'||n==='truncate'||n==='install'){if(nf.length)add(nf[nf.length-1]);if(n==='truncate')nf.forEach(add)}
   else if(n==='sed'&&fl.some(x=>/^-\w*i/.test(x)||x==='--in-place'))nf.slice(1).forEach(add)});
  return set.slice(0,6)};
 /* --- чтение и запись файлов через оболочку --- */
 const readCmd=ps=>ps.map(p=>'f='+q(p)+'; if [ -f "$f" ]; then n=$(wc -c < "$f" | tr -d " "); if [ "$n" -le '+MAXF+' ]; then echo "@@F"; base64 "$f" | tr -d "\\n"; echo; else echo "@@BIG"; fi; else echo "@@NO"; fi').join('\n');
 const parse=(out,ps)=>{
  const L=String(out||'').split('\n'),res={};let i=0,k=0;
  while(i<L.length&&k<ps.length){
   const t=L[i++].trim();
   if(t==='@@F'){const d=(L[i++]||'').trim();let s=null;try{s=b64d(d);if(s.indexOf('\u0000')>=0)s=undefined}catch(e){s=undefined}res[ps[k++]]=s===undefined?{big:1}:{s}}
   else if(t==='@@BIG')res[ps[k++]]={big:1};
   else if(t==='@@NO')res[ps[k++]]={s:null}}
  return res};
 const snap=async(ps,o)=>{const r=await orig({backend:o.backend,timeout:30},readCmd(ps));return parse(r.out,ps)};
 let origExec=null;
 const orig=(o,cmd)=>origExec(cmd,o);
 /* --- сравнение строк (LCS), возвращает строки с метками --- */
 const diff=(a,b)=>{
  const x=a==null?[]:a.split('\n'),y=b==null?[]:b.split('\n');
  if(x.length>1500||y.length>1500)return null;
  let s=0;while(s<x.length&&s<y.length&&x[s]===y[s])s++;
  let e=0;while(e<x.length-s&&e<y.length-s&&x[x.length-1-e]===y[y.length-1-e])e++;
  const A=x.slice(s,x.length-e),B=y.slice(s,y.length-e),n=A.length,m=B.length;
  const d=[];for(let i=0;i<=n;i++)d.push(new Uint16Array(m+1));
  for(let i=n-1;i>=0;i--)for(let j=m-1;j>=0;j--)d[i][j]=A[i]===B[j]?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
  const out=[];x.slice(0,s).forEach(l=>out.push([' ',l]));
  let i=0,j=0;while(i<n&&j<m){if(A[i]===B[j]){out.push([' ',A[i]]);i++;j++}else if(d[i+1][j]>=d[i][j+1]){out.push(['-',A[i++]])}else out.push(['+',B[j++]])}
  while(i<n)out.push(['-',A[i++]]);while(j<m)out.push(['+',B[j++]]);
  x.slice(x.length-e).forEach(l=>out.push([' ',l]));
  return out};
 const api={hist:()=>hist,targets,diff};
 /* --- запуск команды с запоминанием --- */
 api.wrap=()=>{
  if(typeof Term==='undefined'||Term.exec.__fd)return;
  origExec=Term.exec;
  const w=async(cmd,o={})=>{
   if(o.nodiff)return origExec(cmd,o);
   let ps=[],before=null;
   if(Native.on){try{ps=targets(cmd);if(ps.length)before=await snap(ps,o)}catch(e){ps=[];before=null}}
   const r=await origExec(cmd,o);
   if(!ps.length||!before)return r;
   try{
    const after=await snap(ps,o),files=[];
    ps.forEach(p=>{
     const b=before[p],a=after[p];if(!b||!a)return;
     if(b.big||a.big){files.push({p,big:1});return}
     if(b.s===a.s)return;
     files.push({p,b:b.s,a:a.s})});
    if(files.length){const e={id:'d'+Date.now().toString(36),ts:Date.now(),cmd:String(cmd).slice(0,300),files};hist.push(e);save();r.fd=e}}
   catch(e){}
   return r};
  w.__fd=1;Term.exec=w};
 /* --- показ --- */
 const fileBlock=f=>{
  const d=el('<div class="fd-f"><div class="fd-p"></div><pre class="fd-d"></pre></div>'),pre=$('.fd-d',d);
  $('.fd-p',d).textContent=f.p+(f.b==null&&!f.big?' · '+L('Файл новый'):f.a==null&&!f.big?' · '+L('Файл удалён'):'');
  if(f.big){pre.textContent=L('Слишком большой или двоичный файл: дифф и откат недоступны');return d}
  const ln=diff(f.b,f.a);
  if(!ln){pre.textContent=L('Слишком большой или двоичный файл: дифф и откат недоступны');return d}
  const ch=[];ln.forEach((l,i)=>{if(l[0]!==' ')for(let k=Math.max(0,i-2);k<=Math.min(ln.length-1,i+2);k++)ch[k]=1});
  let gap=0;
  ln.forEach((l,i)=>{
   if(!ch[i]){gap++;return}
   if(gap){pre.append(el('<span class="fd-g">⋯</span>'));gap=0}
   const s=document.createElement('span');s.className='fd-l '+(l[0]==='+'?'add':l[0]==='-'?'del':'');s.textContent=l[0]+' '+l[1];pre.append(s)});
  if(!pre.childNodes.length)pre.textContent=L('Без изменений');
  return d};
 const restoreCmd=f=>{
  if(f.b==null)return ['rm -f '+q(f.p)];
  const e=b64e(f.b),out=[];
  if(!e){out.push(': > '+q(f.p));return out}
  for(let i=0;i<e.length;i+=3000)out.push('printf %s \''+e.slice(i,i+3000)+'\' | base64 -d '+(i?'>>':'>')+' '+q(f.p));
  return out};
 api.rollback=async(e,done)=>{
  const fs=e.files.filter(f=>!f.big);
  if(!fs.length)return;
  ask(L('Откатить изменения?'),L('Файлы вернутся к состоянию до команды. Созданные командой файлы будут удалены.'),L('Откатить'),async()=>{
   try{
    let bad=0;
    for(const f of fs){
     for(const c of restoreCmd(f)){const r=await origExec(c,{timeout:30});if(r.err||r.code!==0)bad++}}
    if(bad)throw new Error('exit');
    e.rb=1;save();toast(L('Откат выполнен'));if(done)done()}
   catch(x){toast(L('Откат не удался'))}})};
 api.show=e=>{
  const s=sheet('<h2 style="margin-bottom:8px"></h2><pre class="fd-c"></pre><div class="fd-list"></div><div class="two" style="margin-top:12px"><button class="btn ghost" data-x type="button"></button><button class="btn" data-r type="button"></button></div>');
  $('h2',s).textContent=L('Изменено файлов')+': '+e.files.length;
  $('.fd-c',s).textContent='$ '+e.cmd;
  e.files.forEach(f=>$('.fd-list',s).append(fileBlock(f)));
  $('[data-x]',s).textContent=L('Закрыть');$('[data-x]',s).onclick=s.close;
  const r=$('[data-r]',s);r.textContent=e.rb?L('Откат уже выполнен'):L('Откатить');
  r.disabled=!!e.rb||!e.files.some(f=>!f.big);
  r.onclick=()=>{s.close();api.rollback(e,null)}};
 api.chip=(host,e)=>{
  if(!host||!e)return;
  const b=el('<button type="button" class="rb fd-chip"></button>');
  b.textContent='± '+L('Изменено файлов')+': '+e.files.length;
  b.onclick=()=>api.show(e);host.after(b)};
 /* --- экран со списком --- */
 const screen=()=>page('filediff','Изменения файлов',(b)=>{
  const draw=()=>{
   b.innerHTML='';
   if(!hist.length){b.append(el('<p class="hint" style="margin:0 4px">'+esc(L('Пока нет изменений.'))+'</p>'));return}
   [...hist].reverse().forEach(e=>{
    const c=el('<button type="button" class="card pv in fd-row"><span class="m"><b></b><small></small></span></button>');
    $('b',c).textContent=e.cmd.split('\n')[0].slice(0,80);
    $('small',c).textContent=new Date(e.ts).toLocaleString(LANG==='en'?'en-US':'ru-RU')+' · '+e.files.length+(e.rb?' · '+L('Откат выполнен'):'');
    c.onclick=()=>api.show(e);b.append(c)})};
  draw()});
 Hooks.on('app:ready',()=>{SCREENS.filediff=screen;api.wrap()});
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-fd]',v))return;
  const r=el('<button class="sr" style="--i:1" data-fd><span class="si c">'+ic('term')+'</span><span class="m"><b>'+esc(L('Изменения файлов агента'))+'</b><small>'+esc(L('Дифф и откат изменений, сделанных командами из чата'))+'</small></span>'+ic('chevR')+'</button>');
  r.onclick=()=>openScreen('filediff');ab.insertAdjacentElement('beforebegin',r)});
 return api})();
