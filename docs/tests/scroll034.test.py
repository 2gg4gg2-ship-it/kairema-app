"""Тест 0.34.2: чат не тянет вниз, пока читатель листает вверх; следует, пока он внизу; палец на экране не двигает чат.
Запуск: python3 -I docs/tests/scroll034.test.py"""
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
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',chat(){},shell(){},setOrientation(){}};
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove())")
    R = pg.evaluate("""(async()=>{
      const w=ms=>new Promise(r=>setTimeout(r,ms));
      const box=document.createElement('div');box.className='msgs';box.style.cssText='position:fixed;left:0;top:0;width:360px;height:400px;overflow:auto;z-index:999;background:#fff';
      const bd=document.createElement('div');box.append(bd);document.body.append(box);
      const grow=n=>{for(let i=0;i<n;i++){const p=document.createElement('p');p.textContent='строка '+bd.childElementCount;p.style.cssText='margin:0;height:30px';bd.append(p)}};
      const out={};
      grow(60);scr(box);await w(50);
      out.atBottom=box.scrollHeight-box.scrollTop-box.clientHeight<2;
      grow(5);scl(box);await w(50);out.follow=box.scrollHeight-box.scrollTop-box.clientHeight<2;
      box.scrollTop=300;await w(80);          // читатель потянул вверх
      grow(5);scl(box);await w(50);out.stay=box.scrollTop===300;
      grow(5);scl(box);await w(50);out.stay2=box.scrollTop===300;
      box.scrollTop=1e6;await w(80);           // вернулся вниз
      grow(5);scl(box);await w(50);out.back=box.scrollHeight-box.scrollTop-box.clientHeight<2;
      box.dispatchEvent(new Event('touchstart'));grow(5);const before=box.scrollTop;scl(box);await w(50);out.touchHold=box.scrollTop===before;
      box.dispatchEvent(new Event('touchend'));await w(750);grow(1);scl(box);await w(50);out.afterTouch=box.scrollHeight-box.scrollTop-box.clientHeight<2;
      return out})()""")
    check('открыли чат: в самом низу', R['atBottom'], R)
    check('пока читатель внизу, чат следует за текстом', R['follow'], R)
    check('потянул вверх: чат не двигается', R['stay'] and R['stay2'], R)
    check('вернулся вниз: снова следует', R['back'], R)
    check('палец на экране: чат не двигается', R['touchHold'], R)
    check('палец убрали: через 0,6 с следование возвращается', R['afterTouch'], R)
    check('нет ошибок', not errs, errs)
    b.close()
print('\nпройдено %d провалено %d %s' % (OK, len(BAD), BAD))
