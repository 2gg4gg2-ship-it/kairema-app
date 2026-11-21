"""Тест 0.43.0: инструкции проекта, apply_patch, web_fetch, подагенты (task), MCP-клиент. Мост подменён: «модель» идёт по сценарию,
веб-страницы и MCP-сервер сымитированы, команды выполняет настоящая bash. Запуск: python3 -I docs/tests/agent043.test.py"""
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
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'m',url:'https://api.groq.com/openai/v1',ok:true}],s:[]}));
 localStorage.setItem('kact','p1');
 window.__reqs=[]; window.__script=[]; window.__subq={}; window.__http=[]; window.__pages={}; window.__keys=[]; window.__mcpFail=0; window.__mcpGone=0;
 const J=(o)=>JSON.stringify(o);
 /* имитация MCP-сервера (Streamable HTTP) */
 window.__mcp=(o,body)=>{
  const h=o.headers||{}; const m=body.method;
  if(window.__mcpFail) return {status:500,ctype:'text/plain',session:'',body:'boom'};
  if(m==='initialize') return {status:200,ctype:'application/json',session:'sess1',body:J({jsonrpc:'2.0',id:body.id,result:{protocolVersion:'2025-03-26',serverInfo:{name:'TestSrv'},capabilities:{tools:{}}}})};
  if(m==='notifications/initialized') return {status:202,ctype:'',session:'',body:''};
  if(h['Mcp-Session-Id']!=='sess1' && !window.__mcpGone) return {status:400,ctype:'text/plain',session:'',body:'no session'};
  if(window.__mcpGone===1 && m==='tools/call'){window.__mcpGone=2;return {status:404,ctype:'text/plain',session:'',body:'session gone'}}
  if(m==='tools/list'){
   if(!body.params||!body.params.cursor) return {status:200,ctype:'application/json',session:'',body:J({jsonrpc:'2.0',id:body.id,result:{tools:[{name:'echo',description:'Повторяет текст',inputSchema:{type:'object',properties:{text:{type:'string'}},required:['text']}}],nextCursor:'p2'}})};
   return {status:200,ctype:'text/event-stream',session:'',body:'event: message\ndata: '+J({jsonrpc:'2.0',id:body.id,result:{tools:[{name:'lookup',description:'Поиск',annotations:{readOnlyHint:true},inputSchema:{type:'object',properties:{q:{type:'string'}}}},{name:'bad',description:'Падает',inputSchema:{type:'object'}}]}})+'\n\n'};
  }
  if(m==='tools/call'){
   const n=body.params.name,a=body.params.arguments||{};
   if(n==='echo') return {status:200,ctype:'application/json',session:'',body:J({jsonrpc:'2.0',id:body.id,result:{content:[{type:'text',text:'ECHO:'+a.text}]}})};
   if(n==='lookup') return {status:200,ctype:'text/event-stream',session:'',body:'data: '+J({jsonrpc:'2.0',method:'notifications/progress',params:{}})+'\n\ndata: '+J({jsonrpc:'2.0',id:body.id,result:{content:[{type:'text',text:'FOUND:'+a.q}]}})+'\n\n'};
   return {status:200,ctype:'application/json',session:'',body:J({jsonrpc:'2.0',id:body.id,result:{isError:true,content:[{type:'text',text:'сервер упал'}]}})};
  }
  return {status:200,ctype:'application/json',session:'',body:J({jsonrpc:'2.0',id:body.id,error:{code:-32601,message:'нет метода'}})};
 };
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(id,k){window.__keys.push([id,k])},deleteKey(id){window.__keys.push(['del',id])},termuxStatus:()=>'{}',setOrientation(){},
  agentKeep(){},agentNotify(){},
  httpReq(id,opts){const o=JSON.parse(opts);window.__http.push(o);let r;
   if(/mcp\.test/.test(o.url)){r=window.__mcp(o,JSON.parse(o.body||'{}'))}
   else{const pg=window.__pages[o.url];r=pg?Object.assign({status:200,ctype:'text/html',session:'',cut:false},pg):{status:404,ctype:'text/html',session:'',body:'<h1>Not found</h1>',cut:false}}
   setTimeout(()=>{KairemaNative.chunk(id,JSON.stringify(Object.assign({cut:false},r)));KairemaNative.done(id,null)},5)},
  chat(id,prov,msgs){const P=JSON.parse(prov),M=JSON.parse(msgs);const sub=/ПОДАГЕНТ-ИССЛЕДОВАТЕЛЬ/.test(P.system||'');
   let t;if(sub){const f=typeof M[0].content==='string'?M[0].content:'';t=((window.__subq[f]||[]).shift())||{text:'(подсценарий кончился)'}}else t=window.__script.shift()||{text:'(сценарий кончился)'};
   window.__reqs.push({prov:P,msgs:M,sub});
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

    def start(script, mode='auto', q='Задача', sub=None, instr=1):
        pg.evaluate("window.__script=%s;window.__subq=%s;window.__reqs=[];window.__http=[];window.__done=false" % (json.dumps(script), json.dumps(sub or {})))
        pg.evaluate("(()=>{Coder.cfg.on=1;Coder.cfg.mode=%s;Coder.cfg.env='sandbox';Coder.cfg.dir='kairema-work';Coder.cfg.steps=40;Coder.cfg.instr=%d;Coder._reset();S.apiMsgs.length=0;S.apiMsgs.push({r:'u',q:%s,t:%s});const box=document.querySelector('#v-api .msgs');window.__p=respond(S.apiMsgs,box,'').then(()=>{window.__done=true})})();0" % (json.dumps(mode), instr, json.dumps(q), json.dumps(q)))
    def finish():
        pg.wait_for_function('window.__done===true', timeout=60000)
        return pg.evaluate("(()=>{const m=S.apiMsgs[S.apiMsgs.length-1];return{t:m.t,err:!!m.err,ag:m.ag.map(s=>s.k==='say'?'say':s.n+':'+s.st),cards:m.ag}})()")
    def answer(sel):
        pg.wait_for_selector('.sheet [data-y]', timeout=15000); pg.wait_for_timeout(400)
        t = pg.locator('.sheet h2').last.inner_text() + ' | ' + pg.locator('.sheet pre').last.inner_text()
        pg.evaluate("document.querySelector('.sheet %s').click()" % sel); pg.wait_for_timeout(500)
        return t
    def run(script, **kw):
        start(script, **kw); return finish()
    def tool_msgs(i):  # сообщения role=tool в запросе номер i
        return [x for x in pg.evaluate("window.__reqs")[i]['msgs'] if x.get('role') == 'tool']
    def reset():
        shutil.rmtree(PROJ, ignore_errors=True); os.makedirs(PROJ)
        open(os.path.join(PROJ, 'a.py'), 'w').write('x = 1\ny = 2\nz = 3\n')
        open(os.path.join(PROJ, 'b.py'), 'w').write('name = "old"\nname = "old2"\n')

    # ===== 1. инструкции проекта =====
    reset()
    open(os.path.join(PROJ, 'AGENTS.md'), 'w').write('Всегда пиши тесты на pytest. ZZ-AGENTS')
    r = run([{'text': 'ок'}])
    s0 = pg.evaluate("window.__reqs")[0]['prov']['system']
    check('AGENTS.md попал в системный запрос', 'ИНСТРУКЦИИ ПРОЕКТА из AGENTS.md' in s0 and 'ZZ-AGENTS' in s0)
    check('есть карточка «Инструкции проекта»', r['ag'][0] == 'instructions:ok', r['ag'])
    open(os.path.join(PROJ, 'KAIREMA.md'), 'w').write('Отвечай коротко. ZZ-KAIREMA')
    r = run([{'text': 'ок'}])
    s0 = pg.evaluate("window.__reqs")[0]['prov']['system']
    check('KAIREMA.md важнее AGENTS.md (берётся только один файл)', 'ZZ-KAIREMA' in s0 and 'ZZ-AGENTS' not in s0)
    check('правило языка стоит в самом конце системного запроса, после инструкций проекта; для русского запроса оговорено',
          s0.rstrip().endswith('имена файлов не переводи.') and s0.index('[ЯЗЫК ОТВЕТА]') > s0.index('[ИНСТРУКЦИИ ПРОЕКТА') and 'русский или украинский' in s0 and 'китайский' in s0 and 'ОБЯЗАТЕЛЬНЫ' in s0)
    r = run([{'text': 'ок'}], instr=0)
    s0 = pg.evaluate("window.__reqs")[0]['prov']['system']
    check('опция «Читать инструкции: Нет» отключает чтение', 'ИНСТРУКЦИИ ПРОЕКТА' not in s0 and 'instructions:ok' not in r['ag'])
    open(os.path.join(PROJ, 'KAIREMA.md'), 'w').write('Я' * 30000)
    r = run([{'text': 'ок'}])
    s0 = pg.evaluate("window.__reqs")[0]['prov']['system']
    check('огромный файл инструкций обрезается до 12000 знаков', 'пропущено' in s0 and s0.count('Я') <= 12100, s0.count('Я'))
    os.remove(os.path.join(PROJ, 'KAIREMA.md')); os.remove(os.path.join(PROJ, 'AGENTS.md'))
    r = run([{'text': 'ок'}])
    check('без файла инструкций карточки нет', 'instructions:ok' not in r['ag'] and 'ИНСТРУКЦИИ ПРОЕКТА' not in pg.evaluate("window.__reqs")[0]['prov']['system'])

    # ===== 2. apply_patch =====
    reset()
    P1 = {'name': 'apply_patch', 'args': {'edits': [
        {'path': 'a.py', 'old': 'x = 1', 'new': 'x = 10'},
        {'path': 'a.py', 'old': 'x = 10\ny = 2', 'new': 'x = 10\ny = 20'},   # опирается на предыдущую правку
        {'path': 'b.py', 'old': 'old2', 'new': 'new2'}]}}
    r = run([{'calls': [P1]}, {'text': 'готово'}])
    a = open(os.path.join(PROJ, 'a.py')).read(); b_ = open(os.path.join(PROJ, 'b.py')).read()
    check('apply_patch: правки двух файлов применены, вторая видит результат первой', a == 'x = 10\ny = 20\nz = 3\n' and 'new2' in b_, (a, b_))
    check('apply_patch: ответ модели сообщает число правок и файлы', 'применено правок: 3' in tool_msgs(1)[0]['content'] and 'a.py' in tool_msgs(1)[0]['content'], tool_msgs(1))
    check('apply_patch: карточка шага со сводкой «3 правок»', r['cards'][0]['h'].startswith('apply_patch 3 правок'), r['cards'][0]['h'])
    reset()
    P2 = {'name': 'apply_patch', 'args': {'edits': [{'path': 'a.py', 'old': 'x = 1', 'new': 'x = 99'}, {'path': 'b.py', 'old': 'НЕТ ТАКОГО', 'new': 'q'}]}}
    r = run([{'calls': [P2]}, {'text': 'не вышло'}])
    check('apply_patch атомарный: вторая правка не подошла → первый файл не изменён',
          open(os.path.join(PROJ, 'a.py')).read() == 'x = 1\ny = 2\nz = 3\n' and 'Ни один файл не изменён' in tool_msgs(1)[0]['content'], tool_msgs(1))
    check('apply_patch: карточка с ошибкой', r['ag'][0] == 'apply_patch:err', r['ag'])
    reset()
    r = run([{'calls': [{'name': 'apply_patch', 'args': {'edits': [{'path': 'b.py', 'old': 'name', 'new': 'n'}]}}]}, {'text': '.'}])
    check('apply_patch: неоднозначный фрагмент (2 вхождения) отклоняется', 'найден 2 раз' in tool_msgs(1)[0]['content'] and 'name = "old"' in open(os.path.join(PROJ, 'b.py')).read())
    r = run([{'calls': [{'name': 'apply_patch', 'args': {'edits': [{'path': 'b.py', 'old': 'name', 'new': 'n', 'replace_all': True}]}}]}, {'text': '.'}])
    check('apply_patch: replace_all заменяет все вхождения', open(os.path.join(PROJ, 'b.py')).read() == 'n = "old"\nn = "old2"\n')
    r = run([{'calls': [{'name': 'apply_patch', 'args': {'edits': [{'path': '../x.py', 'old': 'a', 'new': 'b'}]}}]}, {'text': '.'}])
    check('apply_patch: путь вне проекта запрещён', 'вне папки проекта' in tool_msgs(1)[0]['content'])
    r = run([{'calls': [{'name': 'apply_patch', 'args': {'edits': []}}]}, {'text': '.'}])
    check('apply_patch: пустой список — ошибка аргумента', 'edits' in tool_msgs(1)[0]['content'])
    reset()
    start([{'calls': [P1]}, {'text': 'ок'}], mode='ask')
    t = answer('[data-n]')
    check('apply_patch в режиме «Спрашивать»: окно показывает оба файла и правки', 'Применить правки?' in t and 'a.py' in t and 'b.py' in t and 'x = 10' in t, t)
    r = finish()
    check('apply_patch отклонён → файлы не тронуты', open(os.path.join(PROJ, 'a.py')).read() == 'x = 1\ny = 2\nz = 3\n' and r['ag'][0] == 'apply_patch:no', r['ag'])
    r = run([{'calls': [P1]}, {'text': 'ок'}], mode='read')
    check('режим «Только чтение»: apply_patch запрещён', 'Только чтение' in tool_msgs(1)[0]['content'] and open(os.path.join(PROJ, 'a.py')).read().startswith('x = 1'))

    # ===== 3. web_fetch =====
    HTML = ('<html><head><title>Док</title><style>.x{}</style><script>alert(1)</script></head><body><nav>МЕНЮ-НАВ</nav><main><h1>Заголовок</h1><p>Первый <b>абзац</b> с <a href="/guide/start">ссылкой</a>.</p>'
            '<ul><li>раз</li><li>два</li></ul><pre>print("hi")\nx = 1</pre><p>Конец</p></main><footer>ФУТЕР</footer></body></html>')
    pg.evaluate("window.__pages={'https://docs.example.com/page':{body:%s},'https://docs.example.com/data.json':{ctype:'application/json',body:'{\"a\":1}'},'https://docs.example.com/img.png':{ctype:'image/png',body:'xx'},'https://docs.example.com/long':{ctype:'text/plain',body:%s}}" % (json.dumps(HTML), json.dumps('0123456789' * 200)))
    r = pg.evaluate("Web.htmlText(%s,'https://docs.example.com/page')" % json.dumps(HTML))
    check('htmlText: заголовок, абзац, список, код', '# Док' in r and '# Заголовок' in r and '- раз' in r and '- два' in r and '```\nprint("hi")\nx = 1\n```' in r, r)
    check('htmlText: ссылка превращается в [текст](полный адрес)', '[ссылкой](https://docs.example.com/guide/start)' in r, r)
    check('htmlText: скрипты, стили, навигация и футер вырезаны', 'alert' not in r and '.x{}' not in r and 'МЕНЮ-НАВ' not in r and 'ФУТЕР' not in r, r)
    r = run([{'calls': [{'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/page'}}]}, {'text': 'прочитал'}], mode='auto')
    tc = tool_msgs(1)[0]['content']
    check('web_fetch (авто): текст страницы дошёл до модели с шапкой URL и размером', tc.startswith('URL: https://docs.example.com/page') and '[знаков всего:' in tc and '# Заголовок' in tc, tc[:200])
    check('web_fetch: запрос ушёл через мост GET без токена', pg.evaluate("window.__http.length")==1 and pg.evaluate("window.__http[0].method")=='GET' and not pg.evaluate("window.__http[0].keyId"))
    r = run([{'calls': [{'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/long', 'max_chars': 500}}]}, {'calls': [{'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/long', 'start': 500, 'max_chars': 500}}]}, {'text': 'ок'}], mode='auto')
    c1, c2 = tool_msgs(1)[0]['content'], tool_msgs(2)[1]['content']
    check('web_fetch: постраничное чтение (показано 0–500, продолжение start=500)', '0–500' in c1 and 'start=500' in c1 and '500–1000' in c2, (c1[:120], c2[:120]))
    check('web_fetch: продолжение берётся из кэша без нового запроса', pg.evaluate("window.__http.length") == 1, pg.evaluate("window.__http.length"))
    pg.evaluate("Web._clear()")
    r = run([{'calls': [{'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/img.png'}}, {'name': 'web_fetch', 'args': {'url': 'ftp://x/y'}}, {'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/nope'}}, {'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/data.json'}}]}, {'text': 'ок'}], mode='auto')
    tm = [x['content'] for x in tool_msgs(1)]
    check('web_fetch: картинка, не-http адрес, 404 дают понятные ошибки, JSON читается как есть',
          'не текстовый' in tm[0] and 'http://' in tm[1] and 'HTTP 404' in tm[2] and '{"a":1}' in tm[3], tm)
    pg.evaluate("Web._clear()")
    start([{'calls': [{'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/page'}}]}, {'text': 'ок'}], mode='ask')
    t = answer('[data-a]')
    check('web_fetch в режиме «Спрашивать»: вопрос про сайт с адресом', 'Открыть сайт?' in t and 'docs.example.com/page' in t, t)
    finish(); pg.evaluate("Web._clear()")
    start([{'calls': [{'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/page'}}, {'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/long'}}]}, {'text': 'ок'}], mode='ask')
    answer('[data-a]'); finish()
    check('«до конца чата» запоминается по хосту: вторая страница того же сайта без вопроса', len(pg.evaluate("window.__http")) == 2)
    pg.evaluate("Web._clear()")
    start([{'calls': [{'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/page'}}]}, {'text': 'ок'}], mode='ask')
    answer('[data-n]'); r = finish()
    check('отказ в доступе к сайту: страница не запрашивалась, модель получила отказ', pg.evaluate("window.__http.length") == 0 and 'отклонил' in tool_msgs(1)[0]['content'] and r['ag'][0] == 'web_fetch:no')

    # ===== 4. подагенты =====
    reset()
    open(os.path.join(PROJ, 'notes.txt'), 'w').write('секрет: 42\n')
    TASK = {'name': 'task', 'args': {'description': 'найти секрет', 'prompt': 'Найди секрет в notes.txt и верни его'}}
    SUB = {'Найди секрет в notes.txt и верни его': [
        {'text': 'Читаю.', 'calls': [{'name': 'read_file', 'args': {'path': 'notes.txt'}}, {'name': 'edit_file', 'args': {'path': 'notes.txt', 'old': '42', 'new': '0'}}]},
        {'text': 'Секрет равен 42 (notes.txt:1).'}]}
    r = run([{'calls': [TASK]}, {'text': 'Подагент нашёл: 42'}], mode='auto', sub=SUB)
    rq = pg.evaluate("window.__reqs")
    subr = [x for x in rq if x['sub']]; mainr = [x for x in rq if not x['sub']]
    check('подагент: 2 своих запроса, главный агент — 2', len(subr) == 2 and len(mainr) == 2, (len(subr), len(mainr)))
    check('подагент получает только инструменты чтения (list_dir, read_file, search, web_fetch)',
          [t['function']['name'] for t in subr[0]['prov']['tools']] == ['list_dir', 'read_file', 'search', 'web_fetch'], [t['function']['name'] for t in subr[0]['prov']['tools']])
    check('подагент: чистый контекст — только задание, история чата и план главного не передаются', len(subr[0]['msgs']) == 1 and subr[0]['msgs'][0]['content'].startswith('Найди секрет'))
    check('подагент: правило языка по языку задания', 'русский или украинский' in subr[0]['prov']['system'])
    check('подагент: своя системная подсказка без инструментов правки', 'ПОДАГЕНТ' in subr[0]['prov']['system'] and 'РЕЖИМ АГЕНТА' not in subr[0]['prov']['system'])
    tc = [x['content'] for x in mainr[1]['msgs'] if x.get('role') == 'tool'][0]
    check('главный агент получил отчёт подагента', 'Секрет равен 42' in tc and 'отчёт подагента' in tc, tc)
    check('подагент не смог править: edit_file отклонён, файл цел', open(os.path.join(PROJ, 'notes.txt')).read() == 'секрет: 42\n' and any('недоступно' in x['content'] for x in subr[1]['msgs'] if x.get('role') == 'tool'))
    check('карточка task: шаги подагента записаны в деталях', r['cards'][0]['n'] == 'task' and 'read_file notes.txt' in r['cards'][0]['d'] and r['cards'][0]['st'] == 'ok', r['cards'][0])
    r = run([{'calls': [TASK]}, {'text': 'ок'}], mode='read', sub=SUB)
    check('подагент работает и в режиме «Только чтение»', 'Секрет равен 42' in tool_msgs(1)[0]['content'] if False else any('Секрет равен 42' in x['content'] for x in [y for y in pg.evaluate("window.__reqs") if not y['sub']][1]['msgs'] if x.get('role') == 'tool'))
    # параллельные подагенты
    T1 = {'name': 'task', 'args': {'description': 'раз', 'prompt': 'Задание раз'}}; T2 = {'name': 'task', 'args': {'description': 'два', 'prompt': 'Задание два'}}
    SUB2 = {'Задание раз': [{'text': 'Отчёт РАЗ'}], 'Задание два': [{'text': 'Отчёт ДВА'}]}
    r = run([{'calls': [T1, T2]}, {'text': 'оба готовы'}], mode='auto', sub=SUB2)
    mainr = [x for x in pg.evaluate("window.__reqs") if not x['sub']]
    tm = [x['content'] for x in mainr[1]['msgs'] if x.get('role') == 'tool']
    check('два task в одном ответе: оба отчёта вернулись, порядок как в вызовах', len(tm) == 2 and 'Отчёт РАЗ' in tm[0] and 'Отчёт ДВА' in tm[1], tm)
    # подагент читает сайт: вопрос про доступ один на сайт
    pg.evaluate("Web._clear()")
    SUB3 = {'Прочитай сайт': [{'calls': [{'name': 'web_fetch', 'args': {'url': 'https://docs.example.com/page'}}]}, {'text': 'Страница про Заголовок'}]}
    start([{'calls': [{'name': 'task', 'args': {'description': 'сайт', 'prompt': 'Прочитай сайт'}}]}, {'text': 'ок'}], mode='ask', sub=SUB3)
    t = answer('[data-y]'); r = finish()
    check('подагент читает сайт через общий запрос доступа', 'Открыть сайт?' in t and 'Страница про Заголовок' in r['cards'][0]['o'], (t, r['cards'][0]['o']))
    # лимит шагов подагента
    LOOP = {'Бесконечно': [{'calls': [{'name': 'list_dir', 'args': {'path': '.'}}]}] * 30 + [{'text': 'итог после лимита'}]}
    r = run([{'calls': [{'name': 'task', 'args': {'description': 'цикл', 'prompt': 'Бесконечно'}}]}, {'text': 'ок'}], mode='auto', sub=LOOP)
    sr = [x for x in pg.evaluate("window.__reqs") if x['sub']]
    check('лимит шагов подагента: он останавливается и просит отчёт без инструментов', len(sr) <= 14 and 'tools' not in sr[-1]['prov'], len(sr))

    # ===== 5. MCP =====
    check('Mcp: модуль подключён к агенту', pg.evaluate("typeof Mcp!=='undefined'&&Coder.allTools().length===10"))
    pg.evaluate("Mcp._reset();Mcp.list().length");
    pg.evaluate("localStorage.setItem('kairema.mcp.v1',JSON.stringify([{id:'t1',name:'test',url:'https://mcp.test/mcp',on:1,tok:1}]))")
    pg.reload(); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());S.apiMsgs.length=0;show('api')"); pg.wait_for_timeout(700)
    errs0 = pg.evaluate("Mcp.ready().then(e=>e)")
    check('Mcp.ready: подключение прошло без ошибок', errs0 == [], errs0)
    names = pg.evaluate("Coder.allTools().map(t=>t.name)")
    check('инструменты сервера видны агенту как mcp__сервер__инструмент (с постраничной выдачей)', 'mcp__test__echo' in names and 'mcp__test__lookup' in names and 'mcp__test__bad' in names, names)
    d = pg.evaluate("Coder.defs(false).find(t=>t.function.name==='mcp__test__echo')")
    check('схема инструмента передана как есть, описание с именем сервера', d['function']['parameters']['properties']['text']['type'] == 'string' and d['function']['description'].startswith('[test]'), d)
    h = pg.evaluate("window.__http")
    check('первый запрос — initialize без сессии, токен идёт как keyId, не в заголовках', json.loads(h[0]['body'])['method'] == 'initialize' and h[0]['keyId'] == 'mcp-t1' and 'Authorization' not in (h[0].get('headers') or {}), h[0])
    check('дальше заголовок Mcp-Session-Id и версия протокола', all(x['headers'].get('Mcp-Session-Id') == 'sess1' and x['headers'].get('MCP-Protocol-Version') == '2025-03-26' for x in h[1:]) and len(h) >= 4, [x['headers'] for x in h])
    check('отправлено уведомление initialized и 2 страницы tools/list', [json.loads(x['body']).get('method') for x in h] == ['initialize', 'notifications/initialized', 'tools/list', 'tools/list'], [json.loads(x['body']).get('method') for x in h])
    ECHO = {'name': 'mcp__test__echo', 'args': {'text': 'привет'}}
    start([{'calls': [ECHO]}, {'text': 'MCP ответил'}], mode='ask')
    t = answer('[data-a]'); r = finish()
    check('MCP в режиме «Спрашивать»: вопрос с сервером, инструментом и аргументами', 'Вызвать инструмент MCP?' in t and 'test → mcp__test__echo' in t and 'привет' in t, t)
    check('результат MCP дошёл до модели', 'ECHO:привет' in tool_msgs(1)[0]['content'] and r['ag'][0] == 'mcp__test__echo:ok', (tool_msgs(1), r['ag']))
    check('в запросе к серверу ушёл tools/call с аргументами', any(json.loads(x['body']).get('method') == 'tools/call' and json.loads(x['body'])['params']['arguments'] == {'text': 'привет'} for x in pg.evaluate("window.__http")))
    r = run([{'calls': [ECHO, {'name': 'mcp__test__lookup', 'args': {'q': 'кот'}}, {'name': 'mcp__test__bad', 'args': {}}]}, {'text': 'ок'}], mode='auto')
    tm = [x['content'] for x in tool_msgs(1)]
    check('режим «Полный авто»: без вопросов; SSE-ответ разобран; isError → ошибка', 'ECHO:привет' in tm[0] and 'FOUND:кот' in tm[1] and 'сервер упал' in tm[2] and r['ag'] == ['mcp__test__echo:ok', 'mcp__test__lookup:ok', 'mcp__test__bad:err'], (tm, r['ag']))
    r = run([{'calls': [ECHO, {'name': 'mcp__test__bad', 'args': {}}]}, {'text': 'ок'}], mode='read')
    tm = [x['content'] for x in tool_msgs(1)]
    check('«Только чтение»: инструмент без readOnlyHint запрещён', all('Только чтение' in x for x in tm), tm)
    start([{'calls': [{'name': 'mcp__test__lookup', 'args': {'q': 'ро'}}]}, {'text': 'ок'}], mode='read')
    t = answer('[data-y]'); r = finish()
    check('«Только чтение»: инструмент с readOnlyHint разрешён (после вопроса)', 'FOUND:ро' in tool_msgs(1)[0]['content'] and r['ag'][0] == 'mcp__test__lookup:ok', (t, r['ag']))
    pg.evaluate("window.__mcpGone=1;Mcp._sessDrop&&0")
    r = run([{'calls': [ECHO]}, {'text': 'ок'}], mode='auto')
    check('сессия потеряна (404) → одна повторная инициализация и повтор вызова', 'ECHO:привет' in tool_msgs(1)[0]['content'], tool_msgs(1))
    pg.evaluate("window.__mcpGone=0")
    check('провайдер: meta возвращает сервер и признак readOnly', pg.evaluate("[Mcp.provider.meta('mcp__test__lookup'),Mcp.provider.meta('mcp__test__echo')]") == [{'server': 'test', 'ro': True}, {'server': 'test', 'ro': False}])
    # сервер недоступен
    pg.evaluate("Mcp._reset();localStorage.setItem('kairema.mcp.v1','[]')")
    pg.reload(); pg.wait_for_timeout(5500)
    pg.evaluate("localStorage.setItem('kairema.mcp.v1',JSON.stringify([{id:'t2',name:'dead',url:'https://mcp.test/x',on:1,tok:0}]));window.__mcpFail=1")
    pg.reload(); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());S.apiMsgs.length=0;show('api');window.__mcpFail=1"); pg.wait_for_timeout(700)
    r = run([{'text': 'работаю без MCP'}], mode='auto')
    check('недоступный MCP-сервер не ломает агента: карточка-ошибка и обычный ответ', 'mcp:err' in r['ag'] and r['t'] == 'работаю без MCP' and not r['err'], r)
    check('в запросе к модели нет инструментов недоступного сервера', all('dead' not in t['function']['name'] for t in pg.evaluate("window.__reqs")[0]['prov']['tools']))
    pg.evaluate("window.__mcpFail=0")

    # ===== 6. интерфейс MCP =====
    pg.evaluate("Mcp._reset()")
    pg.evaluate("Coder.panel()"); pg.wait_for_timeout(600)
    check('в окне агента есть кнопка «MCP-серверы…»', pg.locator('.sheet [data-mcp]').count() == 1)
    pg.locator('.sheet [data-mcp]').click(); pg.wait_for_timeout(600)
    top = lambda sel: pg.locator('.sheet-bg').last.locator(sel)
    check('окно MCP открылось, список пуст', 'Серверов пока нет' in top('.sheet').inner_text())
    top('[data-add]').click(); pg.wait_for_timeout(500)
    top('[data-n]').fill('my srv'); top('[data-u]').fill('ftp://x'); top('[data-k]').fill('TOKEN-123')
    top('[data-s]').click(); pg.wait_for_timeout(400)
    check('неверный адрес не принимается', pg.evaluate("Mcp.list().length") == 0)
    top('[data-u]').fill('https://mcp.test/mcp'); top('[data-s]').click(); pg.wait_for_timeout(2500)
    lst = pg.evaluate("Mcp.list()")
    check('сервер добавлен в список (localStorage) с флагом токена, самого токена там нет',
          len(lst) == 1 and lst[0]['name'] == 'my srv' and lst[0]['tok'] == 1 and 'TOKEN-123' not in pg.evaluate("localStorage.getItem('kairema.mcp.v1')"), lst)
    check('токен сохранён в Keystore под mcp-<id>', pg.evaluate("window.__keys") == [['mcp-' + lst[0]['id'], 'TOKEN-123']], pg.evaluate("window.__keys"))
    row = top('.mcr').inner_text()
    check('после добавления сервер проверен: «✓ 3 инструм.»', '✓ 3' in row, row)
    names = pg.evaluate("Coder.allTools().map(t=>t.name)")
    check('имя сервера с пробелом превращено в безопасное (mcp__my_srv__echo)', 'mcp__my_srv__echo' in names, names)
    top('[data-d]').click(); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelector('.sheet [data-o]').click()"); pg.wait_for_timeout(500)
    check('удаление: список пуст, токен удалён из Keystore', pg.evaluate("Mcp.list().length") == 0 and ['del', 'mcp-' + lst[0]['id']] in pg.evaluate("window.__keys"))
    bk = open(os.path.join(os.path.dirname(UI), 'features/backup/backup.js')).read()
    check('список MCP-серверов входит в резервную копию', "'kairema.mcp.v1'" in bk)
    check('нет ошибок страницы', not errs, errs)
    b.close()
print('\nИТОГ:', OK, 'ок,', len(BAD), 'провалов'); 
if BAD: print(BAD); raise SystemExit(1)
