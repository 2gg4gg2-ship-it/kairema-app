"""Тесты 0.21.0 (роли и «/», сжатие контекста, ветвление, диффы и откат)  [на базе стенда 0.20.0]
Тесты 0.20.0 (Playwright, Chromium, мосты подменены): возможности модели, токен моста, клавиатура, «Поделиться», бэкап.
Запуск: python3 docs/tests/ui020.test.py   (нужен пакет playwright и установленный Chromium)
Не проверяет настоящий Android: Kotlin (SystemBridge, Guard, Inbox) здесь не запускается."""
import json, os, sys
from playwright.sync_api import sync_playwright

UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
OUT = os.environ.get('SHOTS', '/tmp')
TOKEN = 'TKN123'
LIST = [
    {'id': 'cohere/north-mini-code:free', 'name': 'North Mini Code', 'free': True, 'img': False, 'think': False, 'vis': False},
    {'id': 'google/gemini-2.5-flash-image', 'name': 'Gemini Image', 'free': False, 'img': True, 'think': False, 'vis': True},
    {'id': 'deepseek/deepseek-r1', 'name': 'R1', 'free': False, 'img': False, 'think': True, 'vis': False},
]
INIT = r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'OpenRouter',model:'cohere/north-mini-code:free',url:'https://openrouter.ai/api/v1',ok:true}],s:[{id:'s1',name:'Tavily',url:'https://tavily.com',ok:true}]}));
 localStorage.setItem('kact','p1');
 window.__calls = []; window.__denied = 0; const TOKEN = '@TOKEN@'; const LIST = @LIST@;
 const guard = (fn) => function(tok, ...a){ if (tok !== TOKEN) { window.__denied++; return fn.__deny ? fn.__deny(a) : undefined } return fn(...a) };
 const B = {
  hasKey: () => true, cancel(){}, copyText: () => true, shareFile: (n,m,c) => { window.__shared = {n,m,len:c.length}; return true },
  saveFile: (n,m,c) => { window.__saved = {n,m,len:c.length}; return true },
  saveKey: guard(() => {}), deleteKey: guard(() => {}), termuxRequestPermission: guard(() => {}),
  termuxStatus: (tok) => tok === TOKEN ? '{"installed":false,"permission":false}' : '{}',
  models: (tok, id, prov) => { if (tok !== TOKEN) { window.__denied++; setTimeout(()=>KairemaNative.done(id,'отказано'),0); return }
     window.__calls.push('models'); setTimeout(()=>{KairemaNative.chunk(id, JSON.stringify(LIST)); KairemaNative.done(id, null)},5) },
  chat: (tok, id, prov, msgs) => { const P = JSON.parse(prov); window.__sys = P.system; window.__hist = JSON.parse(msgs); window.__calls.push('chat');
     const sum = /summaries of chat/.test(P.system); window.__n = (window.__n||0)+1;
     setTimeout(()=>{KairemaNative.chunk(id, sum ? 'КРАТКИЙ ПЕРЕСКАЗ' : 'ответ'+window.__n); KairemaNative.done(id,null)},5) },
  shell: (tok, id, cmd, to) => { let out='';
     const FS = (window.__fs = window.__fs || {});
     if (cmd.includes('@@F')) { const re=/f='((?:[^']|'\\'')*)'/g; let m; while((m=re.exec(cmd))){ const p=m[1]; if (p in FS) out += '@@F\n'+btoa(unescape(encodeURIComponent(FS[p])))+'\n'; else out += '@@NO\n' } }
     else { let m; const w=/echo\s+'([^']*)'\s*>\s*'?([^'\s]+)'?/.exec(cmd); if (w) FS[w[2]] = w[1]+'\n';
       const r=/printf %s '([^']*)' \| base64 -d (>>?) '([^']+)'/.exec(cmd); if (r) { const t=decodeURIComponent(escape(atob(r[1]))); FS[r[3]] = r[2]==='>>' ? (FS[r[3]]||'')+t : t }
       const d=/rm -f '([^']+)'/.exec(cmd); if (d) delete FS[d[1]] }
     setTimeout(()=>{KairemaNative.chunk(id, out+'\n\u0001exit:0'); KairemaNative.done(id,null)},5) },
  inboxTake: (tok) => tok === TOKEN ? (window.__inbox || '') : '',
 };
 window.KairemaBridge = B;
 window.KairemaSysBridge = { dark: () => true, bars(){} };
}
""".replace("@TOKEN@", TOKEN).replace("@LIST@", json.dumps(LIST))

fails = []
def check(name, cond, extra=''):
    print(('ok   ' if cond else 'FAIL ') + name + ((' :: ' + str(extra)) if (extra and not cond) else ''))
    if not cond: fails.append(name)

with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 360, 'height': 780})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.add_init_script(INIT)
    pg.goto('file://' + UI)
    pg.wait_for_timeout(6200)
    pg.evaluate("KairemaNative.tok('%s')" % TOKEN)
    pg.evaluate("Chx.load(); Chx.open(Chx.fresh()); show('api')")
    pg.wait_for_timeout(400)

    # --- роли и «/» ---
    ta = "document.querySelector('#v-api textarea')"
    pg.fill('#v-api textarea', '/')
    pg.wait_for_timeout(300)
    n = pg.evaluate("document.querySelectorAll('.slc .sl-i').length")
    check('«/»: появился список команд (до 6)', 1 <= n <= 6, n)
    pg.fill('#v-api textarea', '/trans')
    pg.wait_for_timeout(200)
    check('«/trans»: найден переводчик', pg.evaluate("[...document.querySelectorAll('.slc .sl-c')].map(x=>x.textContent).join()") == '/translate')
    pg.click('.slc .sl-i')
    pg.wait_for_timeout(300)
    check('роль выбрана: плашка над полем ввода', pg.evaluate("!!document.querySelector('.rlc')"))
    check('роль выбрана: поле ввода очищено, список закрыт', pg.evaluate("%s.value===''&&!document.querySelector('.slc')" % ta))
    pg.fill('#v-api textarea', 'Привет')
    pg.evaluate("document.querySelector('#v-api .send').click()")
    pg.wait_for_timeout(600)
    check('роль уходит в системную инструкцию', 'translator' in (pg.evaluate("window.__sys") or ''))
    pg.evaluate("document.querySelector('.rl-x').click()")
    pg.fill('#v-api textarea', 'Ещё')
    pg.evaluate("document.querySelector('#v-api .send').click()")
    pg.wait_for_timeout(600)
    check('роль снята: инструкции переводчика нет', 'translator' not in (pg.evaluate("window.__sys") or ''))
    pg.fill('#v-api textarea', '/fix')
    pg.wait_for_timeout(200)
    pg.click('.slc .sl-i')
    pg.wait_for_timeout(200)
    check('шаблон вставляет текст в поле ввода', 'ошибки' in pg.evaluate("%s.value" % ta))
    pg.fill('#v-api textarea', '')

    # --- ветвление ---
    check('ветвление: у последнего ответа кнопка ↻', pg.evaluate("!!document.querySelector('.bn [data-r]')"))
    before = pg.evaluate("S.apiMsgs[S.apiMsgs.length-1].t")
    pg.evaluate("document.querySelector('.bn [data-r]').click()")
    pg.wait_for_timeout(900)
    m = pg.evaluate("(()=>{const m=S.apiMsgs[S.apiMsgs.length-1];return {t:m.t,vi:m.x&&m.x.vi,n:m.x&&m.x.vs.length,cnt:S.apiMsgs.length}})()")
    check('ветвление: получен второй вариант', m['n'] == 2 and m['vi'] == 1 and m['t'] != before, m)
    check('ветвление: сообщений не прибавилось', m['cnt'] == 4, m)
    check('ветвление: показано 2/2', pg.evaluate("document.querySelector('.bn .bc').textContent") == '2/2')
    pg.evaluate("document.querySelector('.bn [data-p]').click()")
    pg.wait_for_timeout(300)
    check('ветвление: ‹ возвращает первый вариант', pg.evaluate("S.apiMsgs[S.apiMsgs.length-1].t") == before and pg.evaluate("document.querySelector('.bn .bc').textContent") == '1/2')
    # сохранение и чтение
    pg.evaluate("Chx.save(Chx.cur)")
    ser = pg.evaluate("JSON.stringify(Chx.ser(S.apiMsgs[S.apiMsgs.length-1],true))")
    back = pg.evaluate("(s=>{const m=Chx.hyd(JSON.parse(s));return {n:m.x&&m.x.vs.length,vi:m.x&&m.x.vi}})(%s)" % json.dumps(ser))
    check('ветвление: варианты переживают сохранение', back['n'] == 2 and back['vi'] == 0, back)

    # --- сжатие контекста ---
    pg.evaluate("""(()=>{const ms=S.apiMsgs;for(let i=0;i<4;i++){ms.push({r:'u',q:'вопрос'+i,t:'вопрос'+i},{r:'a',t:'ответ'+i})}})()""")
    n0 = pg.evaluate("S.apiMsgs.length")
    check('сжатие: есть что сжимать', pg.evaluate("Ctx.cut(S.apiMsgs)") > 0)
    pg.evaluate("Ctx.run()")
    pg.wait_for_timeout(900)
    mk = pg.evaluate("S.apiMsgs.findIndex(m=>m.x&&m.x.cx)")
    check('сжатие: пометка поставлена, чат на месте', mk >= 0 and pg.evaluate("S.apiMsgs.length") == n0, mk)
    v = pg.evaluate("Ctx.view(S.apiMsgs).map(m=>m.t)")
    check('сжатие: модели уходит пересказ вместо старой части', v[0].endswith('КРАТКИЙ ПЕРЕСКАЗ') and len(v) < n0, (len(v), n0))
    check('сжатие: хвост с последними вопросами сохранён', v[-1] == 'ответ3' and 'вопрос3' in v)
    pg.fill('#v-api textarea', 'после сжатия')
    pg.evaluate("document.querySelector('#v-api .send').click()")
    pg.wait_for_timeout(600)
    h = pg.evaluate("window.__hist.map(x=>x.content)")
    check('сжатие: в запросе пересказ, а не вся история', any('КРАТКИЙ ПЕРЕСКАЗ' in str(x) for x in h) and len(h) < 12, len(h))
    check('сжатие: пометка видна в чате', pg.evaluate("!!document.querySelector('.cxm')"))

    # --- диффы и откат ---
    t = pg.evaluate("FileDiff.targets(\"echo 'x' > a.txt && sed -i 's/a/b/' b.txt; rm c.txt; cat d.txt > $HOME/e\")")
    check('цели команды найдены (без $ и подстановок)', t == ['a.txt', 'b.txt', 'c.txt'], t)
    check('heredoc не даёт ложных файлов', pg.evaluate("FileDiff.targets(\"cat > f.py <<'EOF'\\nx = a > b\\nEOF\")") == ['f.py'])
    d = pg.evaluate("FileDiff.diff('a\\nb\\nc','a\\nB\\nc').filter(l=>l[0]!==' ').map(l=>l.join(''))")
    check('дифф: -b и +B', d == ['-b', '+B'], d)
    pg.evaluate("window.__fs={'/w/a.txt':'старое\\n'}")
    r = pg.evaluate("""(async()=>{const r=await Term.exec("echo 'новое' > '/w/a.txt'");return {fd:!!r.fd,files:r.fd&&r.fd.files.map(f=>[f.p,f.b,f.a])}})()""")
    check('запуск: изменение замечено', r['fd'] and r['files'] == [['/w/a.txt', 'старое\n', 'новое\n']], r)
    r = pg.evaluate("""(async()=>{const r=await Term.exec("echo 'нов' > '/w/new.txt'");return r.fd&&r.fd.files.map(f=>[f.p,f.b])})()""")
    check('создание нового файла: before=null', r == [['/w/new.txt', None]], r)
    pg.evaluate("FileDiff.show(FileDiff.hist()[0])")
    pg.wait_for_timeout(400)
    check('окно диффа показывает красное и зелёное', pg.evaluate("!!document.querySelector('.fd-l.add')&&!!document.querySelector('.fd-l.del')"))
    pg.screenshot(path=OUT + '/021_diff.png')
    pg.evaluate("document.querySelectorAll('.sheet-bg').forEach(x=>x.close&&x.close())")
    pg.wait_for_timeout(500)
    pg.evaluate("FileDiff.rollback(FileDiff.hist()[0],null)")
    pg.wait_for_timeout(400)
    pg.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Откатить').click()")
    pg.wait_for_timeout(800)
    check('откат: файл вернулся к старому', pg.evaluate("window.__fs['/w/a.txt']") == 'старое\n', pg.evaluate("window.__fs"))
    pg.evaluate("FileDiff.rollback(FileDiff.hist()[1],null)")
    pg.wait_for_timeout(400)
    pg.evaluate("[...document.querySelectorAll('button')].find(b=>b.textContent==='Откатить').click()")
    pg.wait_for_timeout(800)
    check('откат: созданный файл удалён', '/w/new.txt' not in pg.evaluate("window.__fs"))
    check('обычная команда без файлов проходит как раньше', pg.evaluate("(async()=>{const r=await Term.exec('ls');return r.code===0&&!r.fd})()"))

    # --- озвучка: язык по тексту ---
    langs = pg.evaluate("['Привет, как дела','Привіт, як справи. Їжак','Hello there my friend','你好，今天天气很好','こんにちは、テストです','안녕하세요 테스트','Das ist Straße'].map(t=>Tts.lang(t))")
    check('озвучка: язык по тексту ответа', langs == ['ru-RU','uk-UA','en-US','zh-CN','ja-JP','ko-KR','de-DE'], langs)

    # --- источники компактно ---
    pg.evaluate("(()=>{const d=document.createElement('div');mdRender(d,'текст',{src:[{title:'Сайт А',url:'https://a.example/x'},{title:'Сайт Б',url:'https://b.example/y'}]});document.body.append(d);d.id='srcT'})()")
    sm = pg.evaluate("(()=>{const s=document.querySelector('#srcT details.srcs');return s?{open:s.open,t:s.querySelector('summary').textContent,n:s.querySelectorAll('.srcl a').length}:null})()")
    check('источники: свёрнутая кнопка «Источники · 2» со списком внутри', sm and not sm['open'] and sm['t'].endswith('· 2') and sm['n'] == 2, sm)

    # --- /compact: набранная команда выполняется, есть окно со статусом ---
    pg.evaluate("document.querySelectorAll('.sheet-bg').forEach(x=>x.close&&x.close())")
    pg.evaluate("show('api')")
    pg.wait_for_timeout(500)
    pg.fill('#v-api textarea', '/compact')
    n_before = pg.evaluate("S.apiMsgs.length")
    pg.evaluate("document.querySelector('#v-api .send').click()")
    pg.wait_for_timeout(500)
    check('/compact + отправить: окно со статусом, в модель ничего не ушло', pg.evaluate("!!document.querySelector('.sheet-bg .cx-t')") and pg.evaluate("S.apiMsgs.length") == n_before)
    pg.screenshot(path=OUT + '/022_compact.png')

    # --- настройки и экран ---
    pg.evaluate("show('set')")
    pg.wait_for_timeout(500)
    check('настройки: строки «Роли и команды» и «Изменения файлов агента»', pg.evaluate("!!document.querySelector('[data-roles]')&&!!document.querySelector('[data-fd]')"))
    pg.evaluate("document.querySelector('[data-roles]').click()")
    pg.wait_for_timeout(500)
    check('экран «Роли и команды» открывается', pg.evaluate("!!document.querySelector('[data-screen=roles]')"))
    pg.screenshot(path=OUT + '/021_roles.png')

    check('ошибок страницы нет', not errs, errs[:3])
    b.close()

print('\nПровалов: %d' % len(fails))
sys.exit(1 if fails else 0)
