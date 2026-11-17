"""Тест 0.31.0: компактный код с номерами строк и полным экраном, черновик поля ввода.
Запуск: python3 -I docs/tests/code031.test.py [папка_скриншотов]"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright
UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='c31')
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
 window.__cp=[]; window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText(t){window.__cp.push(t);return true},saveKey(){},deleteKey(){},termuxStatus:()=>'{}',chat(){},shell(){},setOrientation(){}};
}"""
LONG = '```html\n' + '\n'.join('<div class="row">строка %d</div>' % i for i in range(1, 61)) + '\n```\n\nТекст после.'
SHORT = '```python\nprint(1)\nprint(2)\n```'
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=2); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove())")
    r = pg.evaluate("""(()=>{const bd=document.createElement('div');bd.className='bd md';bd.id='t1';const w=document.createElement('div');w.className='msg a';w.append(bd);document.body.append(w);
      mdRender(bd,%r);const pre=bd.querySelector('pre');return{cls:pre.className,lines:pre.querySelector('code').textContent.split('\\n').length,g:pre.querySelector('.cv-g').textContent.split('\\n').length,more:(pre.querySelector('.cv-more')||{}).textContent,lang:pre.querySelector('.cv-l').textContent,h:pre.offsetHeight}})()""" % LONG)
    check('длинный код: показано 12 строк с номерами', r['lines'] == 12 and r['g'] == 12, r)
    check('длинный код: «Показать все · 60 строк»', r['more'] and 'Показать все' in r['more'] and '60' in r['more'], r)
    check('язык в шапке', r['lang'] == 'html', r)
    check('блок компактный (<340 px)', r['h'] < 340, r)
    pg.screenshot(path=SHOTS + '/c-long.png')
    pg.click('#t1 pre.cv'); pg.wait_for_timeout(700)
    f = pg.evaluate("({n:document.querySelector('.cv-pg code').textContent.split('\\n').length,g:document.querySelector('.cv-pg .cv-g').textContent.split('\\n').length,t:document.querySelector('.cv-pg h2').textContent})")
    check('нажатие открывает весь код (60 строк, номера)', f['n'] == 60 and f['g'] == 60 and '60' in f['t'], f)
    pg.screenshot(path=SHOTS + '/c-full.png')
    pg.click('.cv-pg .art-ft .btn'); pg.wait_for_timeout(200)
    cp = pg.evaluate("window.__cp")
    check('«Копировать» на экране копирует весь код', len(cp) == 1 and cp[0].count('\n') == 59, len(cp))
    pg.click('.cv-pg [data-bk]'); pg.wait_for_timeout(700)
    check('назад закрывает экран кода', pg.locator('.cv-pg').count() == 0)
    pg.click('#t1 pre.cv .cv-b >> nth=1'); pg.wait_for_timeout(200)
    check('копирование в шапке: весь код, экран не открылся', len(pg.evaluate("window.__cp")) == 2 and pg.locator('.cv-pg').count() == 0)
    s = pg.evaluate("""(()=>{const bd=document.createElement('div');bd.className='bd md';const w=document.createElement('div');w.className='msg a';w.append(bd);document.body.append(w);mdRender(bd,%r);const pre=bd.querySelector('pre');return{long:pre.classList.contains('long'),more:!!pre.querySelector('.cv-more'),n:pre.querySelector('code').textContent}})()""" % SHORT)
    check('короткий код целиком, без «Показать все»', not s['long'] and not s['more'] and s['n'] == 'print(1)\nprint(2)', s)
    # потоковый вывод: длинный код не раздувает блок
    h = pg.evaluate("""(async()=>{const bd=document.createElement('div');bd.className='bd md';const w=document.createElement('div');w.className='msg a';w.append(bd);document.body.append(w);
      const m={t:'```js\\n'};let hs=[];for(let i=0;i<80;i++){m.t+='let a'+i+' = '+i+';\\n';mdLive(bd,m);await new Promise(r=>setTimeout(r,20));if(i%20==19)hs.push(bd.offsetHeight)}await new Promise(r=>setTimeout(r,400));return hs})()""")
    check('при стриме высота блока не растёт после 14 строк', h[-1] - h[1] < 12, h)
    # --- черновик
    pg.evaluate("show('api')"); pg.wait_for_timeout(600)
    pg.fill('.cmp textarea', 'Недописанное сообщение'); pg.wait_for_timeout(500)
    pg.evaluate("show('set')"); pg.wait_for_timeout(300)
    pg.evaluate("show('api')"); pg.wait_for_timeout(600)
    check('черновик: текст вернулся после ухода в настройки', pg.input_value('.cmp textarea') == 'Недописанное сообщение', pg.input_value('.cmp textarea'))
    check('кнопка отправки активна для черновика', pg.evaluate("!document.querySelector('.cmp .send').disabled"))
    pg.reload(); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());show('api')"); pg.wait_for_timeout(600)
    check('черновик: пережил перезапуск страницы', pg.input_value('.cmp textarea') == 'Недописанное сообщение', pg.input_value('.cmp textarea'))
    pg.fill('.cmp textarea', 'abc'); pg.wait_for_timeout(100)
    pg.evaluate("window.dispatchEvent(new Event('pagehide'))"); pg.wait_for_timeout(150); pg.reload(); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());show('api')"); pg.wait_for_timeout(600)
    check('черновик: сохраняется при выходе из приложения без паузы', pg.input_value('.cmp textarea') == 'abc', pg.input_value('.cmp textarea'))
    pg.fill('.cmp textarea', ''); pg.wait_for_timeout(500)
    pg.evaluate("show('set');show('api')"); pg.wait_for_timeout(500)
    check('пустое поле: черновика нет', pg.input_value('.cmp textarea') == '')
    # --- дизайн: мозаика настроек и стартовые плитки
    pg.evaluate("show('set')"); pg.wait_for_timeout(700)
    d = pg.evaluate("({mz:document.querySelectorAll('.st .grp.mz').length,w6:document.querySelectorAll('.st .grp.mz>.sr.w6').length,w2:document.querySelectorAll('.st .grp.mz>.sr.w2').length,w4:document.querySelectorAll('.st .grp.mz>.sr.w4').length,over:document.documentElement.scrollWidth>innerWidth})")
    check('настройки: мозаика, плитки трёх размеров', d['mz'] >= 2 and d['w6'] >= 1 and d['w2'] >= 2 and d['w4'] >= 1 and not d['over'], d)
    pg.evaluate("S.apiMsgs.length=0;show('api')"); pg.wait_for_timeout(300)
    pg.evaluate("show('set');show('api')"); pg.wait_for_timeout(900)
    t = pg.evaluate("({n:document.querySelectorAll('.dz-t').length,w:[...document.querySelectorAll('.dz-t')].map(x=>Math.round(x.getBoundingClientRect().width))})")
    check('пустой чат: 5 плиток разной ширины', t['n'] == 5 and len(set(t['w'])) >= 3, t)
    pg.click('.dz-t >> nth=0'); pg.wait_for_timeout(200)
    check('плитка вставляет заготовку в поле ввода', pg.input_value('.cmp textarea').startswith('Написать код'), pg.input_value('.cmp textarea'))
    # --- большая вставка не отправляет сообщение
    pg.evaluate("window.__sent=0;Chat.cmp.setText('')"); pg.fill('.cmp textarea', 'x' * 5000 + '\n' + 'y' * 5000); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    check('Enter после большой вставки не отправляет', pg.input_value('.cmp textarea').count('x') == 5000 and pg.evaluate("S.apiMsgs.length") == 0, pg.evaluate("S.apiMsgs.length"))
    # --- провайдера удалили: переписка видна
    pg.evaluate("S.apiMsgs.push({r:'u',q:'Привет',t:'Привет'},{r:'a',t:'Здравствуйте'});S.providers.length=0;apiView()"); pg.wait_for_timeout(500)
    check('без провайдера переписка остаётся на экране', pg.locator('.msg').count() >= 2 and pg.locator('#btn-connect-provider').count() == 1, pg.locator('.msg').count())
    check('нет ошибок', not errs, errs)
    b.close()
print('\nпройдено %d провалено %d %s  скриншоты: %s' % (OK, len(BAD), BAD, SHOTS))
