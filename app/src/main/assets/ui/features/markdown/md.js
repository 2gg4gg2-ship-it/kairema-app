/* ===== MARKDOWN → DOM для ответов ИИ =====
   Безопасно: всё строится через createElement и textContent, innerHTML не используется.
   Ссылки только http(s). Поддержка: абзацы, заголовки, списки, таблицы, цитаты, код, жирный, курсив. */
const MD_INLINE=/(`[^`\n]+`)|(\*\*[^*\n]+?\*\*|__[^_\n]+?__)|(\*[^*\s][^*\n]*?\*|(?<![\w])_[^_\s][^_\n]*?_(?![\w]))|(\[[^\]\n]+\]\(https?:\/\/[^\s)]+\))|(https?:\/\/[^\s<>()]*[^\s<>().,;:!?*_])/g;
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
  else n=mdLink(t,t);
  parent.append(n);last=m.index+t.length}
 if(last<text.length)parent.append(document.createTextNode(text.slice(last)))}
const MD_SEP=/^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/;
const MD_LI=/^(\s*)([-*+]|\d+[.)])\s+(.*)$/;
const MD_HR=/^\s*([-*_])(\s*\1){2,}\s*$/;
const mdCells=l=>{l=l.trim();if(l.startsWith('|'))l=l.slice(1);if(l.endsWith('|'))l=l.slice(0,-1);return l.split('|').map(x=>x.trim())};
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
   tb.append(bd);wrap.append(tb);root.append(wrap);continue}
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
  const d=mdTag('div','srcs'),t=mdTag('div','srct');t.textContent='Источники';d.append(t);
  m.src.forEach((s,k)=>{
   const r=mdTag('div');const label='['+(k+1)+'] '+(s.title||s.url);
   if(/^https?:\/\//.test(s.url||''))r.append(mdLink(label,s.url));else r.textContent=label;
   d.append(r)});
  bd.append(d)}
 if(m.serr){const e=mdTag('div','srcs serr');e.textContent='⚠ Поиск не сработал: '+m.serr;bd.append(e)}}
/* Полная отрисовка ответа в элемент bd. m нужен для источников (необязательно). */
function mdRender(bd,text,m){
 if(bd._mr){cancelAnimationFrame(bd._mr);bd._mr=0}
 bd.textContent='';bd.classList.add('md');
 try{mdBlocks(bd,String(text||''),!!m)}catch(e){bd.textContent=String(text||'')}
 if(m)mdSources(bd,m)}
/* Во время потока: не чаще одного раза за кадр. */
function mdLive(bd,m,after){
 bd._mt=m.t;
 if(bd._mr)return;
 bd._mr=requestAnimationFrame(()=>{bd._mr=0;mdRender(bd,bd._mt);if(after)after()})}
i18nAdd({"Источники":"Sources"});
