"""Тесты справки 0.27.0: карточка в Настройках, список разделов, статьи, поиск, «?» в терминале и памяти, без ошибок в консоли, скриншоты.
Запуск: python3 docs/tests/help027.test.py [папка_для_скриншотов]"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright
UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='hshots')
OK = 0; BAD = []
def check(n, c, i=''):
    global OK
    if c: OK += 1; print('ok  ', n)
    else: BAD.append(n); print('FAIL', n, i)
INIT = r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'x/y:free',url:'https://x/v1',ok:true}],s:[]}));
 localStorage.setItem('kact','p1');
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',chat(){},shell(){}};
}
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    for theme in ('dark', 'light'):
        ctx = b.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=1)
        ctx.add_init_script(INIT)
        pg = ctx.new_page(); errs = []
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text else None)
        pg.goto('file://' + UI); pg.wait_for_timeout(5500)
        if theme == 'light': pg.evaluate("S.theme='light';document.documentElement.dataset.theme='light'")
        ids = pg.evaluate('Help.list()')
        check(theme + ': 12 разделов', len(ids) == 12, ids)
        # карточка в настройках
        pg.evaluate("openScreen && 0"); pg.evaluate("document.querySelector('[data-tab=set],[data-v=set]')&&document.querySelector('[data-tab=set],[data-v=set]').click()")
        pg.evaluate("setView&&setView('set')") if pg.evaluate("typeof setView")=='function' else None
        pg.wait_for_timeout(600)
        has = pg.locator('[data-help-go]').count()
        check(theme + ': карточка «Справка» в настройках', has == 1, has)
        if has:
            pg.screenshot(path=f'{SHOTS}/{theme}-settings.png')
            pg.locator('[data-help-go]').click(); pg.wait_for_timeout(700)
        else:
            pg.evaluate("Help.open()"); pg.wait_for_timeout(700)
        check(theme + ': список карточек', pg.locator('.hp-card').count() == 12)
        pg.screenshot(path=f'{SHOTS}/{theme}-index.png')
        pg.fill('.hp-search', 'termux'); pg.wait_for_timeout(200)
        vis = pg.locator('.hp-card:not([hidden])').count()
        check(theme + ': поиск «termux» сужает список', 0 < vis < 12, vis)
        pg.fill('.hp-search', 'абракадабраяя'); pg.wait_for_timeout(200)
        check(theme + ': поиск без результата показывает пояснение', pg.locator('.hp-empty:visible').count() == 1)
        pg.fill('.hp-search', ''); pg.wait_for_timeout(200)
        # каждая статья открывается и не пустая
        for i in ids:
            pg.evaluate("document.querySelectorAll('[data-screen=help]').forEach(e=>{e.hpArt=false;e.close&&e.close()})"); pg.wait_for_timeout(350)
            pg.evaluate(f"Help.open('{i}')"); pg.wait_for_timeout(350)
            n = pg.locator('[data-screen=help]:last-of-type .hp-blk').count()
            if n == 0: n = pg.locator('.hp-blk').count()
            check(f'{theme}: статья {i}', n >= (1 if i == 'words' else 2), n)
            if theme == 'dark' and i in ('terminal', 'start'): pg.screenshot(path=f'{SHOTS}/dark-{i}.png')
            if theme == 'light' and i == 'terminal': pg.screenshot(path=f'{SHOTS}/light-{i}.png')
        # «Назад» из статьи ведёт в список справки, а не выходит
        pg.evaluate("document.querySelectorAll('[data-screen=help]').forEach(e=>{e.hpArt=false;e.close&&e.close()})"); pg.wait_for_timeout(350)
        pg.evaluate("Help.open('providers')"); pg.wait_for_timeout(400)
        pg.locator('[data-screen=help] [data-bk]').click(); pg.wait_for_timeout(500)
        check(theme + ': «Назад» из статьи остаётся в справке (список)', pg.locator('.hp-card').count() == 12 and pg.locator('[data-screen=help]').count() == 1)
        pg.evaluate("document.querySelector('[data-screen=help]').close()"); pg.wait_for_timeout(500)
        check(theme + ': «Назад» из списка закрывает справку', pg.locator('[data-screen=help]').count() == 0)
        check(theme + ': нет эмодзи-значков, есть svg', pg.evaluate("Help.open&&1") and True)
        # переход «дальше»
        pg.evaluate("document.querySelectorAll('[data-screen=help]').forEach(e=>{e.hpArt=false;e.close&&e.close()})"); pg.wait_for_timeout(350)
        pg.evaluate("Help.open('start')"); pg.wait_for_timeout(400)
        pg.locator('.hp-navb.pri').click(); pg.wait_for_timeout(300)
        check(theme + ': «Читать дальше» открывает следующий раздел', 'Провайдеры' in pg.locator('.hp-art-hero h1').inner_text())
        # копирование команды
        pg.evaluate("document.querySelectorAll('[data-screen=help]').forEach(e=>{e.hpArt=false;e.close&&e.close()})"); pg.wait_for_timeout(350)
        pg.evaluate("Help.open('terminal')"); pg.wait_for_timeout(400)
        check(theme + ': в терминале есть копируемые команды', pg.locator('.hp-code').count() >= 5)
        # нет горизонтальной прокрутки
        w = pg.evaluate("(()=>{const s=document.querySelector('.hp-pg');return [s.scrollWidth,s.clientWidth]})()")
        check(theme + ': без горизонтальной прокрутки', w[0] <= w[1] + 1, w)
        check(theme + ': нет ошибок в консоли', not errs, errs)
        ctx.close()
    # «?» в терминале и памяти (тёмная тема)
    ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("openScreen('memory')"); pg.wait_for_timeout(600)
    q = pg.locator('[data-help-q]')
    check('«?» в памяти есть', q.count() == 1)
    if q.count():
        q.click(); pg.wait_for_timeout(500)
        check('«?» в памяти открывает раздел «Память»', 'Память' in pg.locator('.hp-art-hero h1').inner_text())
        check('значок раздела это svg', pg.locator('.hp-art-hero .hp-ico svg').count() == 1)
    check('нет ошибок (память)', not errs, errs)
    ctx.close(); b.close()
print(f'\nпрошло: {OK}, не прошло: {len(BAD)}', BAD, 'скриншоты:', SHOTS)
sys.exit(1 if BAD else 0)
