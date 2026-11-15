"""Тесты 0.20.0 (Playwright, Chromium, мосты подменены): возможности модели, токен моста, клавиатура, «Поделиться», бэкап.
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
INIT = """
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'OpenRouter',model:'cohere/north-mini-code:free',url:'https://openrouter.ai/api/v1',ok:true}],s:[{id:'s1',name:'Tavily',url:'https://tavily.com',ok:true}]}));
 localStorage.setItem('kact','p1');
 window.__calls = []; window.__denied = 0; const TOKEN = '%s'; const LIST = %s;
 const guard = (fn) => function(tok, ...a){ if (tok !== TOKEN) { window.__denied++; return fn.__deny ? fn.__deny(a) : undefined } return fn(...a) };
 const B = {
  hasKey: () => true, cancel(){}, copyText: () => true, shareFile: (n,m,c) => { window.__shared = {n,m,len:c.length}; return true },
  saveFile: (n,m,c) => { window.__saved = {n,m,len:c.length}; return true },
  saveKey: guard(() => {}), deleteKey: guard(() => {}), termuxRequestPermission: guard(() => {}),
  termuxStatus: (tok) => tok === TOKEN ? '{"installed":false,"permission":false}' : '{}',
  models: (tok, id, prov) => { if (tok !== TOKEN) { window.__denied++; setTimeout(()=>KairemaNative.done(id,'отказано'),0); return }
     window.__calls.push('models'); setTimeout(()=>{KairemaNative.chunk(id, JSON.stringify(LIST)); KairemaNative.done(id, null)},5) },
  chat: (tok, id, prov, msgs) => { if (tok !== TOKEN) { window.__denied++; setTimeout(()=>KairemaNative.done(id,'отказано'),0); return }
     window.__calls.push('chat:' + JSON.parse(prov).think); setTimeout(()=>{KairemaNative.chunk(id,'ok'); KairemaNative.done(id,null)},5) },
  inboxTake: (tok) => tok === TOKEN ? (window.__inbox || '') : '',
 };
 window.KairemaBridge = B;
 window.KairemaSysBridge = { dark: () => true, bars(){} };
}
""" % (TOKEN, json.dumps(LIST))

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

    # --- токен моста ---
    pg.evaluate("KairemaNative.tok('%s')" % TOKEN)
    r = pg.evaluate("""async () => { let raw=''; await Native.run('models',[JSON.stringify({id:'p1',url:'x'})],t=>{raw+=t}); return JSON.parse(raw).length }""")
    check('Native.run добавляет токен (models)', r == 3, r)
    # прямой вызов без токена (как из iframe) отклоняется
    pg.evaluate("window.__denied=0")
    r = pg.evaluate("""async () => { try { await new Promise((res,rej)=>{ window.KairemaNative.done; KairemaBridge.chat('r99','{}','[]'); setTimeout(res,50) }); } catch(e){} return window.__denied }""")
    check('вызов без токена отклонён', r == 1, r)
    # повторная установка токена не подменяет его
    pg.evaluate("KairemaNative.tok('EVIL')")
    r = pg.evaluate("""async () => { let raw=''; await Native.run('models',[JSON.stringify({id:'p1',url:'x'})],t=>{raw+=t}); return JSON.parse(raw).length }""")
    check('второй токен игнорируется', r == 3, r)
    check('Native.sync с токеном (termuxStatus)', pg.evaluate("JSON.parse(Native.sync('termuxStatus')).installed===false"))

    # --- возможности модели ---
    pg.evaluate("Caps.learn('p1', %s)" % json.dumps(LIST))
    def menu():
        pg.evaluate("Tools.open({pick(){},tpl(){}})")
        pg.wait_for_timeout(300)
        rows = pg.evaluate("[...document.querySelectorAll('.tl-row')].map(r=>[r.querySelector('b').textContent,(r.querySelector('small')||{}).textContent||''])")
        pg.evaluate("document.querySelectorAll('.sheet-bg').forEach(x=>x.close&&x.close())")
        pg.wait_for_timeout(500)
        return rows
    rows = menu(); names = [r[0] for r in rows]
    check('cohere (текстовая): нет «Создать изображение»', 'Создать изображение' not in names, names)
    check('cohere: «Думать» и «Быстрый ответ» остаются', 'Думать' in names and 'Быстрый ответ' in names, names)
    sub = dict(rows).get('Думать', '')
    check('cohere: подпись «Думать» честно говорит, что сама не размышляет', 'не размышляет' in sub, sub)
    pg.evaluate("S.providers[0].model='google/gemini-2.5-flash-image'")
    names = [r[0] for r in menu()]
    check('модель с картинками: «Создать изображение» появилась', 'Создать изображение' in names, names)
    pg.evaluate("S.providers[0].model='deepseek/deepseek-r1'")
    rows = menu(); names = [r[0] for r in rows]
    check('R1: нет картинок', 'Создать изображение' not in names, names)
    check('R1: подпись про настоящее размышление', 'Thinking' in dict(rows).get('Думать', ''), rows)
    # параметр запроса
    pg.evaluate("Tools.setThink('think')")
    check('R1: think=1 уходит провайдеру', pg.evaluate("Tools.think()") == 1)
    pg.evaluate("S.providers[0].model='cohere/north-mini-code:free'")
    check('cohere: think=0 (параметр reasoning не шлём), режим работает через инструкцию', pg.evaluate("Tools.think()") == 0 and 'step by step' in pg.evaluate("Tools.sysx(null)"))
    pg.evaluate("Tools.setThink('auto')")
    # режим «изображение» сбрасывается, если модель его не умеет
    pg.evaluate("S.providers[0].model='google/gemini-2.5-flash-image'; Tools.set('image')")
    check('режим «изображение» включён у модели с картинками', pg.evaluate("Tools.mode") == 'image')
    pg.evaluate("S.providers[0].model='cohere/north-mini-code:free'; Tools.refresh()")
    check('режим «изображение» сброшен после смены модели', pg.evaluate("Tools.mode") is None)
    # эвристика без данных провайдера
    check('имя gpt-image-1 без данных провайдера = картинки', pg.evaluate("(()=>{localStorage.removeItem('kairema.mcaps.v1');return Caps.image({id:'zz',model:'gpt-image-1',url:'https://api.openai.com/v1'})})()"))
    check('gpt-4o-mini = не картинки', not pg.evaluate("Caps.image({id:'zz',model:'gpt-4o-mini',url:'https://api.openai.com/v1'})"))

    # --- клавиатура и верх ---
    pg.evaluate("Sys.insets(0,0,0)")
    check('верх: --sat = 0 в приложении', pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--sat').trim()") == '0px')
    pg.screenshot(path=OUT + '/020_closed.png')
    pg.evaluate("Sys.insets(0,0,300)")
    pg.wait_for_timeout(300)
    check('клавиатура открыта: класс .kb', pg.evaluate("document.documentElement.classList.contains('kb')"))
    check('клавиатура открыта: нижняя панель остаётся на месте (её накрывает клавиатура, CSS её не трогает)', pg.evaluate("getComputedStyle(document.querySelector('nav')).display!=='none'&&getComputedStyle(document.querySelector('nav')).bottom==='0px'"))
    check('нет CSS-переходов bottom у экрана (плавность даёт Kotlin, без рывка)', 'bottom' not in pg.evaluate("getComputedStyle(document.querySelector('#v-api')).transitionProperty"))
    check('клавиатура открыта: .view не меняет нижнюю границу (64px над панелью)', pg.evaluate("getComputedStyle(document.querySelector('#v-api')).bottom") == '64px')
    check('--kb всегда 0 (окно уже сжато Kotlin)', pg.evaluate("getComputedStyle(document.documentElement).getPropertyValue('--kb').trim()") == '0px')
    pg.screenshot(path=OUT + '/020_kb.png')
    pg.evaluate("Sys.insets(0,0,0)")
    check('клавиатура закрыта: класс снят сразу', not pg.evaluate("document.documentElement.classList.contains('kb')"))

    # --- «Поделиться» ---
    pg.evaluate("window.__inbox = JSON.stringify({text:'https://example.com/статья', subject:'Заголовок'})")
    pg.evaluate("Inbox.check()")
    pg.wait_for_timeout(500)
    v = pg.evaluate("document.querySelector('#v-api textarea').value")
    check('Поделиться: текст в поле ввода нового чата', 'https://example.com/статья' in v and 'Заголовок' in v, v)
    pg.evaluate("window.__inbox = ''; Inbox.check()")
    pg.wait_for_timeout(200)

    # --- бэкап ---
    pg.evaluate("""(()=>{Chx.load(); const c=Chx.fresh(); c.title='Тест'; c.named=1; c.msgs.push({r:'u',q:'привет',t:'привет'},{r:'a',t:'здравствуйте'}); Chx.keep(c); S.memos.push(['Люблю чай','', '',0]); Hooks.run('memory:changed'); })()""")
    res = pg.evaluate("(()=>{const b=Backup.build();return {len:b.json.length,chats:b.chats,mem:b.mem,j:b.json}})()")
    j = json.loads(res['j'])
    check('бэкап: чаты и память вошли', res['chats'] >= 1 and res['mem'] >= 1, (res['chats'], res['mem']))
    check('бэкап: ключи и токен входа не вошли', 'session' not in res['j'] and 'sk-' not in res['j'] and 'key' not in json.dumps(j['providers']).lower().replace('"keys"', ''), j['providers'])
    check('бэкап: провайдеры без ключей и без флага ok', all('ok' not in x for x in j['providers']))
    # восстановление: свежий «телефон» = пустые чаты
    pg.evaluate("""(window.__data = %s, true)""" % res['j'])
    pg.evaluate("localStorage.removeItem('kairema.chats.v1'); Chx.list.length=0; S.memos.length=0; S.providers.length=0;")
    r = pg.evaluate("Backup.restore(window.__data)")
    check('восстановление: чат вернулся', r['chats'] >= 1 and pg.evaluate("Chx.list.some(c=>c.title==='Тест'&&c.msgs.length===2)"), r)
    check('восстановление: память вернулась', r['mem'] >= 1 and pg.evaluate("S.memos.some(x=>x[0]==='Люблю чай')"), r)
    check('восстановление: провайдер вернулся без ключа (ok=false)', r['prov'] >= 1 and pg.evaluate("S.providers.length>0&&S.providers.every(p=>p.ok===false)"), r)
    r2 = pg.evaluate("Backup.restore(window.__data)")
    check('повторное восстановление ничего не дублирует', r2['chats'] == 0 and r2['mem'] == 0 and r2['prov'] == 0 and pg.evaluate("Chx.list.filter(c=>c.title==='Тест').length")==1, r2)
    # плохие данные не ломают
    pg.evaluate("Backup.restore({chats:[{id:'../x',msgs:[]},{id:'a b',msgs:[]},null], memory:{items:[null,{t:5}]}, providers:[{id:'z',url:'http://insecure'}]})")
    check('мусор в копии пропускается', not pg.evaluate("Chx.list.some(c=>c.id==='../x'||c.id==='a b')") and not pg.evaluate("S.providers.some(p=>p.id==='z')"))
    pg.evaluate("Backup.save()")
    check('бэкап: сохранение в «Загрузки» через мост', pg.evaluate("window.__saved&&window.__saved.n.startsWith('kairema-backup-')&&window.__saved.m==='application/json'"))
    # экран и строка в настройках
    pg.evaluate("show('set')"); pg.wait_for_timeout(600)
    check('настройки: строка «Резервная копия»', pg.evaluate("!!document.querySelector('[data-backup]')"))
    pg.evaluate("document.querySelector('[data-backup]').click()"); pg.wait_for_timeout(700)
    check('экран «Резервная копия» открывается', pg.evaluate("!!document.querySelector('[data-screen=backup]')"))
    pg.screenshot(path=OUT + '/020_backup.png')

    check('нет ошибок страницы', not errs, errs)
    b.close()

print('\nПровалов: %d' % len(fails))
sys.exit(1 if fails else 0)
