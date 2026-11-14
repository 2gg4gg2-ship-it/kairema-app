/* Поиск по чатам и коду (режим JS без KairemaSearch) и повтор ответа без результатов поиска. */
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const assert=require('assert');
const dir=process.env.UI_DIR||require('path').join(__dirname,'../../app/src/main/assets/ui/');
const html=fs.readFileSync(dir+'index.html','utf8').replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(dir+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const errs=[],chatCalls=[];let emptyFirst=false;
const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/ui/index.html',beforeParse(w){
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
 w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
 const ans=fn=>setTimeout(()=>{try{fn()}catch(e){errs.push('mock '+e.message)}},5);
 w.KairemaBridge={saveKey(){},deleteKey(){},hasKey:()=>true,cancel(){},
  search(r){ans(()=>{w.KairemaNative.chunk(r,JSON.stringify([{title:'T',url:'https://a.b/',snippet:'s'}]));w.KairemaNative.done(r,null)})},
  chat(r,pj,m){const msgs=JSON.parse(m);chatCalls.push(JSON.stringify(msgs[msgs.length-1].content));const n=chatCalls.length;
   ans(()=>{if(!(emptyFirst&&n===1))w.KairemaNative.chunk(r,'Ответ');w.KairemaNative.done(r,null)})}};
}});
const w=dom.window,sleep=ms=>new Promise(r=>setTimeout(r,ms)),ev=c=>w.eval(c),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
(async()=>{
 await sleep(800);
 // --- Поиск ---
 ev("Chx.load();const c=Chx.fresh();c.msgs.push({r:'u',q:'q',t:'Как приготовить пельмени?'},{r:'a',t:'Варите пельмени 7 минут.\\n```python\\nprint(\"hello world\")\\n```\\nГотово'});Chx.keep(c);const d=Chx.fresh();d.msgs.push({r:'u',q:'q',t:'Привет'},{r:'a',t:'Здравствуйте'});Chx.keep(d);Chx.open(d)");
 const docs=ev("JSON.stringify(Srch.docs(Chx.list.find(c=>c.msgs.length&&c.msgs[0].t.includes('пельмени'))))");
 assert(JSON.parse(docs).some(d=>d[1]==='c'&&d[2]==='python'),'code block indexed with language');
 ev("chatsPage()");await sleep(500);
 q('[data-chs]').click();await sleep(500);
 const inp=q('[data-q]');inp.value='ПЕЛЬМ';inp.dispatchEvent(new w.Event('input'));await sleep(400);
 assert(qa('.srch-res mark').some(m=>m.textContent.toLowerCase()==='пельмени'),'prefix match highlights whole word');
 inp.value='hello';inp.dispatchEvent(new w.Event('input'));await sleep(400);
 assert(qa('.srch-tag').some(t=>t.textContent.includes('python')),'code hit has language tag');
 qa('.srch-seg .chip')[1].click();await sleep(300);
 assert.equal(qa('.srch-hit').length,0,'filter Сообщения hides code');
 qa('.srch-seg .chip')[2].click();await sleep(300);
 assert.equal(qa('.srch-hit').length,1,'filter Код shows code');
 inp.value='<img src=x onerror=alert(1)>';inp.dispatchEvent(new w.Event('input'));await sleep(300);
 assert.equal(qa('.srch-res img').length,0,'no html injection');
 qa('.srch-seg .chip')[0].click();inp.value='пельмени';inp.dispatchEvent(new w.Event('input'));await sleep(400);
 q('.srch-hit').click();await sleep(700);
 assert(ev("Chx.cur.msgs[0].t").includes('пельмени'),'result opens the chat');
 assert(!q('[data-screen=search]'),'search page closed');
 // --- Поиск в интернете: пустой ответ с результатами, повтор без них ---
 for(const first of [true,false]){
  emptyFirst=first;chatCalls.length=0;
  const r=await w.eval("(async()=>{S.providers=[{id:'p1',name:'t',model:'m',url:'https://api.openai.com/v1',ok:true}];S.sproviders=[{id:'s1',name:'tv',url:'https://api.tavily.com',ok:true}];S.web=true;const box=document.createElement('div');const msgs=[{r:'u',q:'x',t:'В каком ты приложении'}];await respond(msgs,box,'');return JSON.stringify({t:msgs[1].t,err:msgs[1].err||0,src:(msgs[1].src||[]).length})})()");
  const o=JSON.parse(r);assert.equal(o.t,'Ответ');assert.equal(o.err,0);
  if(first){assert.equal(chatCalls.length,2);assert(!chatCalls[1].includes('Результаты поиска'));assert.equal(o.src,0)}
  else{assert.equal(chatCalls.length,1);assert.equal(o.src,1)}}
 console.log('ERRORS:',errs.length?errs:'none');process.exit(0)})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,5).join(' | '),errs);process.exit(1)});
