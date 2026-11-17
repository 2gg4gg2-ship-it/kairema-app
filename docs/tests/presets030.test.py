"""Тест 0.30.0: готовые сервисы (адрес подставляется), встроенный поиск модели, глубокое исследование (ход, параллельный поиск, Стоп).
Запуск: python3 -I docs/tests/presets030.test.py [папка_скриншотов]"""
import os, sys, tempfile
from playwright.sync_api import sync_playwright
UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
SHOTS = sys.argv[1] if len(sys.argv) > 1 else tempfile.mkdtemp(prefix='p30')
OK = 0; BAD = []
def check(n, c, i=''):
    global OK
    if c: OK += 1; print('ok  ', n)
    else: BAD.append(n); print('FAIL', n, i)
def init(model, url):
    return r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'%s',url:'%s',ok:true}],s:[{id:'s1',name:'Tavily',url:'https://api.tavily.com/search',ok:true}]}));
 localStorage.setItem('kact','p1');
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',chat(){},shell(){}};
}""" % (model, url)
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(init('deepseek/deepseek-chat:free', 'https://openrouter.ai/api/v1'))
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text and 'ERR_' not in m.text and 'Failed to load resource' not in m.text else None)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    # --- пресеты чат
    pg.evaluate("chatProvForm(-1,()=>{})"); pg.wait_for_timeout(500)
    n = pg.locator('.pre-b').count()
    check('сервисы: список из 17 + «Другой»', n == 18, n)
    check('сервисы: поле адреса скрыто, пока сервис не выбран', not pg.locator('[data-k=url]').is_visible())
    pg.click('.pre-b[data-id=groq]'); pg.wait_for_timeout(200)
    vals = pg.evaluate("({u:document.querySelector('[data-k=url]').value,n:document.querySelector('[data-k=name]').value,vis:!!document.querySelector('[data-k=url]').offsetParent})")
    check('Groq: адрес и название подставились, поле скрыто', vals['u'] == 'https://api.groq.com/openai/v1' and vals['n'] == 'Groq' and not vals['vis'], vals)
    pg.click('.pre-b[data-id=kimi]'); pg.wait_for_timeout(200)
    check('Kimi: имя обновилось на Kimi (Moonshot)', pg.evaluate("document.querySelector('[data-k=name]').value") == 'Kimi (Moonshot)')
    pg.screenshot(path=SHOTS + '/p-form.png')
    pg.fill('[data-k=key]', 'sk-test-12345678'); pg.wait_for_timeout(150)
    check('кнопка «Проверить ключ» активна без ручного ввода адреса', pg.evaluate("!document.querySelector('[data-s]').disabled"))
    pg.click('.pre-b.other'); pg.wait_for_timeout(200)
    vals = pg.evaluate("({u:document.querySelector('[data-k=url]').value,vis:!!document.querySelector('[data-k=url]').offsetParent})")
    check('«Другой сервис»: поле адреса видно и пустое', vals['u'] == '' and vals['vis'], vals)
    allu = pg.evaluate("Presets.ai.map(x=>x.u)")
    check('адреса сервисов: все https и без пробелов', all(u.startswith('https://') and ' ' not in u for u in allu), allu)
    for need in ['https://api.moonshot.ai/v1','https://api.deepseek.com','https://api.groq.com/openai/v1','https://api.sambanova.ai/v1','https://api.cerebras.ai/v1','https://api.together.xyz/v1','https://codestral.mistral.ai/v1','https://api.cometapi.com/v1','https://zenmux.ai/api/v1','https://api.teamorouter.com/v1','https://api.bazaarlink.ai/v1']:
        check('есть адрес ' + need, need in allu)
    # --- пресеты поиск
    pg.evaluate("document.querySelectorAll('.spg').forEach(e=>e.remove());provForm(-1,()=>{},'search')"); pg.wait_for_timeout(500)
    sn = pg.evaluate("[...document.querySelectorAll('.pre-b')].map(x=>x.textContent)")
    check('поиск: Tavily, Brave, Serper, Exa, You.com, Firecrawl', all(x in sn for x in ['Tavily','Brave Search','Serper','Exa','You.com','Firecrawl']), sn)
    pg.click('.pre-b[data-id=exa]'); pg.wait_for_timeout(150)
    check('поиск: Exa подставил адрес', pg.evaluate("document.querySelector('[data-k=url]').value") == 'https://api.exa.ai/search')
    pg.evaluate("document.querySelectorAll('.spg').forEach(e=>e.remove())")
    # --- встроенный поиск модели
    k = pg.evaluate("Tools.webKind()")
    check('OpenRouter: встроенный поиск есть (or)', k == 'or', k)
    check('другие провайдеры: webKind', pg.evaluate("[Tools.webKind({url:'https://api.anthropic.com',model:'claude'}),Tools.webKind({url:'https://api.openai.com/v1',model:'gpt-4o-search-preview'}),Tools.webKind({url:'https://api.openai.com/v1',model:'gpt-4o'}),Tools.webKind({url:'https://api.groq.com/openai/v1',model:'x'})]") == ['anthropic', 'oai', '', ''])
    check('webArg выключен по умолчанию', pg.evaluate("JSON.stringify(Tools.webArg(false))") == '{}')
    pg.evaluate("Tools.setMweb(true)")
    check('webArg при включённой кнопке', pg.evaluate("JSON.stringify(Tools.webArg(false))") == '{"web":"or","webmax":3}')
    check('webArg при исследовании без поиска: 8 источников', pg.evaluate("JSON.stringify(Tools.webArg(true))") == '{"web":"or","webmax":8}')
    pg.evaluate("Tools.setMweb(false)")
    # --- глубокое исследование: ход, параллельность, дубликаты
    r = pg.evaluate("""(async()=>{
      const calls=[];let active=0,maxActive=0;
      Native.cancel=()=>{};
      Native.run=(fn,args,cb)=>{const pr=new Promise(async res=>{
        if(fn==='chat'){cb('["история Python","Python 2026 новости","Python против Go","Python 2026 новости"]');res()}
        else{calls.push(JSON.parse(args[0]));active++;maxActive=Math.max(maxActive,active);await new Promise(r=>setTimeout(r,60));active--;
          const q=args[1];cb(JSON.stringify([{title:'A '+q,url:'https://a.com/x',snippet:'s1'},{title:'B '+q,url:'https://b.com/'+q.length,snippet:'s2'},{title:'C',url:'https://c.com/p',snippet:'s3'}]));res()}});
        pr.id='r'+Math.random();return pr};
      const bd=document.createElement('div');document.body.append(bd);
      const out=await Tools.research(actProv(),{id:'s1',url:'https://api.tavily.com/search'},'Расскажи про Python',bd);
      const st=[...bd.querySelectorAll('.dr-s')].map(x=>x.className.replace('dr-s ',''));
      bd.remove();window.GEN=null;
      return{n:out.src.length,urls:out.src.map(s=>s.url),calls:calls.length,deep:calls.every(c=>c.deep===true),maxActive,st,serr:out.serr,stopped:!!out.stopped}})()""")
    check('исследование: источники без повторов и не больше 12', r['n'] >= 3 and len(set(r['urls'])) == r['n'] and r['n'] <= 12, r)
    check('исследование: запросы выполняются параллельно (до 3)', 1 < r['maxActive'] <= 3, r)
    check('исследование: поиск идёт в глубоком режиме', r['deep'] and r['calls'] >= 4, r)
    check('исследование: шаги: план, поиск, отбор выполнены, отчёт идёт', r['st'] == ['done', 'done', 'done', 'active'], r['st'])
    # Стоп
    r2 = pg.evaluate("""(async()=>{
      Native.cancel=()=>{};
      Native.run=(fn,args,cb)=>{const pr=new Promise(async res=>{if(fn==='chat'){cb('["a b","c d","e f","g h"]');res()}else{await new Promise(r=>setTimeout(r,200));cb('[]');res()}});pr.id='x';return pr};
      const bd=document.createElement('div');document.body.append(bd);
      const p=Tools.research(actProv(),{id:'s1',url:'https://api.tavily.com/search'},'тест стоп',bd);
      await new Promise(r=>setTimeout(r,120));window.GEN.stop();const out=await p;bd.remove();window.GEN=null;return{stopped:!!out.stopped}})()""")
    check('исследование: «Стоп» останавливает', r2['stopped'] is True, r2)
    # без провайдера поиска и без встроенного поиска
    r3 = pg.evaluate("""(async()=>{const bd=document.createElement('div');document.body.append(bd);
      const out=await Tools.research({url:'https://api.groq.com/openai/v1',model:'x',id:'p'},null,'вопрос',bd);bd.remove();window.GEN=null;return{serr:out.serr,n:out.src.length}})()""")
    check('исследование без поиска: понятная причина', 'нужен провайдер поиска' in r3['serr'] and r3['n'] == 0, r3)
    r4 = pg.evaluate("""(async()=>{Native.run=(fn,args,cb)=>{const pr=Promise.resolve();pr.id='z';return pr};const bd=document.createElement('div');document.body.append(bd);
      const out=await Tools.research(actProv(),null,'вопрос',bd);bd.remove();window.GEN=null;return{native:out.native,serr:out.serr}})()""")
    check('исследование без поиска, но у OpenRouter: ищет сама модель', r4['native'] is True and r4['serr'] == '', r4)
    # --- меню «+»: плитки
    pg.evaluate("Tools.open({pick(){}})"); pg.wait_for_timeout(500)
    names = pg.evaluate("[...document.querySelectorAll('.tm-tile')].map(x=>x.querySelector('.tm-n').textContent+'|'+x.classList.contains('off'))")
    check('меню: плитка «Поиск модели» доступна у OpenRouter', 'Поиск модели|false' in names, names)
    check('меню: «Глубокое исследование» доступно', 'Глубокое исследование|false' in names, names)
    pg.screenshot(path=SHOTS + '/p-menu.png')
    check('нет ошибок в консоли', not errs, errs)
    ctx.close()
    # у провайдера без встроенного поиска плитка серая
    ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(init('llama-3.3-70b', 'https://api.groq.com/openai/v1'))
    pg = ctx.new_page(); pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("Tools.open({pick(){}})"); pg.wait_for_timeout(500)
    names = pg.evaluate("[...document.querySelectorAll('.tm-tile')].map(x=>x.querySelector('.tm-n').textContent+'|'+x.classList.contains('off'))")
    check('Groq: «Поиск модели» серая (нет встроенного поиска)', 'Поиск модели|true' in names, names)
    ctx.close(); b.close()
print(f'\nпрошло: {OK}, не прошло: {len(BAD)}', BAD)
sys.exit(1 if BAD else 0)
