const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const assert=require('assert');
const dir=process.env.UI_DIR||require('path').join(__dirname,'../../app/src/main/assets/ui/');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>errs.push(e.message));
const html=fs.readFileSync(dir+'index.html','utf8').replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(dir+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const reqs=[];let mode='ok',EXP=3600;
const users={};
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/ui/index.html',
 beforeParse(w){
  w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
  w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
  const sess=email=>({access_token:'at-'+email,refresh_token:'rt-'+email,expires_in:EXP,user:{id:'u1',email}});
  w.fetch=async(url,o)=>{
   const b=JSON.parse(o.body||'{}'),path=url.replace('https://abc.supabase.co/auth/v1','');reqs.push({path,b,h:o.headers});
   const R=(s,j)=>({ok:s<300,status:s,json:async()=>j});
   if(path==='/otp')return mode==='rate'?R(429,{error_code:'over_email_send_rate_limit',msg:'rate'}):R(200,{});
   if(path==='/verify')return b.token==='123456'?R(200,sess(b.email)):R(403,{error_code:'otp_expired',msg:'Token has expired or is invalid'});
   if(path==='/signup')return users[b.email]?R(422,{error_code:'user_already_exists',msg:'User already registered'}):(users[b.email]=b.password,mode==='confirm'?R(200,{id:'u1',email:b.email}):R(200,sess(b.email)));
   if(path.startsWith('/token?grant_type=password'))return users[b.email]===b.password?R(200,sess(b.email)):R(400,{error_code:'invalid_credentials',msg:'Invalid login credentials'});
   if(path.startsWith('/token?grant_type=refresh_token'))return b.refresh_token.startsWith('rt-')?R(200,Object.assign(sess('me@x.io'),{access_token:'at-new'})):R(400,{msg:'bad'});
   if(path==='/logout')return R(204,{});
   return R(404,{})};
 }});
const w=dom.window,sleep=ms=>new Promise(r=>setTimeout(r,ms)),ev=c=>w.eval(c),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
const set=(sel,v)=>{const i=q(sel);i.value=v;i.dispatchEvent(new w.Event('input',{bubbles:true}))};
(async()=>{
 await sleep(800);
 // settings row
 ev("show('set')");await sleep(500);
 assert(q('[data-acc]'),'account row in settings');assert(!q('[data-act=out]'),'demo logout hidden when signed out');
 console.log('row subtitle:',q('[data-acc] small').textContent);
 q('[data-acc]').click();await sleep(150);
 assert(q('[data-screen=account]'));assert(q('[data-k=url]'),'server form first');
 // server setup
 const sv=()=>q('[data-screen=account] [data-s]');
 assert(sv().disabled);
 set('[data-k=url]','http://bad');set('[data-k=key]','short');assert(sv().disabled);
 set('[data-k=url]','https://abc.supabase.co/');set('[data-k=key]','sb_publishable_1234567890abcdef');assert(!sv().disabled);
 sv().click();await sleep(100);
 assert(q('[data-screen=account] .segc'),'login view after saving server');
 // code flow
 set('[data-k=email]','me@x.io');q('[data-screen=account] [data-s]').click();await sleep(150);
 assert(reqs.some(r=>r.path==='/otp'&&r.b.email==='me@x.io'&&r.b.create_user===true));
 assert(reqs[reqs.length-1].h.apikey.startsWith('sb_publishable'));
 assert(q('[data-k=code]'),'code step');console.log('note:',q('[data-nt]').textContent);
 set('[data-k=code]','000000');q('[data-screen=account] [data-s]').click();await sleep(150);
 console.log('bad code:',q('.stat.bad').textContent);assert(/Код неверный/.test(q('.stat.bad').textContent));assert.equal(ev("Auth.user()"),null);
 set('[data-k=code]','123456');q('[data-screen=account] [data-s]').click();await sleep(300);
 assert.equal(ev("Auth.user().email"),'me@x.io');
 assert.equal(JSON.parse(w.localStorage.getItem('kairema.session.v1')).user.email,'me@x.io');
 await sleep(600);assert(!q('[data-screen=account]'),'page closed after login');
 console.log('settings row after login:',q('[data-acc] small').textContent);assert.equal(q('[data-acc] small').textContent,'me@x.io');assert(q('[data-act=out]'));
 // sign out
 q('[data-act=out]').click();await sleep(100);
 const okb=qa('.sheet-bg.on button').find(x=>/Выйти/.test(x.textContent)&&!x.classList.contains('ghost'))||qa('.sheet-bg.on button').pop();okb.click();await sleep(300);
 assert.equal(ev("Auth.user()"),null);assert(reqs.some(r=>r.path==='/logout'&&r.h.Authorization==='Bearer at-me@x.io'));
 assert.equal(w.localStorage.getItem('kairema.session.v1'),null);
 // password flow: sign up, wrong password, sign in
 q('[data-acc]').click();await sleep(150);
 qa('[data-screen=account] .segc button')[1].click();await sleep(50);
 set('[data-k=email]','new@x.io');set('[data-k=pw]','secret1');
 q('[data-screen=account] [data-up]').click();await sleep(200);
 assert.equal(ev("Auth.user().email"),'new@x.io');
 await ev("Auth.signOut()");
 await assert.rejects(ev("Auth.signIn('new@x.io','wrong')"),/Неверная почта или пароль/);
 await ev("Auth.signIn('new@x.io','secret1')");assert.equal(ev("Auth.user().email"),'new@x.io');
 await assert.rejects(ev("Auth.signUp('new@x.io','secret1')"),/уже зарегистрирована/);
 mode='confirm';assert.equal((await ev("Auth.signOut().then(()=>Auth.signUp('c@x.io','secret1'))")).confirm,true);
 // refresh token when nearly expired
 EXP=30;await ev("Auth.signOut()");await ev("Auth.signIn('new@x.io','secret1')");
 assert.equal(await ev("Auth.token()"),'at-new');assert(reqs.some(r=>r.path.startsWith('/token?grant_type=refresh_token')));console.log('refresh ok');
 // persistence: new Auth module instance reads storage (simulate restart)
 console.log('ERRORS:',errs.length?errs:'none');process.exit(0)})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,4).join(' | '),errs);process.exit(1)});
