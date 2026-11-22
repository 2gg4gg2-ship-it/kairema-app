/* ===== ИГРА «Байт-прыгун»: движок (чистая логика, без DOM) =====
   Тут физика, уровни, генератор участков, баги, бонусы и босс «Ошибка 404». Ничего не рисует и не трогает страницу,
   поэтому его можно проверять в node (docs/tests/game047.test.js: бот проходит 10 уровней и босса).
   Координаты: мир идёт слева направо, S.x — сколько пробежали; игрок всегда на экране в точке PX.
   Высоты предметов хранятся как «высота над землёй» (h), поэтому поворот экрана ничего не ломает.
   Вызов: S=GameEngine.create({mode:'level'|'boss'|'endless',L:1..10,W,H,seed}); потом каждые 1/60 с GameEngine.step(S,dt,{down,pressed}).
   События для звука лежат в S.ev (очищает тот, кто рисует). Убрать игру: удалить папку features/game и её строки в index.html. */
const GameEngine=(()=>{
 const G=1900,JV=640,HG=.55,HMAX=.3,PX=80,PW=20,PH=24,FOOT=8,GY=.68;
 const mul=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 /* сложность d от 0 (уровень 1) до 1 (уровень 10): растёт плавно, размер героя, высота прыжка и управление не меняются */
 const prm=d=>({v0:200+126*d,vmax:270+126*d,acc:.012,bug:.3+.35*d,pit:d<.05?0:.18+.3*d,mov:d>.5?.6*(d-.5):0,gap:68+84*d,two:d>.3?.35:0,pow:.25});
 const target=L=>6000+900*(L-1);
 function create(o){
  const S={mode:o.mode||'level',L:o.L||1,W:o.W||360,H:o.H||640,rnd:mul(o.seed==null?(Math.random()*1e9)|0:o.seed),
   x:0,speed:0,t:0,items:[],pits:[],genX:420,rest:0,score:0,bytes:0,spawned:0,combo:0,usedShield:false,ev:[],over:null,
   hearts:o.mode==='boss'?3:1,boss:null,seg:0,last:'flat'};
  S.gy=S.H*GY;S.d=S.mode==='endless'?.25:(S.L-1)/9;S.P=prm(S.d);
  S.p={y:S.gy-PH,vy:0,on:true,hold:0,buf:0,coy:.1,sh:false,mag:0,inv:0};
  if(S.mode==='boss')S.boss={hp:100,max:100,phase:1,atk:2.2,zone:7,fix:1.6,bob:0};
  else for(let i=0;i<5;i++)byte(S,200+i*40,0);
  S.target=S.mode==='level'?target(S.L):0;
  return S}
 function byte(S,x,h,gold){S.items.push({t:gold?'gold':'byte',x,h});S.spawned++}
 const place=(S,x,h,t,e)=>{const it=Object.assign({t,x,h},e||{});S.items.push(it);return it};
 /* ---------- генератор: блоки «старт → препятствие → передышка» ---------- */
 function gen(S){
  const P=S.P,r=S.rnd,lim=S.x+S.W+500;
  while(S.genX<lim){
   let x=S.genX,len;
   if(S.rest>0||S.last!=='flat'){
    /* передышка после опасного места: всегда не короче, чем нужно для спокойного прыжка */
    len=320+r()*70;const n=3+((r()*4)|0);for(let i=0;i<n;i++)byte(S,x+60+i*(len-120)/n,0,r()<.06);
    S.rest=0;S.last='flat'}
   else{
    const w=r(),pit=P.pit,bug=P.bug,pw=r()<P.pow&&S.seg>1;
    if(w<pit){
     const g=40+r()*(P.gap-40);len=g+280;S.pits.push({a:x+120,b:x+120+g});
     for(let i=0;i<5;i++)byte(S,x+120+g*(i+.5)/5,Math.sin((i+.5)/5*Math.PI)*(70+g*.3));S.last='pit'}
    else if(w<pit+bug){
     const two=r()<P.two,sp2=P.vmax*.82+r()*50;len=two?130+sp2+300:300;
     const arc=bx=>{for(let i=0;i<5;i++)byte(S,bx-80+i*40,50+Math.sin(i/4*Math.PI)*70)};
     place(S,x+130,0,'bug',{big:r()<.35,vx:r()<P.mov?-70:0});arc(x+130);
     if(two){const b2=x+130+sp2;place(S,b2,0,'bug',{big:false,vx:0});arc(b2)}
     S.last='bug'}
    else{len=240+r()*60;const n=4+((r()*3)|0);for(let i=0;i<n;i++)byte(S,x+50+i*(len-100)/n,0,r()<.07);S.last='flat'}
    if(pw)place(S,x+len*.5,90,r()<.5?'shield':'magnet')}
   S.seg++;S.genX=x+len}}
 /* ---------- столкновения ---------- */
 const inPit=(S,x)=>S.pits.some(p=>x>=p.a&&x<=p.b);
 const solid=(S,pw)=>!inPit(S,pw-FOOT)||!inPit(S,pw+FOOT);
 function hit(S,it){
  const p=S.p;
  if(S.mode==='boss'){if(p.inv>0)return;S.hearts--;p.inv=1.3;S.combo=0;S.ev.push('hit');if(S.hearts<=0){S.over='dead';S.ev.push('die')}return}
  if(p.inv>0)return;
  if(p.sh){p.sh=false;p.inv=.9;S.usedShield=true;S.combo=0;S.ev.push('shield');if(it)it.dead=1;return}
  S.over='dead';S.ev.push('die')}
 const pts=(S,v)=>{S.score+=v*(S.combo>=10?2:1)};
 /* ---------- босс «Ошибка 404» ---------- */
 function bossStep(S,dt){
  const B=S.boss,gy=S.gy;B.bob+=dt;
  const ph=B.hp>70?1:B.hp>35?2:3;if(ph>B.phase){B.phase=ph;if(S.hearts<3)S.hearts++;S.ev.push('phase')}
  B.atk-=dt;B.fix-=dt;B.zone-=dt;B.charge=B.atk<.6;
  if(B.atk<=0){
   B.atk=[2.7,2.3,2.0][B.phase-1]+S.rnd()*.4;
   const hi=B.phase>1&&S.rnd()<.45;
   place(S,S.x+S.W+30,hi?62:0,'proj',{vx:-70-B.phase*15,hi});
   S.ev.push('shot')}
  if(B.phase>1&&B.zone<=0){B.zone=B.phase===2?7.5:6;place(S,S.x+PX+420,0,'zone',{w:90,age:0});S.ev.push('warn')}
  if(B.fix<=0){B.fix=B.phase===3?2.3:2.6;place(S,S.x+S.W+20,72+S.rnd()*48,'fix')}}
 /* ---------- шаг ---------- */
 function step(S,dt,inp){
  if(S.over)return;
  const p=S.p,gy=S.gy,boss=S.mode==='boss';
  S.t+=dt;
  S.speed=boss?250:S.mode==='endless'?Math.min(230+S.x*.012,420):Math.min(S.P.v0+S.P.acc*S.x,S.P.vmax);
  S.x+=S.speed*dt;
  if(S.mode==='endless')S.d=clamp(.25+S.x/20000,.25,1),S.P=prm(S.d);
  if(!boss)gen(S);else bossStep(S,dt);
  const pw=S.x+PX;
  /* прыжок: буфер нажатия и «койот»: нажал чуть раньше или чуть позже края — всё равно прыгнет */
  if(inp&&inp.pressed)p.buf=.12;
  p.coy=p.on?.08:p.coy-dt;p.buf-=dt;
  if(p.buf>0&&p.coy>0){p.vy=-JV;p.on=false;p.coy=0;p.buf=0;p.hold=HMAX;S.ev.push('jump')}
  let g=G;
  if(inp&&inp.down&&p.vy<0&&p.hold>0){g=G*HG;p.hold-=dt}else if(!(inp&&inp.down))p.hold=0;
  p.vy+=g*dt;p.y+=p.vy*dt;
  if(p.y+PH>=gy&&p.vy>=0&&solid(S,pw)&&p.y+PH<gy+14){p.y=gy-PH;p.vy=0;p.on=true}else p.on=false;
  if(!p.on&&p.y+PH>gy+14&&inPit(S,pw)){S.over='dead';S.ev.push('die');return}
  if(p.y>S.H+80){S.over='dead';S.ev.push('die');return}
  p.inv=Math.max(0,p.inv-dt);p.mag=Math.max(0,p.mag-dt);
  /* предметы */
  const px0=pw-PW/2,px1=pw+PW/2,py0=p.y,py1=p.y+PH;
  for(const it of S.items){
   if(it.vx)it.x+=it.vx*dt;
   if(it.t==='zone'){it.age+=dt;continue}
   const y=gy-it.h;
   if((it.t==='byte'||it.t==='gold')&&p.mag>0){const dx=pw-it.x,dy=(p.y+PH/2)-y,d=Math.hypot(dx,dy);if(d<170&&d>1){it.x+=dx/d*620*dt;it.h-=dy/d*620*dt}}
   const Y=gy-it.h;
   if(it.t==='byte'||it.t==='gold'||it.t==='fix'||it.t==='shield'||it.t==='magnet'){
    const r=it.t==='byte'?15:18;
    if(Math.abs(it.x-pw)<r+PW/2&&Math.abs(Y-(p.y+PH/2))<r+PH/2){
     it.dead=1;
     if(it.t==='byte'||it.t==='gold'){S.bytes+=it.t==='gold'?5:1;S.combo++;pts(S,it.t==='gold'?50:10);S.ev.push(it.t==='gold'?'gold':'byte')}
     else if(it.t==='fix'){S.boss.hp=Math.max(0,S.boss.hp-12);S.combo++;pts(S,100);S.ev.push('fix');if(S.boss.hp<=0){S.over='win';S.score+=1000;S.ev.push('win');return}}
     else if(it.t==='shield'){p.sh=true;S.ev.push('power')}
     else{p.mag=6;S.ev.push('power')}}}
   else if(it.t==='bug'||it.t==='proj'){
    const w=it.t==='bug'?(it.big?11:9):8,h=it.t==='bug'?(it.big?30:22):14;
    const top=Y-h,bot=Y;
    const bx0=it.x-w,bx1=it.x+w;
    if(px1>bx0&&px0<bx1&&py1>top&&py0<bot)hit(S,it)}}
  /* зоны босса: красная полоса на земле, жжёт только когда горит */
  for(const it of S.items)if(it.t==='zone'&&it.age>1.2&&it.age<2.4&&p.y+PH>=gy-6&&Math.abs(it.x-pw)<it.w/2+PW/2)hit(S,it);
  S.items=S.items.filter(it=>!it.dead&&it.x>S.x-80&&!(it.t==='zone'&&it.age>2.6));
  S.pits=S.pits.filter(q=>q.b>S.x-80);
  if(S.mode==='level'){S.score=Math.max(S.score,0);if(S.x>=S.target){S.over='win';S.ev.push('win')}}
}
 const stars=S=>{if(S.over!=='win'||S.mode!=='level')return S.over==='win'?3:0;const pc=S.bytes/Math.max(1,S.spawned);return 1+(pc>=.7?1:0)+(pc>=.9&&!S.usedShield?1:0)};
 const dist=S=>Math.floor(S.x/10);
 return{create,step,stars,dist,target,prm,PX,PW,PH,GY,G,JV,HMAX,HG,solid,inPit}})();
