/* Меню «+» (половина высоты, закрытие после выбора), анимация «Источников», профиль без username. */
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const assert=require('assert');
const dir=process.env.UI_DIR||require('path').join(__dirname,'../../app/src/main/assets/ui/');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/HTMLMediaElement/.test(e.message))errs.push(e.message)});
const html=fs.readFileSync(dir+'index.html','utf8').replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(dir+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/ui/index.html',
 beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
  w.localStorage.setItem('ko','1');w.localStorage.setItem('kna','1');w.localStorage.setItem('kairema.welcome.v1','1')}});
const w=dom.window,sleep=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)],ev=c=>w.eval(c);
const tile=n=>qa('.tm-tile').find(x=>x.querySelector('.tm-n').textContent===n);
(async()=>{
 await sleep(8000);
 // меню: окно получает класс tmw (половина высоты), 8 плиток, три группы
 ev("Tools.open({pick(){}})");await sleep(150);
 assert(q('.sheet-bg.tmw'),'menu has tmw class');assert.equal(qa('.tm-tile').length,8);assert.equal(qa('.tm-g').length,3);
 // «Думать» включается и окно сразу закрывается
 const t0=tile('Думать');t0.click();await sleep(30);
 assert(!q('.sheet-bg.tmw.on'),'menu closes right after choosing a mode');
 await sleep(450);assert.equal(ev("Tools.thinkMode"),'think');assert(!q('.tm'),'menu removed');
 // повторное открытие: «Думать» отмечен галочкой
 ev("Tools.open({pick(){}})");await sleep(150);
 assert(tile('Думать').classList.contains('on'),'mode shown as on');
 assert(tile('Думать').querySelector('.tm-ck'),'check mark');
 // серая плитка окно не закрывает
 const img=tile('Изображение');assert(img.classList.contains('off'));img.click();await sleep(150);
 assert(q('.sheet-bg.tmw.on'),'disabled tile keeps menu open');
 // повторный выбор «Думать» выключает режим и тоже закрывает окно
 tile('Думать').click();await sleep(350);assert.equal(ev("Tools.thinkMode"),'auto');assert(!q('.tm'));
 // источники: плавное раскрытие и закрытие
 ev("window.__bd=document.createElement('div');document.body.append(window.__bd);mdSources(window.__bd,{src:[{title:'Один',url:'https://a.io/1'},{title:'Два',url:'https://b.io/2'}]})");
 const d=q('details.srcs'),sm=d.querySelector('summary');
 assert(d&&!d.open&&!d.classList.contains('op'),'sources closed at start');
 sm.click();await sleep(30);assert(d.open&&d.classList.contains('op'),'sources open with animation class');
 assert.equal(d.querySelectorAll('.srci a').length,2);
 sm.click();await sleep(30);assert(!d.classList.contains('op')&&d.open,'closing: animation first, still open');
 await sleep(400);assert(!d.open,'closed after animation');
 sm.click();await sleep(30);sm.click();sm.click();await sleep(450);assert(d.open===d.classList.contains('op'),'fast taps stay consistent');
 // профиль без username
 ev("profPage()");await sleep(250);
 assert(q('[data-screen=profile] [data-k=name]'),'profile page opens');assert(!q('[data-screen=profile] [data-k=user]'),'no username field');assert(!q('[data-screen=profile] [data-k=email]'),'no email field');
 q('[data-screen=profile] [data-k=name]').value='Иван';q('[data-screen=profile] [data-k=name]').dispatchEvent(new w.Event('input',{bubbles:true}));await sleep(50);
 q('[data-screen=profile] [data-s]').click();await sleep(400);assert.equal(ev("S.p.name"),'Иван');
 console.log('ERRORS:',errs.length?errs:'none');process.exit(0)})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,3).join(' | '),errs);process.exit(1)});
