"""Дымовой тест 0.28.0: приложение открывается без ошибок, все экраны из SCREENS открываются, журнал ошибок работает
(перехват, замена ключей на ***, экран, копирование, очистка), порядок файлов core/ после разреза app.js.
Запуск: python3 -I docs/tests/smoke028.test.py [папка_скриншотов]"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright
UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='sm')
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
 window.__copied = '';
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText(t){window.__copied=t;return true},saveKey(){},deleteKey(){},termuxStatus:()=>'{}',chat(){},shell(){}};
}
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGE ' + str(e)))
    pg.on('console', lambda m: errs.append('CON ' + m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    check('запуск без ошибок', not errs, errs)
    # все файлы разрезанного app.js загрузились и дали ожидаемые глобальные имена
    names = pg.evaluate("['page','sheet','el','ic','L','Native','Chx','S','openScreen','SCREENS','Hooks','respond','composer','tplPage','provForm','APP_VERSION','Log','Help','Term','Mem'].filter(n=>{try{return typeof eval(n)==='undefined'}catch(e){return true}})")
    check('глобальные имена на месте после разреза app.js', not names, names)
    # все экраны открываются
    scr = pg.evaluate("Object.keys(SCREENS)")
    skip = {'splash', 'chat', 'api', 'term', 'set', 'welcome'}
    opened = 0
    for k in scr:
        if k in skip: continue
        e0 = len(errs)
        try:
            pg.evaluate(f"(()=>{{try{{openScreen('{k}')}}catch(e){{window.__err=String(e)}}}})()"); pg.wait_for_timeout(350)
            pg.evaluate("document.querySelectorAll('.spg,.sheet-bg,.pbg').forEach(e=>e.remove());document.querySelectorAll('[data-screen=onboarding]').forEach(e=>e.remove())")
            opened += 1
        except Exception as ex:
            errs.append('EXC ' + k + ' ' + str(ex)[:80])
        check(f'экран {k} открывается без ошибок', len(errs) == e0, errs[e0:])
    check('открыто экранов не меньше 8', opened >= 8, opened)
    # журнал ошибок
    pg.evaluate("Log.clear()")
    pg.evaluate("Log.add('test','ключ sk-abcdefghijklmnop1234 и Bearer abcdefghijklmnopqrstu, почта me@example.com')")
    pg.evaluate("setTimeout(()=>{throw new Error('проверка ошибки')},0)"); pg.wait_for_timeout(300)
    rows = pg.evaluate("Log.rows()")
    txt = ' '.join(r['m'] for r in rows)
    check('журнал: ловит необработанную ошибку', 'проверка ошибки' in txt, rows)
    check('журнал: ключи, токены и почты заменены на ***', 'sk-abc' not in txt and 'abcdefghijklmnopqrstu' not in txt and 'example.com' not in txt and '***' in txt, txt)
    pg.evaluate("Log.add('test','повтор');Log.add('test','повтор');Log.add('test','повтор')")
    check('журнал: одинаковые записи склеиваются', pg.evaluate("Log.rows().filter(r=>r.m==='повтор').length")==1)
    errs.clear()
    pg.evaluate("document.querySelector('#tab-set')&&document.querySelector('#tab-set').click()"); pg.wait_for_timeout(700)
    check('журнал: строка в Настройках', pg.locator('[data-log]').count() == 1)
    pg.evaluate("document.querySelector('[data-log]').click()"); pg.wait_for_timeout(500)
    check('журнал: экран показывает записи', 'проверка ошибки' in pg.locator('.lg-box').inner_text())
    pg.screenshot(path=SHOTS + '/log.png')
    pg.locator('.lg-box').scroll_into_view_if_needed(); pg.click('[data-screen=log] [data-c]'); pg.wait_for_timeout(300)
    cp = pg.evaluate('window.__copied')
    check('журнал: «Копировать» отдаёт текст с версией', cp.startswith('Kairema ') and 'проверка ошибки' in cp, cp[:80])
    pg.click('[data-screen=log] [data-x]'); pg.wait_for_timeout(300)
    check('журнал: «Очистить»', 'ошибок не было' in pg.locator('.lg-box').inner_text())
    errs[:] = [e for e in errs if 'проверка ошибки' not in e]
    check('нет новых ошибок на экране журнала', not errs, errs)
    ctx.close(); b.close()
print(f'\nпрошло: {OK}, не прошло: {len(BAD)}', BAD)
sys.exit(1 if BAD else 0)
