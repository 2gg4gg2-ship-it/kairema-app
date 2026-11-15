/* ===== ВЕТВЛЕНИЕ ОТВЕТОВ: «Другой ответ» и переключатель ‹ 1/2 › =====
   Под ПОСЛЕДНИМ ответом ИИ появляется кнопка ↻ «Другой ответ»: ответ запрашивается заново, прежний не пропадает.
   Варианты лежат в m.x.vs (до 6 штук), номер выбранного в m.x.vi; сохраняет их chats.js. Стрелки ‹ › переключают вариант,
   и дальше чат продолжается с выбранного. У старых ответов переключателя нет, чтобы не путать историю.
   Убрать модуль: удалить папку и строки в index.html. */
const Branch=(()=>{
 const MAX=6;
 i18nAdd({"Другой ответ":"Another answer","Предыдущий вариант":"Previous version","Следующий вариант":"Next version","Дождитесь ответа":"Wait for the answer"});
 const snap=m=>({t:m.t,src:m.src,serr:m.serr,cost:m.cost});
 const box=()=>$('#v-api .msgs');
 const lastA=()=>{const ms=S.apiMsgs,m=ms[ms.length-1];return m&&m.r==='a'&&!m.err&&m.t?m:null};
 const api={};
 api.regen=async()=>{
  if(Chx.busy){toast(L('Дождитесь ответа'));return}
  const m=lastA(),b=box(),ch=Chx.cur,pv=actProv();if(!m||!b||!ch||!pv)return;
  const ms=ch.msgs,vs=(m.x&&m.x.vs)?m.x.vs.slice():[snap(m)];
  if(m.x&&m.x.vs)vs[m.x.vi]=snap(m);
  ms.pop();const old=b.querySelectorAll('.msg.a');if(old.length)old[old.length-1].remove();
  const cmp=Chat.cmp;Chx.busy=1;if(cmp)cmp.busy(1);
  try{await respond(ms,b,'['+pv.model+'] ')}finally{Chx.busy=0}
  const nm=ms[ms.length-1];
  if(nm&&nm.r==='a'&&!nm.err&&nm.t){
   vs.push(snap(nm));while(vs.length>MAX)vs.shift();
   nm.x=Object.assign({},m.x&&m.x.cx?{cx:m.x.cx}:{},{vs,vi:vs.length-1})}
  else{if(nm&&nm.r==='a'&&nm!==m)ms.pop();ms.push(m);const bad=b.querySelectorAll('.msg.a');if(bad.length)bad[bad.length-1].replaceWith(msgEl(m,0))}
  Chx.save(ch);if(cmp)cmp.busy(0);refresh()};
 api.go=(m,j)=>{
  if(!m.x||!m.x.vs||Chx.busy)return;
  const vs=m.x.vs;j=Math.max(0,Math.min(vs.length-1,j));
  vs[m.x.vi]=snap(m);
  const v=vs[j];m.t=v.t;m.src=v.src;m.serr=v.serr;m.cost=v.cost;m.x.vi=j;
  Chx.save(Chx.cur);
  const b=box(),all=b?b.querySelectorAll('.msg.a'):[];
  if(all.length){const d=all[all.length-1],nd=msgEl(m,0);d.replaceWith(nd)}
  refresh()};
 const refresh=()=>{
  const b=box();if(!b)return;
  $$('.bn',b).forEach(x=>x.remove());
  const m=lastA();if(!m)return;
  const all=b.querySelectorAll('.msg.a'),d=all[all.length-1];if(!d||d._m!==m)return;
  let row=$('.msg-act',d);if(!row){row=el('<div class="msg-act"></div>');d.append(row)}
  const n=el(`<span class="bn"><button type="button" data-r aria-label="${esc(L('Другой ответ'))}">↻</button></span>`);
  $('[data-r]',n).onclick=e=>{e.stopPropagation();api.regen()};
  if(m.x&&m.x.vs&&m.x.vs.length>1){
   const k=m.x.vi,t=m.x.vs.length;
   const p=el(`<button type="button" data-p aria-label="${esc(L('Предыдущий вариант'))}">‹</button>`),c=el('<span class="bc"></span>'),x=el(`<button type="button" data-n aria-label="${esc(L('Следующий вариант'))}">›</button>`);
   c.textContent=(k+1)+'/'+t;p.disabled=k<=0;x.disabled=k>=t-1;
   p.onclick=e=>{e.stopPropagation();api.go(m,k-1)};x.onclick=e=>{e.stopPropagation();api.go(m,k+1)};
   n.append(p,c,x)}
  row.append(n)};
 api.refresh=refresh;
 Hooks.on('msg:render',(d,m)=>{d._m=m;setTimeout(refresh,30)});
 Hooks.on('chat:answer',()=>setTimeout(refresh,60));
 Hooks.on('chat:rendered',()=>setTimeout(refresh,80));
 return api})();
