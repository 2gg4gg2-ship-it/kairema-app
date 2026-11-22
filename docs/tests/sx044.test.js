/* Настройки (features/setlayout): иерархия как в профессиональных приложениях. */
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const assert=require('assert');
const dir=process.env.UI_DIR||require('path').join(__dirname,'../../app/src/main/assets/ui/');
const errs=[];const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/HTMLMediaElement/.test(e.message))errs.push(e.message)});
const html=fs.readFileSync(dir+'index.html','utf8').replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(dir+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/ui/index.html',beforeParse(w){
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('ko','1');w.localStorage.setItem('kna','1');w.localStorage.setItem('kairema.welcome.v1','1')}});
const w=dom.window,sleep=ms=>new Promise(r=>setTimeout(r,ms)),ev=c=>w.eval(c),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
(async()=>{
 await sleep(8000);
 ev("show('set')");await sleep(500);
 const sx=q('#v-set .sx');assert(sx,'sx layout built');
 // 1. кто вы: профиль и аккаунт в одной карточке
 const id=q('#v-set .sx-id');assert(id&&id.querySelector('.card.pf')&&id.querySelector('[data-acc]'),'profile and account in one card');
 // 2. провайдеры сверху: первая группа после карточки «кто вы», первая строка «Провайдеры ИИ», плиток больше нет
 assert.equal(qa('#v-set .sx-q,#v-set .sx-t').length,0,'no tiles');
 const g1=q('#v-set .sx>.sx-g:not(.sx-id)');assert.equal(g1.querySelector('.sx-r b').textContent,'Провайдеры ИИ','providers first');
 assert.equal(g1.querySelectorAll('.sx-r')[1].querySelector('b').textContent,'Провайдер поиска');
 const main=qa('#v-set .sx>.sx-g:not(.sx-id)')[1];assert.deepEqual([...main.querySelectorAll('.sx-r b')].map(b=>b.textContent),['Поиск','Тема']);
 assert(['Включён','Выключен'].includes(main.querySelector('[data-tg=web] small').textContent),'search state');
 // 3. группы: не больше 5 строк, нет «одинаковых пустышек» (у каждой строки в группе своя иконка)
 const groups=qa('#v-set .sx>.sx-g:not(.sx-id)');assert(groups.length>=4,'groups: '+groups.length);
 groups.forEach(g=>{const n=g.querySelectorAll('.sx-r').length;assert(n>=1&&n<=5,'group size '+n)});
 const icons=qa('#v-set .sx-g:not(.sx-id) .sx-r .si').map(e=>e.innerHTML);assert(new Set(icons).size>=icons.length-2,'icons are distinct: '+new Set(icons).size+'/'+icons.length);
 // 4. каждая известная строка на месте и ровно один раз
 ['mem','tpl','add','adds'].forEach(k=>assert.equal(qa(`#v-set [data-go=${k}]`).length,1,k));
 ['theme','log','cost','backup','roles','fd','coder-s','org-s','a11y-s','ca','qh','qc','rag','upd','feel','feels'].forEach(k=>assert.equal(qa(`#v-set [data-${k}]`).length,1,k));
 // 5. редкое свёрнуто в «Дополнительно» и раскрывается
 const adv=q('#v-set .sx-adv');assert(adv&&!adv.classList.contains('on'),'advanced collapsed');assert.equal(adv.querySelectorAll('.sx-r').length,3);
 assert.equal(adv.querySelector('em').textContent,'3');
 q('#v-set .sx-ah').click();assert(adv.classList.contains('on')&&q('#v-set .sx-ah').getAttribute('aria-expanded')==='true','advanced opens');
 assert.equal(w.localStorage.getItem('kairema.setadv'),'1','state remembered');
 // повторная отрисовка запоминает состояние
 ev("show('api')");await sleep(200);ev("show('set')");await sleep(400);assert(q('#v-set .sx-adv').classList.contains('on'),'state kept after re-render');
 // 6. плитки и строки работают как раньше
 q('#v-set [data-go=mem]').click();await sleep(300);assert(q('[data-screen=memory]')||q('.spg'),'row opens memory');
 ev("document.querySelectorAll('.spg,.sheet-bg').forEach(x=>x.remove())");
 ev("S.sproviders=[{id:'s1',name:'tv',url:'https://api.tavily.com',ok:true}];saveProviders();show('api')");await sleep(200);ev("show('set')");await sleep(400);
 const st0=q('#v-set [data-tg=web] small').textContent;q('#v-set [data-tg=web]').click();await sleep(300);assert.notEqual(q('#v-set [data-tg=web] small').textContent,st0,'search tile toggles and the state text follows');
 // 7. неизвестная строка другого модуля не теряется
 ev("Hooks.on('settings:rendered',v=>{const b=document.createElement('button');b.className='sr';b.setAttribute('data-zzz','');b.innerHTML='<span class=\"si\"></span><span class=\"m\"><b>Новая строка</b><small>x</small></span>';$('.st',v).append(b)})");
 ev("show('api')");await sleep(200);ev("show('set')");await sleep(400);
 const z=q('#v-set [data-zzz]');assert(z&&z.closest('.sx-g'),'unknown row kept in the Other group');
 assert(qa('#v-set .sx-h').some(h=>h.textContent==='Прочее'));
 console.log('ERRORS:',errs.length?errs:'none');process.exit(0)})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,4).join(' | '),errs);process.exit(1)});
