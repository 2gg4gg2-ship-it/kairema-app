"""Тест 0.34.0: дизайн-слой, большая вставка, переписка без провайдера, обрыв ответа.
Запуск: python3 -I docs/tests/design034.test.py [папка_скриншотов]"""
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
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}, device_scale_factor=2); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove())")
    # --- дизайн: мозаика настроек и стартовые плитки
    pg.evaluate("show('set')"); pg.wait_for_timeout(700)
    pg.evaluate("S.apiMsgs.length=0;show('api')"); pg.wait_for_timeout(300)
    pg.evaluate("show('set');show('api')"); pg.wait_for_timeout(900)
    t = pg.evaluate("({n:document.querySelectorAll('.dz-t').length,w:[...document.querySelectorAll('.dz-t')].map(x=>Math.round(x.getBoundingClientRect().width))})")
    check('пустой чат: 5 плиток, первая широкая', t['n'] == 5 and t['w'][0] > t['w'][1], t)
    pg.click('.dz-t >> nth=0'); pg.wait_for_timeout(200)
    check('плитка вставляет заготовку в поле ввода', pg.input_value('.cmp textarea').startswith('Написать код'), pg.input_value('.cmp textarea'))
    # --- большая вставка не отправляет сообщение
    pg.evaluate("window.__sent=0;Chat.cmp.setText('')"); pg.fill('.cmp textarea', 'x' * 5000 + '\n' + 'y' * 5000); pg.keyboard.press('Enter'); pg.wait_for_timeout(300)
    check('Enter после большой вставки не отправляет', pg.input_value('.cmp textarea').count('x') == 5000 and pg.evaluate("S.apiMsgs.length") == 0, pg.evaluate("S.apiMsgs.length"))
    # --- провайдера удалили: переписка видна
    pg.evaluate("S.apiMsgs.push({r:'u',q:'Привет',t:'Привет'},{r:'a',t:'Здравствуйте'});S.providers.length=0;apiView()"); pg.wait_for_timeout(500)
    check('без провайдера переписка остаётся на экране', pg.locator('.msg').count() >= 2 and pg.locator('#btn-connect-provider').count() == 1, pg.locator('.msg').count())
    # --- обрыв: метка \u0003 и сохранение написанного при ошибке связи
    pg.evaluate("S.providers.push({id:'p1',name:'X',model:'m',url:'https://api.groq.com/openai/v1',ok:true});S.apiMsgs.length=0;show('api')"); pg.wait_for_timeout(500)
    r = pg.evaluate("""(async()=>{
      Native.run=(fn,args,cb)=>{const pr=new Promise((res,rej)=>{setTimeout(()=>{cb('Начало ответа ');cb('\\u0003');setTimeout(res,20)},30)});pr.id=1;return pr};
      const box=document.querySelector('.msgs');S.apiMsgs.push({r:'u',q:'q',t:'q'});await respond(S.apiMsgs,box,'');
      await new Promise(r=>setTimeout(r,300));return{cont:!!document.querySelector('.stp-c'),t:S.apiMsgs[S.apiMsgs.length-1].t,cut:S.apiMsgs[S.apiMsgs.length-1].cut}})()""")
    check('лимит длины: текст сохранён, есть «Продолжить»', r['cont'] and r['t'].startswith('Начало') and r['cut'], r)
    r = pg.evaluate("""(async()=>{
      Native.run=(fn,args,cb)=>{const pr=new Promise((res,rej)=>{setTimeout(()=>{cb('Половина ответа');setTimeout(()=>rej(new Error('network')),20)},30)});pr.id=2;return pr};
      const box=document.querySelector('.msgs');S.apiMsgs.push({r:'u',q:'q2',t:'q2'});await respond(S.apiMsgs,box,'');
      await new Promise(r=>setTimeout(r,300));const m=S.apiMsgs[S.apiMsgs.length-1];return{t:m.t,err:!!m.err,cont:document.querySelectorAll('.stp-c').length}})()""")
    check('обрыв связи: написанный текст не затёрт ошибкой', r['t'].startswith('Половина') and not r['err'] and r['cont'] >= 1, r)
    check('нет ошибок', not errs, errs)
    b.close()
print('\nпройдено %d провалено %d %s  скриншоты: %s' % (OK, len(BAD), BAD, SHOTS))
