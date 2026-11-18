"""Тест 0.29.0: качество ответов для слабых моделей, фильтр иероглифов, плавная прокрутка при потоке, вкладка размышлений, масштаб предпросмотра.
Запуск: python3 -I docs/tests/quality029.test.py [папка_скриншотов]"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright
UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='q29')
OK = 0; BAD = []
def check(n, c, i=''):
    global OK
    if c: OK += 1; print('ok  ', n)
    else: BAD.append(n); print('FAIL', n, i)
INIT = r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'openai/gpt-4o-mini',url:'https://x/v1',ok:true}],s:[]}));
 localStorage.setItem('kact','p1');
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',chat(){},shell(){}};
}
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    # --- подсказки
    sp = pg.evaluate("sysPrompt()")
    check('подсказка: правило языка и запрет иероглифов', 'Never use Chinese, Japanese or Korean' in sp and 'ONLY in the language' in sp)
    check('подсказка: пример таблицы с разделителем', '|---|---|---|' in sp and 'ONE line' in sp)
    check('слабая модель (gpt-4o-mini) получает простой режим', 'Simple mode' in sp)
    pg.evaluate("localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'anthropic/claude-opus-4',url:'https://x/v1',ok:true}],s:[]}));S.providers=JSON.parse(localStorage.getItem('kairema.providers.v1')).c")
    sp2 = pg.evaluate("sysPrompt()")
    check('сильная модель: простой режим не добавляется (авто)', 'Simple mode' not in sp2 and 'Never use Chinese' in sp2, pg.evaluate("Quality.weak()"))
    pg.evaluate("localStorage.setItem('kqhelp','on')")
    check('настройка «Вкл» добавляет простой режим для любой модели', 'Simple mode' in pg.evaluate("sysPrompt()"))
    pg.evaluate("localStorage.setItem('kqhelp','off')")
    check('настройка «Выкл» убирает простой режим', 'Simple mode' not in pg.evaluate("sysPrompt()"))
    pg.evaluate("localStorage.removeItem('kqhelp')")
    # --- фильтр иероглифов
    bad = 'Выполняйте最重要的 задачи | 价格 | цена'
    pg.evaluate("Quality.watch([{r:'u',q:'привет, составь распорядок'}])")
    f = pg.evaluate("t=>Quality.filter(t)", bad)
    check('фильтр убирает иероглифы из русского ответа', not any(ord(c) > 0x2E80 for c in f) and 'Выполняйте задачи' in f, f)
    pg.evaluate("Quality.watch([{r:'u',q:'переведи на китайский: привет'}])")
    check('просьба о китайском: иероглифы остаются', pg.evaluate("t=>Quality.filter(t)", '你好') == '你好')
    pg.evaluate("Quality.watch([{r:'u',q:'你好'}])")
    check('пишете по-китайски: иероглифы остаются', pg.evaluate("t=>Quality.filter(t)", '你好') == '你好')
    pg.evaluate("localStorage.setItem('kqcjk','0');Quality.watch([{r:'u',q:'привет'}])")
    check('переключатель выключен: ничего не удаляется', pg.evaluate("t=>Quality.filter(t)", '好') == '好')
    pg.evaluate("localStorage.removeItem('kqcjk')")
    # --- строки в настройках
    pg.evaluate("document.querySelector('#tab-set')&&document.querySelector('#tab-set').click()"); pg.wait_for_timeout(700)
    check('настройки: строки качества на месте', pg.locator('[data-qh]').count() == 1 and pg.locator('[data-qc]').count() == 1)
    v0 = pg.evaluate("document.querySelector('[data-qh] .qv').textContent")
    pg.evaluate("document.querySelector('[data-qh]').click()"); pg.wait_for_timeout(200)
    v1 = pg.evaluate("document.querySelector('[data-qh] .qv').textContent")
    check('настройки: «Подсказки» переключаются Авто, Вкл', v0 == 'Авто' and v1 == 'Вкл', (v0, v1))
    pg.evaluate("localStorage.removeItem('kqhelp')")
    pg.screenshot(path=SHOTS + '/q-settings.png')
    # --- прокрутка при потоке
    r = pg.evaluate("""(async()=>{
      const box=document.createElement('div');box.className='msgs';box.style.cssText='position:fixed;left:0;top:0;width:300px;height:300px;overflow:auto;z-index:9999;display:block';
      const inner=document.createElement('div');inner.style.height='3000px';box.append(inner);document.body.append(box);
      scr(box);await new Promise(r=>setTimeout(r,60));const a=box.scrollTop;
      inner.style.height='3200px';scl(box);const b2=box.scrollTop;                    // читатель внизу: следуем
      box.dispatchEvent(new Event('touchstart'));box.scrollTop=1000;box.dispatchEvent(new Event('scroll'));
      await new Promise(r=>setTimeout(r,50));
      inner.style.height='3400px';scl(box);const c=box.scrollTop;                      // потянул вверх: не мешаем
      box.dispatchEvent(new Event('touchmove'));box.scrollTop=box.scrollHeight;box.dispatchEvent(new Event('scroll'));
      await new Promise(r=>setTimeout(r,50));
      inner.style.height='3600px';scl(box);const d=box.scrollTop,mx=box.scrollHeight-box.clientHeight;  // вернулся вниз: снова следуем
      const sm=getComputedStyle(document.querySelector('.msgs')).scrollBehavior;
      box.remove();return{a,b2,c,d,mx,sm}})()""")
    check('прокрутка: читатель внизу, поток ведёт вниз', r['b2'] >= 2800, r)
    check('прокрутка: читатель потянул вверх, чат не тянет обратно', r['c'] == 1000, r)
    check('прокрутка: вернулся вниз, снова следуем', abs(r['d'] - r['mx']) < 5, r)
    check('прокрутка: плавная анимация CSS выключена (не дерётся с пальцем)', r['sm'] == 'auto', r)
    # --- реже перерисовка длинного ответа
    cnt = pg.evaluate("""(async()=>{
      const bd=document.createElement('div');document.body.append(bd);let n=0;const o=window.mdRender;window.mdRender=function(){n++;return o.apply(this,arguments)};
      const m={t:'слово '.repeat(1500)};const t0=performance.now();
      for(let i=0;i<60;i++){m.t+='ещё ';mdLive(bd,m);await new Promise(r=>setTimeout(r,8))}
      await new Promise(r=>setTimeout(r,400));window.mdRender=o;bd.remove();return {n,ms:Math.round(performance.now()-t0)}})()""")
    check('длинный ответ: перерисовок заметно меньше, чем кусков (60)', cnt['n'] <= 12, cnt)
    # --- размышления свёрнуты
    th = pg.evaluate("""(()=>{
      const box=document.createElement('div');box.className='msgs';const d=document.createElement('div');d.className='msg';d.innerHTML='<div class="bd"></div>';box.append(d);document.body.append(box);
      const m={};Tools.thought(d,m,'Сначала подумаю '.repeat(40));
      const e=d.querySelector('details.think');const o1=e.open,s1=e.querySelector('summary').textContent;
      Tools.thoughtDone(d);const s2=e.querySelector('summary').textContent;box.remove();return{o1,s1,s2}})()""")
    check('размышления: по умолчанию свёрнуты (вкладка)', th['o1'] is False, th)
    check('размышления: в заголовке счётчик, затем «Размышления»', 'Думает' in th['s1'] and 'симв' in th['s1'] and 'Размышления' in th['s2'], th)
    # --- масштаб предпросмотра
    pg.evaluate("Art.preview('<!doctype html><html><body style=\"font-size:20px\">Привет<h1>Страница</h1></body></html>','Тест','','html')"); pg.wait_for_timeout(900)
    check('предпросмотр: кнопки масштаба есть', pg.locator('.art-z [data-zi]').count() == 1 and pg.locator('.art-z [data-zo]').count() == 1)
    pg.click('.art-z [data-zi]'); pg.wait_for_timeout(500)
    l1 = pg.locator('.art-z [data-zr]').inner_text()
    pg.click('.art-z [data-zi]'); pg.wait_for_timeout(400)
    l2 = pg.locator('.art-z [data-zr]').inner_text()
    pg.click('.art-z [data-zo]'); pg.wait_for_timeout(400)
    l3 = pg.locator('.art-z [data-zr]').inner_text()
    pg.click('.art-z [data-zr]'); pg.wait_for_timeout(400)
    l4 = pg.locator('.art-z [data-zr]').inner_text()
    check('предпросмотр: «+» увеличивает, «−» уменьшает, «100%» сбрасывает', (l1, l2, l3, l4) == ('110%', '120%', '110%', '100%'), (l1, l2, l3, l4))
    pg.screenshot(path=SHOTS + '/q-preview.png')
    check('нет ошибок в консоли', not errs, errs)
    ctx.close(); b.close()
print(f'\nпрошло: {OK}, не прошло: {len(BAD)}', BAD)
sys.exit(1 if BAD else 0)
