"""Тест 0.30.1: размышления шагами, поворот экрана предпросмотра, новые сервисы.
Запуск: python3 -I docs/tests/steps0301.test.py"""
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
 window.__or=[]; window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',chat(){},shell(){},setOrientation(m){window.__or.push(m)}};
}"""
T = "**Разбор списка пунктов из запроса**\nСначала смотрю, что просит пользователь.\n\nПроверяю прокрутку чата. Это важно, потому что чат тянет вниз.\n\n# Правка автопрокрутки\nДелаю прокрутку, которая следует только у низа.\n\nПроверяю итог и пишу ответ пользователю"
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    st = pg.evaluate("Tools.steps(%r).map(x=>x.t)" % T)
    check('шаги: 4 заголовка', len(st) == 4, st)
    check('шаги: берётся жирный заголовок и # заголовок', st[0] == 'Разбор списка пунктов из запроса' and st[2] == 'Правка автопрокрутки', st)
    check('шаги: без абзаца-простыни в заголовке (<=71 символ)', all(len(x) <= 71 for x in st), st)
    r = pg.evaluate("""(async()=>{
      const box=document.createElement('div');box.className='msgs';const d=document.createElement('div');d.className='msg';d.innerHTML='<div class="bd"></div>';box.append(d);document.body.append(box);
      const m={};Tools.thought(d,m,%r);await new Promise(r=>setTimeout(r,80));
      const e=d.querySelector('details.think');const sum=e.querySelector('summary').textContent;const n=e.querySelectorAll('.tk-st').length;
      const vis=getComputedStyle(e.querySelector('.tk-b')).display;
      e.open=true;e.querySelector('.tk-h').click();const vis2=getComputedStyle(e.querySelector('.tk-b')).display;
      Tools.thought(d,m,'\\n\\nЕщё один шаг рассуждения');await new Promise(r=>setTimeout(r,80));
      const n2=e.querySelectorAll('.tk-st').length,open1=e.querySelector('.tk-st').classList.contains('open');
      Tools.thoughtDone(d);const done=e.querySelector('summary').textContent;box.remove();
      return{sum,n,vis,vis2,n2,open1,done}})()""" % T)
    check('сводка: последний шаг и счётчик шагов', 'Проверяю итог' in r['sum'] and 'шагов' in r['sum'] and 'Думает' in r['sum'], r)
    check('4 шага в списке, текст шага скрыт', r['n'] == 4 and r['vis'] == 'none', r)
    check('нажатие открывает текст шага, при добавлении он остаётся открытым', r['vis2'] != 'none' and r['n2'] == 5 and r['open1'], r)
    check('по окончании: «Размышления», без последнего шага в строке', 'Размышления' in r['done'], r)
    # поворот
    game = '<!doctype html><canvas id=c></canvas><script>function f(){requestAnimationFrame(f)}f();addEventListener("keydown",()=>{})</script>'
    pg.evaluate("window.__or=[]")
    pg.evaluate("Art.preview(%r,'Змейка','','html')" % game); pg.wait_for_timeout(900)
    check('игра: предпросмотр просит горизонтальный экран', pg.evaluate("window.__or") == ['landscape'], pg.evaluate("window.__or"))
    pg.click('[data-bk]'); pg.wait_for_timeout(700)
    check('закрытие предпросмотра возвращает вертикальный экран', pg.evaluate("window.__or")[-1] == 'portrait', pg.evaluate("window.__or"))
    pg.evaluate("window.__or=[]")
    pg.evaluate("Art.preview('<!doctype html><h1>Резюме</h1>','Резюме','','html')"); pg.wait_for_timeout(900)
    check('обычная страница: поворота нет', pg.evaluate("window.__or") == [], pg.evaluate("window.__or"))
    pg.click('.art-rot'); pg.wait_for_timeout(200)
    check('кнопка поворота включает горизонтальный экран вручную', pg.evaluate("window.__or") == ['landscape'])
    pg.click('.art-rot'); pg.wait_for_timeout(200)
    check('и выключает', pg.evaluate("window.__or")[-1] == 'portrait')
    ids = pg.evaluate("[Presets.ai.map(x=>x.id),Presets.search.map(x=>x.id)]")
    check('сервисы: Token Harbor, NaraRouter, Haimaker, Keiro, GoRouter, Keiro поиск', all(x in ids[0] for x in ['tokenharbor','nara','haimaker','keiro','gurouter']) and 'keirosearch' in ids[1], ids)
    check('нет ошибок', not errs, errs)
    b.close()
print('\nпройдено %d провалено %d %s' % (OK, len(BAD), BAD))
