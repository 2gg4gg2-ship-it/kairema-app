/* Понимание запроса (intent), планировщик поиска (websearch), плитки вложений (attview), зрение модели (Caps.vision). */
const {JSDOM,VirtualConsole}=require('jsdom');const fs=require('fs');const assert=require('assert');
const dir=process.env.UI_DIR||require('path').join(__dirname,'../../app/src/main/assets/ui/');
const html=fs.readFileSync(dir+'index.html','utf8').replace(/<script src="([^"]+)"><\/script>/g,(m,f)=>'<script>'+fs.readFileSync(dir+f,'utf8').replace(/<\/script>/g,'<\\/script>')+'</script>');
const errs=[],searches=[],plans=[],finals=[],bridge=[];let planMode='json';
const vc=new VirtualConsole();vc.on('jsdomError',e=>{if(!/HTMLMediaElement/.test(e.message))errs.push(e.message)});
const dom=new JSDOM(html,{runScripts:'dangerously',pretendToBeVisual:true,virtualConsole:vc,url:'http://localhost/ui/index.html',beforeParse(w){
 w.matchMedia=()=>({matches:false,addEventListener(){},addListener(){}});
 w.HTMLElement.prototype.scrollTo=function(){};w.HTMLElement.prototype.scrollIntoView=function(){};
 w.localStorage.setItem('ko','1');w.localStorage.setItem('kna','1');w.localStorage.setItem('kairema.welcome.v1','1');
 const ans=fn=>setTimeout(()=>{try{fn()}catch(e){errs.push('mock '+e.message)}},5);
 w.KairemaBridge={saveKey(){},deleteKey(){},hasKey:()=>true,cancel(){},
  saveImage(n,m,b){bridge.push(['save',n,m,b]);return true},shareImage(n,m,b){bridge.push(['share',n,m,b]);return true},
  search(r,a,q){searches.push(q);ans(()=>{w.KairemaNative.chunk(r,JSON.stringify([{title:'T',url:'https://a.b/x',snippet:'s'}]));w.KairemaNative.done(r,null)})},
  chat(r,pj,m){
   if(/web search queries/.test(pj)){plans.push(JSON.parse(m));
    const out=planMode==='json'?'Вот: {"search":true,"queries":["weather Moscow today","погода Москва"]}':planMode==='no'?'{"search":false,"queries":[]}':'я не знаю что делать';
    ans(()=>{w.KairemaNative.chunk(r,out);w.KairemaNative.done(r,null)});return}
   const msgs=JSON.parse(m);finals.push({sys:JSON.parse(pj).system,last:JSON.stringify(msgs[msgs.length-1].content)});
   ans(()=>{w.KairemaNative.chunk(r,'Ответ');w.KairemaNative.done(r,null)})}};
}});
const w=dom.window,sleep=ms=>new Promise(r=>setTimeout(r,ms)),ev=c=>w.eval(c),q=s=>w.document.querySelector(s),qa=s=>[...w.document.querySelectorAll(s)];
const ask=async txt=>{searches.length=0;plans.length=0;finals.length=0;
 const r=await w.eval(`(async()=>{S.providers=[{id:'p1',name:'t',model:'m',url:'https://api.openai.com/v1',ok:true}];S.sproviders=[{id:'s1',name:'tv',url:'https://api.tavily.com',ok:true}];S.web=true;const box=document.createElement('div');
  const msgs=[{r:'u',q:'Какая погода в Берлине?',t:'Какая погода в Берлине?'},{r:'a',t:'Сейчас +5.'},{r:'u',q:${JSON.stringify(txt)},t:${JSON.stringify(txt)}}];
  await respond(msgs,box,'');return JSON.stringify({t:msgs[3].t,err:msgs[3].err||0,src:(msgs[3].src||[]).length})})()`);
 return JSON.parse(r)};
(async()=>{
 await sleep(900);
 // --- intent: системная инструкция
 const s1=ev("sysExtra([{r:'u',t:'сделай игру'}])");
 assert(s1.includes('Understanding requests')&&s1.includes('Understood:')&&s1.includes('complete updated file'),'intent block present');
 assert(!s1.includes('attachments'));
 const s2=ev("sysExtra([{r:'u',t:'улучши',parts:[{k:'text',name:'a.html',text:'x'}]}])");
 assert(s2.includes('has attachments'),'attachment rule added');
 // --- поиск: модель составила запросы, контекст беседы передан, дубли ссылок убраны
 planMode='json';let o=await ask('а в Москве?');
 assert.equal(o.t,'Ответ');assert.deepEqual(searches,['weather Moscow today','погода Москва'],'planned queries searched');
 assert.equal(plans.length,1);assert.equal(plans[0].length,3,'planner sees previous messages');assert.equal(plans[0][0].role,'user');assert.equal(plans[0][2].content,'а в Москве?');
 assert.equal(finals.length,1);assert(finals[0].last.includes('Запросы: weather Moscow today; погода Москва'),'queries shown to the model');assert(finals[0].last.includes('Результаты поиска'));
 assert.equal(o.src,1,'duplicate urls merged');
 // --- модель решила, что поиск не нужен
 planMode='no';o=await ask('спасибо');
 assert.equal(searches.length,0,'no search when not needed');assert.equal(o.src,0);assert.equal(o.t,'Ответ');assert(!finals[0].last.includes('Результаты поиска'));
 // --- план не получился: ищем по тексту вопроса
 planMode='garbage';o=await ask('курс доллара');
 assert.deepEqual(searches,['курс доллара'],'fallback to raw text');assert.equal(o.src,1);
 // --- зрение модели
 assert.equal(ev("Caps.vision({id:'x',model:'claude-3-5-sonnet',url:'https://api.anthropic.com'})"),true);
 assert.equal(ev("Caps.vision({id:'x',model:'gpt-4o-mini',url:'https://api.openai.com/v1'})"),true);
 assert.equal(ev("Caps.vision({id:'x',model:'deepseek-chat',url:'https://api.deepseek.com'})"),null,'unknown is not blocked');
 ev("Caps.learn('pr',[{id:'m1',vis:true},{id:'m2',vis:false}])");
 assert.equal(ev("Caps.vision({id:'pr',model:'m1',url:'https://openrouter.ai/api/v1'})"),true);
 assert.equal(ev("Caps.vision({id:'pr',model:'m2',url:'https://openrouter.ai/api/v1'})"),false,'provider says no vision');
 // модель без зрения: картинка не уходит, вместо неё честная пометка
 const tc=JSON.parse(ev("(()=>{const o=Caps.vision;Caps.vision=()=>false;const r=toContent({r:'u',t:'что тут?',parts:[{k:'image',name:'a.jpg',mime:'image/jpeg',data:'AA'}]},false,'');Caps.vision=o;return JSON.stringify(r)})()"));
 assert(!tc.some(b=>b.type==='image_url'),'image withheld');assert(tc.find(b=>b.type==='text').text.includes('не умеет видеть изображения'));
 const tv=JSON.parse(ev("JSON.stringify(toContent({r:'u',t:'что тут?',parts:[{k:'image',name:'a.jpg',mime:'image/jpeg',data:'AA'}]},false,''))"));
 assert(tv.some(b=>b.type==='image_url'),'image sent when vision is not known to be missing');
 // --- определение картинок по расширению (у части галерей type пустой)
 assert.equal(ev("isImgF({type:'',name:'IMG_1.JPG'})"),true);assert.equal(ev("isImgF({type:'',name:'notes.txt'})"),false);
 // --- плитки вложений
 const d=ev("(()=>{const d=msgEl({r:'u',t:'game.html\\nулучши',parts:[{k:'image',name:'p.jpg',mime:'image/jpeg',data:'QUJD'},{k:'text',name:'game.html',text:'<html>hello</html>'},{k:'pdf',name:'x.pdf',data:'Zg=='}]},0);document.body.append(d);return 1})()");
 const tiles=qa('.msg.u .atc');assert.equal(tiles.length,3,'three attachment tiles');
 assert.equal(tiles[0].querySelector('img').getAttribute('src'),'data:image/jpeg;base64,QUJD');
 assert(tiles[1].textContent.includes('game.html'));assert(tiles[2].textContent.includes('PDF'));
 tiles[0].click();await sleep(60);
 assert(q('.attv img'),'image viewer opened');assert(q('.attv').classList.contains('on'));
 q('.attv [data-s]').click();q('.attv [data-h]').click();
 assert.deepEqual(bridge.map(b=>b[0]+':'+b[1]+':'+b[3]),['save:p.jpg:QUJD','share:p.jpg:QUJD']);
 q('.attv [data-x]').click();await sleep(320);assert(!q('.attv'),'viewer closed');
 tiles[1].click();await sleep(100);
 assert.equal(q('.attt').textContent,'<html>hello</html>','text file opens');
 assert(qa('.sheet-bg button').some(b=>b.textContent==='Копировать'));
 // повторная отрисовка не дублирует плитки
 ev("Att.paint(document.querySelector('.msg.u'),{r:'u',parts:[{k:'text',name:'a.txt',text:'q'}]})");assert.equal(qa('.msg.u .atr').length,1);assert.equal(qa('.msg.u .atc').length,1);
 console.log('ERRORS:',errs.length?errs:'none');process.exit(0)})().catch(e=>{console.log('FAIL',e.stack.split('\n').slice(0,4).join(' | '),errs);process.exit(1)});
