const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const assert=require('assert');
const dir=process.env.UI_DIR||require('path').join(__dirname,'../../app/src/main/assets/ui/');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/HTMLMediaElement/.test(e.message))errs.push(e.message)});
const html=fs.readFileSync(dir+'index.html','utf8').replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(dir+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/ui/index.html',
 beforeParse(w){w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
  w.localStorage.setItem('ko','1');w.localStorage.setItem('kna','1')}});
const w=dom.window,sleep=ms=>new Promise(r=>setTimeout(r,ms)),q=s=>w.document.querySelector(s);
(async()=>{
 await sleep(8000);
 assert(q('[data-in]'),'welcome sheet shown after splash');assert(q('[data-no]'));
 assert.equal(w.localStorage.getItem('kairema.welcome.v1'),'1');
 q('[data-no]').click();await sleep(400);assert(!q('[data-in]'),'closed, guest mode');
 assert.equal(w.eval('Auth.user()'),null);
 console.log('ERRORS:',errs.length?errs:'none');process.exit(0)})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,3).join(' | '),errs);process.exit(1)});
