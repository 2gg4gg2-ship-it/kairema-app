"""Тест 0.36.0: вибро, звуки, шкала контекста.
Запуск: python3 -I docs/tests/feel036.test.py"""
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
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'claude-sonnet-4',url:'https://api.anthropic.com/v1',ok:true}],s:[]}));
 localStorage.setItem('kact','p1');
 window.__h=[];window.__osc=0;
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',chat(){},shell(){},setOrientation(){},haptic(n,l){window.__h.push(n+':'+l)}};
 const AC=function(){this.currentTime=0;this.state='running';this.destination={};this.resume=()=>{};
  this.createGain=()=>({gain:{value:1,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){}});
  this.createOscillator=()=>{window.__osc++;return{frequency:{},connect(){},start(){},stop(){}}}};
 window.AudioContext=AC;
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove())")
    pg.evaluate("S.apiMsgs.length=0;show('api')"); pg.wait_for_timeout(800)
    # --- вибро
    pg.evaluate("window.__h.length=0;Hooks.run('chat:answer',{},document.body)"); 
    check('конец ответа: вибро done', pg.evaluate("window.__h")[:1] == ['done:1'], pg.evaluate("window.__h"))
    pg.evaluate("window.__h.length=0;Log.add('chat','тест ошибка')")
    check('ошибка ответа: вибро error', pg.evaluate("window.__h") == ['error:1'], pg.evaluate("window.__h"))
    pg.wait_for_timeout(150); pg.evaluate("window.__h.length=0;Feel.tick();Feel.tick()")
    check('два тика подряд слипаются в один', len(pg.evaluate("window.__h")) == 1, pg.evaluate("window.__h"))
    # --- звуки
    pg.evaluate("window.__osc=0;Feel.done()")
    check('звук окончания: две ноты', pg.evaluate("window.__osc") == 2, pg.evaluate("window.__osc"))
    pg.evaluate("window.__osc=0;Feel.error()")
    check('звук ошибки: две ноты', pg.evaluate("window.__osc") == 2)
    pg.evaluate("window.__osc=0;Feel.send()")
    check('звук отправки: одна короткая нота', pg.evaluate("window.__osc") == 1)
    # --- настройки
    pg.evaluate("show('set')"); pg.wait_for_timeout(700)
    check('настройки: строки «Вибро» и «Звуки»', pg.locator('[data-feel]').count() == 1 and pg.locator('[data-feels]').count() == 1)
    pg.evaluate("document.querySelector('[data-feel]').click()")  # 1 -> 2
    check('«Вибро» переключается на «Обычная»', pg.evaluate("document.querySelector('[data-feel] small').textContent") == 'Обычная')
    pg.evaluate("document.querySelector('[data-feel]').click()")  # -> 0
    pg.evaluate("window.__h.length=0;Hooks.run('chat:answer',{},document.body)")
    check('вибро выключено: вибрации нет', pg.evaluate("window.__h").count('done:0') == 0 and not [x for x in pg.evaluate("window.__h") if x.startswith('done')], pg.evaluate("window.__h"))
    pg.evaluate("document.querySelector('[data-feels]').click();document.querySelector('[data-feels]').click()")  # 1->2->0
    pg.evaluate("window.__osc=0;Feel.done()")
    check('звуки выключены: нот нет', pg.evaluate("window.__osc") == 0)
    check('настройки сохранены', pg.evaluate("JSON.parse(localStorage.getItem('kairema.feel.v1')).s") == 0)
    pg.evaluate("localStorage.removeItem('kairema.feel.v1')")
    # --- шкала контекста
    pg.evaluate("S.apiMsgs.length=0;show('api')"); pg.wait_for_timeout(600)
    check('пустой чат: шкалы не видно', pg.evaluate("getComputedStyle(document.querySelector('.cxb')).display") == 'none')
    pg.evaluate("S.apiMsgs.push({r:'u',q:'a',t:'x'.repeat(60000)},{r:'a',t:'y'.repeat(60000)});CtxBar.open&&0")
    pg.wait_for_timeout(2300)
    w = pg.evaluate("document.querySelector('.cxb').dataset.w")
    check('окно Claude = 200k', w == '200000', w)
    txt = pg.evaluate("document.querySelector('.cxb span').textContent")
    wd = pg.evaluate("document.querySelector('.cxb em i').style.width")
    check('120 тыс. знаков ≈ 40k токенов = 20%: шкала есть, подписи нет', wd == '20%' and txt == '', (wd, txt))
    pg.evaluate("S.apiMsgs.push({r:'u',q:'b',t:'x'.repeat(420000)})"); pg.wait_for_timeout(2300)
    check('больше 80%: красная шкала и подпись «Контекст»', pg.evaluate("document.querySelector('.cxb').classList.contains('hot')") and 'Контекст' in pg.evaluate("document.querySelector('.cxb span').textContent"))
    pg.click('.cxb'); pg.wait_for_timeout(500)
    check('нажатие на шкалу открывает окно с кнопками', pg.locator('.sheet [data-c]').count() == 1 and pg.locator('.sheet [data-n]').count() == 1)
    pg.evaluate("document.querySelector('.sheet [data-n]').click()"); pg.wait_for_timeout(700)
    check('«Новый чат»: история пуста, шкала скрыта', pg.evaluate("S.apiMsgs.length") == 0 and pg.evaluate("getComputedStyle(document.querySelector('.cxb')).display") == 'none', pg.evaluate("S.apiMsgs.length"))
    # размер окна от провайдера
    pg.evaluate("Caps.learn('p1',[{id:'claude-sonnet-4',cl:64000}])")
    pg.evaluate("S.apiMsgs.push({r:'u',q:'a',t:'x'.repeat(30000)})"); pg.wait_for_timeout(2300)
    check('окно от провайдера (64k) важнее догадки по имени', pg.evaluate("document.querySelector('.cxb').dataset.w") == '64000', pg.evaluate("document.querySelector('.cxb').dataset.w"))
    check('ошибок страницы нет', not errs, errs)
    b.close()
print('пройдено', OK, 'провалено', len(BAD), BAD)
