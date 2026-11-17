"""Тесты 0.26.0: удалены голос и озвучка (A1, A3), кнопка «Шаблоны» (A2), новое меню «+» (A4).
Запуск: python3 docs/tests/ui026.test.py   (нужны playwright и Chromium). Скриншоты 360x780 кладёт в $SHOTS (по умолчанию /tmp).
Настоящий Android и Kotlin не запускает."""
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
    pg.on('console', lambda m: errs.append('console: ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.add_init_script(INIT)
    pg.goto('file://' + UI)
    pg.wait_for_timeout(6200)
    pg.evaluate("KairemaNative.tok('%s')" % TOKEN)
    pg.evaluate("Chx.load(); Chx.open(Chx.fresh()); show('api')")
    pg.wait_for_timeout(400)

    LIGHT = "document.documentElement.dataset.theme='light'"
    DARK = "document.documentElement.dataset.theme='dark'"
    CLOSE = "document.querySelectorAll('.sheet-bg').forEach(x=>x.close&&x.close())"
    def closeall():
        pg.evaluate(CLOSE); pg.wait_for_timeout(450)

    # --- A1 и A3: голос и озвучка удалены ---
    check('A1: нет глобалов Voice и Tts', pg.evaluate("typeof Voice==='undefined'&&typeof Tts==='undefined'"))
    check('A1: нет кнопки микрофона и индикатора «Слушаю»', pg.evaluate("!document.querySelector('.cmp [data-v],.lsn,[data-action=\"composer:voice\"]')"))
    check('A1: мосты голоса и озвучки не используются', pg.evaluate("![...document.scripts].some(s=>/voice|tts/.test(s.src))"))
    pg.fill('#v-api textarea', 'Привет')
    pg.evaluate("document.querySelector('#v-api .send').click()")
    pg.wait_for_timeout(900)
    check('A3: под ответом нет «Прослушать»', pg.evaluate("document.querySelectorAll('.msg-act').length>0&&!document.querySelector('[data-tts]')"))

    # --- A2: кнопка «Шаблоны» на месте микрофона ---
    box = pg.evaluate("(()=>{const b=document.querySelector('#v-api [data-tb]');if(!b)return null;const r=b.getBoundingClientRect(),s=document.querySelector('#v-api .send').getBoundingClientRect();return{w:r.width,h:r.height,leftOfSend:r.right<=s.left+1}})()")
    check('A2: кнопка «Шаблоны» есть, слева от «Отправить», не меньше 44 px', box and box['w'] >= 44 and box['h'] >= 44 and box['leftOfSend'], box)
    pg.screenshot(path=OUT + '/026_composer.png')
    pg.click('#v-api [data-tb]'); pg.wait_for_timeout(500)
    n = pg.evaluate("document.querySelectorAll('.tpk-i').length")
    check('A2: окно со списком шаблонов и ролей', n >= 9, n)
    check('A2: поиск есть, потому что пунктов больше 8', pg.evaluate("!!document.querySelector('.tpk-s input')"))
    hs = pg.evaluate("[...document.querySelectorAll('.tpk-i')].map(b=>b.getBoundingClientRect().height)")
    check('A2: цели нажатия не ниже 44 px', min(hs) >= 44, min(hs))
    pg.screenshot(path=OUT + '/026_tpl_dark.png')
    pg.fill('.tpk-s input', 'перев'); pg.wait_for_timeout(200)
    names = pg.evaluate("[...document.querySelectorAll('.tpk-i b')].map(b=>b.textContent)")
    check('A2: поиск «перев» оставляет подходящее (переводчик)', 1 <= len(names) < n and any('еревод' in x for x in names), names)
    pg.fill('.tpk-s input', 'qqzzxx'); pg.wait_for_timeout(200)
    check('A2: поиск без совпадений: надпись «Ничего не найдено»', pg.evaluate("!document.querySelector('.tpk-i')&&/Ничего не найдено/.test(document.querySelector('.tpk').textContent)"))
    pg.fill('.tpk-s input', 'Объяснить'); pg.wait_for_timeout(200)
    pg.click('.tpk-i'); pg.wait_for_timeout(500)
    v = pg.evaluate("document.querySelector('#v-api textarea').value")
    check('A2: выбор шаблона подставляет текст в поле ввода', 'Объясни' in v and not pg.evaluate("document.querySelector('.sheet-bg')"), v)
    pg.fill('#v-api textarea', ''); pg.wait_for_timeout(100)
    pg.click('#v-api [data-tb]'); pg.wait_for_timeout(500)
    pg.fill('.tpk-s input', 'Переводчик'); pg.wait_for_timeout(200)
    pg.click('.tpk-i'); pg.wait_for_timeout(500)
    check('A2: выбор роли включает роль чата (плашка над полем)', pg.evaluate("!!document.querySelector('.rlc')&&document.querySelector('#v-api textarea').value===''"))
    pg.evaluate("document.querySelector('.rl-x').click()")
    pg.evaluate(LIGHT); pg.click('#v-api [data-tb]'); pg.wait_for_timeout(600)
    pg.screenshot(path=OUT + '/026_tpl_light.png')
    closeall(); pg.evaluate(DARK)

    # --- A4: меню «+» ---
    pg.click('#v-api [data-plus]'); pg.wait_for_timeout(600)
    info = pg.evaluate("""(()=>{const t=[...document.querySelectorAll('.tm-tile')];const g=[...document.querySelectorAll('.tm-grid')].map(x=>[...x.children].map(c=>{const r=c.getBoundingClientRect();return[Math.round(r.top),Math.round(r.left),Math.round(r.width),Math.round(r.height)]}));
      return{n:t.length,names:t.map(x=>x.querySelector('.tm-n').textContent),groups:[...document.querySelectorAll('.tm-g')].map(x=>x.textContent),g,
        fs:Math.min(...t.map(x=>parseFloat(getComputedStyle(x.querySelector('.tm-n')).fontSize))),mh:Math.min(...t.map(x=>x.getBoundingClientRect().height)),
        vw:innerWidth,over:document.documentElement.scrollWidth>innerWidth}})()""")
    check('A4: 9 плиток', info['n'] == 9, info)
    check('A4: группы Прикрепить, Создать, Режим', info['groups'] == ['Прикрепить', 'Создать', 'Режим'], info['groups'])
    two = all(len(row) < 2 or (row[0][0] == row[1][0] and row[0][1] < row[1][1] and abs(row[0][2] - row[1][2]) <= 1) for row in info['g'])
    check('A4: плитки по 2 в ряд', two and any(len(r) >= 2 for r in info['g']), info['g'])
    check('A4: подпись не меньше 15 px', info['fs'] >= 15, info['fs'])
    check('A4: высота плитки не меньше 76 px', info['mh'] >= 76, info['mh'])
    check('A4: нет горизонтальной прокрутки', not info['over'])
    full = pg.evaluate("[...document.querySelectorAll('.tm-grid')].map(g=>{const k=[...g.children];return k.length%2===1?Math.round(k[k.length-1].getBoundingClientRect().width)>=Math.round(g.getBoundingClientRect().width)-1:true})")
    check('A4: одинокая плитка в группе занимает всю ширину', all(full), full)
    clip = pg.evaluate("[...document.querySelectorAll('.tm-tile.off .tm-h')].every(h=>h.scrollHeight<=h.clientHeight+1)")
    check('A4: подсказка серой плитки помещается без обрезки', clip)
    pg.screenshot(path=OUT + '/026_menu_dark.png')
    # режимы: с 0.26.4 выбор сразу закрывает окно, режим и метка включаются
    pg.evaluate("[...document.querySelectorAll('.tm-tile')].find(x=>x.querySelector('.tm-n').textContent==='Думать').click()"); pg.wait_for_timeout(500)
    st = pg.evaluate("({open:!!document.querySelector('.tm'),mode:Tools.thinkMode,chip:!!document.querySelector('.mchip')})")
    check('A4: «Думать» включён, окно закрылось, метка в поле ввода', st['mode'] == 'think' and not st['open'] and st['chip'], st)
    pg.click('#v-api [data-plus]'); pg.wait_for_timeout(500)
    check('A4: в окне «Думать» подсвечен', pg.evaluate("[...document.querySelectorAll('.tm-tile.on .tm-n')].map(x=>x.textContent).join()")=='Думать')
    pg.screenshot(path=OUT + '/026_menu_on_dark.png')
    pg.evaluate("[...document.querySelectorAll('.tm-tile')].find(x=>x.querySelector('.tm-n').textContent==='Быстрый ответ').click()"); pg.wait_for_timeout(500)
    check('A4: «Быстрый ответ» заменяет «Думать»', pg.evaluate("Tools.thinkMode")=='instant')
    pg.click('#v-api [data-plus]'); pg.wait_for_timeout(500)
    pg.evaluate("[...document.querySelectorAll('.tm-tile')].find(x=>x.querySelector('.tm-n').textContent==='Быстрый ответ').click()"); pg.wait_for_timeout(500)
    check('A4: повторное нажатие выключает режим', pg.evaluate("Tools.thinkMode")=='auto')
    pg.click('#v-api [data-plus]'); pg.wait_for_timeout(500)
    # модель без картинок: плитка серая, нажатие объясняет причину и не закрывает окно
    off = pg.evaluate("(()=>{const t=[...document.querySelectorAll('.tm-tile')].find(x=>x.querySelector('.tm-n').textContent==='Изображение');return{off:t.classList.contains('off'),hint:t.querySelector('.tm-h').textContent}})()")
    check('A4: «Изображение» серое с понятной причиной (текстовая модель)', off['off'] and 'не рисует' in off['hint'], off)
    pg.evaluate("[...document.querySelectorAll('.tm-tile')].find(x=>x.querySelector('.tm-n').textContent==='Изображение').click()"); pg.wait_for_timeout(250)
    check('A4: нажатие на серую плитку: окно открыто, режим не включился', pg.evaluate("!!document.querySelector('.tm')&&Tools.mode===null"))
    # светлая тема
    pg.evaluate(LIGHT); pg.wait_for_timeout(300)
    pg.screenshot(path=OUT + '/026_menu_light.png')
    pg.screenshot(path=OUT + '/026_menu_on_light.png')
    pg.evaluate("Tools.setThink('auto')"); pg.evaluate(DARK)
    # прикрепление закрывает окно и открывает выбор файла
    pg.evaluate("window.__picked=[];['g','f','c'].forEach(k=>{});")
    pg.evaluate("[...document.querySelectorAll('.tm-tile')].find(x=>x.querySelector('.tm-n').textContent==='Файл').click()"); pg.wait_for_timeout(500)
    check('A4: «Файл» закрывает окно', pg.evaluate("!document.querySelector('.tm')"))
    # модель с картинками: плитка доступна, режим включается
    pg.evaluate("S.providers[0].model='google/gemini-2.5-flash-image'")
    pg.click('#v-api [data-plus]'); pg.wait_for_timeout(500)
    pg.evaluate("[...document.querySelectorAll('.tm-tile')].find(x=>x.querySelector('.tm-n').textContent==='Изображение').click()"); pg.wait_for_timeout(500)
    check('A4: у рисующей модели «Изображение» включает режим и закрывает окно', pg.evaluate("Tools.mode==='image'&&!document.querySelector('.tm')"))
    pg.evaluate("Tools.set(null)")

    # --- цвета и шрифты только из токенов ---
    css = open(os.path.join(os.path.dirname(UI), 'features/tools/tools.css'), encoding='utf-8').read()
    menu = css[css.index('/* меню «+»'):css.index('/* размышления */')]
    import re
    check('A4: в стилях меню нет жёстких цветов (#...) и шрифтов, только var(--...)', not re.search(r'#[0-9a-fA-F]{3,6}\b|rgb\(|font-family', menu), re.findall(r'#[0-9a-fA-F]{3,6}\b|rgb\(|font-family', menu))

    check('ошибок страницы и консоли нет', not errs, errs[:4])
    b.close()

print('\nПровалов: %d' % len(fails))
sys.exit(1 if fails else 0)
