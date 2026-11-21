"""Тест 0.43.2: терминал не зависает, если остановленная команда не отпускает вывод (на телефоне это был «sleep 100» + Стоп).
Мост подменён: команда «sleep» никогда не завершается и не реагирует на отмену. Запуск: python3 -I docs/tests/term043.test.py
Kotlin-часть (Shell.kt: принудительное завершение через 1,5 с) здесь не проверяется: она компилируется только в CI."""
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
 localStorage.setItem('kact','p1'); window.__ids=[]; window.__cancels=[];
 window.KairemaBridge = {hasKey:()=>true,cancel(id){window.__cancels.push(id)},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',
  shell(id,cmd){window.__ids.push([id,cmd]); if(/sleep/.test(cmd)) return; setTimeout(()=>{KairemaNative.chunk(id,'hi\n\u0001exit:0');KairemaNative.done(id,null)},10)}};
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []; pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_default_timeout(15000)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());Term.activate()"); pg.wait_for_timeout(500)
    pg.evaluate("void Term.run('sleep 100')"); pg.wait_for_timeout(300)
    check('команда запущена, терминал занят', pg.evaluate("Term.busy") is True)
    pg.evaluate("Term.stop()"); pg.wait_for_timeout(600)
    check('отмена передана мосту', len(pg.evaluate("window.__cancels")) == 1)
    check('мост молчит: сразу после Стоп терминал ещё занят', pg.evaluate("Term.busy") is True)
    pg.wait_for_timeout(2600)
    check('через 2,5 с сеанс освобождён принудительно (ввод и Стоп снова работают)', pg.evaluate("Term.busy") is False)
    pg.evaluate("void Term.run('echo hi')"); pg.wait_for_timeout(500)
    check('следующая команда выполняется как обычно', pg.evaluate("Term.busy") is False and any('echo hi' in x[1] for x in pg.evaluate("window.__ids")), pg.evaluate("window.__ids"))
    # позднее завершение старой команды не должно сбросить новую
    pg.evaluate("void Term.run('sleep 200')"); pg.wait_for_timeout(300)
    old = pg.evaluate("window.__ids[0][0]")
    pg.evaluate("KairemaNative.chunk(%r,'\\n\\u0001exit:-1');KairemaNative.done(%r,null)" % (old, old)); pg.wait_for_timeout(300)
    check('позднее завершение прежней команды не освобождает новую', pg.evaluate("Term.busy") is True)
    pg.evaluate("Term.stop()"); pg.wait_for_timeout(3000)
    check('и вторую зависшую команду Стоп тоже освобождает', pg.evaluate("Term.busy") is False)
    check('нет ошибок страницы', not errs, errs)
    b.close()
print('\nИТОГ:', OK, 'ок,', len(BAD), 'провалов')
if BAD: print(BAD); raise SystemExit(1)
