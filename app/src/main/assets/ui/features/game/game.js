/* ===== ИГРА «Байт-прыгун»: экраны, рисование, звук, сохранение =====
   Офлайн-игра внутри приложения: пока нет сети или просто для отдыха. Вход: строка «Байт-прыгун» в Настройках
   и плашка «Нет сети — поиграть?», которая сама появляется, когда пропадает интернет. Код Game.open() открывает игру.
   Логика (физика, уровни, босс) в engine.js, здесь только DOM, canvas и звук. Всё рисуется кодом, без картинок и библиотек.
   Прогресс (открытые уровни, звёзды, рекорд, байты, звук) лежит в localStorage 'kairema.game.v1' на этом телефоне.
   Ничего не отправляется в сеть. Весь текст ставится через textContent. Убрать игру: удалить папку features/game и её строки в index.html. */
i18nAdd({"Байт-прыгун":"Byte Jumper","Отдых: игра без интернета":"Break: a game that works offline","Нет сети":"No connection","Поиграть":"Play","Один тап — прыжок. Держи — прыгнешь выше.":"Tap to jump. Hold to jump higher.","Играть":"Play","Уровни":"Levels","Бесконечный режим":"Endless mode","Звук: вкл":"Sound: on","Звук: выкл":"Sound: off","Байтов собрано":"Bytes collected","Рекорд":"Best","Босс":"Boss","Уровень":"Level","Пауза":"Pause","Продолжить":"Resume","Заново":"Restart","В меню":"Menu","Уровень пройден!":"Level complete!","Баг победил":"A bug got you","Босс побеждён!":"Boss defeated!","Ещё раз":"Try again","Дальше":"Next","К уровням":"To levels","Байты":"Bytes","Очки":"Score","Путь":"Distance","Закрыть":"Close","Босс «Ошибка 404» откроется после 10-го уровня":"Boss \"Error 404\" unlocks after level 10","Собирай зелёные «фиксы», уворачивайся от багов":"Collect green fixes, dodge the bugs"});
const Game=(()=>{
 const E=typeof GameEngine!=='undefined'?GameEngine:null;
 const KEY='kairema.game.v1';
 const mk=(t,c,x)=>{const e=document.createElement(t);if(c)e.className=c;if(x!=null)e.textContent=x;return e};
 const T=s=>typeof L==='function'?L(s):s;
 /* ---------- сохранение ---------- */
 let sv=load();
 function load(){try{const j=JSON.parse(localStorage.getItem(KEY)||'{}');return{u:Math.min(11,Math.max(1,j.u|0||1)),st:j.st&&typeof j.st==='object'?j.st:{},b:j.b|0,best:j.best|0,boss:!!j.boss,snd:j.snd!==0}}catch(e){return{u:1,st:{},b:0,best:0,boss:false,snd:true}}}
 function save(){try{localStorage.setItem(KEY,JSON.stringify(sv))}catch(e){}}
 /* ---------- звук: короткие сигналы, создаются по первому нажатию ---------- */
 let ac=null;
 function beep(f,d,type,vol,f2){
  if(!sv.snd)return;
  try{
   if(!ac){const C=window.AudioContext||window.webkitAudioContext;if(!C)return;ac=new C()}
   if(ac.state==='suspended')ac.resume();
   const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime;
   o.type=type||'square';o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+d);
   g.gain.setValueAtTime(vol||.05,t);g.gain.exponentialRampToValueAtTime(.0001,t+d);
   o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+d+.02)}catch(e){}}
 const SFX={jump:()=>beep(380,.11,'square',.04,720),byte:()=>beep(900,.06,'triangle',.05),gold:()=>{beep(900,.08,'triangle',.06);setTimeout(()=>beep(1350,.1,'triangle',.06),70)},
  hit:()=>beep(160,.22,'sawtooth',.07,60),shield:()=>beep(300,.16,'sine',.07,120),die:()=>beep(220,.4,'sawtooth',.08,40),power:()=>beep(520,.14,'sine',.06,1040),
  fix:()=>{beep(600,.08,'triangle',.07);setTimeout(()=>beep(900,.12,'triangle',.07),60)},win:()=>[523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,.16,'triangle',.07),i*110)),
  shot:()=>beep(200,.1,'square',.03,140),warn:()=>beep(440,.12,'square',.03),phase:()=>beep(330,.3,'sawtooth',.06,660)};
 const buzz=n=>{try{if(sv.snd&&navigator.vibrate)navigator.vibrate(n)}catch(e){}};
 /* ---------- экраны ---------- */
 let cur=null;
 function open(){
  if(!E){toast(T('Игра недоступна'));return}
  if(cur&&cur.isConnected)return;
  const d=page('game',T('Байт-прыгун'),b=>{b.className='scroll gm-b';menu(b)});
  cur=d;d.classList.add('gm');
  const bk=d.querySelector('[data-bk]');
  bk.onclick=()=>{if(d._stop&&d._inPlay){d._stop();d._inPlay=false;menu(d.querySelector('.gm-b'))}else{if(d._stop)d._stop();d.close()}};
  return d}
 function btn(txt,fn,cls){const b=mk('button','gm-btn'+(cls?' '+cls:''),txt);b.type='button';b.onclick=fn;return b}
 function menu(b){
  if(cur&&cur._stop)cur._stop();if(cur)cur._inPlay=false;
  b.textContent='';
  const h=mk('div','gm-hero');
  const ico=mk('div','gm-logo');ico.innerHTML='<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="14" y="20" width="36" height="36" rx="9" fill="none" stroke="currentColor" stroke-width="3"/><circle cx="26" cy="35" r="3.5" fill="currentColor"/><circle cx="38" cy="35" r="3.5" fill="currentColor"/><path d="M8 58h48" stroke="currentColor" stroke-width="3" stroke-linecap="round"/><path d="M22 12l-3-6M32 10V3M42 12l3-6" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg>';
  h.append(ico,mk('h1','',T('Байт-прыгун')),mk('p','gm-tag',T('Один тап — прыжок. Держи — прыгнешь выше.')));
  const st=mk('div','gm-stats');
  [[T('Байтов собрано'),sv.b],[T('Рекорд'),sv.best]].forEach(([k,v])=>{const c=mk('div','gm-stat');c.append(mk('b','',String(v)),mk('small','',k));st.append(c)});
  const nx=sv.u>10?11:sv.u;
  const go=btn(T('Играть')+(nx>10?' · '+T('Босс'):' · '+T('Уровень')+' '+nx),()=>start(b,nx>10?'boss':'level',nx>10?10:nx),'pri');
  const lv=btn(T('Уровни'),()=>levels(b));
  const en=btn(T('Бесконечный режим'),()=>start(b,'endless',1));
  const sn=btn(T(sv.snd?'Звук: вкл':'Звук: выкл'),()=>{sv.snd=!sv.snd;save();sn.textContent=T(sv.snd?'Звук: вкл':'Звук: выкл');if(sv.snd)SFX.byte()},'ghost');
  b.append(h,st,go,lv,en,sn)}
 function levels(b){
  b.textContent='';
  const top=mk('div','gm-lt');top.append(mk('h3','',T('Уровни')));
  const back=btn('‹',()=>menu(b),'ghost sm');back.setAttribute('aria-label',T('В меню'));top.prepend(back);
  const g=mk('div','gm-grid');
  for(let i=1;i<=10;i++){
   const c=mk('button','gm-lv'+(i>sv.u?' lock':''));c.type='button';c.disabled=i>sv.u;
   c.append(mk('b','',String(i)));
   const s=sv.st[i]|0,row=mk('span','gm-stars');for(let k=1;k<=3;k++)row.append(mk('i',k<=s?'on':'',''));c.append(row);
   c.onclick=()=>start(b,'level',i);g.append(c)}
  const bo=mk('button','gm-lv gm-boss'+(sv.u<11?' lock':''));bo.type='button';bo.disabled=sv.u<11;
  bo.append(mk('b','',T('Босс')+' «404»'),mk('small','',sv.boss?'✓':(sv.u<11?T('Босс «Ошибка 404» откроется после 10-го уровня'):T('Собирай зелёные «фиксы», уворачивайся от багов'))));
  bo.onclick=()=>start(b,'boss',10);
  b.append(top,g,bo)}
 /* ---------- игра ---------- */
 function start(b,mode,Lv){
  if(!cur)return;
  if(cur._stop)cur._stop();
  b.textContent='';
  const wrap=mk('div','gm-play'),cv=mk('canvas','gm-cv');cv.setAttribute('role','img');cv.setAttribute('aria-label',T('Байт-прыгун'));
  const pb=mk('button','gm-pb');pb.type='button';pb.setAttribute('aria-label',T('Пауза'));pb.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" fill="none"/></svg>';
  wrap.append(cv,pb);b.append(wrap);
  const ctx=cv.getContext('2d');
  let S=null,raf=0,last=0,acc=0,down=false,press=false,paused=false,ended=false,sc=1,dpr=1,col={},ov=null,gone=false,hint=3;
  const cs=()=>{const s=getComputedStyle(document.documentElement);const g=n=>s.getPropertyValue(n).trim();col={bg:g('--bg')||'#0B0B0C',s1:g('--s1')||'#131315',s2:g('--s2')||'#1C1C1F',line:g('--line')||'#2B2B2F',tx:g('--tx')||'#EDEDEF',tx2:g('--tx2')||'#9A9AA2',err:g('--err')||'#E5736B'};col.font=getComputedStyle(document.body).fontFamily||'sans-serif'};
  function size(){
   const r=wrap.getBoundingClientRect(),w=Math.max(200,r.width),h=Math.max(200,r.height);
   dpr=Math.min(window.devicePixelRatio||1,2);cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
   sc=Math.min(w/360,h/520);const W=w/sc,H=h/sc;
   if(S){const og=S.gy;S.W=W;S.H=H;S.gy=H*E.GY;S.p.y+=S.gy-og}
   return{W,H}}
  function reset(){
   closeOv();cs();const z=size();S=E.create({mode,L:Lv,W:z.W,H:z.H});acc=0;last=0;ended=false;paused=false;down=false;press=false;hint=3;
   if(!raf)raf=requestAnimationFrame(loop)}
  function closeOv(){if(ov){ov.remove();ov=null}}
  function overlay(title,lines,buttons){
   closeOv();ov=mk('div','gm-ov');const card=mk('div','gm-card');card.append(mk('h3','',title));
   lines.forEach(t=>card.append(mk('p','',t)));
   const row=mk('div','gm-row');buttons.forEach(x=>row.append(x));card.append(row);ov.append(card);wrap.append(ov)}
  function pause(on){
   if(ended||!S)return;paused=on;
   if(on)overlay(T('Пауза'),[],[btn(T('Продолжить'),()=>pause(false),'pri'),btn(T('Заново'),reset),btn(T('В меню'),()=>{stop();cur._inPlay=false;menu(b)},'ghost')]);
   else{closeOv();last=0}}
  function finish(){
   ended=true;const win=S.over==='win',stars=E.stars(S);
   sv.b+=S.bytes;
   if(mode==='level'&&win){sv.u=Math.max(sv.u,Math.min(11,Lv+1));sv.st[Lv]=Math.max(sv.st[Lv]|0,stars)}
   if(mode==='boss'&&win){sv.boss=true}
   if(mode==='endless')sv.best=Math.max(sv.best,S.score);
   save();
   const lines=[T('Очки')+': '+S.score,T('Байты')+': '+S.bytes];
   if(mode!=='boss')lines.push(T('Путь')+': '+E.dist(S)+' м');
   if(mode==='endless')lines.push(T('Рекорд')+': '+sv.best);
   const bs=[];
   if(win&&mode==='level'&&Lv<10)bs.push(btn(T('Дальше'),()=>start(b,'level',Lv+1),'pri'));
   if(win&&mode==='level'&&Lv===10)bs.push(btn(T('Босс')+' «404»',()=>start(b,'boss',10),'pri'));
   bs.push(btn(T('Ещё раз'),reset,win?'':'pri'));
   if(mode==='level'||mode==='boss')bs.push(btn(T('К уровням'),()=>{stop();levels(b)},'ghost'));
   else bs.push(btn(T('В меню'),()=>{stop();cur._inPlay=false;menu(b)},'ghost'));
   setTimeout(()=>{if(gone)return;overlay(win?(mode==='boss'?T('Босс побеждён!'):T('Уровень пройден!')):T('Баг победил'),lines.concat(win&&mode==='level'?['★'.repeat(stars)+'☆'.repeat(3-stars)]:[]),bs)},450)}
  function loop(ts){
   raf=0;if(gone)return;
   if(!last)last=ts;let dt=Math.min((ts-last)/1000,.05);last=ts;
   if(!paused&&!ended){
    acc+=dt;let n=0;
    while(acc>=1/60&&n<6){E.step(S,1/60,{down,pressed:press});press=false;acc-=1/60;n++;
     for(const e of S.ev){if(SFX[e])SFX[e]();if(e==='hit'||e==='die')buzz(e==='die'?60:30)}S.ev.length=0;
     if(S.over){finish();break}}
    if(hint>0)hint-=dt}
   draw();
   raf=requestAnimationFrame(loop)}
  /* ---------- рисование ---------- */
  function draw(){
   const W=S.W,H=S.H,gy=S.gy,pw=S.x+E.PX;
   ctx.setTransform(dpr*sc,0,0,dpr*sc,0,0);
   ctx.fillStyle=col.bg;ctx.fillRect(0,0,W,H);
   /* фон: медленные строки «кода» */
   ctx.fillStyle=col.line;
   for(let i=0;i<16;i++){const k=.12+(i%3)*.07,x=((i*97-S.x*k)%(W+120)+W+120)%(W+120)-60,y=30+(i*53)%Math.max(40,gy-90);ctx.globalAlpha=.55;ctx.fillRect(x,y,24+(i*37)%70,3)}
   ctx.globalAlpha=1;
   /* земля с ямами */
   const px=x=>x-S.x;
   const pits=S.pits.slice().sort((a,b)=>a.a-b.a);let cx=-10;
   const seg=(a,b)=>{if(b<=a)return;ctx.fillStyle=col.s1;ctx.fillRect(a,gy,b-a,H-gy+4);ctx.fillStyle=col.tx2;ctx.fillRect(a,gy,b-a,2);ctx.fillStyle=col.line;for(let x=Math.ceil(a/40)*40;x<b;x+=40)ctx.fillRect(x,gy+16,18,2)};
   for(const q of pits){const a=px(q.a),b=px(q.b);seg(cx,Math.min(a,W+10));cx=Math.max(cx,b)}
   seg(cx,W+10);
   /* предметы */
   const t=S.t;
   for(const it of S.items){
    const x=px(it.x),y=gy-it.h;if(x<-60||x>W+80)continue;
    if(it.t==='byte'||it.t==='gold'){
     const s=it.t==='gold'?9:7;ctx.save();ctx.translate(x,y);ctx.rotate(Math.sin(t*3+it.x)*.3);ctx.fillStyle=col.tx;ctx.fillRect(-s,-s,s*2,s*2);
     ctx.fillStyle=col.bg;ctx.fillRect(-s+3,-s+3,s*2-6,s*2-6);ctx.fillStyle=col.tx;ctx.fillRect(-2,-2,4,4);if(it.t==='gold'){ctx.lineWidth=2;ctx.strokeStyle=col.tx;ctx.strokeRect(-s-3,-s-3,s*2+6,s*2+6)}ctx.restore()}
    else if(it.t==='bug'){
     const h=it.big?30:22,w=it.big?13:11;ctx.fillStyle=col.err;ctx.beginPath();ctx.moveTo(x-w,gy);ctx.lineTo(x,gy-h);ctx.lineTo(x+w,gy);ctx.closePath();ctx.fill();
     ctx.fillStyle=col.bg;ctx.font='700 12px '+col.font;ctx.textAlign='center';ctx.fillText('!',x,gy-4)}
    else if(it.t==='proj'){ctx.save();ctx.translate(x,y);ctx.rotate(t*5);ctx.fillStyle=col.err;ctx.fillRect(-8,-8,16,16);ctx.fillStyle=col.bg;ctx.fillRect(-3,-3,6,6);ctx.restore()}
    else if(it.t==='fix'){ctx.save();ctx.translate(x,y+Math.sin(t*4+it.x)*3);ctx.fillStyle='#34C759';ctx.fillRect(-13,-13,26,26);ctx.fillStyle=col.bg;ctx.fillRect(-7,-2,14,4);ctx.fillRect(-2,-7,4,14);ctx.restore()}
    else if(it.t==='shield'||it.t==='magnet'){
     ctx.save();ctx.translate(x,y+Math.sin(t*3)*3);ctx.strokeStyle=col.tx;ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,15,0,7);ctx.stroke();ctx.fillStyle=col.tx;
     if(it.t==='shield'){ctx.beginPath();ctx.moveTo(-7,-6);ctx.lineTo(7,-6);ctx.lineTo(7,2);ctx.lineTo(0,9);ctx.lineTo(-7,2);ctx.closePath();ctx.fill()}
     else{ctx.lineWidth=4;ctx.beginPath();ctx.arc(0,0,6,Math.PI,0,true);ctx.moveTo(-6,0);ctx.lineTo(-6,6);ctx.moveTo(6,0);ctx.lineTo(6,6);ctx.stroke()}ctx.restore()}
    else if(it.t==='zone'){
     const w=it.w,warn=it.age<=1.2;ctx.save();ctx.globalAlpha=warn?.18+.18*Math.abs(Math.sin(it.age*10)):.7;ctx.fillStyle=col.err;ctx.fillRect(x-w/2,gy-3,w,H-gy+3);
     if(warn){ctx.globalAlpha=.9;ctx.strokeStyle=col.err;ctx.lineWidth=2;ctx.strokeRect(x-w/2,gy-3,w,10)}ctx.restore()}}
   /* босс */
   if(S.boss){
    const B=S.boss,bx=W-62,by=Math.max(70,H*.2)+Math.sin(B.bob*2)*12,j=B.phase>1&&Math.sin(t*40)>.9?3:0;
    ctx.save();ctx.translate(bx+j,by);
    ctx.fillStyle=col.tx;ctx.fillRect(-36,-30,72,60);ctx.fillStyle=col.bg;ctx.fillRect(-24,-18,18,14);ctx.fillRect(6,-18,18,14);
    ctx.fillStyle=col.tx;ctx.fillRect(-18,-14,6,6);ctx.fillRect(12,-14,6,6);ctx.fillStyle=col.err;ctx.fillRect(-20,8,40,8);
    if(B.charge){ctx.strokeStyle=col.err;ctx.lineWidth=4;ctx.strokeRect(-40,-34,80,68)}
    ctx.fillStyle=col.bg;ctx.font='700 11px '+col.font;ctx.textAlign='center';ctx.fillText('404',0,24);ctx.restore()}
   /* игрок */
   {const p=S.p,blink=p.inv>0&&Math.floor(t*14)%2;
    if(!blink){ctx.save();ctx.translate(E.PX,p.y+E.PH/2);ctx.rotate(p.on?0:Math.max(-.35,Math.min(.35,p.vy/2400)));
     ctx.fillStyle=col.tx;ctx.beginPath();if(ctx.roundRect)ctx.roundRect(-12,-12,24,24,7);else ctx.rect(-12,-12,24,24);ctx.fill();
     ctx.fillStyle=col.bg;ctx.beginPath();ctx.arc(-4.5,-2,3,0,7);ctx.arc(4.5,-2,3,0,7);ctx.fill();
     ctx.strokeStyle=col.tx;ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,-12);ctx.lineTo(0,-17);ctx.stroke();ctx.beginPath();ctx.arc(0,-18,2,0,7);ctx.fillStyle=col.tx;ctx.fill();
     if(p.sh){ctx.strokeStyle=col.tx;ctx.lineWidth=2;ctx.globalAlpha=.8;ctx.beginPath();ctx.arc(0,0,21,0,7);ctx.stroke()}
     if(p.mag>0){ctx.strokeStyle=col.tx2;ctx.setLineDash([4,5]);ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(0,0,28+Math.sin(t*8)*2,0,7);ctx.stroke()}
     ctx.restore()}}
   /* HUD */
   ctx.textAlign='left';ctx.fillStyle=col.tx;ctx.font='700 16px '+col.font;
   const topY=18;
   ctx.fillText(String(S.score),14,topY+12);
   ctx.fillStyle=col.tx2;ctx.font='600 12px '+col.font;
   ctx.fillText(mode==='boss'?T('Босс')+' «404»':mode==='endless'?T('Бесконечный режим'):T('Уровень')+' '+Lv,14,topY+30);
   ctx.fillText('◆ '+S.bytes,14,topY+46);
   if(S.combo>=10){ctx.fillStyle=col.tx;ctx.font='700 13px '+col.font;ctx.fillText('x2',14,topY+64)}
   if(mode==='level'){const f=Math.min(1,S.x/S.target);ctx.fillStyle=col.line;ctx.fillRect(0,0,W,4);ctx.fillStyle=col.tx;ctx.fillRect(0,0,W*f,4)}
   if(S.boss){const f=S.boss.hp/S.boss.max;ctx.fillStyle=col.line;ctx.fillRect(W*.2,10,W*.6,8);ctx.fillStyle=col.err;ctx.fillRect(W*.2,10,W*.6*f,8);
    for(let i=0;i<3;i++){ctx.fillStyle=i<S.hearts?col.err:col.line;ctx.fillRect(14+i*18,topY+54,12,12)}}
   if(hint>0&&mode!=='boss'&&Lv<=1){ctx.globalAlpha=Math.min(1,hint);ctx.fillStyle=col.tx;ctx.textAlign='center';ctx.font='600 14px '+col.font;ctx.fillText(T('Один тап — прыжок. Держи — прыгнешь выше.'),W/2,gy+60);ctx.globalAlpha=1}}
  /* ---------- управление ---------- */
  const pd=e=>{if(paused||ended)return;e.preventDefault();down=true;press=true;if(sv.snd&&!ac)beep(1,.001,'sine',.0001)};
  const pu=()=>{down=false};
  cv.addEventListener('pointerdown',pd);cv.addEventListener('pointerup',pu);cv.addEventListener('pointercancel',pu);cv.addEventListener('pointerleave',pu);
  pb.onclick=()=>pause(!paused);
  const kd=e=>{if(e.code==='Space'||e.code==='ArrowUp'){e.preventDefault();if(!e.repeat&&!paused&&!ended){down=true;press=true}}else if(e.code==='Escape')pause(!paused)};
  const ku=e=>{if(e.code==='Space'||e.code==='ArrowUp')down=false};
  const vis=()=>{if(document.hidden)pause(true)};
  const rs=()=>{if(S){size();if(!raf)raf=requestAnimationFrame(loop)}};
  document.addEventListener('keydown',kd);document.addEventListener('keyup',ku);document.addEventListener('visibilitychange',vis);window.addEventListener('resize',rs);
  function stop(){gone=true;cancelAnimationFrame(raf);raf=0;document.removeEventListener('keydown',kd);document.removeEventListener('keyup',ku);document.removeEventListener('visibilitychange',vis);window.removeEventListener('resize',rs)}
  cur._stop=stop;cur._inPlay=true;
  requestAnimationFrame(()=>{if(!gone)reset()});
  return{stop}}
 /* ---------- плашка «Нет сети» ---------- */
 let chip=null,chipT=0;
 function hideChip(){clearTimeout(chipT);if(chip){chip.classList.remove('on');const c=chip;chip=null;setTimeout(()=>c.remove(),300)}}
 function showChip(){
  if(chip||(cur&&cur.isConnected))return;
  chip=mk('div','gm-chip');chip.setAttribute('role','status');
  const t=mk('span','',T('Нет сети')),go=mk('button','gm-chip-go',T('Поиграть')),x=mk('button','gm-chip-x','×');
  go.type='button';x.type='button';x.setAttribute('aria-label',T('Закрыть'));
  go.onclick=()=>{hideChip();open()};x.onclick=hideChip;
  chip.append(t,go,x);(document.getElementById('app')||document.body).append(chip);
  requestAnimationFrame(()=>chip&&chip.classList.add('on'));chipT=setTimeout(hideChip,12000)}
 Hooks.on('app:ready',()=>{
  SCREENS.game=open;
  window.addEventListener('offline',showChip);window.addEventListener('online',hideChip);
  if(typeof navigator!=='undefined'&&navigator.onLine===false)setTimeout(showChip,1500)});
 /* ---------- строка в Настройках ---------- */
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-game-go]',v))return;
  const r=el('<button class="sr" data-game-go><span class="si c"></span><span class="m"><b></b><small></small></span>'+ic('chevR')+'</button>');
  $('b',r).textContent=T('Байт-прыгун');$('small',r).textContent=T('Отдых: игра без интернета');
  r.onclick=()=>open();ab.insertAdjacentElement('beforebegin',r)});
 return{open,state:()=>sv}})();
