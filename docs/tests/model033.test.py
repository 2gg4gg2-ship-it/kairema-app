"""Тест 0.33.0: «кто ты» (факты о модели в подсказке), просмотр вложений в поле ввода, метка «Поиск» у моделей и подписи в меню «+».
Запуск: python3 -I docs/tests/model033.test.py [папка_скриншотов]"""
import os, sys, json, base64, tempfile
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__))
UI = os.path.abspath(os.path.join(HERE, '../../app/src/main/assets/ui/index.html'))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='at')
def b64f(n): return base64.b64encode(open(os.path.join(HERE, 'fixtures', n), 'rb').read()).decode()
RED = base64.b64encode(__import__('io').BytesIO(b'').getvalue()).decode()
# маленький настоящий JPEG 40x30 (красный), чтобы createImageBitmap его прочитал
import io
from PIL import Image
_b = io.BytesIO(); Image.new('RGB', (40, 30), (200, 30, 30)).save(_b, 'JPEG'); RED = base64.b64encode(_b.getvalue()).decode()
OK = 0; BAD = []
def check(n, c, i=''):
    global OK
    if c: OK += 1; print('ok  ', n)
    else: BAD.append(n); print('FAIL', n, i)
INIT = r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'OpenRouter',model:'cohere/north-mini-code:free',url:'https://openrouter.ai/api/v1',ok:true}],s:[]}));
 localStorage.setItem('kact','p1');
 window.__chat = []; window.__pickFiles = [];
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText(){return true},saveKey(){},deleteKey(){},termuxStatus:()=>'{}',shell(){},
  chat(tok,id,prov,msgs){ window.__chat.push({prov:JSON.parse(prov),msgs:JSON.parse(msgs)}); setTimeout(()=>{KairemaNative.chunk(id,'готово');KairemaNative.done(id,null)},20) },
  models(tok,id){ setTimeout(()=>{KairemaNative.chunk(id,'[]');KairemaNative.done(id,null)},5) }};
 /* Kotlin-мост вложений: отдаёт заранее заданные файлы теми же кусками, что Attach.kt */
 window.KairemaAttach = {
  attachPick(tok,id,kind){ const list = window.__pickFiles.shift() || [];
    setTimeout(()=>{ for (const f of list) { const d=f.d, N=Math.ceil(d.length/60000)||1;
        for (let i=0;i<N;i++) KairemaNative.chunk(id, JSON.stringify({n:f.n,m:f.m,k:f.k,pk:f.pk||'',i:i,c:N,d:d.slice(i*60000,(i+1)*60000)})) }
      KairemaNative.done(id,null) },10) },
  pdfPages(tok,id,key,max){ window.__pages = (window.__pages||0)+1; setTimeout(()=>{ KairemaNative.chunk(id, JSON.stringify({i:0,n:1,d:window.__RED})); KairemaNative.done(id,null) },10) }
 };
}
"""
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append('PAGE ' + str(e)))
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("window.__RED=%s; KairemaNative.tok('T')" % json.dumps(RED))
    pg.evaluate("Chx.load&&Chx.load(); Chx.open(Chx.fresh()); show('api')"); pg.wait_for_timeout(500)
    def set_pick(lst): pg.evaluate("window.__pickFiles.push(%s)" % json.dumps(lst))
    def pick(tile):
        pg.click('[data-plus]'); pg.wait_for_timeout(500)
        pg.evaluate("[...document.querySelectorAll('.tm-tile')].find(b=>b.textContent.includes(%s)).click()" % json.dumps(tile))
        pg.wait_for_timeout(900)

    # --- 1. подсказка: честное имя модели и что включено ---
    pg.fill('#v-api textarea', 'Кто ты?')
    pg.evaluate("document.querySelector('#v-api .send').click()"); pg.wait_for_timeout(1200)
    sysp = pg.evaluate("window.__chat.length?window.__chat[0].prov.system:''")
    check('в подсказке есть точный id модели', 'cohere/north-mini-code:free' in sysp, sysp[-300:])
    check('в подсказке есть имя провайдера', 'OpenRouter' in sysp)
    check('в подсказке сказано, умеет ли модель Think и есть ли поиск', 'Think button' in sysp and 'built-in web search' in sysp)
    check('для OpenRouter у модели есть встроенный поиск (yes)', 'built-in web search for this model: yes' in sysp, sysp[-200:])
    check('подсказка запрещает выдумывать другую модель', 'Do not claim to be another model' in sysp)

    # --- 2. просмотр вложений до отправки ---
    set_pick([{'n': 'photo.jpg', 'm': 'image/jpeg', 'k': 'f1', 'd': RED}])
    pick('Фото')
    pg.click('.cmp .ap.im'); pg.wait_for_timeout(500)
    check('нажатие на фото в поле ввода открывает просмотр', pg.evaluate("!!document.querySelector('.attv img')"))
    check('в просмотре фото из поля ввода нет «Сохранить/Поделиться» (нет данных base64)', pg.evaluate("!document.querySelector('.attv [data-s]')"))
    pg.evaluate("document.querySelector('.attv [data-x]').click()"); pg.wait_for_timeout(400)
    pg.evaluate("document.querySelectorAll('.cmp .ap .rm').forEach(b=>b.click())")
    set_pick([{'n': 'note.txt', 'm': 'text/plain', 'k': 'f3', 'd': base64.b64encode('Привет, это текст файла'.encode()).decode()}])
    pick('Файл')
    pg.click('.cmp .ap:not(.im)'); pg.wait_for_timeout(600)
    check('нажатие на текстовый файл показывает его текст', pg.evaluate("(document.querySelector('.attt')||{}).textContent||''") .startswith('Привет'))
    pg.keyboard.press('Escape'); pg.evaluate("document.querySelectorAll('.sheet-bg,.sh-bg').forEach(x=>x.click())"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelectorAll('.cmp .ap .rm').forEach(b=>b.click())")
    set_pick([{'n': 'report.pdf', 'm': 'application/pdf', 'k': 'k1', 'pk': 'abc123', 'd': b64f('chrome.pdf')}])
    pick('Файл')
    pg.click('.cmp .ap:not(.im)'); pg.wait_for_timeout(1200)
    check('нажатие на PDF показывает страницы (Kotlin)', pg.evaluate("document.querySelectorAll('.attv-pg img').length") >= 1)
    pg.screenshot(path=os.path.join(SHOTS, 'pdf_view.png'))
    pg.evaluate("document.querySelector('.attv-pg [data-x]').click()"); pg.wait_for_timeout(400)
    check('крестик закрывает просмотр PDF', pg.evaluate("!document.querySelector('.attv-pg')"))
    check('удаление вложения (крестик) всё ещё работает и не открывает просмотр', pg.evaluate("(()=>{document.querySelector('.cmp .ap .rm').click();return document.querySelectorAll('.cmp .ap').length===0&&!document.querySelector('.attv')})()"))

    # --- 3. метка «Поиск» в списке моделей ---
    pg.evaluate("pickModel([{id:'a/b'},{id:'c/d'}],'a/b',()=>{},{url:'https://openrouter.ai/api/v1'})"); pg.wait_for_timeout(600)
    tags = pg.evaluate("[...document.querySelectorAll('.mdl-tag.cap')].map(x=>x.textContent)")
    check('у моделей OpenRouter в списке есть метка «Поиск»', 'Поиск' in tags, tags)
    pg.evaluate("document.querySelectorAll('.sheet-bg,.sh-bg').forEach(x=>x.click())"); pg.wait_for_timeout(300)
    check('webKind: для обычного адреса пусто, для OpenRouter or, для Claude anthropic',
          pg.evaluate("[Tools.webKind({url:'https://x/v1',model:'m'}),Tools.webKind({url:'https://openrouter.ai/api/v1',model:'m'}),Tools.webKind({url:'https://api.anthropic.com/v1',model:'claude-x'})].join()") == ',or,anthropic')
    # --- 4. подписи в меню «+» ---
    pg.click('[data-plus]'); pg.wait_for_timeout(600)
    txt = pg.evaluate("document.body.innerText")
    check('в меню «+» написано про Think и про поиск модели', ('Think' in txt) and ('поиск у модели есть' in txt or 'Своего поиска' in txt), txt[-300:])
    check('ошибок страницы нет', not errs, errs[:3])
    b.close()
print('\nПровалов: %d, успешных: %d' % (len(BAD), OK)); sys.exit(1 if BAD else 0)
