"""Тест 0.31.0: предпросмотр страницы: масштаб кнопками −/+ (шаг 10%), щипок отключён, в горизонтальном положении кнопки в один ряд.
Запуск: python3 -I docs/tests/preview031.test.py [папка_скриншотов]"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright
UI = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '../../app/src/main/assets/ui/index.html'))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='pv')
OK = 0; BAD = []
def check(n, c, i=''):
    global OK
    if c: OK += 1; print('ok  ', n)
    else: BAD.append(n); print('FAIL', n, i)
INIT = r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 window.KairemaBridge = {hasKey:()=>true,cancel(){},termuxStatus:()=>'{}',setOrientation(m){window.__or=m}};
}
"""
HTML = '<!doctype html><html><head><title>Тест</title></head><body style="margin:0"><h1>Привет</h1><p>Страница для проверки масштаба</p></body></html>'
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("Art.preview(%s,'Тест','x','html')" % repr(HTML).replace("'", '"') if False else "Art.preview(" + __import__('json').dumps(HTML) + ",'Тест','x','html')")
    pg.wait_for_timeout(800)
    lbl = lambda: pg.evaluate("document.querySelector('[data-zr]').textContent")
    check('масштаб сначала 100%', lbl() == '100%', lbl())
    pg.click('[data-zi]'); pg.wait_for_timeout(250); pg.click('[data-zi]'); pg.wait_for_timeout(250)
    check('два нажатия «+»: 120%', lbl() == '120%', lbl())
    pg.click('[data-zo]'); pg.wait_for_timeout(250)
    check('«−»: 110%', lbl() == '110%', lbl())
    z = pg.frame_locator('iframe').locator('html').evaluate("e=>e.style.zoom")
    check('страница внутри действительно масштабирована', str(z) in ('1.1', '110%'), z)
    pg.click('[data-zr]'); pg.wait_for_timeout(250)
    check('нажатие на проценты возвращает 100%', lbl() == '100%', lbl())
    check('щипок отключён (нет обработчиков касаний в странице)', 'touchmove' not in pg.evaluate("Art.zoomJs"))
    check('кнопки масштаба не меньше 44 px', pg.evaluate("[...document.querySelectorAll('.art-z button')].every(b=>b.getBoundingClientRect().height>=44-1)"))
    pg.screenshot(path=SHOTS + '/preview_portrait.png')
    pg.set_viewport_size({'width': 780, 'height': 360}); pg.wait_for_timeout(500)
    h = pg.evaluate("document.querySelector('.art-fr').getBoundingClientRect().height")
    check('горизонтально: странице остаётся больше половины высоты (%d из 360)' % h, h > 180, h)
    row = pg.evaluate("(()=>{const z=document.querySelector('.art-z').getBoundingClientRect(),f=document.querySelector('.art-ft').getBoundingClientRect();return Math.abs((z.top+z.bottom)/2-(f.top+f.bottom)/2)<30})()")
    check('горизонтально: масштаб и кнопки действий в одном ряду', row)
    pg.screenshot(path=SHOTS + '/preview_landscape.png')
    check('ошибок страницы нет', not errs, errs[:3])
    b.close()
print('\nПровалов: %d, успешных: %d' % (len(BAD), OK)); sys.exit(1 if BAD else 0)
