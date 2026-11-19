"""Тест 0.37.0: поиск по большим файлам (RAG), обновление из приложения, кнопка «Отправить ошибку ИИ на разбор» в терминале.
Запуск: python3 -I docs/tests/tools037.test.py   (Chromium, Kotlin не запускается)"""
import os
from playwright.sync_api import sync_playwright
UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
OK = 0; BAD = []
def check(n, c, i=''):
    global OK
    if c: OK += 1; print('ok  ', n)
    else: BAD.append(n); print('FAIL', n, i)
INIT = r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'m',url:'https://api.groq.com/openai/v1',ok:true}],s:[]}));
 localStorage.setItem('kact','p1');
 window.__sent=[];
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',setOrientation(){},
  chat(id,prov,msgs){window.__sent.push(JSON.parse(msgs));setTimeout(()=>{KairemaNative.chunk(id,'ok');KairemaNative.done(id,null)},10)},
  shell(id,cmd,to){setTimeout(()=>{KairemaNative.chunk(id,cmd.indexOf('good')>=0?'fine\n\u0001exit:0':'ls: cannot access /nope: No such file or directory\n\u0001exit:2');KairemaNative.done(id,null)},10)}};
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_default_timeout(10000)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());S.apiMsgs.length=0;show('api')"); pg.wait_for_timeout(700)

    # ===== RAG =====
    pg.evaluate("""window.__big=(()=>{let s='';for(let i=0;i<260;i++){s+='Раздел '+i+'. Это обычный абзац про погоду, дороги и разные мелочи номер '+i+'. '.repeat(1)+'Ещё немного текста для объёма, чтобы файл стал большим и длинным. '.repeat(6)+'\\n\\n';if(i===137)s+='Секретный код хранилища: ЗЕНИТ-4417, его знает только директор.\\n\\n';if(i===201)s+='Гарантия на оборудование составляет двадцать четыре месяца с даты поставки.\\n\\n'}return s})()""")
    n = pg.evaluate("__big.length")
    check('тестовый файл большой (> 100 тыс. знаков)', n > 100000, n)
    ch = pg.evaluate("Rag.chunk(__big)")
    check('нарезка: куски не длиннее ~2000 знаков, их много', len(ch) > 80 and max(len(c) for c in ch) < 2100, (len(ch), max(len(c) for c in ch)))
    check('в нарезке ничего не потеряно (нужная фраза цела)', any('ЗЕНИТ-4417' in c for c in ch))
    top = pg.evaluate("(()=>{const c=Rag.chunk(__big);return Rag.rank(c,'Какой секретный код хранилища?',3).map(i=>c[i].includes('ЗЕНИТ-4417'))})()")
    check('поиск: нужный кусок на первом месте', top and top[0] is True, top)
    top = pg.evaluate("(()=>{const c=Rag.chunk(__big);return Rag.rank(c,'сроки гарантии оборудования',3).map(i=>c[i].includes('двадцать четыре месяца'))})()")
    check('поиск с другими окончаниями слов («гарантии» → «Гарантия»)', top and top[0] is True, top)
    check('вопрос без слов из файла: ничего не находится', pg.evaluate("Rag.rank(Rag.chunk(__big),'qwertyuiop zzzxxx',3).length") == 0)
    r = pg.evaluate("""(async()=>{
      const f=new File([__big],'book.txt',{type:'text/plain'});
      const parts=await readFiles([f],false);const p=parts[0];
      S.apiMsgs.length=0;const m={r:'u',q:'Какой секретный код хранилища?',t:'book.txt\\nКакой секретный код хранилища?',parts};S.apiMsgs.push(m);
      const sys=sysExtra(S.apiMsgs);const c=toContent(m,false,'');
      return{rag:!!p.rag,ptext:p.text.length,sys:sys.length,hasCode:sys.includes('ЗЕНИТ-4417'),cLen:(typeof c==='string'?c:c.map(x=>x.text||'').join('')).length,parts:(sys.match(/\\[\\d+\\/\\d+\\]/g)||[]).length}})()""")
    check('большой файл заменён короткой заметкой', r['rag'] and r['ptext'] < 1500, r)
    check('в запрос идут только нужные куски (мало знаков), код найден', r['hasCode'] and r['sys'] < 12000 and 1 <= r['parts'] <= 7, r)
    check('история с файлом остаётся короткой (не весь файл)', r['cLen'] < 3000, r)
    pg.evaluate("localStorage.setItem('kragoff','1')")
    r = pg.evaluate("(async()=>{const f=new File([__big],'b2.txt',{type:'text/plain'});const p=(await readFiles([f],false))[0];return{rag:!!p.rag,len:p.text.length}})()")
    check('поиск выключен в настройках: файл идёт как раньше, целиком', not r['rag'] and r['len'] == n, r)
    pg.evaluate("localStorage.removeItem('kragoff')")
    pg.evaluate("show('set')"); pg.wait_for_timeout(900)
    check('настройки: строка «Поиск по большим файлам»', pg.locator('[data-rag]').count() == 1)
    check('настройки: строка «Сохранённые большие файлы» с очисткой', pg.locator('[data-ragc]').count() == 1)

    # ===== Обновление =====
    r = pg.evaluate("[Updater.cmp('v0.38.0','0.37.0'),Updater.cmp('0.37.0','0.37.0'),Updater.cmp('v0.36.9','0.37.0'),Updater.cmp('v1.0.0','0.99.9'),Updater.cmp('x','0.1.0')]")
    check('сравнение версий', r == [1, 0, -1, 1, 0], r)
    check('настройки: строка «Обновление»', pg.locator('[data-upd]').count() == 1)
    def mock(js): pg.evaluate("Native.on=true;" + js + ";0")
    pg.evaluate("window.__calls=[];window.__orun=Native.run;0")
    mock("""Native.run=(fn,args,cb)=>{window.__calls.push([fn,args]);const p=new Promise((res)=>{setTimeout(()=>{
       if(fn==='updCheck'){cb(JSON.stringify({tag:'v9.9.9',name:'n',body:'Новое: поиск по файлам',page:'https://github.com/x',url:'https://github.com/2gg4gg2-ship-it/kairema-app/releases/download/v9.9.9/k.apk',size:20971520}))}
       else{cb('p:5242880/20971520');cb('p:20971520/20971520');cb(window.__perm?'perm':'ok')}res()},40)});p.id=1;return p}""")
    pg.evaluate("document.querySelector('[data-upd]').click()"); pg.wait_for_timeout(500)
    t = pg.evaluate("document.querySelector('.upd-t').textContent")
    check('есть новая версия: показано «Доступна версия 9.9.9», размер 20 MB', 'Доступна версия 9.9.9' in t and '20.0 MB' in t, t)
    check('описание релиза показано', 'поиск по файлам' in pg.evaluate("document.querySelector('.upd-n').textContent") and pg.evaluate("!document.querySelector('.upd-n').hidden"))
    check('кнопка «Скачать и установить» видна', pg.evaluate("!document.querySelector('.sheet [data-o]').hidden"))
    pg.evaluate("document.querySelector('.sheet [data-o]').click()"); pg.wait_for_timeout(400)
    t = pg.evaluate("document.querySelector('.upd-t').textContent")
    c = pg.evaluate("window.__calls.filter(x=>x[0]==='updInstall')")
    check('установка: вызван updInstall с репозиторием и адресом APK', len(c) == 1 and c[0][1][0] == '2gg4gg2-ship-it/kairema-app' and c[0][1][1].endswith('k.apk'), c)
    check('после скачивания: «Откроется окно установки Android»', 'окно установки' in t, t)
    pg.evaluate("document.querySelector('.sheet [data-c]').click()"); pg.wait_for_timeout(400)
    pg.evaluate("window.__perm=1;document.querySelector('[data-upd]').click()"); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('.sheet [data-o]').click()"); pg.wait_for_timeout(400)
    t = pg.evaluate("document.querySelector('.upd-t').textContent")
    check('нет разрешения на установку: понятная подсказка', 'Разрешите установку' in t, t)
    pg.evaluate("document.querySelector('.sheet [data-c]').click()"); pg.wait_for_timeout(400)
    mock("Native.run=(fn,args,cb)=>{const p=new Promise(res=>setTimeout(()=>{cb(JSON.stringify({tag:'v0.0.1',url:'',size:0}));res()},30));p.id=2;return p}")
    pg.evaluate("document.querySelector('[data-upd]').click()"); pg.wait_for_timeout(500)
    check('версия не новее: «У вас последняя версия»', 'последняя версия' in pg.evaluate("document.querySelector('.upd-t').textContent"))
    pg.evaluate("document.querySelector('.sheet [data-c]').click()"); pg.wait_for_timeout(400)
    mock("Native.run=(fn,args,cb)=>{const p=new Promise(res=>setTimeout(()=>{cb(JSON.stringify({none:true}));res()},30));p.id=3;return p}")
    pg.evaluate("document.querySelector('[data-upd]').click()"); pg.wait_for_timeout(500)
    check('релизов нет: понятное сообщение', 'Релизов на GitHub пока нет' in pg.evaluate("document.querySelector('.upd-t').textContent"))
    pg.evaluate("document.querySelector('.sheet [data-c]').click()"); pg.wait_for_timeout(400)
    mock("Native.run=(fn,args,cb)=>{const p=new Promise((res,rej)=>setTimeout(()=>rej(new Error('нет соединения')),30));p.id=4;return p}")
    pg.evaluate("document.querySelector('[data-upd]').click()"); pg.wait_for_timeout(500)
    check('нет сети: «Не удалось проверить»', 'Не удалось проверить' in pg.evaluate("document.querySelector('.upd-t').textContent"))
    pg.evaluate("document.querySelector('.sheet [data-c]').click()")

    # ===== Терминал: ошибка → ИИ =====
    pg.evaluate("Native.run=window.__orun;Native.on=true;S.apiMsgs.length=0;show('term');0"); pg.wait_for_timeout(700)
    pg.evaluate("Term.activate()"); pg.wait_for_timeout(300)
    check('до команд кнопки «ошибку ИИ» нет', pg.evaluate("document.querySelector('[data-fix]').hidden"))
    pg.fill('.tin input', 'ls /nope'); pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    check('команда упала (код 2): кнопка «Отправить ошибку ИИ на разбор» видна', pg.evaluate("!document.querySelector('[data-fix]').hidden"))
    pg.fill('.tin input', 'echo good'); pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    check('следующая команда прошла: кнопка исчезла', pg.evaluate("document.querySelector('[data-fix]').hidden"))
    pg.fill('.tin input', 'ls /nope'); pg.keyboard.press('Enter'); pg.wait_for_timeout(700)
    pg.evaluate("window.__sent.length=0;document.querySelector('[data-fix]').click()"); pg.wait_for_timeout(1500)
    s = pg.evaluate("window.__sent")
    txt = pg.evaluate("JSON.stringify(window.__sent[0]||[])")
    check('открыт чат и ошибка отправлена модели вместе с командой и кодом выхода', len(s) == 1 and 'ls /nope' in txt and 'exit code: 2' in txt and 'No such file' in txt, txt[:300])
    check('ошибок страницы нет', not errs, errs)
    b.close()
print('пройдено', OK, 'провалено', len(BAD), BAD)
