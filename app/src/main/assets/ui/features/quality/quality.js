/* ===== КАЧЕСТВО ОТВЕТОВ ДЛЯ ЛЮБЫХ МОДЕЛЕЙ (от самых слабых до лучших) =====
   1) Quality.prompt(): короткие жёсткие правила в системную подсказку: язык ответа, никаких иероглифов, форма таблицы с примером;
      для слабых моделей (по названию или по настройке) добавляется «простой режим»: короткие фразы, шаги, не выдумывать.
   2) Quality.filter(кусок): убирает китайские/японские/корейские символы из ответа, если вы пишете не на этих языках
      и не просили перевод. Слабые модели иногда вставляют иероглиф посреди русской фразы или в ячейку таблицы.
   3) Настройки: «Подсказки для слабых моделей» (Авто, Вкл, Выкл) и «Убирать иероглифы».
   Подключается в providers.js (sysPrompt, функция qualityPrompt) и в core/messages.js (watch и filter при потоке ответа).
   Убрать: удалить папку features/quality и её строку в index.html (вызовы защищены typeof). Тест: docs/tests/quality029.test.py */
i18nAdd({"Подсказки для слабых моделей":"Hints for weak models","Авто":"Auto","Вкл":"On","Выкл":"Off","Простые правила для небольших моделей: короткие фразы, шаги, ровные таблицы":"Simple rules for small models: short sentences, steps, tidy tables","Убирать иероглифы":"Remove CJK characters","Если вы пишете не на китайском, лишние иероглифы из ответа удаляются":"If you do not write in Chinese, stray CJK characters are removed from answers"});
const Quality=(()=>{
 const KH='kqhelp',KC='kqcjk';
 const CJK=/[⺀-〿぀-ヿ㄀-ㄯ㇀-ㇿ㐀-䶿一-鿿가-힯豈-﫿＀-｠︰-﹏]/;
 const CJKG=new RegExp(CJK.source,'g');
 const ASK=/(китайск|японск|корейск|иероглиф|хиндзи|кандзи|chinese|japanese|korean|mandarin|hanzi|kanji|中文|汉语|日本語|한국어)/i;
 let ok=false; /* true: в этом диалоге иероглифы допустимы */
 const get=(k,d)=>{try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}};
 const set=(k,v)=>{try{localStorage.setItem(k,v)}catch(e){}};
 const help=()=>get(KH,'auto'),cjkOff=()=>get(KC,'1')==='1';
 const WEAK=/(mini|nano|tiny|small|lite|haiku|instant|gemma|phi-?\d|[-_:/ ](0\.5|1|1\.5|2|3|4|7|8|9|11)b\b|-free\b|:free\b|llama-?3\.[12]|8x7b)/i;
 const model=()=>{try{const p=actProv();return(p&&p.model)||''}catch(e){return''}};
 const weak=()=>{const h=help();return h==='on'||(h==='auto'&&WEAK.test(model()))};
 /* Правила для всех моделей. */
 function core(){
  return "\n\nLanguage and quality rules (very important). "
   +"Write ONLY in the language of the user's latest message. Never use Chinese, Japanese or Korean characters (hanzi, kanji, kana, hangul) unless the user wrote in that language or asked for a translation into it. "
   +"Never mix two languages inside one sentence, list item or table cell. Do not insert random foreign words or symbols. If you do not know something, say so in one short sentence instead of guessing.\n"
   +"Tables: use a Markdown table only to compare 2 or more items. Exactly this shape (header row, then a |---|---|---| separator row, then data rows):\n\n"
   +"| Name | Price | Note |\n|---|---|---|\n| Item A | 10 | short text |\n| Item B | 20 | short text |\n\n"
   +"Table rules: a blank line before the table; each row is ONE line; every row has the same number of cells; at most 5 columns; no line breaks inside a cell; short plain text in cells; never put a table inside a code block or a list item."}
 /* Простой режим для слабых моделей. */
 function simple(){
  return "\nSimple mode (you may be a small model, so be extra careful): "
   +"1) Start with the answer in one short sentence. 2) Use short plain sentences, one idea each. 3) For instructions use a numbered list, one action per step. "
   +"4) Do not repeat the question, do not apologize, do not add disclaimers or filler. 5) If the question is unclear, ask ONE short clarifying question instead of guessing. "
   +"6) Never invent links, numbers, quotes, names or sources. 7) For math, calculate step by step and re-check the final number. "
   +"8) Finish every answer completely, never stop in the middle of a sentence. 9) If a task needs many steps, do the first step and offer to continue."}
 const prompt=()=>core()+(weak()?simple():'');
 /* В начале ответа решаем, допустимы ли иероглифы: пользователь пишет на этих языках или просит о них. */
 function watch(msgs){
  ok=!cjkOff();if(ok)return;
  let last='';for(let i=msgs.length-1;i>=0;i--){const x=msgs[i];if(x&&x.r==='u'){last=String(x.q||x.t||'');break}}
  ok=CJK.test(last)||ASK.test(last)}
 const filter=t=>{
  if(ok||!CJK.test(t))return t;
  return t.replace(CJKG,'').replace(/[ \t]{2,}/g,' ')};
 /* ---- строки в Настройках ---- */
 const LBL={auto:'Авто',on:'Вкл',off:'Выкл'};
 Hooks.on('settings:rendered',v=>{
  const ab=$('[data-go="about"]',v);if(!ab||$('[data-qh]',v))return;
  const r1=el('<button class="sr" data-qh><span class="si c">'+ic('tpl')+'</span><span class="m"><b></b><small></small></span><span class="qv"></span></button>');
  $('b',r1).textContent=L('Подсказки для слабых моделей');$('small',r1).textContent=L('Простые правила для небольших моделей: короткие фразы, шаги, ровные таблицы');
  const q=$('.qv',r1),draw=()=>{q.textContent=L(LBL[help()]||'Авто')};draw();
  r1.onclick=()=>{const n={auto:'on',on:'off',off:'auto'}[help()]||'on';set(KH,n);draw();toast(L(LBL[n]))};
  const r2=el('<button class="sr" data-qc><span class="si c">'+ic('edit')+'</span><span class="m"><b></b><small></small></span><span class="sw"></span></button>');
  $('b',r2).textContent=L('Убирать иероглифы');$('small',r2).textContent=L('Если вы пишете не на китайском, лишние иероглифы из ответа удаляются');
  const sw=$('.sw',r2),d2=()=>sw.classList.toggle('on',cjkOff());d2();
  r2.onclick=()=>{set(KC,cjkOff()?'0':'1');d2()};
  ab.insertAdjacentElement('beforebegin',r1);ab.insertAdjacentElement('beforebegin',r2)});
 return{prompt,filter,watch,weak,core,simple,get allowCjk(){return ok}}})();
function qualityPrompt(){try{return Quality.prompt()}catch(e){return''}}
