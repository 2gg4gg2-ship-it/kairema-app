"""Тест 0.35.0: шрифты встроены (без сети), автосжатие и проверка ключа.
Запуск: python3 -I docs/tests/fonts035.test.py"""
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
 localStorage.setItem('kact','p1');
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',chat(){},shell(){},setOrientation(){}};
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []; ext = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('request', lambda r: ext.append(r.url) if r.url.startswith('http') else None)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove())")
    fonts = pg.evaluate("""(async()=>{await document.fonts.ready;
      await Promise.all(['16px Manrope','600 20px "Space Grotesk"','14px "JetBrains Mono"','16px "Source Serif 4"','italic 16px "Source Serif 4"'].map(f=>document.fonts.load(f,'Аб Ab')));
      return [...document.fonts].map(f=>f.family.replace(/"/g,'')+' '+f.style+' '+f.status)})()""")
    loaded = [f for f in fonts if f.endswith('loaded')]
    check('все 5 начертаний шрифтов загружены из файлов приложения', len(loaded) == 5, fonts)
    check('запросов в интернет за шрифтами нет', not [u for u in ext if 'font' in u], ext)
    # --- автосжатие истории
    pg.evaluate("show('api')"); pg.wait_for_timeout(600)
    r = pg.evaluate("""(async()=>{
      Native.on=true;const calls=[];
      Native.run=(fn,args,cb)=>{const pr=new Promise((res,rej)=>{setTimeout(()=>{
        const sys=JSON.parse(args[0]).system||'';
        if(/compact summaries/.test(sys)){cb('Краткий пересказ беседы');res()}
        else{calls.push(args[1].length);if(calls.length===1)rej(new Error('запрос слишком большой для этой модели (413)'));else{cb('Ответ после сжатия');res()}}},30)});pr.id=calls.length+1;return pr};
      S.apiMsgs.length=0;for(let i=0;i<4;i++){S.apiMsgs.push({r:'u',q:'вопрос '+i,t:'вопрос '+i+' '+'x'.repeat(2000)},{r:'a',t:'ответ '+i+' '+'y'.repeat(2000)})}
      S.apiMsgs.push({r:'u',q:'новый',t:'новый вопрос'});
      const box=document.querySelector('.msgs');await respond(S.apiMsgs,box,'');await new Promise(r=>setTimeout(r,400));
      const m=S.apiMsgs[S.apiMsgs.length-1];return{calls,t:m.t,err:!!m.err,cx:S.apiMsgs.some(x=>x.x&&x.x.cx)}})()""")
    check('413: история сжата и запрос повторён сам, ответ получен', len(r['calls']) == 2 and r['calls'][1] < r['calls'][0] and r['t'] == 'Ответ после сжатия' and r['cx'] and not r['err'], r)
    pg.evaluate("localStorage.setItem('kcauto','0')")
    r = pg.evaluate("""(async()=>{Native.run=(fn,args,cb)=>{const pr=new Promise((res,rej)=>setTimeout(()=>rej(new Error('запрос слишком большой (413)')),20));pr.id=9;return pr};
      S.apiMsgs.forEach(x=>{if(x.x)delete x.x.cx});S.apiMsgs.push({r:'u',q:'ещё',t:'ещё'});const box=document.querySelector('.msgs');await respond(S.apiMsgs,box,'');await new Promise(r=>setTimeout(r,300));
      const m=S.apiMsgs[S.apiMsgs.length-1];return{err:!!m.err,t:m.t.slice(0,60)}})()""")
    check('автосжатие выключено в настройках: ошибка показывается как есть', r['err'], r)
    pg.evaluate("localStorage.removeItem('kcauto')")
    pg.evaluate("show('set')"); pg.wait_for_timeout(700)
    check('настройки: переключатель «Автосжатие истории»', pg.locator('[data-ca]').count() == 1)
    # --- ключ проверяется сам, без нажатия кнопки
    pg.evaluate("Native.on=false;chatProvForm(-1,()=>{})"); pg.wait_for_timeout(900)
    pg.fill('[data-k=name]', 'Test'); pg.evaluate("(()=>{const u=document.querySelector('[data-k=url]');u.value='https://api.example.com/v1';u.dispatchEvent(new Event('input'))})()"); pg.fill('[data-k=key]', 'bad-key-12345')
    pg.wait_for_timeout(3200)
    st = pg.evaluate("document.querySelector('.stat').textContent")
    check('плохой ключ: через пару секунд сам показано «ключ отклонён»', 'отклонён' in st, st)
    pg.fill('[data-k=key]', 'sk-good-key-12345'); pg.wait_for_timeout(3200)
    st = pg.evaluate("document.querySelector('.stat').textContent")
    check('хороший ключ: «Ключ принят», список моделей сам не открывается', 'Ключ принят' in st and pg.locator('.sheet-bg.on').count() == 0, st)
    pg.evaluate("[...document.querySelectorAll('[data-s]')].pop().click()"); pg.wait_for_timeout(600)
    check('кнопка после автопроверки открывает выбор модели сразу', pg.locator('.sheet-bg.on').count() == 1)
    check('нет ошибок', not errs, errs)
    b.close()
print('\nпройдено %d провалено %d %s' % (OK, len(BAD), BAD))
