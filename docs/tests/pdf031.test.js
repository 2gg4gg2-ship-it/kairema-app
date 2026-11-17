/* Тест чтения PDF (features/pdf/pdf.js) на настоящих файлах из docs/tests/fixtures.
   Запуск: node docs/tests/pdf031.test.js (нужен Node 18+, там есть DecompressionStream). */
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const src=fs.readFileSync(path.join(__dirname,'../../app/src/main/assets/ui/features/pdf/pdf.js'),'utf8');
const ctx={i18nAdd(){},TextDecoder,DecompressionStream,Uint8Array,String,Math,JSON,Object,Array,Number,parseFloat,parseInt,RegExp,Map,Promise,console,Blob};
vm.createContext(ctx);vm.runInContext(src+';this.Pdf=Pdf',ctx);
const ab=n=>{const b=fs.readFileSync(path.join(__dirname,'fixtures',n));return b.buffer.slice(b.byteOffset,b.byteOffset+b.length)};
let ok=0;const t=async(name,fn)=>{try{await fn();ok++;console.log('ok  ',name)}catch(e){console.log('FAIL',name,e.message);process.exitCode=1}};
(async()=>{
 await t('Chrome: русский, английский, украинский, китайский, слова без лишних пробелов',async()=>{
  const r=await ctx.Pdf.extract(ab('chrome.pdf'));
  assert(r.text.includes('Отчёт по продажам'),r.text);assert(r.text.includes('Выручка за квартал выросла на 12%'));
  assert(r.text.includes('Revenue grew by 12 percent'));assert(r.text.includes('Їжак та ґанок'));assert(r.text.includes('中文测试'));assert(r.text.includes('Февраль'))});
 await t('ReportLab (ASCII85+Flate, шрифты TrueType): 2 страницы, кириллица, скобки',async()=>{
  const r=await ctx.Pdf.extract(ab('rl.pdf'));assert.equal(r.pages,2);
  assert(r.text.includes('Hello world. Invoice 12345 total 99.50 USD'));assert(r.text.includes('Second line (with parens) and \\ backslash'));
  assert(r.text.includes('Привет, мир! Это тест на русском языке.'));assert(r.text.includes('Привіт, світе! Їжак, є, ґанок.'));assert(r.text.includes('[Страница 2]\nPage two text here'))});
 await t('PDF с потоками объектов (ObjStm)',async()=>{
  const r=await ctx.Pdf.extract(ab('rl_objstm.pdf'));assert(r.text.includes('Привет, мир!')&&r.text.includes('Page two text here'))});
 await t('LibreOffice: текст из txt',async()=>{
  const r=await ctx.Pdf.extract(ab('doc.pdf'));assert(r.text.includes('Первый абзац на русском языке. Second paragraph in English.'))});
 await t('скан без текста: chars=0 (приложение пошлёт картинки страниц)',async()=>{
  const r=await ctx.Pdf.extract(ab('scan.pdf'));assert.equal(r.chars,0);assert.equal(r.pages,1)});
 await t('PDF с шифрованием: распознан, текст не выдумывается',async()=>{
  const r=await ctx.Pdf.extract(ab('enc.pdf'));assert.equal(r.chars,0);assert.equal(r.enc,true)});
 await t('мусор вместо PDF не роняет разбор',async()=>{
  const r=await ctx.Pdf.extract(new TextEncoder().encode('not a pdf at all').buffer);assert.equal(r.chars,0)});
 console.log(ok+' ok')})();
