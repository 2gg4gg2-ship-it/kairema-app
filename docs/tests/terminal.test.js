const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const assert=require('assert');
const dir=process.env.UI_DIR||require('path').join(__dirname,'../../app/src/main/assets/ui/');
const html=fs.readFileSync(dir+'index.html','utf8').replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(dir+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const errs=[],calls=[],chatMsgs=[];let status={installed:true,permission:false},script=[],grant=false;
const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/ui/index.html',beforeParse(w){
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
 w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
 const ans=fn=>setTimeout(()=>{try{fn()}catch(e){errs.push('mock '+e.message)}},5);
 const result=(r,cmd)=>ans(()=>{w.KairemaNative.chunk(r,'out:'+cmd.slice(0,12));w.KairemaNative.chunk(r,'\n\u0001exit:0');w.KairemaNative.done(r,null)});
 w.KairemaBridge={saveKey(){},deleteKey(){},hasKey:()=>true,cancel(){},termuxStatus:()=>JSON.stringify(status),termuxRequestPermission(){calls.push('reqperm');if(grant)status.permission=true},
  shell(r,cmd){calls.push('shell:'+cmd.slice(0,30));result(r,cmd)},
  termux(r,cmd){calls.push('termux:'+cmd.slice(0,30));if(/termux-ok/.test(cmd)){ans(()=>{w.KairemaNative.chunk(r,'termux-ok\nPython 3.12\n\u0001exit:0'.replace('\n\u0001','\n\n\u0001'));w.KairemaNative.done(r,null)});return}result(r,cmd)},
  chat(r,pj,m){const msgs=JSON.parse(m);chatMsgs.push(msgs[msgs.length-1].content);const n=chatMsgs.length;
   ans(()=>{w.KairemaNative.chunk(r,script[n-1]||'Готово.');w.KairemaNative.done(r,null)})}};
}});
const w=dom.window,sleep=ms=>new Promise(r=>setTimeout(r,ms)),ev=c=>w.eval(c),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
const ask=async text=>{await ev("(async()=>{const box=document.querySelector('.msgs');const m0={r:'u',q:'"+text+"',t:'"+text+"'};S.apiMsgs.push(m0);box.append(msgEl(m0,1));await respond(S.apiMsgs,box,'')})()");await sleep(120)};
(async()=>{
 await sleep(800);
 ev("S.providers=[{id:'p1',name:'t',model:'m',url:'https://api.openai.com/v1',ok:true}];saveProviders();apiView()");await sleep(50);
 // --- Termux check flow ---
 ev("show('term')");await sleep(500);
 q('#v-term [data-a=on]').click();await sleep(80);
 assert.equal(q('#v-term [data-tchk]').style.display,'none','check button hidden for Android backend');
 qa('#v-term .segc button')[1].click();await sleep(80);
 assert.equal(ev("Term.backend"),'termux');assert.notEqual(q('#v-term [data-tchk]').style.display,'none');
 assert.equal(w.localStorage.getItem('kairema.term.backend.v1'),'termux','backend persisted');
 ev('TERMUX_WAIT=1');q('#v-term [data-tchk]').click();await sleep(1500);
 let log=q('#v-term .tout').textContent;console.log('check1:',log.replace(/\n/g,' ').slice(0,240));
 assert(/✓ Termux установлен/.test(log)&&/Сейчас Android покажет окно/.test(log)&&/✗ Разрешение/.test(log)&&/запасной способ/.test(log));assert(calls.includes('reqperm'),'permission requested from the app');
 grant=true;q('#v-term [data-tchk]').click();await sleep(1800);
 log=q('#v-term .tout').textContent;assert(/✓ Termux отвечает/.test(log),'termux answers');assert(calls.some(c=>/^termux:echo termux-ok/.test(c)),'test command went to termux');
 // command in Termux backend
 const inp=q('#v-term .tin input');inp.value='pwd';inp.dispatchEvent(new w.KeyboardEvent('keydown',{key:'Enter'}));await sleep(120);
 assert(calls.includes('termux:pwd'),'typed command goes to Termux');
 assert(/Linux in Termux|Termux/.test(ev("sysPrompt()")),'prompt mentions Termux');
 // --- Agent ---
 script=['Сначала проверим:\n\n```bash\npwd\n```','Теперь список:\n\n```bash\nls\n```','Готово: это домашняя папка.'];
 ev("show('api')");await sleep(500);
 await ask('где я');
 const bars=qa('.runbar');assert.equal(bars.length,1);
 bars[0].querySelector('.rb').click();await sleep(100);
 assert(q('.sheet-bg.on [data-a]'),'auto button offered for safe command');
 q('.sheet-bg.on [data-a]').click();await sleep(3);
 assert(q('.agbar'),'agent bar visible');console.log('bar:',q('.agbar b').textContent);
 await sleep(1500);
 console.log('chat msgs sent:',chatMsgs.length,JSON.stringify(chatMsgs.map(x=>x.slice(0,30))));
 assert.equal(chatMsgs.length,3,'question + two auto results');
 assert(/Command results/.test(chatMsgs[2])&&/\$ ls/.test(chatMsgs[2]));
 assert(!q('.agbar'),'agent bar removed after finish');
 assert(calls.filter(c=>c==='termux:ls').length===1,'second step ran without confirm');
 assert.equal(qa('.sheet-bg.on').length,0,'no extra confirm sheet');
 // --- dangerous command stops agent ---
 chatMsgs.length=0;calls.length=0;
 script=['Шаг:\n\n```bash\necho 1\n```','Теперь удалим:\n\n```bash\nrm -rf work\n```'];
 await ask('почисти');
 qa('.runbar').pop().querySelector('.rb').click();await sleep(100);
 q('.sheet-bg.on [data-a]').click();await sleep(1500);
 assert(!calls.some(c=>/rm -rf/.test(c)),'dangerous command not auto-run');assert(!q('.agbar'),'agent stopped on danger');
 console.log('ERRORS:',errs.length?errs:'none');process.exit(0)})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,5).join(' | '),errs);process.exit(1)});
