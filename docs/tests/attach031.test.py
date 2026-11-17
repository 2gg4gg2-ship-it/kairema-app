"""Тест 0.31.0: вложения через Kotlin-мост (подменён), PDF для не-Anthropic модели, скан PDF картинками, меню «+».
Запуск: python3 -I docs/tests/attach031.test.py [папка_скриншотов]"""
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
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'x/y:free',url:'https://x/v1',ok:true}],s:[]}));
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

    # --- фото из галереи через Kotlin-мост ---
    set_pick([{'n': 'photo.jpg', 'm': 'image/jpeg', 'k': 'f1', 'd': RED}])
    pick('Фото')
    check('фото из галереи прикреплено (миниатюра в поле ввода)', pg.evaluate("document.querySelectorAll('.cmp .ap.im').length") == 1)
    check('миниатюра показывает картинку, а не пустой файл', pg.evaluate("(()=>{const i=document.querySelector('.cmp .ap.im img');return i&&i.src.startsWith('blob:')})()"))
    # несколько кусков одного файла
    big = base64.b64encode(os.urandom(100000)).decode()
    set_pick([{'n': 'many.bin', 'm': 'application/octet-stream', 'k': 'f2', 'd': big}])
    pick('Файл')
    names = pg.evaluate("[...document.querySelectorAll('.cmp .ap b')].map(x=>x.textContent)")
    check('файл из нескольких кусков собран', 'many.bin' in names, names)
    pg.evaluate("document.querySelectorAll('.cmp .ap .rm').forEach(b=>b.click())")

    # --- PDF и не-Anthropic модель: текст попадает в запрос ---
    set_pick([{'n': 'report.pdf', 'm': 'application/pdf', 'k': 'k1', 'pk': 'abc123', 'd': b64f('chrome.pdf')}])
    pick('Файл')
    pg.fill('#v-api textarea', 'Кратко перескажи файл')
    pg.evaluate("document.querySelector('#v-api .send').click()"); pg.wait_for_timeout(1500)
    msgs = pg.evaluate("JSON.stringify(window.__chat.map(c=>c.msgs))")
    check('PDF для не-Anthropic: текст файла ушёл модели', 'Выручка за квартал выросла на 12%' in msgs, msgs[:300])
    check('PDF: приложение не пишет «поддерживается только Anthropic»', 'только провайдером Anthropic' not in msgs)
    check('PDF с текстом не просит картинки страниц', pg.evaluate("window.__pages||0") == 0)

    # --- скан PDF: страницы уходят картинками ---
    pg.evaluate("window.__chat.length=0")
    set_pick([{'n': 'scan.pdf', 'm': 'application/pdf', 'k': 'k2', 'pk': 'def456', 'd': b64f('scan.pdf')}])
    pick('Файл')
    pg.fill('#v-api textarea', 'Что на скане?')
    pg.evaluate("document.querySelector('#v-api .send').click()"); pg.wait_for_timeout(1500)
    msgs = pg.evaluate("JSON.stringify(window.__chat.map(c=>c.msgs))")
    check('скан PDF: Kotlin попросили нарисовать страницы', pg.evaluate("window.__pages||0") == 1)
    check('скан PDF: картинка страницы в запросе', 'data:image/jpeg;base64,' in msgs, msgs[:200])

    # --- запрос чата помечен для уведомления «ответ готов» ---
    notify = pg.evaluate("window.__chat.map(c=>c.prov.notify)")
    check('основной запрос чата с notify=1 (Kotlin пришлёт уведомление, если приложение свёрнуто)', notify and notify[0] == 1, notify)
    # --- без моста работает прежний выбор ---
    pg.evaluate("window.KairemaAttach=undefined")
    check('без моста Attach.pick возвращает false (остаётся <input type=file>)', pg.evaluate("Attach.pick('g',()=>{})") is False)
    check('ошибок страницы нет', not errs, errs[:3])
    b.close()
print('\nПровалов: %d, успешных: %d' % (len(BAD), OK)); sys.exit(1 if BAD else 0)
