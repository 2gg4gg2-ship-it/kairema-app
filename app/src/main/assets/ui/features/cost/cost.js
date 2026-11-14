/* ===== СЧЁТЧИК ТОКЕНОВ И РАСХОДОВ =====
   Под каждым ответом ИИ: сколько токенов ушло и примерная цена. Экран «Расходы и токены» в настройках: сумма за месяц,
   по моделям, прошлые месяцы.
   Откуда цифры: 1) провайдер сообщает usage в конце потока (Kotlin Bridge.chat присылает кусок с \u0002), у OpenRouter там же цена;
   2) если провайдер молчит, токены оцениваются по длине текста (метка «≈»), цена считается по тарифам из списка моделей OpenRouter
   (хранятся в localStorage kairema.prices.v1) или равна 0 для моделей :free; 3) если тарифа нет, цена не показывается.
   Статистика: localStorage kairema.usage.v1 (по месяцам), ничего не уходит с устройства. Убрать модуль: удалить папку и строку в index.html
   (в app.js и chats.js вызовы защищены typeof или безвредны). */
i18nAdd({"Расходы и токены":"Spend and tokens","Токены и примерная цена ответов":"Tokens and approximate cost of answers","Этот месяц":"This month","Ответов":"Answers","Токены":"Tokens","Вход":"Input","Выход":"Output","Примерная цена":"Approximate cost","По моделям":"By model","Прошлые месяцы":"Previous months","Пока нет данных: расходы считаются с этой версии":"No data yet: spending is counted from this version","Сбросить статистику":"Reset statistics","Статистика сброшена":"Statistics reset","Цены известны не для всех моделей: у остальных считаются только токены":"Prices are not known for every model: only tokens are counted for the rest","ток":"tok"});
const Cost=(()=>{
 const PK='kairema.prices.v1',UK='kairema.usage.v1';
 let prices={},use={};
 try{prices=JSON.parse(localStorage.getItem(PK)||'{}')||{}}catch(e){}
 try{use=JSON.parse(localStorage.getItem(UK)||'{}')||{}}catch(e){}
 const put=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
 const api={};
 /* Тарифы из списка моделей: pin/pout в долларах за 1 млн токенов */
 api.learn=(pid,list)=>{
  if(!pid||!Array.isArray(list))return;
  const r={};let n=0;
  list.forEach(m=>{if(typeof m.pin==='number'&&typeof m.pout==='number'){r[m.id]=[m.pin,m.pout];n++}});
  if(n){prices[pid]=r;put(PK,prices)}};
 const price=(pv,id)=>{const r=prices[pv.id];return r&&r[id]||null};
 const strLen=v=>typeof v==='string'?v.length:Array.isArray(v)?v.reduce((a,x)=>a+(x&&x.type==='text'&&typeof x.text==='string'?x.text.length:0),0):0;
 /* Приходит из Kotlin: {i,o,c} */
 api.usage=(m,json)=>{try{const u=JSON.parse(json);m._u={i:+u.i,o:+u.o,c:typeof u.c==='number'?u.c:null}}catch(e){}};
 const mk=()=>new Date().toISOString().slice(0,7);
 api.done=(m,pv,hist,sys)=>{
  try{
   const u=m._u;delete m._u;
   let i,o,e=0,c=null;
   if(u&&(u.i>=0||u.o>=0)){i=Math.max(0,u.i||0);o=Math.max(0,u.o||0);c=u.c}
   else{e=1;i=Math.ceil(((hist||[]).reduce((a,x)=>a+strLen(x.content),0)+String(sys||'').length)/3.5);o=Math.ceil(String(m.t||'').length/3.5)}
   if(c==null){
    if(/:free$/.test(pv.model))c=0;
    else{const p=price(pv,pv.model);if(p)c=(i*p[0]+o*p[1])/1e6}}
   m.cost={i,o,c,e};
   const k=mk(),b=use[k]||(use[k]={n:0,i:0,o:0,c:0,u:0,by:{}});
   b.n++;b.i+=i;b.o+=o;if(c!=null)b.c+=c;else b.u++;
   const y=b.by[pv.model]||(b.by[pv.model]={n:0,i:0,o:0,c:0});y.n++;y.i+=i;y.o+=o;if(c!=null)y.c+=c;
   put(UK,use)}catch(e){}};
 const nf=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ');
 api.fmt=c=>{
  if(c==null)return '';
  if(c===0)return LANG==='en'?'free':'бесплатно';
  const cents=c*100;
  if(c>=1)return '$'+c.toFixed(2).replace('.',LANG==='en'?'.':',');
  if(cents<0.01)return '<0,01 ¢';
  return '~'+(cents<1?cents.toFixed(2):cents.toFixed(1)).replace('.',LANG==='en'?'.':',')+' ¢'};
 api.line=cs=>{if(!cs)return '';const t=(cs.e?'≈':'')+nf(cs.i+cs.o)+' '+L('ток'),p=api.fmt(cs.c);return p?t+' · '+p:t};
 api.month=()=>use[mk()]||null;
 api.reset=()=>{use={};put(UK,use)};
 api.all=()=>use;
 api.nf=nf;
 /* Подпись под ответом */
 const addLine=(d,m)=>{
  if(!m||m.r!=='a'||!m.cost)return;
  const row=$('.msg-act',d);if(!row)return;
  let s=$('.cost',row);if(!s){s=el('<span class="cost"></span>');row.append(s)}
  s.textContent=api.line(m.cost);s.title=LANG==='en'?'Tokens and approximate cost':'Токены и примерная цена'};
 Hooks.on('msg:render',(d,m)=>setTimeout(()=>addLine(d,m),0));
 Hooks.on('chat:answer',(m,bd)=>{const d=bd&&bd.closest&&bd.closest('.msg');if(d)setTimeout(()=>addLine(d,m),0)});
 /* Экран статистики */
 const stat=(l,v)=>`<div class="cs"><small>${esc(L(l))}</small><b>${esc(v)}</b></div>`;
 const monthName=k=>{const[y,mo]=k.split('-');try{return new Date(+y,+mo-1,1).toLocaleDateString(LANG==='en'?'en-US':'ru-RU',{month:'long',year:'numeric'})}catch(e){return k}};
 const costPage=()=>{
  if($('[data-screen=cost]'))return;
  return page('cost',L('Расходы и токены'),(b,d)=>{
   const m=api.month(),keys=Object.keys(use).sort().reverse();
   if(!m){b.innerHTML='<p class="ac-note">'+esc(L('Пока нет данных: расходы считаются с этой версии'))+'</p>';return}
   const by=Object.entries(m.by).sort((a,c)=>(c[1].c-a[1].c)||(c[1].i+c[1].o)-(a[1].i+a[1].o)).slice(0,8);
   b.innerHTML=`<h3 class="cs-h">${esc(L('Этот месяц'))} · ${esc(monthName(mk()))}</h3>
    <div class="cs-g">${stat('Примерная цена',api.fmt(m.c)||'0')}${stat('Ответов',nf(m.n))}${stat('Вход',nf(m.i)+' '+L('ток'))}${stat('Выход',nf(m.o)+' '+L('ток'))}</div>
    ${m.u?`<p class="ac-note">${esc(L('Цены известны не для всех моделей: у остальных считаются только токены'))}</p>`:''}
    <h3 class="cs-h">${esc(L('По моделям'))}</h3>
    <div class="cs-l">${by.map(([k,v])=>`<div class="cs-r"><span class="mo">${esc(k)}</span><span>${esc(nf(v.i+v.o))} ${esc(L('ток'))}${v.c?' · '+esc(api.fmt(v.c)):''}</span></div>`).join('')}</div>
    ${keys.length>1?`<h3 class="cs-h">${esc(L('Прошлые месяцы'))}</h3><div class="cs-l">${keys.slice(1,7).map(k=>`<div class="cs-r"><span class="mo">${esc(monthName(k))}</span><span>${esc(nf(use[k].i+use[k].o))} ${esc(L('ток'))}${use[k].c?' · '+esc(api.fmt(use[k].c)):''}</span></div>`).join('')}</div>`:''}
    <button class="btn ghost" data-rs style="width:100%;margin-top:18px">${esc(L('Сбросить статистику'))}</button>`;
   $('[data-rs]',b).onclick=()=>{api.reset();toast('Статистика сброшена');d.r()}})};
 Hooks.on('app:ready',()=>{P.chart=P.chart||'<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>';SCREENS.cost=costPage});
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-cost]',v))return;
  const r=el(`<button class="sr" style="--i:1" data-cost><span class="si c">${ic('chart')}</span><span class="m"><b>${esc(L('Расходы и токены'))}</b><small>${esc(L('Токены и примерная цена ответов'))}</small></span>${ic('chevR')}</button>`);
  r.onclick=()=>openScreen('cost');ab.insertAdjacentElement('beforebegin',r)});
 return api})();
