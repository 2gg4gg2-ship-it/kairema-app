/* ===== PDF ДЛЯ ЛЮБОЙ МОДЕЛИ: текст из файла без библиотек =====
   Раньше PDF понимал только Anthropic (он принимает файл целиком). Теперь приложение само достаёт текст:
   читает объекты PDF, распаковывает потоки (Flate), находит страницы и шрифты, переводит коды букв в Unicode по таблицам ToUnicode
   и собирает строки из операторов Tj, TJ, ', ". Работает с Word, Google Docs, Chrome, LibreOffice, обычными отчётами.
   Не умеет: сканы без текстового слоя (для них Kotlin рисует страницы картинками, см. attach/Attach.kt, pdfPages), защищённые паролем PDF,
   шрифты без таблицы ToUnicode с кодами не в Latin-1.
   API: Pdf.extract(ArrayBuffer) → {text, pages, chars}; Pdf.read(file, anth) → части сообщения для модели (читает messages.js, readFiles).
   Для Anthropic по-прежнему уходит сам PDF. Убрать модуль: удалить папку и строку в index.html (readFiles проверяет typeof Pdf). */
const Pdf=(()=>{
 i18nAdd({"PDF без текста (скан). Страницы отправлены картинками.":"PDF without text (scan). Pages are sent as images.","Читаю PDF…":"Reading PDF…","PDF не содержит текста":"PDF has no text"});
 const NAME=/[^\s\/\[\]<>()%{}]/;
 /* ---------- разбор синтаксиса PDF ---------- */
 const ws=c=>c===32||c===10||c===13||c===9||c===12||c===0;
 const dl=c=>c===40||c===41||c===60||c===62||c===91||c===93||c===123||c===125||c===47||c===37;
 function skipWs(s,i){for(;;){const c=s.charCodeAt(i);if(ws(c))i++;else if(c===37){while(i<s.length&&s.charCodeAt(i)!==10&&s.charCodeAt(i)!==13)i++}else return i}}
 /* Значения: число, '/Имя' (строка с косой чертой), {s:'строка'}, [массив], {…словарь…}, {r:номер} ссылка, true/false/null */
 function parseObj(s,i,depth){
  depth=depth||0;if(depth>40)return[null,i];
  i=skipWs(s,i);const c=s[i];
  if(c==='<'&&s[i+1]==='<'){
   i+=2;const d={};
   for(;;){i=skipWs(s,i);if(i>=s.length)break;if(s[i]==='>'&&s[i+1]==='>'){i+=2;break}
    if(s[i]!=='/'){i++;continue}
    const k=nameAt(s,i);i=k[1];const v=parseObj(s,i,depth+1);d[k[0].slice(1)]=v[0];i=v[1]}
   return[d,i]}
  if(c==='['){i++;const a=[];for(;;){i=skipWs(s,i);if(i>=s.length)break;if(s[i]===']'){i++;break}const v=parseObj(s,i,depth+1);a.push(v[0]);if(v[1]<=i)i++;else i=v[1]}return[a,i]}
  if(c==='/')return nameAt(s,i);
  if(c==='('){let d=1,j=i+1,o='';while(j<s.length&&d>0){const ch=s[j];if(ch==='\\'){const n=s[j+1];j+=2;
    if(n==='n')o+='\n';else if(n==='r')o+='\r';else if(n==='t')o+='\t';else if(n==='b')o+='\b';else if(n==='f')o+='\f';
    else if(n>='0'&&n<='7'){let oc=n;while(oc.length<3&&s[j]>='0'&&s[j]<='7'){oc+=s[j];j++}o+=String.fromCharCode(parseInt(oc,8)&255)}
    else if(n==='\r'){if(s[j]==='\n')j++}else if(n==='\n'){}else o+=n;continue}
   if(ch==='(')d++;else if(ch===')'){d--;if(d===0){j++;break}}o+=ch;j++}return[{s:o},j]}
  if(c==='<'){const e=s.indexOf('>',i);const h=s.slice(i+1,e<0?s.length:e).replace(/\s+/g,'');let o='';for(let k=0;k<h.length;k+=2)o+=String.fromCharCode(parseInt((h.substr(k,2)+'0').slice(0,2),16));return[{s:o},(e<0?s.length:e)+1]}
  let j=i;while(j<s.length&&!ws(s.charCodeAt(j))&&!dl(s.charCodeAt(j)))j++;
  const t=s.slice(i,j);if(j===i)return[null,i+1];
  if(/^[+-]?(\d+\.?\d*|\.\d+)$/.test(t)){
   if(/^\d+$/.test(t)){const m=/^\s+(\d+)\s+R(?![A-Za-z])/.exec(s.slice(j,j+24));if(m)return[{r:+t},j+m[0].length]}
   return[parseFloat(t),j]}
  if(t==='true')return[true,j];if(t==='false')return[false,j];if(t==='null')return[null,j];
  return[{op:t},j]}
 function nameAt(s,i){let j=i+1,o='/';while(j<s.length&&!ws(s.charCodeAt(j))&&!dl(s.charCodeAt(j))){if(s[j]==='#'&&/^[0-9a-fA-F]{2}$/.test(s.substr(j+1,2))){o+=String.fromCharCode(parseInt(s.substr(j+1,2),16));j+=3}else{o+=s[j];j++}}return[o,j]}
 /* ---------- байты, потоки ---------- */
 const latin=u8=>{let s='';const n=0x8000;for(let i=0;i<u8.length;i+=n)s+=String.fromCharCode.apply(null,u8.subarray(i,Math.min(u8.length,i+n)));return s};
 async function inflate(u8){
  const ds=new DecompressionStream('deflate');const w=ds.writable.getWriter();w.write(u8).catch(()=>{});w.close().catch(()=>{});
  const out=[];const r=ds.readable.getReader();let n=0;
  for(;;){const x=await r.read();if(x.done)break;out.push(x.value);n+=x.value.length;if(n>40e6)break}
  const res=new Uint8Array(n);let o=0;for(const p of out){res.set(p,o);o+=p.length}return res}
 /* Один PDF: объекты, потоки, страницы */
 async function load(buf){
  const u8=new Uint8Array(buf),s=latin(u8),objs={};
  const re=/(\d+)\s+(\d+)\s+obj\b/g;let m;
  while((m=re.exec(s))){
   const num=+m[1],start=m.index+m[0].length;
   const v=parseObj(s,start);const o={v:v[0],at:v[1]};
   let j=skipWs(s,v[1]);
   if(v[0]&&typeof v[0]==='object'&&!Array.isArray(v[0])&&s.startsWith('stream',j)){
    j+=6;if(s[j]==='\r')j++;if(s[j]==='\n')j++;
    let len=v[0].Length,end=-1;
    if(typeof len==='number'&&s.startsWith('endstream',skipWs(s,j+len)))end=j+len;
    if(end<0){end=s.indexOf('endstream',j);if(end<0)end=s.length;if(s[end-1]==='\n')end--;if(s[end-1]==='\r')end--}
    o.st=[j,end];re.lastIndex=end}
   objs[num]=o}
  const doc={u8,s,objs,cache:{}};
  /* Потоки объектов (ObjStm): внутри лежат словари шрифтов, страниц и каталога */
  for(const k of Object.keys(objs)){
   const o=objs[k];if(!o.st||!o.v||o.v.Type!=='/ObjStm')continue;
   try{
    const d=await stream(doc,+k);if(!d)continue;
    const t=latin(d),n=get(doc,o.v.N),first=get(doc,o.v.First);
    const hd=t.slice(0,first).trim().split(/\s+/).map(Number);
    for(let q=0;q<n;q++){const on=hd[q*2],off=hd[q*2+1];if(!(on>=0))continue;
     const v=parseObj(t,first+off);if(!objs[on])objs[on]={v:v[0],at:0}}}
   catch(e){}}
  return doc}
 function get(doc,v){let n=0;while(v&&typeof v==='object'&&v.r!==undefined&&n++<20){const o=doc.objs[v.r];v=o?o.v:null}return v}
 /* Содержимое потока без сжатия (только Flate и без фильтров; остальные фильтры не поддерживаются) */
 async function stream(doc,num){
  if(doc.cache[num]!==undefined)return doc.cache[num];
  const o=doc.objs[num];if(!o||!o.st){doc.cache[num]=null;return null}
  let raw=doc.u8.subarray(o.st[0],o.st[1]);
  let f=get(doc,o.v.Filter);const fl=Array.isArray(f)?f.map(x=>get(doc,x)):(f?[f]:[]);
  let out=raw;
  try{
   for(const x of fl){
    if(x==='/FlateDecode'||x==='/Fl'){out=await inflate(out);
     const dp=get(doc,Array.isArray(o.v.DecodeParms)?o.v.DecodeParms[0]:o.v.DecodeParms);
     if(dp&&dp.Predictor>=10)out=pngPredict(out,get(doc,dp.Columns)||1,get(doc,dp.Colors)||1,get(doc,dp.BitsPerComponent)||8)}
    else if(x==='/ASCII85Decode'||x==='/A85')out=a85(out);
    else if(x==='/ASCIIHexDecode'||x==='/AHx')out=ahex(out);
    else{out=null;break}}}
  catch(e){out=null}
  doc.cache[num]=out;return out}
function a85(u8){
  const out=[];let g=[];
  for(let i=0;i<u8.length;i++){const c=u8[i];
   if(c===126)break;if(ws(c))continue;
   if(c===122&&!g.length){out.push(0,0,0,0);continue}
   if(c<33||c>117)continue;
   g.push(c-33);
   if(g.length===5){let v=0;for(const d of g)v=v*85+d;out.push((v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255);g=[]}}
  if(g.length>1){const n=g.length;while(g.length<5)g.push(84);let v=0;for(const d of g)v=v*85+d;const b=[(v>>>24)&255,(v>>>16)&255,(v>>>8)&255,v&255];for(let k=0;k<n-1;k++)out.push(b[k])}
  return Uint8Array.from(out)}
 function ahex(u8){const t=latin(u8).replace(/>.*$/s,'').replace(/\s+/g,'');const out=[];for(let i=0;i<t.length;i+=2)out.push(parseInt((t.substr(i,2)+'0').slice(0,2),16));return Uint8Array.from(out)}
 function pngPredict(d,cols,colors,bpc){
  const bpp=Math.max(1,Math.ceil(colors*bpc/8)),row=Math.ceil(cols*colors*bpc/8),n=Math.floor(d.length/(row+1)),out=new Uint8Array(n*row);
  for(let r=0;r<n;r++){const ft=d[r*(row+1)];for(let i=0;i<row;i++){
   const x=d[r*(row+1)+1+i],a=i>=bpp?out[r*row+i-bpp]:0,b=r?out[(r-1)*row+i]:0,c=(r&&i>=bpp)?out[(r-1)*row+i-bpp]:0;let v=x;
   if(ft===1)v=x+a;else if(ft===2)v=x+b;else if(ft===3)v=x+((a+b)>>1);else if(ft===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);v=x+(pa<=pb&&pa<=pc?a:pb<=pc?b:c)}
   out[r*row+i]=v&255}}return out}
 /* ---------- таблицы ToUnicode ---------- */
 const hexU=h=>{let o='';for(let i=0;i+3<=h.length;i+=4)o+=String.fromCharCode(parseInt(h.substr(i,4),16));if(h.length<4&&h.length>0)o=String.fromCharCode(parseInt(h,16));return o};
 function parseCMap(t){
  const map=new Map();let len=0;
  const cs=/begincodespacerange([\s\S]*?)endcodespacerange/g;let m;
  while((m=cs.exec(t))){const a=/<([0-9a-fA-F]+)>/.exec(m[1]);if(a)len=Math.max(len,a[1].length/2)}
  const bc=/beginbfchar([\s\S]*?)endbfchar/g;
  while((m=bc.exec(t))){const r=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]*)>/g;let x;while((x=r.exec(m[1]))){map.set(parseInt(x[1],16),hexU(x[2]));if(!len)len=x[1].length/2}}
  const br=/beginbfrange([\s\S]*?)endbfrange/g;
  while((m=br.exec(t))){
   const r=/<([0-9a-fA-F]+)>\s*<([0-9a-fA-F]+)>\s*(<[0-9a-fA-F]*>|\[[^\]]*\])/g;let x;
   while((x=r.exec(m[1]))){const lo=parseInt(x[1],16),hi=parseInt(x[2],16);if(!len)len=x[1].length/2;
    if(hi-lo>70000)continue;
    if(x[3][0]==='<'){const base=hexU(x[3].slice(1,-1));const last=base.charCodeAt(base.length-1);for(let c=lo;c<=hi;c++)map.set(c,base.slice(0,-1)+String.fromCharCode(last+(c-lo)))}
    else{const a=x[3].match(/<([0-9a-fA-F]*)>/g)||[];for(let c=lo;c<=hi&&c-lo<a.length;c++)map.set(c,hexU(a[c-lo].slice(1,-1)))}}}
  return{map,len:len||1}}
 async function fontInfo(doc,ref){
  const key='f'+(ref&&ref.r!==undefined?ref.r:JSON.stringify(ref));
  if(doc.cache[key])return doc.cache[key];
  const f=get(doc,ref);let info={cm:null,t0:false};
  if(f&&typeof f==='object'){
   info.t0=f.Subtype==='/Type0';
   const tu=f.ToUnicode;
   if(tu&&tu.r!==undefined){const d=await stream(doc,tu.r);if(d)info.cm=parseCMap(latin(d))}
   if(!info.cm&&!info.t0)info.diff=diffMap(doc,f)}
  doc.cache[key]=info;return info}
 /* Простые шрифты без ToUnicode: /Encoding с /Differences и именами глифов (uniXXXX, имена кириллицы afii10017 и т.д.) */
 const AFII={afii10017:0x410,afii10018:0x411,afii10019:0x412,afii10020:0x413,afii10021:0x414,afii10022:0x415,afii10023:0x401,afii10024:0x416,afii10025:0x417,afii10026:0x418,afii10027:0x419,afii10028:0x41a,afii10029:0x41b,afii10030:0x41c,afii10031:0x41d,afii10032:0x41e,afii10033:0x41f,afii10034:0x420,afii10035:0x421,afii10036:0x422,afii10037:0x423,afii10038:0x424,afii10039:0x425,afii10040:0x426,afii10041:0x427,afii10042:0x428,afii10043:0x429,afii10044:0x42a,afii10045:0x42b,afii10046:0x42c,afii10047:0x42d,afii10048:0x42e,afii10049:0x42f};
 function glyph(n){
  n=n.replace(/^\//,'');
  let m=/^uni([0-9A-Fa-f]{4})$/.exec(n);if(m)return String.fromCharCode(parseInt(m[1],16));
  m=/^afii(100\d\d)$/.exec(n);
  if(AFII[n])return String.fromCharCode(AFII[n]);
  if(m){const k=+m[1];if(k>=10065&&k<=10097)return String.fromCharCode(0x430+k-10065);if(k===10071)return 'ё'}
  if(n.length===1)return n;
  const W={space:' ',period:'.',comma:',',hyphen:'-',colon:':',semicolon:';',parenleft:'(',parenright:')',quotedbl:'"',exclam:'!',question:'?',slash:'/',percent:'%',numbersign:'#',endash:'–',emdash:'—',quoteright:'’',quoteleft:'‘',bullet:'•',plus:'+',equal:'=',underscore:'_',zero:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9'};
  return W[n]||''}
 function diffMap(doc,f){
  const enc=get(doc,f.Encoding);if(!enc||typeof enc!=='object')return null;
  const d=get(doc,enc.Differences);if(!Array.isArray(d))return null;
  const map={};let c=0;for(const x of d){if(typeof x==='number')c=x;else if(typeof x==='string'){const g=glyph(x);if(g)map[c]=g;c++}}
  return map}
 /* ---------- чтение содержимого страницы ---------- */
 function tokenize(t){
  const out=[];let i=0;
  while(i<t.length){i=skipWs(t,i);if(i>=t.length)break;
   const c=t[i];
   if(c===']'||c===')'||c==='>'||c==='}'||c==='{'){i++;continue}
   if(c==='B'&&t.startsWith('BI',i)&&ws(t.charCodeAt(i+2))){const e=t.indexOf('EI',i+2);i=e<0?t.length:e+2;continue}
   const v=parseObj(t,i);if(v[1]<=i){i++;continue}
   i=v[1];out.push(v[0])}
  return out}
 async function pageText(doc,contents,res,depth){
  depth=depth||0;
  const fonts={};const fd=get(doc,res&&res.Font);
  const xo=get(doc,res&&res.XObject);
  let src='';
  for(const c of contents){const d=c.r!==undefined?await stream(doc,c.r):null;if(d)src+=latin(d)+'\n'}
  const tk=tokenize(src);let out='',st=[],font=null,lastY=null,ty=0;
  const dec=(str)=>{
   const info=font;if(!info)return str;
   if(info.cm){const cm=info.cm;let o='';if(cm.len===2){for(let i=0;i+1<str.length;i+=2){const code=str.charCodeAt(i)*256+str.charCodeAt(i+1);o+=cm.map.has(code)?cm.map.get(code):''}}
    else{for(let i=0;i<str.length;i++){const code=str.charCodeAt(i);o+=cm.map.has(code)?cm.map.get(code):''}}return o}
   if(info.t0)return '';
   if(info.diff){let o='';for(let i=0;i<str.length;i++){const code=str.charCodeAt(i);o+=info.diff[code]!==undefined?info.diff[code]:str[i]}return o}
   return str};
  const nl=()=>{if(out&&!out.endsWith('\n'))out+='\n'};
  for(const x of tk){
   if(x&&x.op!==undefined){
    const op=x.op;
    if(op==='Tf'){const nm=st[st.length-2];if(typeof nm==='string'&&fd&&fd[nm.slice(1)]!==undefined){const k=nm;fonts[k]=fonts[k]||await fontInfo(doc,fd[nm.slice(1)]);font=fonts[k]}else font=null}
    else if(op==='Tj'){const a=st[st.length-1];if(a&&a.s!==undefined)out+=dec(a.s)}
    else if(op==="'"||op==='"'){nl();const a=st[st.length-1];if(a&&a.s!==undefined)out+=dec(a.s)}
    else if(op==='TJ'){const a=st[st.length-1];if(Array.isArray(a))for(const e of a){if(e&&e.s!==undefined)out+=dec(e.s);else if(typeof e==='number'&&e<-220&&out&&!/\s$/.test(out))out+=' '}}
    else if(op==='Td'||op==='TD'){const y=st[st.length-1];if(typeof y==='number'&&Math.abs(y)>0.5)nl();}
    else if(op==='T*')nl();
    else if(op==='Tm'){const y=st[st.length-1];if(typeof y==='number'){if(lastY!==null&&Math.abs(y-lastY)>1)nl();lastY=y}}
    else if(op==='BT'){lastY=null}
    else if(op==='ET')nl();
    else if(op==='Do'&&xo&&depth<3){const nm=st[st.length-1];const ref=typeof nm==='string'?xo[nm.slice(1)]:null;
     if(ref&&ref.r!==undefined){const o=doc.objs[ref.r];if(o&&o.v&&o.v.Subtype==='/Form'){
      const r2=get(doc,o.v.Resources)||res;try{const t2=await pageText(doc,[ref],r2,depth+1);if(t2){nl();out+=t2;nl()}}catch(e){}}}}
    st=[]}
   else st.push(x)}
  return out}
 /* Страницы по порядку дерева /Pages */
 function pageList(doc){
  const o=doc.objs;let root=null;
  for(const k of Object.keys(o)){const v=o[k].v;if(v&&v.Type==='/Catalog'){root=v;break}}
  const res=[];
  const walk=(node,inh,d)=>{
   if(d>30)return;const v=get(doc,node);if(!v||typeof v!=='object')return;
   const r=v.Resources!==undefined?v.Resources:inh;
   if(v.Type==='/Pages'||Array.isArray(v.Kids)){for(const k of get(doc,v.Kids)||[])walk(k,r,d+1)}
   else res.push({v,res:r})};
  if(root&&root.Pages)walk(root.Pages,null,0);
  if(!res.length){
   const ks=Object.keys(o).map(Number).sort((a,b)=>a-b);
   for(const k of ks){const v=o[k].v;if(v&&v.Type==='/Page'){
    let r=v.Resources,p=v.Parent,n=0;while(r===undefined&&p&&n++<20){const pv=get(doc,p);r=pv&&pv.Resources;p=pv&&pv.Parent}
    res.push({v,res:r})}}}
  return res}
 const api={};
 api.parse=parseObj;
 /* Главная функция: текст всех страниц. maxChars ограничивает размер. */
 api.extract=async(buf,maxChars)=>{
  maxChars=maxChars||200000;
  const doc=await load(buf);
  const enc=/\/Encrypt\s*(<<|\d+\s+\d+\s+R)/.test(doc.s.slice(-3000)+doc.s.slice(0,1500));
  const pages=pageList(doc);let text='',chars=0;
  for(let i=0;i<pages.length;i++){
   const p=pages[i],cv=get(doc,p.v.Contents);
   const list=Array.isArray(cv)?cv.filter(x=>x&&x.r!==undefined):(p.v.Contents&&p.v.Contents.r!==undefined?[p.v.Contents]:[]);
   let t='';try{t=await pageText(doc,list,get(doc,p.res))}catch(e){t=''}
   t=t.normalize('NFKC').replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
   chars+=t.replace(/\s/g,'').length;
   if(pages.length>1)text+='\n\n[Страница '+(i+1)+']\n'+t;else text+=t;
   if(text.length>maxChars){text=text.slice(0,maxChars)+'\n[… текст обрезан]';break}}
  return{text:text.trim(),pages:pages.length,chars,enc}};
 /* Для чата: части сообщения (текст и, если текста нет, картинки страниц). Ничего не выбрасывает наружу. */
 api.read=async(f,anth)=>{
  const out=[];let ex={text:'',pages:0,chars:0};
  try{ex=await api.extract(await f.arrayBuffer())}catch(e){}
  const poor=ex.chars<Math.max(40,ex.pages*15);
  if(!poor){out.push({k:'text',name:f.name,text:ex.text});return out}
  /* Текста нет (скан или шрифт без таблицы): пробуем картинки страниц, если модель видит изображения */
  const vis=typeof Caps!=='undefined'&&Caps.vision&&typeof actProv==='function'?Caps.vision(actProv()):undefined;
  if(vis!==false&&f._k&&window.KairemaAttach){
   const imgs=await api.pages(f._k,4);
   if(imgs.length){
    if(ex.chars>0)out.push({k:'text',name:f.name,text:ex.text});
    imgs.forEach((d,i)=>out.push({k:'image',name:f.name+' стр.'+(i+1),mime:'image/jpeg',data:d}));
    if(typeof toast==='function')toast(L('PDF без текста (скан). Страницы отправлены картинками.'));
    return out}}
  if(ex.chars>0){out.push({k:'text',name:f.name,text:ex.text});return out}
  if(ex.enc){out.push({k:'text',name:f.name,text:'[Файл «'+f.name+'» защищён паролем или шифрованием, прочитать его нельзя. Скажи пользователю об этом и попроси прислать PDF без защиты или текст.]'});return out}
  out.push({k:'text',name:f.name,text:'[Файл «'+f.name+'»: в PDF нет текстового слоя'+(vis===false?', а выбранная модель не видит изображения':'')+'. Скажи пользователю, что содержимое ты не видишь, и предложи выбрать модель со зрением или прислать текст.]'});
  return out};
 /* Страницы картинками (Kotlin PdfRenderer); возвращает массив base64 JPEG */
 api.pages=async(key,n)=>{
  const res=[];
  try{await Native.run('pdfPages',[key,String(n||4)],t=>{try{const o=JSON.parse(t);if(o&&o.d)res[o.i]=o.d}catch(e){}})}catch(e){}
  return res.filter(Boolean)};
 return api})();
