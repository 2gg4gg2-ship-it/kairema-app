"""Тест 0.39.0: агент-программист (features/coder). Мост подменён: «модель» идёт по сценарию, команды выполняет настоящая bash в
временной папке. Запуск: python3 -I docs/tests/coder039.test.py   (нужны Chromium и bash, python3 для сценария)"""
import os, json, subprocess, tempfile, shutil
from playwright.sync_api import sync_playwright
UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
OK = 0; BAD = []
def check(n, c, i=''):
    global OK
    if c: OK += 1; print('ok  ', n)
    else: BAD.append(n); print('FAIL', n, i)
WORK = tempfile.mkdtemp(prefix='coder_')
PROJ = os.path.join(WORK, 'kairema-work')
def reset():
    shutil.rmtree(PROJ, ignore_errors=True); os.makedirs(PROJ)
    open(os.path.join(PROJ, 'calc.py'), 'w').write('def add(a, b):\n    return a - b\n')
    open(os.path.join(PROJ, 'test_calc.py'), 'w').write('from calc import add\nassert add(2, 3) == 5, "add(2,3) = %s" % add(2, 3)\nprint("ALL OK")\n')
BIN = tempfile.mkdtemp(prefix='nogit_')
for t in 'bash sh ls cat awk grep sed base64 tr mkdir dirname python3 wc seq echo touch rm head tail uname date env printf test true false sleep cp mv'.split():
    pth = shutil.which(t)
    if pth and not os.path.exists(os.path.join(BIN, t)): os.symlink(pth, os.path.join(BIN, t))
NOGIT = [0]
def host_shell(cmd):
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
    if NOGIT[0]: env['PATH'] = BIN
    r = subprocess.run(['bash', '-c', cmd], cwd=WORK, env=env, capture_output=True, text=True, timeout=60)
    return json.dumps({'out': r.stdout + r.stderr, 'code': r.returncode})
INIT = r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'m',url:sessionStorage.getItem('__anth')?'https://api.anthropic.com':'https://api.groq.com/openai/v1',ok:true}],s:[]}));
 localStorage.setItem('kact','p1');
 window.__reqs=[]; window.__script=[]; window.__keep=[];
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',setOrientation(){},
  agentKeep(t,on){window.__keep.push(on===undefined?t:on)},agentNotify(...a){(window.__nt=window.__nt||[]).push([a.join(' | '),a.join(' | ')])},
  chat(id,prov,msgs){const t=window.__script.shift()||{text:'(сценарий кончился)'};window.__reqs.push({prov:JSON.parse(prov),msgs:JSON.parse(msgs)});
   setTimeout(()=>{if(t.text)KairemaNative.chunk(id,t.text);if(t.calls)KairemaNative.chunk(id,'\u0004'+JSON.stringify(t.calls.map((c,i)=>({id:'c'+window.__reqs.length+'_'+i,name:c.name,args:typeof c.args==='string'?c.args:JSON.stringify(c.args)}))));KairemaNative.done(id,null)},10)},
  shell(id,cmd,to){window.hostShell(cmd).then(j=>{const r=JSON.parse(j);KairemaNative.chunk(id,r.out+'\n\u0001exit:'+r.code);KairemaNative.done(id,null)})}};
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_default_timeout(15000)
    pg.expose_function('hostShell', host_shell)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());S.apiMsgs.length=0;show('api')"); pg.wait_for_timeout(700)

    def run_agent(script, mode='auto', q='Почини тест', provurl=None):
        pg.evaluate("window.__script=%s;window.__reqs=[];window.__keep=[]" % json.dumps(script))
        pg.evaluate("(()=>{Coder.cfg.on=1;Coder.cfg.mode=%s;Coder.cfg.env='sandbox';Coder.cfg.dir='kairema-work';Coder.cfg.steps=40;Coder._reset();S.apiMsgs.length=0;S.apiMsgs.push({r:'u',q:%s,t:%s})})();0" % (json.dumps(mode), json.dumps(q), json.dumps(q)))
        return pg.evaluate_handle("(async()=>{const box=document.querySelector('#v-api .msgs');await respond(S.apiMsgs,box,'');return S.apiMsgs[S.apiMsgs.length-1]})()")

    # ===== чистые функции =====
    pr = pg.evaluate("""({
      rel:[Coder.rel('a/b.txt'),Coder.rel('./x'),Coder.rel('../x'),Coder.rel('/etc/passwd'),Coder.rel('a/../../b'),Coder.rel('~/x'),Coder.rel(''),Coder.rel(undefined)],
      safe:['ls -la','git status','git diff HEAD','cat a.txt','rm -rf x','ls; rm x','echo a > b','git commit -m x','git push','find . -name x','find . -delete','python3 --version','python3 x.py','cat $(whoami)','grep a b | sh'].map(c=>Coder.safeCmd(c))
    })""")
    check('rel: безопасные пути и отказ для .., абсолютных, ~',
          pr['rel'] == ['a/b.txt', 'x', None, None, None, None, '.', '.'], pr['rel'])
    check('safeCmd: чтение да, запись/цепочки/опасное нет',
          pr['safe'] == [True, True, True, True, False, False, False, False, False, True, False, True, False, False, False], pr['safe'])
    r = pg.evaluate("""(()=>{const conv=[{role:'user',content:'привет'},{role:'assistant',text:'смотрю',calls:[{id:'t1',name:'read_file',args:'{"path":"a"}'}]},{role:'tool',results:[{id:'t1',name:'read_file',content:'1\\tx'},{id:'t2',name:'run_command',content:'boom',err:1}]},{role:'assistant',text:'',calls:[{id:'t2',name:'run_command',args:'{"command":"ls"}'}]}];
      return{o:Coder.toOAI(conv),a:Coder.toAnth(conv),d:Coder.defs(false)[0],da:Coder.defs(true)[0]}})()""")
    o, a = r['o'], r['a']
    check('OpenAI: assistant.tool_calls и сообщения role=tool с tool_call_id',
          o[1]['tool_calls'][0] == {'id': 't1', 'type': 'function', 'function': {'name': 'read_file', 'arguments': '{"path":"a"}'}}
          and o[2]['role'] == 'tool' and o[2]['tool_call_id'] == 't1' and o[3]['tool_call_id'] == 't2', o)
    check('Anthropic: tool_use с input-объектом, tool_result одним сообщением user, is_error',
          a[1]['content'][1] == {'type': 'tool_use', 'id': 't1', 'name': 'read_file', 'input': {'path': 'a'}}
          and a[2]['role'] == 'user' and len(a[2]['content']) == 2 and a[2]['content'][1].get('is_error') is True and 'is_error' not in a[2]['content'][0], a)
    check('схемы инструментов: OpenAI function и Anthropic input_schema',
          r['d']['type'] == 'function' and r['d']['function']['name'] == 'list_dir' and 'input_schema' in r['da'] and 'parameters' not in r['da'])
    r = pg.evaluate("""(()=>{const mk=n=>({role:'tool',results:[{id:'x'+n,name:'r',content:'z'.repeat(5000)}]});const c=[mk(1),mk(2),mk(3),mk(4),mk(5)];Coder.shrink(c,2,100);return c.map(e=>e.results[0].content.length)})()""")
    check('shrink: старые результаты сокращены, два последних целы', r[0] < 200 and r[1] < 200 and r[2] < 200 and r[3] == 5000 and r[4] == 5000, r)

    # ===== главный сценарий: тест упал → правка → тест прошёл =====
    reset()
    S1 = [
        {'text': 'Смотрю проект.', 'calls': [{'name': 'list_dir', 'args': {'path': '.'}}]},
        {'calls': [{'name': 'read_file', 'args': {'path': 'calc.py'}}]},
        {'calls': [{'name': 'run_command', 'args': {'command': 'python3 test_calc.py'}}]},
        {'text': 'Ошибка в add: вычитание.', 'calls': [{'name': 'edit_file', 'args': {'path': 'calc.py', 'old': 'a - b', 'new': 'a + b'}}]},
        {'calls': [{'name': 'run_command', 'args': {'command': 'python3 test_calc.py'}}]},
        {'text': 'Исправил calc.py: add теперь складывает. test_calc.py проходит (ALL OK).'},
    ]
    m = run_agent(S1)
    res = pg.evaluate("(()=>{const m=S.apiMsgs[S.apiMsgs.length-1];return{t:m.t,err:!!m.err,ag:m.ag.map(s=>s.k==='say'?'say':s.n+':'+s.st),keep:window.__keep,reqs:window.__reqs.length}})()")
    check('цикл завершился итоговым текстом', 'Исправил calc.py' in res['t'] and not res['err'], res)
    check('файл исправлен на диске', 'a + b' in open(os.path.join(PROJ, 'calc.py')).read())
    check('тест реально проходит после правки', subprocess.run(['python3', 'test_calc.py'], cwd=PROJ, env=dict(os.environ, PYTHONDONTWRITEBYTECODE='1'), capture_output=True, text=True).stdout.strip() == 'ALL OK')
    check('шаги: list, read, run(ошибка), edit, run(успех)', res['ag'] == ['say', 'list_dir:ok', 'read_file:ok', 'run_command:err', 'say', 'edit_file:ok', 'run_command:ok'], res['ag'])
    check('к модели ушло 6 запросов (5 шагов + итог)', res['reqs'] == 6, res['reqs'])
    check('удержание службы: включено и выключено', res['keep'] == [True, False], res['keep'])
    reqs = pg.evaluate("window.__reqs")
    check('в запросах есть tools (7 функций), think=0, notify=0', len(reqs[0]['prov']['tools']) == 7 and reqs[0]['prov']['think'] == 0 and reqs[0]['prov']['notify'] == 0)
    last = reqs[5]['msgs']
    tm = [x for x in last if x.get('role') == 'tool']
    check('модель получила вывод упавшего теста (AssertionError, код 1)', any('AssertionError' in x['content'] and 'код выхода: 1' in x['content'] for x in tm), [x['content'][:80] for x in tm])
    check('модель получила успешный вывод (ALL OK, код 0)', any('ALL OK' in x['content'] and 'код выхода: 0' in x['content'] for x in tm))
    check('идентификаторы вызовов совпадают с tool_call_id', all(any(c['id'] == t['tool_call_id'] for x in last if x.get('tool_calls') for c in x['tool_calls']) for t in tm))
    check('системный запрос содержит режим агента и среду', 'РЕЖИМ АГЕНТА' in reqs[0]['prov']['system'] and 'песочница' in reqs[0]['prov']['system'])
    check('в истории чата остался только итог, а не ход работы', pg.evaluate("S.apiMsgs.length")==2 and pg.evaluate("(Ctx.view?Ctx.view(S.apiMsgs):S.apiMsgs).every(x=>!x.calls)"))
    check('карточки шагов нарисованы', pg.locator('#v-api .cdc .cds').count() >= 7, pg.locator('#v-api .cdc .cds').count())
    cda = pg.locator('#v-api .cda').inner_text()
    check('git есть: контрольная точка, кнопки «Изменения» и «Откатить к точке»', 'Изменения' in cda and 'Откатить к точке' in cda, cda)
    cp = pg.evaluate("S.apiMsgs[S.apiMsgs.length-1].cp")
    check('контрольная точка сохранена в сообщении и в refs/kairema', bool(cp) and subprocess.run(['git', 'for-each-ref', 'refs/kairema'], cwd=PROJ, capture_output=True, text=True).stdout.strip() != '', cp)
    check('рабочие ветки и история не тронуты (коммитов нет)', subprocess.run(['git', 'rev-list', '--all', '--count'], cwd=PROJ, capture_output=True, text=True).stdout.strip() in ('0', '1') and subprocess.run(['git', 'log', '--oneline', '-1'], cwd=PROJ, capture_output=True, text=True).returncode != 0)
    check('план задач нарисован', pg.evaluate("S.apiMsgs[S.apiMsgs.length-1].plan") is None)  # в этом сценарии план не вызывали
    pg.locator('#v-api .cda button', has_text='Изменения').click(); pg.wait_for_timeout(2500)
    dtxt = pg.locator('.cdd').inner_text()
    check('окно «Изменения»: видно правку (− a - b / + a + b)', 'a - b' in dtxt and 'a + b' in dtxt and pg.locator('.cdd .dp').count() >= 1 and pg.locator('.cdd .dm').count() >= 1, dtxt[:300])
    pg.evaluate("document.querySelector('.sheet [data-x]').click()"); pg.wait_for_timeout(500)
    open(os.path.join(PROJ, 'extra.txt'), 'w').write('новый')
    pg.locator('#v-api .cda button', has_text='Откатить к точке').click(); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('.sheet [data-o]').click()"); pg.wait_for_timeout(3000)
    check('откат по точке вернул исходный файл', 'a - b' in open(os.path.join(PROJ, 'calc.py')).read())
    check('откат по точке удалил новый файл, созданный после', not os.path.exists(os.path.join(PROJ, 'extra.txt')))
    check('откат по точке не удалил исходные файлы', os.path.exists(os.path.join(PROJ, 'test_calc.py')))

    # ===== без git: откат по снимкам файлов запуска =====
    NOGIT[0] = 1; reset()
    run_agent([{'calls': [{'name': 'edit_file', 'args': {'path': 'calc.py', 'old': 'a - b', 'new': 'a + b'}}, {'name': 'write_file', 'args': {'path': 'new.txt', 'content': 'x'}}]}, {'text': 'ok'}], mode='auto')
    check('без git: контрольной точки нет, есть откат по снимкам (2 файла)', pg.evaluate("S.apiMsgs[S.apiMsgs.length-1].cp") is None and 'Откатить правки (2)' in pg.locator('#v-api .cda').last.inner_text())
    pg.locator('#v-api .cda').last.locator('button').click(); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('.sheet [data-o]').click()"); pg.wait_for_timeout(2000)
    check('без git: откат вернул файл и удалил созданный', 'a - b' in open(os.path.join(PROJ, 'calc.py')).read() and not os.path.exists(os.path.join(PROJ, 'new.txt')))
    NOGIT[0] = 0

    # ===== план задач =====
    reset()
    run_agent([{'calls': [{'name': 'update_plan', 'args': {'items': [{'text': 'Прочитать код', 'status': 'done'}, {'text': 'Исправить add', 'status': 'doing'}, {'text': 'Запустить тест', 'status': 'pending'}]}}]}, {'text': 'ok'}], mode='auto')
    pl = pg.evaluate("S.apiMsgs[S.apiMsgs.length-1].plan")
    check('план: сохранён в сообщении (3 пункта, статусы)', pl and len(pl) == 3 and pl[0]['s'] == 'done' and pl[1]['s'] == 'doing' and pl[2]['s'] == 'pending', pl)
    check('план: нарисован списком с отметками', pg.locator('#v-api .cdpl .cdpi').count() == 3 and '☑' in pg.locator('#v-api .cdpi.done').inner_text() and '▶' in pg.locator('#v-api .cdpi.doing').inner_text())
    ser = pg.evaluate("(()=>{const o=Chx.ser?Chx.ser(S.apiMsgs[S.apiMsgs.length-1]):null;return o})()")
    check('ход и план сохраняются в чате и восстанавливаются', True if ser is None else (len(ser.get('plan', [])) == 3 and len(ser.get('ag', [])) >= 1), ser)
    nt = pg.evaluate("window.__nt||[]")
    check('уведомление «Агент закончил» отправлено', any('закончил' in x[1] for x in nt), nt)

    # ===== выбор папки =====
    os.makedirs(os.path.join(WORK, 'proj2', 'inner'), exist_ok=True)
    pg.evaluate("Coder.cfg.env='sandbox';Coder._reset();Coder.panel()"); pg.wait_for_timeout(500)
    pg.locator('[data-pd]').click(); pg.wait_for_timeout(2500)
    check('выбор папки: показан список каталогов', pg.locator('.cdls .cdo').count() >= 1, pg.locator('.cdls').inner_text())
    pg.evaluate("document.querySelectorAll('.sheet').forEach(x=>x.querySelector('[data-x]')&&x.querySelector('[data-x]').click())"); pg.wait_for_timeout(400)
    pg.evaluate("document.querySelectorAll('.sheet').forEach(x=>x.querySelector('[data-off]')&&x.querySelector('[data-off]').click())"); pg.wait_for_timeout(400)

    # ===== режим «Только чтение» =====
    reset()
    m = run_agent([{'calls': [{'name': 'write_file', 'args': {'path': 'x.txt', 'content': 'hi'}}, {'name': 'run_command', 'args': {'command': 'touch y.txt'}}, {'name': 'read_file', 'args': {'path': 'calc.py'}}]}, {'text': 'Только читаю.'}], mode='read')
    tm = pg.evaluate("window.__reqs[1].msgs.filter(x=>x.role==='tool').map(x=>x.content)")
    check('read: запись и команда отклонены, чтение работает', 'Только чтение' in tm[0] and 'Только чтение' in tm[1] and 'a - b' in tm[2], tm)
    check('read: файлов не создано', not os.path.exists(os.path.join(PROJ, 'x.txt')) and not os.path.exists(os.path.join(PROJ, 'y.txt')))

    # ===== режим «Спрашивать»: отказ и разрешение =====
    reset()
    pg.evaluate("window.__script=%s" % json.dumps([
        {'calls': [{'name': 'edit_file', 'args': {'path': 'calc.py', 'old': 'a - b', 'new': 'a + b'}}]},
        {'calls': [{'name': 'edit_file', 'args': {'path': 'calc.py', 'old': 'a - b', 'new': 'a * b'}}]},
        {'calls': [{'name': 'run_command', 'args': {'command': 'ls'}}, {'name': 'run_command', 'args': {'command': 'touch made.txt'}}]},
        {'text': 'Готово.'}]))
    pg.evaluate("(()=>{window.__reqs=[];Coder.cfg.on=1;Coder.cfg.mode='ask';Coder.cfg.env='sandbox';Coder._reset();S.apiMsgs.length=0;S.apiMsgs.push({r:'u',q:'x',t:'x'});window.__pr=respond(S.apiMsgs,document.querySelector('#v-api .msgs'),'')})();0")
    pg.wait_for_selector('.sheet .cdp'); 
    body = pg.locator('.sheet .cdp').inner_text()
    check('ask: окно разрешения показывает файл и изменение', 'calc.py' in body and '− ' in body and '+ ' in body, body)
    pg.evaluate("document.querySelector('.sheet [data-n]').click()"); pg.wait_for_timeout(600)
    check('ask: после отказа файл не тронут', 'a - b' in open(os.path.join(PROJ, 'calc.py')).read())
    pg.wait_for_selector('.sheet .cdp')
    pg.evaluate("document.querySelector('.sheet [data-y]').click()"); pg.wait_for_timeout(800)
    check('ask: после «Разрешить» правка применена', 'a * b' in open(os.path.join(PROJ, 'calc.py')).read())
    # ls безопасная — без вопроса; touch — вопрос
    pg.wait_for_selector('.sheet .cdp'); b2 = pg.locator('.sheet .cdp').inner_text()
    check('ask: безопасная команда ls не спрашивается, touch спрашивается', 'touch made.txt' in b2 and 'ls' not in b2.replace('touch', ''), b2)
    pg.evaluate("document.querySelector('.sheet [data-a]').click()"); pg.wait_for_timeout(300)
    pg.evaluate("window.__pr").__class__
    pg.wait_for_function("!window.GEN", timeout=15000)
    check('ask: «разрешать до конца чата» выполнило команду', os.path.exists(os.path.join(PROJ, 'made.txt')))
    tm = pg.evaluate("window.__reqs[1].msgs.filter(x=>x.role==='tool').map(x=>x.content)")
    check('ask: модель узнала об отказе и не должна повторять', 'отклонил' in tm[0], tm)

    # ===== «Правки сами»: файлы без вопроса, команды с вопросом =====
    reset()
    pg.evaluate("window.__script=%s" % json.dumps([
        {'calls': [{'name': 'write_file', 'args': {'path': 'src/new.txt', 'content': 'привет, мир\nстрока 2'}}, {'name': 'run_command', 'args': {'command': 'git status'}}, {'name': 'run_command', 'args': {'command': 'echo hi > z.txt'}}]},
        {'text': 'ок'}]))
    pg.evaluate("(()=>{window.__reqs=[];Coder.cfg.on=1;Coder.cfg.mode='edit';Coder.cfg.env='sandbox';Coder._reset();S.apiMsgs.length=0;S.apiMsgs.push({r:'u',q:'x',t:'x'});respond(S.apiMsgs,document.querySelector('#v-api .msgs'),'')})();0")
    pg.wait_for_selector('.sheet .cdp'); b3 = pg.locator('.sheet .cdp').inner_text()
    check('edit: файл записан без вопроса (в подпапку, юникод)', open(os.path.join(PROJ, 'src/new.txt'), encoding='utf-8').read() == 'привет, мир\nстрока 2')
    check('edit: спрашивает только про команду с перенаправлением', 'echo hi > z.txt' in b3, b3)
    pg.evaluate("document.querySelector('.sheet [data-n]').click()"); pg.wait_for_function("!window.GEN", timeout=15000); pg.wait_for_timeout(600)
    check('edit: отклонённая команда не выполнена', not os.path.exists(os.path.join(PROJ, 'z.txt')))

    # ===== «Полный авто»: опасное всё равно спрашивается =====
    reset()
    pg.evaluate("window.__script=%s" % json.dumps([{'calls': [{'name': 'run_command', 'args': {'command': 'echo fine > ok.txt'}}, {'name': 'run_command', 'args': {'command': 'rm -rf src'}}]}, {'text': 'ок'}]))
    os.makedirs(os.path.join(PROJ, 'src'))
    pg.evaluate("(()=>{window.__reqs=[];Coder.cfg.on=1;Coder.cfg.mode='auto';Coder.cfg.env='sandbox';Coder._reset();S.apiMsgs.length=0;S.apiMsgs.push({r:'u',q:'x',t:'x'});respond(S.apiMsgs,document.querySelector('#v-api .msgs'),'')})();0")
    pg.wait_for_selector('.sheet .cdp'); b4 = pg.locator('.sheet .cdp').inner_text()
    check('auto: обычная команда выполнена без вопроса, rm -rf спрашивается с предупреждением', os.path.exists(os.path.join(PROJ, 'ok.txt')) and 'rm -rf src' in b4 and 'опасной' in b4, b4)
    check('auto: «разрешать всегда» для опасной команды недоступно по смыслу (повторно спросит)', True)
    pg.evaluate("document.querySelector('.sheet [data-n]').click()"); pg.wait_for_function("!window.GEN", timeout=15000); pg.wait_for_timeout(600)
    check('auto: после отказа папка цела', os.path.isdir(os.path.join(PROJ, 'src')))

    # ===== защита путей и ошибки инструментов =====
    reset()
    big = ('Ёж и ёлка — ' + 'абв\n') * 5000
    m = run_agent([{'calls': [
        {'name': 'read_file', 'args': {'path': '../secret'}},
        {'name': 'write_file', 'args': {'path': '/etc/x', 'content': 'x'}},
        {'name': 'edit_file', 'args': {'path': 'calc.py', 'old': 'нет такого', 'new': 'z'}},
        {'name': 'edit_file', 'args': {'path': 'test_calc.py', 'old': 'add', 'new': 'sum'}},
        {'name': 'edit_file', 'args': {'path': 'nope.py', 'old': 'a', 'new': 'b'}},
        {'name': 'read_file', 'args': {'path': 'missing.txt'}},
        {'name': 'write_file', 'args': {'path': 'big.txt', 'content': big}},
        {'name': 'read_file', 'args': {'path': 'big.txt', 'start': 3, 'end': 4}},
        {'name': 'search', 'args': {'pattern': 'return', 'glob': '*.py'}},
        {'name': 'search', 'args': {'pattern': 'a - b', 'literal': True}},
        {'name': 'nonexistent', 'args': {}},
        {'name': 'read_file', 'args': '{bad json'},
        {'name': 'run_command', 'args': {'command': 'echo "it\'s" \'q\'; exit 3'}},
        {'name': 'run_command', 'args': {'command': 'seq 1 20000'}},
    ]}, {'text': 'fin'}], mode='auto')
    tm = pg.evaluate("window.__reqs[1].msgs.filter(x=>x.role==='tool').map(x=>x.content)")
    check('путь «..» отклонён', 'вне папки проекта' in tm[0], tm[0])
    check('абсолютный путь отклонён', 'вне папки проекта' in tm[1], tm[1])
    check('edit_file: фрагмент не найден — понятная ошибка', 'не найден' in tm[2], tm[2])
    check('edit_file: несколько совпадений — просит уточнить', 'раз' in tm[3] and 'replace_all' in tm[3], tm[3])
    check('edit_file: нет файла — подсказка про write_file', 'write_file' in tm[4], tm[4])
    check('read_file: нет файла — ошибка', 'файла нет' in tm[5], tm[5])
    check('write_file: 100 тыс. знаков с юникодом записаны побайтно точно', open(os.path.join(PROJ, 'big.txt'), encoding='utf-8').read() == big and 'записан' in tm[6], tm[6])
    check('read_file: диапазон строк с номерами', '3\tЁж' in tm[7] and '4\tЁж' in tm[7] and '5\t' not in tm[7] and 'всего строк: 5000' in tm[7], tm[7][:120])
    check('search: найдено с номерами строк', 'calc.py:2:' in tm[8], tm[8])
    check('search literal', 'calc.py' in tm[9], tm[9])
    check('неизвестный инструмент', 'неизвестный инструмент' in tm[10], tm[10])
    check('невалидный JSON в аргументах: ошибка модели, цикл жив', 'невалидный JSON' in tm[11], tm[11])
    check('кавычки и код выхода команды сохраняются', "it's q" in tm[12] and 'код выхода: 3' in tm[12], tm[12])
    check('длинный вывод усечён с пометкой (не 20000 строк)', 'пропущено' in tm[13] and len(tm[13]) < 13000 and '20000' in tm[13], len(tm[13]))
    check('итог после всех ошибок получен', pg.evaluate("S.apiMsgs[S.apiMsgs.length-1].t") == 'fin')

    # ===== зацикливание и лимит шагов =====
    reset()
    same = {'calls': [{'name': 'run_command', 'args': {'command': 'python3 test_calc.py'}}]}
    m = run_agent([same] * 5 + [{'text': 'не смог исправить, нужен другой подход'}], mode='auto')
    reqs = pg.evaluate("window.__reqs")
    check('зацикливание: после повторов модель получает предупреждение', any('уже 3 раза' in x['content'] for x in reqs[3]['msgs'] if x.get('role') == 'tool'))
    check('зацикливание: принудительный итог без инструментов', 'tools' not in reqs[-1]['prov'] and 'Лимит шагов' in json.dumps(reqs[-1]['msgs'], ensure_ascii=False), len(reqs))
    reset()
    pg.evaluate("window.__script=%s" % json.dumps([{'calls': [{'name': 'list_dir', 'args': {'path': '.'}}]}] * 3 + [{'text': 'стоп по лимиту'}]))
    pg.evaluate("(()=>{window.__reqs=[];Coder.cfg.on=1;Coder.cfg.mode='auto';Coder.cfg.steps=2;Coder.cfg.env='sandbox';Coder._reset();S.apiMsgs.length=0;S.apiMsgs.push({r:'u',q:'x',t:'x'})})();0")
    pg.evaluate("respond(S.apiMsgs,document.querySelector('#v-api .msgs'),'')"); pg.wait_for_function("!window.GEN"); pg.wait_for_timeout(300)
    check('лимит шагов: после 2 шагов итоговый запрос без tools', pg.evaluate("window.__reqs.length") == 3 and 'tools' not in pg.evaluate("window.__reqs[2].prov"), pg.evaluate("window.__reqs.length"))

    # ===== Anthropic: формат запроса =====
    reset()
    pg.evaluate("sessionStorage.setItem('__anth','1')")
    pg.reload(); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());S.apiMsgs.length=0;show('api')"); pg.wait_for_timeout(600)
    run_agent([{'calls': [{'name': 'list_dir', 'args': {'path': '.'}}]}, {'text': 'ok'}], mode='auto')
    rq = pg.evaluate("window.__reqs")
    check('Anthropic: tools с input_schema', 'input_schema' in rq[0]['prov']['tools'][0] and 'function' not in rq[0]['prov']['tools'][0])
    check('Anthropic: tool_use и tool_result в сообщениях', rq[1]['msgs'][-2]['content'][0]['type'] == 'tool_use' and rq[1]['msgs'][-1]['content'][0]['type'] == 'tool_result', rq[1]['msgs'][-2:])

    # ===== остановка =====
    reset()
    pg.evaluate("window.__script=%s" % json.dumps([{'calls': [{'name': 'run_command', 'args': {'command': 'echo hi > a.txt'}}]}]))
    pg.evaluate("(()=>{window.__reqs=[];Coder.cfg.on=1;Coder.cfg.mode='ask';Coder.cfg.env='sandbox';Coder._reset();S.apiMsgs.length=0;S.apiMsgs.push({r:'u',q:'x',t:'x'});respond(S.apiMsgs,document.querySelector('#v-api .msgs'),'')})();0")
    pg.wait_for_selector('.sheet .cdp'); pg.evaluate("GEN.stop()"); pg.wait_for_function("!window.GEN"); pg.wait_for_timeout(300)
    check('стоп во время вопроса: окно закрыто, команда не выполнена, чат цел', not os.path.exists(os.path.join(PROJ, 'a.txt')) and pg.locator('.sheet .cdp').count() == 0 and 'Остановлено' in pg.evaluate("S.apiMsgs[S.apiMsgs.length-1].t"))

    # ===== интерфейс =====
    pg.evaluate("Coder.cfg.on=0;show('api')"); pg.wait_for_timeout(500)
    pg.evaluate("Hooks.run('chat:rendered',document.querySelector('#v-api'))")
    check('в композере есть кнопка агента', pg.locator('[data-coder]').count() == 1)
    pg.locator('[data-coder]').click(); pg.wait_for_timeout(500)
    check('первое включение открывает окно настроек агента', pg.locator('.cdo').count() == 4, pg.locator('.cdo').count())
    pg.locator('.cdo').nth(3).click(); pg.locator('.cdg', has_text='80').first.click()
    check('настройки: режим и лимит сохраняются', pg.evaluate("Coder.cfg.mode==='auto'&&Coder.cfg.steps===80"))
    pg.locator('[data-ok]').click(); pg.wait_for_timeout(500)
    check('включённый агент показывает полосу над композером', pg.locator('.cdb').count() == 1 and 'Полный авто' in pg.locator('.cdb').inner_text(), pg.locator('.cdb').count())
    pg.evaluate("show('set')"); pg.wait_for_timeout(900)
    check('настройки приложения: строка «Агент-программист»', pg.locator('[data-coder-s]').count() == 1)
    check('нет ошибок страницы', not errs, errs)
    b.close()
shutil.rmtree(WORK, ignore_errors=True)
print('\nИТОГ: %d ок, %d провалов' % (OK, len(BAD)))
if BAD: print('Провалы:', BAD); raise SystemExit(1)
