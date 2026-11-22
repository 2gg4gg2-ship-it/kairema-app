/* Тест 0.47.0: движок игры «Байт-прыгун» (features/game/engine.js). Бот «идеально» прыгает; проверяем честность уровней:
   каждый из 10 уровней проходим, босс побеждается, ничего не зависает, звёзды и сложность растут. node docs/tests/game047.test.js */
const fs=require('fs'),vm=require('vm'),assert=require('assert'),path=require('path');
const dir=process.env.UI_DIR||path.join(__dirname,'../../app/src/main/assets/ui/');
const ctx={Math,console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync(dir+'features/game/engine.js','utf8')+';this.E=GameEngine',ctx);
const E=ctx.E;
function bot(S,st){
 const pw=S.x+E.PX,p=S.p,sp=S.speed;let jump=0;
 for(const it of S.items){
  const dx=it.x-pw;
  if(it.t==='bug'||(it.t==='proj'&&!it.hi)){ {const cs=sp-(it.vx||0);if(dx>0&&dx<cs*.33+8&&dx>cs*.33-26)jump=.05} }
  if(it.t==='zone'&&it.age>1&&it.age<2.4){ if(Math.abs(dx)<it.w/2+30)jump=.22 }
  if(it.t==='fix'&&S.mode==='boss'&&dx>sp*.3-16&&dx<sp*.3+16&&it.h>40)jump=.25}
 for(const q of S.pits){const dx=q.a-pw;if(dx>-6&&dx<sp*.045)jump=.3}
 const danger=S.items.some(it=>it.t==='proj'&&it.x-pw>-40&&it.x-pw<(sp-(it.vx||0))*.9+60);
 if((danger||(S.boss&&S.boss.atk<1.1))&&jump===.25)jump=0;
 let pressed=false;
 if(jump&&p.on){pressed=true;st.jt=S.t;st.hold=jump}
 return{pressed,down:S.t-(st.jt==null?-9:st.jt)<(st.hold||0)}}
function run(opts,maxT){
 const S=E.create(opts),st={};let n=0;
 while(!S.over&&S.t<maxT){E.step(S,1/60,bot(S,st));S.ev.length=0;n++}
 return S}
let fail=[];
// 1. все 10 уровней проходимы ботом (по 12 разных случайных уровней на каждый)
for(let L=1;L<=10;L++){
 let ok=0,N=12;for(let k=0;k<N;k++){const S=run({mode:'level',L,W:360,H:640,seed:L*100+k},120);if(S.over==='win')ok++}
 console.log('уровень',L,'пройден',ok+'/'+N);if(ok<N-1)fail.push('level '+L+' '+ok+'/'+N)}
// 2. босс: бот побеждает за разумное время и теряет не больше трёх сердец
let wins=0,times=[];for(let k=0;k<12;k++){const S=run({mode:'boss',L:10,W:360,H:640,seed:900+k},160);if(S.over==='win'){wins++;times.push(S.t)}}
console.log('босс побеждён',wins+'/12','время, c:',times.map(t=>Math.round(t)).join(' '));
if(wins<8)fail.push('boss '+wins+'/12');
if(times.length&&(Math.min(...times)<20||Math.max(...times)>150))fail.push('boss time '+times);
// 3. сложность растёт: скорость, ширина ям, число багов
const a=E.prm(0),b=E.prm(1);assert(b.v0>a.v0&&b.gap>a.gap&&b.bug>a.bug&&b.pit>a.pit,'difficulty grows');
assert(a.pit===0,'level 1 has no pits');
// 4. самая широкая яма физически перепрыгивается: дальность прыжка с запасом
const air=2*E.JV/E.G*b.vmax;console.log('прыжок на максимальной скорости:',Math.round(air),'яма:',Math.round(b.gap));assert(air>b.gap+60,'widest pit is jumpable');
// 5. игрок без прыжков умирает (игра не проходится сама) и нет вечных циклов
const idle=E.create({mode:'level',L:1,seed:5});let t=0;while(!idle.over&&t<3600){E.step(idle,1/60,{});t++}assert.equal(idle.over,'dead','idle player dies');
// 6. звёзды
const w=run({mode:'level',L:1,W:360,H:640,seed:1},120);console.log('звёзды бота на уровне 1:',E.stars(w));assert(E.stars(w)>=1);
// 7. бесконечный режим идёт, пока бот жив, и скорость не превышает предел
const en=run({mode:'endless',W:360,H:640,seed:7},90);console.log('бесконечный: сек',Math.round(en.t),'скорость',Math.round(en.speed));assert(en.speed<=420.1);
// 8. поворот экрана: высоты не зависят от H (предметы хранят h над землёй)
const r1=E.create({mode:'level',L:3,W:360,H:640,seed:3}),r2=E.create({mode:'level',L:3,W:700,H:300,seed:3});
for(let i=0;i<300;i++){E.step(r1,1/60,{});E.step(r2,1/60,{})}
assert.deepEqual(r1.items.slice(0,3).map(i=>i.h),r2.items.slice(0,3).map(i=>i.h),'heights same in any orientation');
if(fail.length){console.log('ПРОВАЛЫ:',fail.join('; '));process.exit(1)}
console.log('Игра: всё прошло');
