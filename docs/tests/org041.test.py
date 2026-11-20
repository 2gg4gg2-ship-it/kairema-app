"""Тест 0.41.0: теги чатов и закладки (organize), команды (cmds), доступность (a11y). Мост подменён."""
import os, json
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
  window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',setOrientation(){}};
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_default_timeout(15000)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());show('api')"); pg.wait_for_timeout(500)

    # ---- данные: три чата ----
    pg.evaluate("""(()=>{Chx.load();Chx.list=[];
      const mk=(id,t,ans)=>({id,title:t,named:1,pinned:0,ts:Date.now()-(+id.slice(1))*1000,msgs:[{r:'u',q:'Вопрос '+t,t:'Вопрос '+t},{r:'a',t:ans}]});
      Chx.list.push(mk('c1','Работа','Это длинный ответ про работу. Вот код:\\n```js\\nconsole.log(1)\\n```\\nИ ссылка https://example.com тут.'));
      Chx.list.push(mk('c2','Рецепты','Борщ варят так.'));Chx.list.push(mk('c3','Код','Привет, это ответ про код.'));
      Chx.open(Chx.list[0]);Chx.persist();apiView()})();0""")
    pg.wait_for_timeout(700)

    # ---- закладки ----
    check('под ответом есть звёздочка ', pg.locator('#v-api .msg-act [data-bm]').count() == 1)
    pg.locator('[data-bm]').click(); pg.wait_for_timeout(300)
    bm = pg.evaluate("JSON.parse(localStorage.getItem('kairema.bm.v1'))")
    check('закладка сохранена (чат, начало текста)', len(bm) == 1 and bm[0]['c'] == 'c1' and bm[0]['p'].startswith('Это длинный ответ'), bm)
    check('звёздочка подсвечена и aria-pressed', 'on' in pg.locator('[data-bm]').get_attribute('class') and pg.locator('[data-bm]').get_attribute('aria-pressed') == 'true')
    pg.evaluate("Chx.open(Chx.list[1]);apiView()"); pg.wait_for_timeout(500)
    check('в другом чате закладки нет (звёздочка не горит)', 'on' not in (pg.locator('[data-bm]').get_attribute('class') or ''))
    pg.evaluate("Org.screen()"); pg.wait_for_timeout(700)
    check('экран «Закладки»: одна запись', pg.locator('[data-screen=marks] .pv').count() == 1 and 'Работа' in pg.locator('[data-screen=marks] .pv').inner_text())
    pg.locator('[data-screen=marks] .pv').click(); pg.wait_for_timeout(1000)
    check('нажатие открывает чат «Работа» и подсвечивает сообщение', pg.evaluate("Chx.cur.id")=='c1' and pg.locator('.msg.orgh').count() == 1, pg.evaluate("Chx.cur.id"))
    pg.locator('[data-bm]').click(); pg.wait_for_timeout(200)
    check('повторное нажатие снимает закладку', pg.evaluate("JSON.parse(localStorage.getItem('kairema.bm.v1')).length") == 0)
    pg.evaluate("Org.screen()"); pg.wait_for_timeout(600)
    check('пустой экран закладок с подсказкой', 'звёздочку' in pg.locator('[data-screen=marks]').inner_text())
    pg.evaluate("document.querySelector('[data-screen=marks] [data-bk]').click()"); pg.wait_for_timeout(400)

    # ---- теги ----
    pg.evaluate("chatsPage()"); pg.wait_for_timeout(700)
    check('без тегов ряда фильтров нет', pg.locator('.orgb').count() == 0)
    pg.locator('[data-screen=chats] [data-m]').first.click(); pg.wait_for_timeout(300)
    items = pg.locator('.pbg .pi2').all_inner_texts()
    check('в меню чата есть пункт «Теги» (после «Закрепить», «Переименовать»)', any('Теги' in x for x in items) and 'Теги' in items[2], items)
    pg.locator('.pbg .pi2', has_text='Теги').click(); pg.wait_for_timeout(400)
    pg.locator('[data-i]').fill('работа'); pg.locator('[data-a]').click(); pg.wait_for_timeout(200)
    pg.locator('[data-i]').fill('#срочно'); pg.keyboard.press('Enter'); pg.wait_for_timeout(200)
    tg = pg.evaluate("JSON.parse(localStorage.getItem('kairema.tags.v1'))")
    cid = list(tg.keys())[0]
    check('теги сохранены без решётки и дублей', sorted(tg[cid]) == ['работа', 'срочно'], tg)
    pg.locator('.orgc', has_text='#срочно').click(); pg.wait_for_timeout(200)
    check('нажатие на тег снимает его', pg.evaluate("JSON.parse(localStorage.getItem('kairema.tags.v1'))")[cid] == ['работа'])
    pg.locator('[data-ok]').click(); pg.wait_for_timeout(700)
    check('появился ряд фильтров: «Все» и #работа 1', pg.locator('.orgb .orgc').count() == 2 and '#работа' in pg.locator('.orgb').inner_text())
    check('в строке чата видна подпись #работа', '#работа' in pg.locator('[data-screen=chats] .orgt').inner_text())
    n_all = pg.locator('[data-screen=chats] .pv').count()
    pg.locator('.orgb .orgc', has_text='#работа').click(); pg.wait_for_timeout(700)
    check('фильтр по тегу оставляет один чат из трёх', n_all == 3 and pg.locator('[data-screen=chats] .pv').count() == 1, (n_all, pg.locator('[data-screen=chats] .pv').count()))
    pg.locator('.orgb .orgc', has_text='Все').click(); pg.wait_for_timeout(700)
    check('«Все» возвращает три чата', pg.locator('[data-screen=chats] .pv').count() == 3)
    pg.evaluate("document.querySelector('[data-screen=chats] [data-bk]').click()"); pg.wait_for_timeout(400)
    bk = open(os.path.join(os.path.dirname(UI), 'features/backup/backup.js'), encoding='utf-8').read()
    check('теги и закладки входят в резервную копию', "'kairema.tags.v1'" in bk and "'kairema.bm.v1'" in bk)

    # ---- команды ----
    cm = pg.evaluate("Roles.actions.map(x=>x.cmd)")
    check('команды /new /agent /agent-set /marks /backup зарегистрированы', all(c in cm for c in ['new', 'agent', 'agent-set', 'marks', 'backup', 'compact']), cm)
    pg.evaluate("Coder.toggle(0)"); pg.evaluate("Roles.actions.find(x=>x.cmd==='agent').run()")
    check('/agent включает агента', pg.evaluate("Coder.on()") is True)
    pg.evaluate("Roles.actions.find(x=>x.cmd==='agent').run()")
    check('/agent повторно выключает', pg.evaluate("Coder.on()") is False)
    pg.evaluate("Chx.open(Chx.list[0]);apiView()"); pg.wait_for_timeout(300)
    pg.evaluate("Roles.actions.find(x=>x.cmd==='new').run()"); pg.wait_for_timeout(400)
    check('/new открывает пустой чат', pg.evaluate("Chx.cur.msgs.length") == 0)

    # ---- доступность ----
    pg.evaluate("(()=>{const b=document.createElement('button');b.id='tb1';b.title='Тестовая кнопка';b.innerHTML='<svg></svg>';document.body.append(b);const c=document.createElement('button');c.id='tb2';c.setAttribute('data-bk','');c.innerHTML='<svg></svg>';document.body.append(c);const d=document.createElement('div');d.className='sheet';d.id='sh1';document.body.append(d)})()"); pg.wait_for_timeout(300)
    check('кнопка без подписи получает aria-label из title', pg.locator('#tb1').get_attribute('aria-label') == 'Тестовая кнопка')
    check('кнопка «назад» получает подпись из таблицы', pg.locator('#tb2').get_attribute('aria-label') == 'Назад')
    check('окно получает role=dialog', pg.locator('#sh1').get_attribute('role') == 'dialog')
    pg.evaluate("document.querySelectorAll('#tb1,#tb2,#sh1').forEach(x=>x.remove())")
    pg.evaluate("A11y.cfg.zoom=1.3;A11y.apply()"); pg.wait_for_timeout(500)
    ov = pg.evaluate("({sw:document.documentElement.scrollWidth,cw:document.documentElement.clientWidth,z:document.documentElement.style.zoom})")
    check('размер текста 130%: zoom применён, горизонтальной прокрутки нет', ov['z'] == '1.3' and ov['sw'] <= ov['cw'] + 1, ov)
    pg.screenshot(path='/tmp/zoom130.png')
    pg.evaluate("A11y.cfg.zoom=1;A11y.apply()")
    check('сброс размера', pg.evaluate("document.documentElement.style.zoom") == '')
    pg.evaluate("show('set')"); pg.wait_for_timeout(900)
    check('в настройках есть строки: Закладки, Размер текста, Агент', all(pg.locator(s).count() == 1 for s in ['[data-org-s]', '[data-a11y-s]', '[data-coder-s]']))
    check('нет ошибок страницы', not errs, errs)
    b.close()
print('\nИТОГ: %d ок, %d провалов' % (OK, len(BAD)))
if BAD: print('Провалы:', BAD); raise SystemExit(1)
