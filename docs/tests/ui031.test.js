/* 0.31: список сервисов (Gurouter), черновик сообщения, блоки кода со сворачиванием, плитки в настройках. */
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const assert=require('assert');
const dir=process.env.UI_DIR||require('path').join(__dirname,'../../app/src/main/assets/ui/');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/HTMLMediaElement/.test(e.message))errs.push(e.message)});
const html=fs.readFileSync(dir+'index.html','utf8').replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(dir+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/ui/index.html',beforeParse(w){
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
 w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('ko','1');w.localStorage.setItem('kna','1');w.localStorage.setItem('kairema.welcome.v1','1')}});
const w=dom.window,sleep=ms=>new Promise(r=>setTimeout(r,ms)),ev=c=>w.eval(c),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
(async()=>{
 await sleep(8000);
 // --- Gurouter в списке сервисов
 const ai=JSON.parse(ev("JSON.stringify(Presets.ai.map(p=>[p.id,p.n,p.u]))"));
 const g=ai.find(x=>x[0]==='gurouter');assert(g,'gurouter in list');assert.equal(g[1],'Gurouter');assert.equal(g[2],'https://gurouter.com/v1');
 assert(!ai.some(x=>/GoRouter/i.test(x[1])),'no GoRouter button');
 ev("show('set')");await sleep(300);ev("provForm(-1,setView,'chat')");await sleep(400);
 const chip=qa('.pre-b').find(b=>b.textContent==='Gurouter');assert(chip,'chip Gurouter');assert(!qa('.pre-b').some(b=>/GoRouter/.test(b.textContent)));
 chip.click();await sleep(100);
 assert.equal(q('[data-k=name]').value,'Gurouter');assert.equal(q('[data-k=url]').value,'https://gurouter.com/v1','name and address filled in');
 q('.sheet-bg .close,.sheet-bg [data-bk]')&&0;ev("document.querySelectorAll('.sheet-bg,.spg').forEach(x=>x.remove())");
 // --- черновик: переживает уход в настройки
 ev("S.providers=[{id:'p1',name:'t',model:'m',url:'https://api.openai.com/v1',ok:true}];saveProviders();Chx.load();Chx.open(Chx.fresh());show('api')");await sleep(500);
 const ta=()=>q('#v-api textarea');assert(ta(),'composer present');
 ta().value='недописанное сообщение';ta().dispatchEvent(new w.Event('input',{bubbles:true}));await sleep(450);
 assert(w.localStorage.getItem('kairema.draft.v1').includes('недописанное'),'draft saved');
 ev("show('set')");await sleep(400);ev("show('api')");await sleep(500);
 assert.equal(ta().value,'недописанное сообщение','draft restored after leaving the chat');
 // другой чат не видит чужой черновик (в пустом текущем чате новый не создаётся, поэтому добавляем сообщения)
 ev("Chx.cur.msgs.push({r:'u',q:'hi',t:'hi'},{r:'a',t:'hello'})");
 ev("Chx.open(Chx.fresh());apiView()");await sleep(400);assert.equal(ta().value,'','other chat has its own draft');
 // после отправки черновик очищается
 const t0=ev("Chx.cur.id");
 ev("Draft.set(Chx.cur.id,'x1')");ev("show('set')");await sleep(300);ev("show('api')");await sleep(500);
 assert.equal(ta().value,'x1');
 q('#v-api .send').click();await sleep(1800);
 assert.equal(ev("Draft.get('"+t0+"')"),'','draft cleared after send');
 // --- блоки кода
 const long=Array.from({length:20},(_,i)=>'line'+(i+1)).join('\n');
 ev("window.__bd=document.createElement('div');document.body.append(window.__bd)");
 ev("mdRender(window.__bd,'Вот:\\n```html\\n"+long.replace(/\n/g,'\\n')+"\\n```\\nготово',{r:'a',t:'x'})");
 let bd=ev("window.__bd");const cbw=q('.cbw');assert(cbw&&cbw.classList.contains('big'),'long code is collapsed');
 assert.equal(cbw.querySelector('.cbl').textContent,'html');assert(cbw.querySelector('.cbm').textContent.includes('20'),'show all button with line count');
 assert(cbw.nextElementSibling&&cbw.nextElementSibling.classList.contains('art-bar'),'module bars stay after the block');
 cbw.querySelector('.cbm').click();await sleep(80);
 assert(q('.cbv'),'viewer opened');assert.equal(q('.cbv .cbg').textContent.split('\n').length,20,'line numbers');assert(q('.cbv code').textContent.includes('line20'));
 q('.cbv [data-x]').click();await sleep(300);assert(!q('.cbv'),'viewer closed');
 cbw.querySelector('.cbp').click();await sleep(80);assert(q('.cbv'),'tap on code opens viewer');q('.cbv [data-x]').click();await sleep(300);
 ev("mdRender(window.__bd,'```py\\nprint(1)\\nprint(2)\\n```',{r:'a',t:'x'})");
 const sc=q('.cbw');assert(!sc.classList.contains('big')&&!sc.querySelector('.cbm'),'short code is not collapsed');
 ev("mdRender(window.__bd,'```js\\n"+long.replace(/\n/g,'\\n')+"')");
 const lv=q('.cbw');assert(lv.classList.contains('live')&&lv.classList.contains('big')&&!lv.querySelector('.cbm'),'streaming code is compact without the button');
 // --- настройки: плитки
 ev("show('set')");await sleep(500);
 assert(q('#v-set .st .stl'),'tiles grid');assert(qa('#v-set .stl .sr').length>=4,'tiles: '+qa('#v-set .stl .sr').length);
 assert(q('#v-set [data-go=mem]').closest('.stl'),'memory is a tile');assert(q('#v-set [data-tg=web]').closest('.grp'),'switch row stays a list row');
 q('#v-set [data-go=mem]').click();await sleep(300);assert(q('[data-screen=memory]')||q('.spg'),'tile click works');
 console.log('ERRORS:',errs.length?errs:'none');process.exit(0)})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,4).join(' | '),errs);process.exit(1)});
