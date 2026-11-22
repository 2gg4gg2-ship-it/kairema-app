/* ===== ВЕБ-ИНСТРУМЕНТЫ АГЕНТА (Web) =====
   Web.http(opts)  — HTTP-запрос через нативный мост (Kotlin: Bridge.httpReq, правила в HttpRules.kt).
                     opts: {url, method, headers, body, ctype, keyId, max}. Возвращает {status, ctype, session, body, cut}.
   Web.htmlText(html, baseUrl) — страница → читаемый текст: заголовки «#», списки «-», код в ```, ссылки [текст](адрес).
   Web.page({url,start,max_chars}) — инструмент web_fetch: читает страницу, отдаёт кусок текста с указанием, сколько всего.
   Используется агентом (coder.js: web_fetch) и MCP-клиентом (features/mcp/mcp.js).
   Тест: docs/tests/agent043.test.py */
const Web=(()=>{
 const SKIP=new Set('script style noscript svg iframe canvas template head nav footer form select button'.split(' '));
 const BLOCK=new Set('p div section article main header ul ol li table tr h1 h2 h3 h4 h5 h6 blockquote pre br hr dl dt dd figure figcaption details summary'.split(' '));
 const http=async o=>{
  if(typeof Native==='undefined'||!Native.on)throw new Error('сетевой доступ агента работает только в приложении на телефоне');
  let raw='';await Native.run('httpReq',[JSON.stringify(o)],t=>{raw+=t});
  try{return JSON.parse(raw)}catch(e){throw new Error('ответ моста не разобран')}};
 const tidy=s=>s.replace(/[ \t ]+/g,' ').replace(/ *\n */g,'\n').replace(/\n{3,}/g,'\n\n').trim();
 const htmlText=(html,base)=>{
  let doc;try{doc=new DOMParser().parseFromString(String(html),'text/html')}catch(e){return String(html)}
  const title=(doc.title||'').trim();
  const root=doc.querySelector('main,article,[role=main]')||doc.body||doc.documentElement;
  const out=[];
  const href=a=>{const h=a.getAttribute('href')||'';if(!h||/^(#|javascript:|mailto:|tel:)/i.test(h))return'';try{return new URL(h,base||'http://x/').href}catch(e){return''}};
  const walk=n=>{
   if(n.nodeType===3){out.push(n.nodeValue.replace(/\s+/g,' '));return}
   if(n.nodeType!==1)return;
   const t=n.tagName.toLowerCase();if(SKIP.has(t))return;
   if(t==='pre'){out.push('\n```\n'+n.textContent.replace(/\n+$/,'')+'\n```\n');return}
   if(t==='br'){out.push('\n');return}
   if(t==='img'){const al=(n.getAttribute('alt')||'').trim();if(al)out.push('[картинка: '+al+']');return}
   if(t==='a'){const h=href(n);const mark=out.length;n.childNodes.forEach(walk);if(h){const txt=out.slice(mark).join('').trim();if(txt){out.length=mark;out.push('['+txt+']('+h+')')}}return}
   const blk=BLOCK.has(t);
   if(blk)out.push('\n');
   if(/^h[1-6]$/.test(t))out.push('#'.repeat(+t[1])+' ');
   else if(t==='li')out.push('- ');
   else if(t==='td'||t==='th')out.push(' | ');
   else if(t==='code')out.push('`');
   n.childNodes.forEach(walk);
   if(t==='code')out.push('`');
   if(blk)out.push('\n')};
  walk(root);
  const body=tidy(out.join(''));
  return (title?'# '+title+'\n\n':'')+body};
 const cache=new Map();
 const okType=ct=>!ct||/text|json|xml|javascript|html|yaml|markdown|x-www-form/i.test(ct);
 const page=async a=>{
  const url=String(a.url||'').trim();
  if(!/^https?:\/\//i.test(url))throw new Error('нужен полный адрес, начинающийся с http:// или https://');
  const mx=Math.min(40000,Math.max(500,parseInt(a.max_chars)||15000)),st=Math.max(0,parseInt(a.start)||0);
  let text=cache.get(url),head='';
  if(text===undefined){
   const r=await http({url,method:'GET',headers:{Accept:'text/html,application/xhtml+xml,text/plain,application/json;q=0.9,*/*;q=0.5'},max:600000});
   if(r.status<200||r.status>=300)throw new Error('HTTP '+r.status+(r.body?': '+tidy(String(r.body).replace(/<[^>]+>/g,' ')).slice(0,200):''));
   if(!okType(r.ctype))throw new Error('не текстовый тип содержимого: '+r.ctype);
   text=/html/i.test(r.ctype||'')||/^\s*<(!doctype|html)/i.test(r.body||'')?htmlText(r.body,url):String(r.body||'');
   if(r.cut)text+='\n[страница слишком большая: показано начало]';
   cache.set(url,text);if(cache.size>6)cache.delete(cache.keys().next().value)}
  const total=text.length;
  if(st>=total&&total)return'(start за пределами текста, всего знаков: '+total+')';
  const part=text.slice(st,st+mx),end=st+part.length;
  head='URL: '+url+'\n[знаков всего: '+total+', показано '+st+'–'+end+(end<total?'; продолжение: start='+end:'')+']\n\n';
  return head+part};
 return{http,htmlText,page,_clear(){cache.clear()}}})();
