const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const assert=require('assert');
const dir=process.env.UI_DIR||require('path').join(__dirname,'../../app/src/main/assets/ui/');
const html=fs.readFileSync(dir+'index.html','utf8').replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(dir+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const server={rows:[],n:0,fail:null,log:[]};
const stamp=()=>'2026-11-12T10:00:00.'+String(++server.n).padStart(6,'0')+'+00:00';
function makeFetch(errs){return async(url,o)=>{
 const R=(s,j)=>({ok:s<300,status:s,json:async()=>j});
 if(!url.includes('/rest/v1/sync_items'))return R(404,{});
 if(server.fail==='notable')return R(404,{message:'relation "public.sync_items" does not exist'});
 const uid=(o.headers.Authorization||'').replace('Bearer at-','');server.log.push(o.method);
 if(o.method==='GET'){
  const q=new URL(url).searchParams;const gt=(q.get('updated_at')||'').replace(/^gt\./,'');
  const rows=server.rows.filter(r=>r.user_id===uid&&(!gt||r.updated_at>gt)).sort((a,b)=>a.updated_at<b.updated_at?-1:1).slice(0,+q.get('limit'));
  return R(200,rows)}
 const body=JSON.parse(o.body);
 body.forEach(b=>{const i=server.rows.findIndex(r=>r.user_id===uid&&r.kind===b.kind&&r.id===b.id);const row=Object.assign({user_id:uid,updated_at:stamp()},b);if(i>=0)server.rows[i]=row;else server.rows.push(row)});
 return R(201,{})}}
function device(uid,pre){
 const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
 const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/ui/index.html',beforeParse(w){
  w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
  w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
  w.fetch=makeFetch(errs);
  w.localStorage.setItem('kairema.sb.v1',JSON.stringify({url:'https://abc.supabase.co',key:'sb_publishable_1234567890abcdef'}));
  w.localStorage.setItem('kairema.session.v1',JSON.stringify({access:'at-'+uid,refresh:'rt-'+uid,exp:Date.now()+3.6e6,user:{id:uid,email:uid+'@x.io'}}));
  if(pre)Object.entries(pre).forEach(([k,v])=>w.localStorage.setItem(k,v));
 }});
 const w=dom.window;return{w,errs,ev:c=>w.eval(c),q:s=>w.document.querySelector(s)}}
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
(async()=>{
 const A=device('u1');await sleep(900);
 // A: chat and memory
 A.ev("Chx.load();S.apiMsgs.push({r:'u',q:'привет',t:'привет'});S.apiMsgs.push({r:'a',t:'ответ'});Chx.save();S.memos.push(['Люблю кофе','']);Hooks.run('memory:changed')");
 await A.ev("Sync.run()");
 console.log('A status:',JSON.stringify(A.ev("Sync.status()")));
 assert.equal(server.rows.length,2);assert(server.rows.some(r=>r.kind==='chat'&&r.data.msgs.length===2));assert(server.rows.some(r=>r.kind==='memory'&&r.data.t==='Люблю кофе'));
 assert.equal(A.ev("Sync.status().pending"),0);
 const chatId=server.rows.find(r=>r.kind==='chat').id;
 // B: new device, same user, pulls
 const B=device('u1');await sleep(1500);
 assert.equal(B.ev("S.apiMsgs.length"),2,'B got the chat');assert.equal(B.ev("S.memos.length"),1);assert.equal(B.ev("S.memos[0][0]"),'Люблю кофе');
 console.log('B restored chat+memory ok; memory stored:',B.w.localStorage.getItem('kairema.memory.v1').slice(0,80));
 assert(B.ev("sysPrompt()").includes('Люблю кофе'),'memory goes into prompt');
 // B edits chat, deletes memory; A pulls
 await sleep(5);
 B.ev("S.apiMsgs.push({r:'u',q:'ещё',t:'ещё'});Chx.save();S.memos.splice(0,1);Hooks.run('memory:changed')");
 await B.ev("Sync.run()");await A.ev("Sync.run()");
 assert.equal(A.ev("S.apiMsgs.length"),3,'A sees B edit');assert.equal(A.ev("S.memos.length"),0,'A sees deletion');
 // LWW: A renames later than B
 await sleep(5);
 A.ev("const c=Chx.cur;c.title='Мой чат';c.named=1;c.ts=Date.now();Chx.persist();Hooks.run('sync:touch','chat',c.id)");
 await A.ev("Sync.run()");await B.ev("Sync.run()");
 assert.equal(B.ev("Chx.cur.title"),'Мой чат');
 // chat deletion propagates
 A.ev("Chx.list=Chx.list.filter(x=>x.id!=='"+chatId+"');Chx.open(Chx.fresh());Chx.persist();Hooks.run('sync:delete','chat','"+chatId+"')");
 await A.ev("Sync.run()");await B.ev("Sync.run()");
 assert.equal(B.ev("Chx.list.length"),0);assert.equal(B.ev("S.apiMsgs.length"),0);
 // offline-ish: no table
 server.fail='notable';B.ev("S.memos.push(['x','']);Hooks.run('memory:changed')");await B.ev("Sync.run()");
 console.log('error text:',B.ev("Sync.status().err"));assert(/sync_items/.test(B.ev("Sync.status().err")));assert(B.ev("Sync.status().pending")>0,'kept dirty');
 server.fail=null;await B.ev("Sync.run()");assert.equal(B.ev("Sync.status().pending"),0);assert.equal(B.ev("Sync.status().err"),'');
 // account switch: device with data of u1 but signed in as u2
 const before=server.rows.filter(r=>r.user_id==='u1').length;
 const C=device('u2',{'kairema.sync.meta.v1':JSON.stringify({uid:'u1',cursor:'',last:1,err:''}),'kairema.memory.v1':JSON.stringify({v:1,mem:true,auto:true,items:[{id:'mlocal',t:'секрет u1',src:'',ts:5}]})});
 await sleep(1200);
 assert(C.q('.sheet-bg.on [data-w]'),'chooser shown');assert.equal(server.rows.filter(r=>r.user_id==='u2').length,0,'nothing leaked before choice');
 C.q('.sheet-bg.on [data-w]').click();await sleep(1500);
 assert.equal(C.ev("S.memos.length"),0,'wiped');assert.equal(server.rows.filter(r=>r.user_id==='u2').length,0,'u1 data not uploaded to u2');assert.equal(server.rows.filter(r=>r.user_id==='u1').length,before);
 // merge choice
 const D=device('u2',{'kairema.sync.meta.v1':JSON.stringify({uid:'u1',cursor:'',last:1,err:''}),'kairema.memory.v1':JSON.stringify({v:1,mem:true,auto:true,items:[{id:'mlocal',t:'добавить',src:'',ts:5}]})});
 await sleep(1200);D.q('.sheet-bg.on [data-m]').click();await sleep(1500);
 assert(server.rows.some(r=>r.user_id==='u2'&&r.data&&r.data.t==='добавить'),'merged into u2');
 console.log('ERRORS:',[A,B,C,D].map(d=>d.errs.length?d.errs:'none').join(' | '));process.exit(0)})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,5).join(' | '));process.exit(1)});
