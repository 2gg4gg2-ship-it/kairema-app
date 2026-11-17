/* ===== MARKDOWN → DOM для ответов ИИ =====
   Безопасно: всё строится через createElement и textContent, innerHTML не используется.
   Ссылки только http(s). Поддержка: абзацы, заголовки, списки, таблицы, цитаты, код, жирный, курсив. */
const MD_INLINE=/(`[^`\n]+`)|(\*\*[^*\n]+?\*\*|__[^_\n]+?__)|(\*[^*\s][^*\n]*?\*|(?<![\w])_[^_\s][^_\n]*?_(?![\w]))|(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?*_])|(~~[^~\n]+?~~)|(==[^=\s](?:[^=\n]*?[^=\s])?==)|(\*\*\*[^*\n]+?\*\*\*)/g;
function mdTag(tag,cls){const e=document.createElement(tag);if(cls)e.className=cls;return e}
function mdLink(text,url){const a=mdTag('a');a.textContent=text;a.href=url;a.rel='noopener noreferrer';return a}
function mdInline(parent,text){
 let last=0,m;const re=new RegExp(MD_INLINE.source,'g');
 while((m=re.exec(text))){
  if(m.index>last)parent.append(document.createTextNode(text.slice(last,m.index)));
  const t=m[0];let n;
  if(m[1]){n=mdTag('code');n.textContent=t.slice(1,-1)}
  else if(m[2]){n=mdTag('strong');mdInline(n,t.slice(2,-2))}
  else if(m[3]){n=mdTag('em');mdInline(n,t.slice(1,-1))}
  else if(m[4]){const k=t.indexOf('](');n=mdLink(t.slice(1,k),t.slice(k+2,-1))}
  else if(m[6]){n=mdTag('del');mdInline(n,t.slice(2,-2))}
  else if(m[7]){n=mdTag('mark');mdInline(n,t.slice(2,-2))}
  else if(m[8]){n=mdTag('strong');const e2=mdTag('em');mdInline(e2,t.slice(3,-3));n.append(e2)}
  else n=mdLink(t,t);
  parent.append(n);last=m.index+t.length}
 if(last<text.length)parent.append(document.createTextNode(text.slice(last)))}
const MD_SEP=/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const MD_LI=/^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const MD_HR=/^\s*([-*_])(\s*\1){2,}\s*$/;
const mdCells=l=>{l=l.trim();if(l.startsWith('|'))l=l.slice(1);if(l.endsWith('|'))l=l.slice(0,-1);return l.split('|').map(x=>x.trim())};
/* ===== БЛОК КОДА: шапка с языком, длинный код свёрнут, нажатие открывает весь код ===== */
const MD_CB_MAX=12;
const MD_ICO={x:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>',
 c:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>',
 k:'<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>'};
const mdCopy=t=>{if(typeof Sx!=='undefined'&&Sx.copyToast){Sx.copyToast(t);return}try{navigator.clipboard.writeText(t)}catch(e){}};
function mdCodeView(lang,code){
 const o=mdTag('div','cbv'),lines=String(code).split('\n');
 o.innerHTML='<div class="cbvh"><button type="button" class="cbi" data-x aria-label="Close">'+MD_ICO.k+'</button><b></b><small></small><button type="button" class="cbi" data-c aria-label="Copy">'+MD_ICO.c+'</button></div><div class="cbvb"><pre class="cbg"></pre><pre class="cbc"><code></code></pre></div>';
 o.querySelector('b').textContent=lang||'code';
 o.querySelector('small').textContent=lines.length+' '+L('строк');
 o.querySelector('.cbg').textContent=lines.map((_,i)=>i+1).join('\n');
 o.querySelector('code').textContent=code;
 const close=()=>{o.classList.remove('on');setTimeout(()=>o.remove(),200)};
 o.querySelector('[data-x]').onclick=close;
 o.querySelector('[data-c]').onclick=()=>mdCopy(code);
 document.body.append(o);requestAnimationFrame(()=>o.classList.add('on'))}
/* Оборачивает уже вставленный в root блок pre. Кнопки, которые добавили модули (Выполнить, Предпросмотр), остаются после обёртки. */
function mdCodeWrap(root,pre,lang,buf,final){
 const code=buf.join('\n'),big=buf.length>MD_CB_MAX;
 const w=mdTag('div','cbw'+(big?' big':'')+(final?'':' live')),hd=mdTag('div','cbh'),lb=mdTag('span','cbl'),ac=mdTag('span','cba'),bx=mdTag('div','cbp');
 lb.textContent=lang||'code';
 const mk=(h,al,fn)=>{const b=mdTag('button','cbi');b.type='button';b.setAttribute('aria-label',al);b.innerHTML=h;b.onclick=e=>{e.stopPropagation();fn()};return b};
 ac.append(mk(MD_ICO.x,'Open',()=>mdCodeView(lang,code)),mk(MD_ICO.c,'Copy',()=>mdCopy(code)));
 hd.append(lb,ac);w.append(hd,bx);
 root.insertBefore(w,pre);bx.append(pre);
 if(big){
  if(final){
   const more=mdTag('button','cbm');more.type='button';more.textContent=L('Показать все')+' · '+buf.length+' '+L('строк');
   more.onclick=()=>mdCodeView(lang,code);w.append(more);bx.onclick=()=>mdCodeView(lang,code)}
  else bx.scrollTop=bx.scrollHeight}}
const mdStart=(l,nx)=>/^```/.test(l)||/^#{1,6}\s/.test(l)||MD_HR.test(l)||/^\s*>/.test(l)||MD_LI.test(l)||(l.includes('|')&&nx!==undefined&&MD_SEP.test(nx));
function mdBlocks(root,text,final){
 const L=text.replace(/\r/g,'').split('\n');let i=0;
 while(i<L.length){
  const l=L[i];
  if(!l.trim()){i++;continue}
  if(/^```/.test(l)){
   const buf=[];i++;
   while(i<L.length&&!/^```/.test(L[i])){buf.push(L[i]);i++}
   i++;const lang=l.replace(/^```/,'').trim().split(/\s+/)[0].toLowerCase(),pre=mdTag('pre'),c=mdTag('code');
   c.textContent=buf.join('\n');pre.append(c);pre.dataset.lang=lang;root.append(pre);
   if(final)Hooks.run('md:code',pre,buf.join('\n'),lang);
   mdCodeWrap(root,pre,lang,buf,final);
   continue}
  let h=l.match(/^(#{1,6})\s+(.*)$/);
  if(h){const e=mdTag('h'+Math.min(6,Math.max(3,h[1].length+2)));mdInline(e,h[2].replace(/\s*#+\s*$/,''));root.append(e);i++;continue}
  if(MD_HR.test(l)){root.append(mdTag('hr'));i++;continue}
  if(l.includes('|')&&i+1<L.length&&MD_SEP.test(L[i+1])){
   const wrap=mdTag('div','tw'),tb=mdTag('table'),th=mdTag('thead'),tr=mdTag('tr');
   mdCells(l).forEach(c=>{const e=mdTag('th');mdInline(e,c);tr.append(e)});th.append(tr);tb.append(th);
   const bd=mdTag('tbody');i+=2;
   while(i<L.length&&L[i].trim()&&L[i].includes('|')){
    const r=mdTag('tr');mdCells(L[i]).forEach(c=>{const e=mdTag('td');mdInline(e,c);r.append(e)});bd.append(r);i++}
   tb.append(bd);wrap.append(tb);root.append(wrap);
   if(final)Hooks.run('md:table',wrap,tb);
   continue}
  if(/^\s*>/.test(l)){
   const buf=[];while(i<L.length&&/^\s*>/.test(L[i])){buf.push(L[i].replace(/^\s*>\s?/,''));i++}
   const q=mdTag('blockquote');mdBlocks(q,buf.join('\n'),final);root.append(q);continue}
  if(MD_LI.test(l)){
   const stack=[];
   while(i<L.length){
    const mm=L[i].match(MD_LI);
    if(!mm){
     if(L[i].trim()&&/^\s{2,}\S/.test(L[i])&&stack.length){const li=stack[stack.length-1].list.lastElementChild;if(li){li.append(mdTag('br'));mdInline(li,L[i].trim());i++;continue}}
     break}
    const ind=mm[1].replace(/\t/g,'    ').length,ord=/\d/.test(mm[2]);
    while(stack.length&&ind<stack[stack.length-1].ind)stack.pop();
    if(!stack.length||ind>stack[stack.length-1].ind){
     const list=mdTag(ord?'ol':'ul');
     if(ord&&parseInt(mm[2],10)>1)list.start=parseInt(mm[2],10);
     if(stack.length){const top=stack[stack.length-1].list;(top.lastElementChild||top).append(list)}else root.append(list);
     stack.push({list,ind})}
    const li=mdTag('li');mdInline(li,mm[3]);stack[stack.length-1].list.append(li);i++}
   continue}
  const buf=[];
  while(i<L.length&&L[i].trim()&&(buf.length===0||!mdStart(L[i],L[i+1]))){buf.push(L[i]);i++}
  const p=mdTag('p');
  buf.forEach((x,k)=>{if(k)p.append(mdTag('br'));mdInline(p,x.trim())});
  root.append(p)}}
function mdSources(bd,m){
 if(Array.isArray(m.src)&&m.src.length){
  /* Компактно: маленькая кнопка «Источники · N», по нажатию список плавно раскрывается и закрывается.
     details остаётся (доступность и сохранение вида без скриптов), но open ставится вручную: при закрытии
     сначала играет анимация (класс op снят), потом open убирается. */
  const d=mdTag('details','srcs'),t=mdTag('summary','srct');t.textContent=L('Источники')+' · '+m.src.length;d.append(t);
  const l=mdTag('div','srcl'),w=mdTag('div','srci');
  m.src.forEach((s,k)=>{
   const r=mdTag('div');const label='['+(k+1)+'] '+(s.title||s.url);
   if(/^https?:\/\//.test(s.url||''))r.append(mdLink(label,s.url));else r.textContent=label;
   w.append(r)});
  l.append(w);d.append(l);bd.append(d);
  let tm=0;
  t.addEventListener('click',e=>{
   e.preventDefault();clearTimeout(tm);
   if(d.classList.contains('op')){d.classList.remove('op');tm=setTimeout(()=>{d.open=false},300)}
   else{d.open=true;void l.offsetHeight;d.classList.add('op')}})}
 if(m.serr){const e=mdTag('div','srcs serr');e.textContent='⚠ Поиск не сработал: '+m.serr;bd.append(e)}}
/* Полная отрисовка ответа в элемент bd. m нужен для источников (необязательно). */
function mdRender(bd,text,m){
 if(bd._mr){cancelAnimationFrame(bd._mr);bd._mr=0}
 if(bd._mw){clearTimeout(bd._mw);bd._mw=0}
 bd.textContent='';bd.classList.add('md');
 try{mdBlocks(bd,String(text||''),!!m)}catch(e){bd.textContent=String(text||'')}
 if(m)mdSources(bd,m)}
/* Во время потока: не чаще одного раза за кадр. */
/* Длинный ответ перерисовывается реже (иначе каждый кадр строит весь текст заново и чат дёргается под пальцем). */
function mdLive(bd,m,after){
 bd._mt=m.t;
 if(bd._mr||bd._mw)return;
 const n=String(bd._mt||'').length,gap=n<1500?0:n<6000?110:230,w=gap-(performance.now()-(bd._ml||0));
 const go=()=>{bd._mw=0;bd._mr=requestAnimationFrame(()=>{bd._mr=0;bd._ml=performance.now();mdRender(bd,bd._mt);if(after)after()})};
 if(w>0)bd._mw=setTimeout(go,w);else go()}
/* Инструкция моделям: богатое оформление, чтобы ответ не был сплошным текстом. Работает для любой подключённой модели. */
function stylePrompt(){
 return "\n\nFormatting style (important). Never answer with a solid wall of text. The app renders rich Markdown, so use a variety of styles: "
  +"short headings (## and ###) to split longer answers; **bold** for key terms, names, numbers and conclusions (several per answer); *italic* for emphasis, titles and foreign words; ~~strikethrough~~ for corrections; ==highlight== for the single most important phrase; "
  +"> quotes for notes and warnings; bullet and numbered lists; tables for comparisons (always write a header row and a |---|---| separator row; keep cell text short, never put one word per line); `inline code` for commands, files and values; fenced code blocks for code; --- to separate big parts. "
  +"Start with the answer itself, then the details. Keep paragraphs to 1-3 sentences. Even a short answer should have at least one bold key phrase."}
i18nAdd({"Источники":"Sources","Показать все":"Show all","строк":"lines"});
