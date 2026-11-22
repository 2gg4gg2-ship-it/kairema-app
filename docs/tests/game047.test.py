"""Тест 0.47.0: игра «Байт-прыгун» в браузере: строка в Настройках, меню, уровни, прыжок тапом, пауза, плашка «Нет сети», поворот экрана, босс.
Запуск: python3 -I docs/tests/game047.test.py [папка_скриншотов]"""
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
    SH = lambda n: pg.screenshot(path=os.path.join(SHOTS, n))
    pg.evaluate("show('set')"); pg.wait_for_timeout(900)
    check('в Настройках есть строка «Байт-прыгун» в группе «Отдых»', pg.evaluate("(()=>{const r=document.querySelector('#v-set [data-game-go]');return !!r&&r.closest('.sx-g')&&r.closest('.sx-g').previousElementSibling.textContent==='Отдых'})()"))
    pg.evaluate("document.querySelector('#v-set').scrollTop=9999;document.querySelector('#v-set .scroll,#v-set .st').scrollTop=9999"); SH('g_settings.png')
    pg.evaluate("document.querySelector('[data-game-go]').click()"); pg.wait_for_timeout(900)
    check('нажатие открывает меню игры', pg.evaluate("!!document.querySelector('.spg.gm .gm-hero h1')"))
    SH('g_menu.png')
    names = pg.evaluate("[...document.querySelectorAll('.gm-btn')].map(b=>b.textContent)")
    check('в меню кнопки: Играть, Уровни, Бесконечный, Звук', len(names) == 4 and names[0].startswith('Играть') and names[3].startswith('Звук'), names)
    pg.evaluate("document.querySelectorAll('.gm-btn')[3].click()"); pg.wait_for_timeout(200)
    check('кнопка звука переключается', 'выкл' in pg.evaluate("document.querySelectorAll('.gm-btn')[3].textContent"))
    pg.evaluate("document.querySelectorAll('.gm-btn')[3].click()")
    pg.evaluate("document.querySelectorAll('.gm-btn')[1].click()"); pg.wait_for_timeout(400)
    check('на экране уровней 10 плиток, открыта только первая', pg.evaluate("[document.querySelectorAll('.gm-lv:not(.gm-boss)').length,[...document.querySelectorAll('.gm-lv:not(.gm-boss)')].filter(b=>!b.disabled).length]") == [10, 1])
    check('босс закрыт до 10-го уровня', pg.evaluate("document.querySelector('.gm-boss').disabled"))
    SH('g_levels.png')
    pg.evaluate("document.querySelector('.gm-lv').click()"); pg.wait_for_timeout(1500)
    check('игровой экран: canvas есть', pg.evaluate("!!document.querySelector('.gm-cv')&&document.querySelector('.gm-cv').width>100"))
    def ink():
        return pg.evaluate("""(()=>{const c=document.querySelector('.gm-cv'),x=c.getContext('2d'),d=x.getImageData(0,0,c.width,c.height).data;const s=new Set();for(let i=0;i<d.length;i+=4*97)s.add(d[i]+','+d[i+1]+','+d[i+2]);return s.size})()""")
    check('на canvas нарисована сцена (больше двух цветов)', ink() > 2)
    SH('g_play.png')
    pg.keyboard.down('Space'); pg.wait_for_timeout(120); pg.keyboard.up('Space'); pg.wait_for_timeout(300)
    box = pg.evaluate("(()=>{const r=document.querySelector('.gm-cv').getBoundingClientRect();return [r.x+r.width/2,r.y+r.height/2]})()")
    pg.mouse.move(*box); pg.mouse.down(); pg.wait_for_timeout(100); pg.mouse.up()
    check('тап по экрану не роняет страницу', not errs, errs[:2])
    # пауза
    pg.click('.gm-pb'); pg.wait_for_timeout(300)
    check('пауза открывает окно с «Продолжить»', pg.evaluate("!!document.querySelector('.gm-ov')&&document.querySelector('.gm-ov').textContent.includes('Продолжить')"))
    SH('g_pause.png')
    pg.evaluate("document.querySelector('.gm-ov .gm-btn.pri').click()"); pg.wait_for_timeout(300)
    check('«Продолжить» закрывает окно паузы', pg.evaluate("!document.querySelector('.gm-ov')"))
    # без нажатий игрок врезается в первое препятствие
    pg.wait_for_timeout(9000)
    ov = pg.evaluate("(document.querySelector('.gm-ov')||{}).textContent||''")
    check('без прыжков игрок проигрывает и видит «Баг победил»', 'Баг победил' in ov, ov[:80])
    SH('g_over.png')
    pg.evaluate("[...document.querySelectorAll('.gm-ov .gm-btn')].find(b=>b.textContent==='Ещё раз').click()"); pg.wait_for_timeout(500)
    check('«Ещё раз» запускает уровень заново', pg.evaluate("!document.querySelector('.gm-ov')&&!!document.querySelector('.gm-cv')"))
    # поворот экрана
    pg.set_viewport_size({'width': 780, 'height': 360}); pg.wait_for_timeout(900)
    check('после поворота canvas подогнан под экран', pg.evaluate("(()=>{const c=document.querySelector('.gm-cv'),r=c.getBoundingClientRect();return Math.abs(c.width/ (Math.min(devicePixelRatio||1,2))-r.width)<2})()"))
    SH('g_land.png')
    pg.set_viewport_size({'width': 360, 'height': 780}); pg.wait_for_timeout(600)
    # назад из игры -> меню, назад из меню -> закрыть
    pg.evaluate("document.querySelector('.spg.gm [data-bk]').click()"); pg.wait_for_timeout(500)
    check('«Назад» в игре ведёт в меню игры', pg.evaluate("!!document.querySelector('.gm-hero')&&!document.querySelector('.gm-cv')"))
    pg.evaluate("document.querySelector('.spg.gm [data-bk]').click()"); pg.wait_for_timeout(700)
    check('«Назад» в меню закрывает игру', pg.evaluate("!document.querySelector('.spg.gm')"))
    # плашка «Нет сети»
    ctx.set_offline(True); pg.wait_for_timeout(700)
    check('при потере сети появляется плашка «Нет сети»', pg.evaluate("!!document.querySelector('.gm-chip')"))
    SH('g_chip.png')
    pg.evaluate("document.querySelector('.gm-chip-go').click()"); pg.wait_for_timeout(800)
    check('«Поиграть» на плашке открывает игру', pg.evaluate("!!document.querySelector('.spg.gm .gm-hero')&&!document.querySelector('.gm-chip')"))
    ctx.set_offline(False)
    # босс
    pg.evaluate("Game.state().u=11"); pg.evaluate("document.querySelectorAll('.gm-btn')[1].click()"); pg.wait_for_timeout(400)
    check('когда открыт 11-й шаг, босс доступен', pg.evaluate("!document.querySelector('.gm-boss').disabled"))
    pg.evaluate("document.querySelector('.gm-boss').click()"); pg.wait_for_timeout(5500)
    check('босс рисуется без ошибок', not errs and pg.evaluate("!!document.querySelector('.gm-cv')"), errs[:2])
    SH('g_boss.png')
    pg.evaluate("document.querySelector('.spg.gm [data-bk]').click()"); pg.wait_for_timeout(300)
    pg.evaluate("document.querySelector('.spg.gm [data-bk]').click()"); pg.wait_for_timeout(500)
    check('ошибок страницы нет', not errs, errs[:3])
    b.close()
print('\nПровалов: %d, успешных: %d' % (len(BAD), OK)); sys.exit(1 if BAD else 0)
