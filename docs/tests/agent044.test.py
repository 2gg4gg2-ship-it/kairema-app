"""Тест 0.44.0: хуки проекта, навыки (/init, /review, свои), журнал прошлых запусков в истории, read_image и картинки пользователя. Мост подменён: «модель» идёт по сценарию,
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
    env['HOME'] = WORK
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

    def start(script, mode='auto', q='Задача', sub=None, instr=1, hooks=0, msgs=None):
        pg.evaluate("window.__script=%s;window.__subq=%s;window.__reqs=[];window.__http=[];window.__done=false" % (json.dumps(script), json.dumps(sub or {})))
        pg.evaluate("(()=>{Coder.cfg.on=1;Coder.cfg.mode=%s;Coder.cfg.env='sandbox';Coder.cfg.dir='kairema-work';Coder.cfg.steps=40;Coder.cfg.instr=%d;Coder.cfg.hooks=%d;Coder._reset();S.apiMsgs.length=0;(%s||[{r:'u',q:%s,t:%s}]).forEach(x=>S.apiMsgs.push(x));const box=document.querySelector('#v-api .msgs');window.__p=respond(S.apiMsgs,box,'').then(()=>{window.__done=true})})();0" % (json.dumps(mode), instr, hooks, json.dumps(msgs) if msgs else 'null', json.dumps(q), json.dumps(q)))
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

    import base64
    def hooks_file(obj):
        os.makedirs(os.path.join(PROJ, '.kairema'), exist_ok=True)
        open(os.path.join(PROJ, '.kairema', 'hooks.json'), 'w').write(json.dumps(obj, ensure_ascii=False))
    def skill_file(name, text):
        os.makedirs(os.path.join(PROJ, '.kairema', 'skills'), exist_ok=True)
        open(os.path.join(PROJ, '.kairema', 'skills', name + '.md'), 'w').write(text)
    def sysprompt(i=0): return pg.evaluate("window.__reqs")[i]['prov']['system']
    EDIT = {'name': 'edit_file', 'args': {'path': 'a.py', 'old': 'x = 1', 'new': 'x = 2'}}

    # ===== 1. хуки: по умолчанию выключены =====
    reset(); hooks_file({'hooks': [{'event': 'after_edit', 'match': '*.py', 'run': "echo LINT-{file}; exit 3"}]})
    r = run([{'calls': [EDIT]}, {'text': 'ок'}], hooks=0)
    check('хуки выключены: найдены, но не запускаются, есть предупреждение', r['ag'][0] == 'hooks:no' and 'LINT' not in tool_msgs(1)[0]['content'], (r['ag'], tool_msgs(1)))
    # ===== 2. after_edit =====
    reset(); hooks_file({'hooks': [{'event': 'after_edit', 'match': '*.py', 'run': "echo LINT-{file}; exit 3"}]})
    r = run([{'calls': [EDIT, {'name': 'write_file', 'args': {'path': 'n.txt', 'content': 'x'}}]}, {'text': 'ок'}], hooks=1)
    tm = [x['content'] for x in tool_msgs(1)]
    check('after_edit: после правки .py запущен хук, вывод и код 3 попали в ответ инструмента', 'хук after_edit' in tm[0] and 'LINT-a.py' in tm[0] and 'код 3' in tm[0], tm)
    check('after_edit: для n.txt (не *.py) хук не запускался', 'хук' not in tm[1], tm)
    check('after_edit: карточка правки помечена ошибкой (хук упал), первая карточка — список хуков', r['ag'][0] == 'hooks:ok' and r['ag'][1] == 'edit_file:err' and r['ag'][2] == 'write_file:ok', r['ag'])
    check('after_edit: сама правка применена', 'x = 2' in open(os.path.join(PROJ, 'a.py')).read())
    reset(); hooks_file({'hooks': [{'event': 'after_edit', 'match': '*.py', 'run': "echo ok-{file}"}]})
    r = run([{'calls': [{'name': 'apply_patch', 'args': {'edits': [{'path': 'a.py', 'old': 'x = 1', 'new': 'x = 5'}, {'path': 'b.py', 'old': 'old2', 'new': 'n2'}, {'path': 'a.py', 'old': 'y = 2', 'new': 'y = 6'}]}}]}, {'text': 'ок'}], hooks=1)
    c = tool_msgs(1)[0]['content']
    check('after_edit для apply_patch: по разу на каждый затронутый файл, хук успешен — карточка зелёная', c.count('хук after_edit') == 2 and 'ok-a.py' in c and 'ok-b.py' in c and r['ag'][1] == 'apply_patch:ok', (c, r['ag']))
    # ===== 3. before_command =====
    reset(); hooks_file({'hooks': [{'event': 'before_command', 'match': 'git push*', 'block': True, 'message': 'push только вручную'}, {'event': 'before_command', 'match': 'touch *', 'run': 'test -f ALLOW'}]})
    r = run([{'calls': [{'name': 'run_command', 'args': {'command': 'git push origin main'}}, {'name': 'run_command', 'args': {'command': 'echo fine'}}, {'name': 'run_command', 'args': {'command': 'touch zzz'}}]}, {'text': 'ок'}], hooks=1)
    tm = [x['content'] for x in tool_msgs(1)]
    check('before_command block: команда запрещена с сообщением, не выполнялась', 'Запрещено хуком проекта: push только вручную' in tm[0] and r['ag'][1] == 'run_command:no', (tm, r['ag']))
    check('before_command: не подходящая под шаблон команда выполняется', 'fine' in tm[1])
    check('before_command run: хук (test -f ALLOW) не пропустил touch, файл не создан', 'не пропустил' in tm[2] and not os.path.exists(os.path.join(PROJ, 'zzz')), tm[2])
    open(os.path.join(PROJ, 'ALLOW'), 'w').write('1')
    r = run([{'calls': [{'name': 'run_command', 'args': {'command': 'touch zzz'}}]}, {'text': 'ок'}], hooks=1)
    check('before_command run: хук прошёл — команда выполнена', os.path.exists(os.path.join(PROJ, 'zzz')))
    # ===== 4. on_finish =====
    reset(); hooks_file({'hooks': [{'event': 'on_finish', 'run': 'test -f DONE || { echo "нет файла DONE"; exit 1; }'}]})
    r = run([{'text': 'Готово!'}, {'calls': [{'name': 'write_file', 'args': {'path': 'DONE', 'content': '1'}}]}, {'text': 'Теперь точно готово'}], hooks=1)
    rq = pg.evaluate("window.__reqs")
    um = [x['content'] for x in rq[1]['msgs'] if x.get('role') == 'user' and isinstance(x['content'], str)]
    check('on_finish: хук упал — модель получила вывод и продолжила', any('on_finish' in u and 'нет файла DONE' in u for u in um) and len(rq) == 3, (um, len(rq)))
    check('on_finish: после исправления хук прошёл, итоговый ответ последний', r['t'] == 'Теперь точно готово' and r['ag'][-1] == 'hook:ok' and 'hook:err' in r['ag'], r)
    reset(); hooks_file({'hooks': [{'event': 'on_finish', 'run': 'echo плохо; exit 1'}]})
    r = run([{'text': 'раз'}, {'text': 'два'}, {'text': 'три'}, {'text': 'четыре'}], hooks=1)
    check('on_finish: не более 2 повторов, потом ответ принимается как есть', len(pg.evaluate("window.__reqs")) == 3 and r['t'] == 'три', (len(pg.evaluate("window.__reqs")), r['t']))
    # ===== 5. hooks.json: ошибки и фильтрация =====
    reset(); os.makedirs(os.path.join(PROJ, '.kairema'), exist_ok=True); open(os.path.join(PROJ, '.kairema', 'hooks.json'), 'w').write('{не json')
    r = run([{'text': 'ок'}], hooks=1)
    check('битый hooks.json: карточка-ошибка, агент работает дальше', r['ag'][0] == 'hooks:err' and r['t'] == 'ок', r['ag'])
    hooks_file({'hooks': [{'event': 'неизвестное', 'run': 'x'}, {'event': 'after_edit'}, 'мусор']})
    r = run([{'text': 'ок'}], hooks=1)
    check('хуки с неизвестным событием или без действия отбрасываются (карточки нет)', not any(a.startswith('hooks') for a in r['ag']), r['ag'])
    os.remove(os.path.join(PROJ, '.kairema', 'hooks.json'))

    # ===== 6. навыки =====
    reset()
    r = run([{'text': 'ок'}])
    s0 = sysprompt()
    check('системный запрос перечисляет встроенные навыки', '[НАВЫКИ]' in s0 and all(k + ' — ' in s0 for k in ['init', 'review', 'tests', 'continue']))
    r = run([{'text': 'ок'}], q='/review проверь модуль api')
    u0 = pg.evaluate("window.__reqs")[0]['msgs'][0]['content']
    check('/review: к запросу добавлена инструкция навыка и сохранён текст пользователя', u0.startswith('[НАВЫК /review') and 'git diff' in u0 and u0.rstrip().endswith('/review проверь модуль api'), u0[:200])
    check('/review: карточка «Навык»', r['ag'][0] == 'skill:ok', r['ag'])
    r = run([{'text': 'ок'}], q='/nope что-то')
    check('неизвестная /команда: инструкции не добавляются', not pg.evaluate("window.__reqs")[0]['msgs'][0]['content'].startswith('[НАВЫК'))
    r = run([{'text': 'ок'}], q='привет /review')
    check('/review не в начале сообщения не срабатывает', not pg.evaluate("window.__reqs")[0]['msgs'][0]['content'].startswith('[НАВЫК'))
    skill_file('deploy', '---\ndescription: Выкатить на сервер\n---\nШаг 1: собери. Шаг 2: отправь. SKILL-DEPLOY')
    skill_file('review', '# Мой обзор\nМОЙ-РЕВЬЮ-ТЕКСТ')
    r = run([{'text': 'ок'}], q='/deploy на стенд')
    s0 = sysprompt(); u0 = pg.evaluate("window.__reqs")[0]['msgs'][0]['content']
    check('свой навык из .kairema/skills: описание из frontmatter в списке, тело в запросе без frontmatter', 'deploy — Выкатить на сервер' in s0 and 'SKILL-DEPLOY' in u0 and 'description:' not in u0, (s0[-400:], u0[:200]))
    r = run([{'text': 'ок'}], q='/review')
    u0 = pg.evaluate("window.__reqs")[0]['msgs'][0]['content']
    check('свой review.md заменяет встроенный', 'МОЙ-РЕВЬЮ-ТЕКСТ' in u0 and 'git diff' not in u0 and 'review — Мой обзор' in sysprompt(), u0[:200])
    r = run([{'calls': [{'name': 'skill', 'args': {'name': 'deploy'}}, {'name': 'skill', 'args': {'name': 'init'}}, {'name': 'skill', 'args': {'name': 'нет'}}, {'name': 'skill', 'args': {'name': '../hooks'}}]}, {'text': 'ок'}])
    tm = [x['content'] for x in tool_msgs(1)]
    check('инструмент skill: загружает свой и встроенный навык, неизвестный и путь с «..» — ошибка', 'SKILL-DEPLOY' in tm[0] and 'AGENTS.md' in tm[1] and 'не найден' in tm[2] and 'не найден' in tm[3], tm)
    shutil.rmtree(os.path.join(PROJ, '.kairema'))

    # ===== 7. журнал прошлых запусков в истории =====
    reset()
    def ag(h, st='ok', o=''): return {'k': 'tool', 'n': h.split()[0], 'h': h, 'st': st, 'd': '', 'o': o}
    hist = [{'r': 'u', 'q': 'один', 't': 'один'},
            {'r': 'a', 't': 'ответ-1', 'ag': [ag('write_file OLD.py')]},
            {'r': 'u', 'q': 'два', 't': 'два'},
            {'r': 'a', 't': 'ответ-2', 'ag': [ag('write_file MID.py')]},
            {'r': 'u', 'q': 'сделай X', 't': 'сделай X'},
            {'r': 'a', 't': '', 'err': True, 'ag': [ag('write_file a.py', 'ok', 'записан'), ag('run_command pytest', 'err', 'FAILED 1 test\nдлинный хвост'), ag('edit_file b.py', 'run')], 'plan': [{'t': 'шаг первый', 's': 'done'}, {'t': 'шаг второй', 's': 'doing'}, {'t': 'шаг третий', 's': 'pending'}]},
            {'r': 'u', 'q': 'продолжай', 't': 'продолжай'}]
    r = run([{'text': 'продолжаю'}], msgs=hist)
    am = [x['content'] for x in pg.evaluate("window.__reqs")[0]['msgs'] if x['role'] == 'assistant']
    check('прерванный запуск (без итогового ответа) виден модели с пометкой и журналом', len(am) == 3 and 'запуск был прерван' in am[2] and 'run_command pytest [ошибка]: FAILED 1 test длинный хвост' in am[2] and 'edit_file b.py [не завершено]' in am[2], am[2])
    check('в журнале есть план с отметками', '[x] шаг первый; [>] шаг второй; [ ] шаг третий' in am[2], am[2])
    check('журнал только у двух последних запусков с действиями, у старых только текст', 'Журнал' not in am[0] and 'Журнал' in am[1] and 'MID.py' in am[1], (am[0], am[1]))
    check('успешные шаги без вывода', 'write_file a.py [ок]' in am[2] and 'записан' not in am[2], am[2])
    # ===== 8. картинки =====
    reset()
    png = os.urandom(200000); open(os.path.join(PROJ, 'shot.png'), 'wb').write(png)
    open(os.path.join(PROJ, 'huge.png'), 'wb').write(os.urandom(500000)); open(os.path.join(PROJ, 'doc.txt'), 'w').write('x')
    pg.evaluate("window.__vis=true;Caps.vision=()=>window.__vis")
    r = run([{'calls': [{'name': 'read_image', 'args': {'path': 'shot.png'}}]}, {'text': 'вижу'}])
    msgs1 = pg.evaluate("window.__reqs")[1]['msgs']
    iu = [x for x in msgs1 if x['role'] == 'user' and isinstance(x['content'], list)]
    check('read_image: файл 200 КБ прочитан по кускам, модель получила картинку отдельным user-сообщением', len(iu) == 1 and iu[0]['content'][1]['type'] == 'image_url', [x['role'] for x in msgs1])
    check('read_image: данные картинки побайтно совпадают с файлом', iu and iu[0]['content'][1]['image_url']['url'] == 'data:image/png;base64,' + base64.b64encode(png).decode())
    check('read_image: ответ инструмента с размером; сообщение с картинкой идёт сразу после ответов инструментов',
          'передано тебе' in tool_msgs(1)[0]['content'] and [x['role'] for x in msgs1][-2:] == ['tool', 'user'], [x['role'] for x in msgs1])
    r = run([{'calls': [{'name': 'read_image', 'args': {'path': 'huge.png'}}, {'name': 'read_image', 'args': {'path': 'нет.png'}}, {'name': 'read_image', 'args': {'path': 'doc.txt'}}, {'name': 'read_image', 'args': {'path': '../x.png'}}]}, {'text': 'ок'}])
    tm = [x['content'] for x in tool_msgs(1)]
    check('read_image: слишком большой, нет файла, не картинка, путь вне проекта — понятные ошибки', 'больше 400 КБ' in tm[0] and 'файла нет' in tm[1] and 'поддерживаются' in tm[2] and 'вне папки' in tm[3], tm)
    check('read_image без картинок в ответе: отдельного сообщения с изображением нет', not [x for x in pg.evaluate("window.__reqs")[1]['msgs'] if x['role'] == 'user' and isinstance(x['content'], list)])
    pg.evaluate("window.__vis=false")
    r = run([{'calls': [{'name': 'read_image', 'args': {'path': 'shot.png'}}]}, {'text': 'ок'}])
    check('модель без зрения: read_image отказывает с подсказкой', 'не умеет видеть' in tool_msgs(1)[0]['content'])
    pg.evaluate("window.__vis=true")
    an = pg.evaluate("Coder.toAnth([{role:'user',content:'q'},{role:'assistant',text:'',calls:[{id:'c1',name:'read_image',args:'{}'}]},{role:'tool',results:[{id:'c1',name:'read_image',content:'ок',err:0}],imgs:[{path:'s.png',mime:'image/png',data:'QUJD'}]}])")
    check('формат Anthropic: картинка идёт блоком image в том же user-сообщении после tool_result', an[2]['content'][0]['type'] == 'tool_result' and an[2]['content'][1] == {'type': 'image', 'source': {'type': 'base64', 'media_type': 'image/png', 'data': 'QUJD'}}, an[2])
    sh = pg.evaluate("(()=>{const c=[];for(let i=0;i<8;i++)c.push({role:'tool',results:[{id:'x',name:'t',content:'y'}],imgs:[{path:'p'+i,mime:'image/png',data:'AA'}]});Coder.shrink(c,6,400);return c.map(e=>!!e.imgs)})()")
    check('старые картинки сбрасываются при сжатии контекста (остаются последние 6)', sh == [False, False, True, True, True, True, True, True], sh)
    # картинка, приложенная пользователем в чате, доходит до агента
    r = run([{'text': 'вижу'}], msgs=[{'r': 'u', 'q': 'что на фото?', 't': 'что на фото?', 'parts': [{'k': 'image', 'name': 'a.png', 'mime': 'image/png', 'data': 'AAAA'}]}])
    c0 = pg.evaluate("window.__reqs")[0]['msgs'][0]['content']
    check('картинка пользователя из чата передаётся агенту (image_url + текст)', isinstance(c0, list) and c0[0]['type'] == 'image_url' and c0[-1]['text'].endswith('что на фото?'), c0)
    check('нет ошибок страницы', not errs, errs)
    b.close()
print('\nИТОГ:', OK, 'ок,', len(BAD), 'провалов')
if BAD: print(BAD); raise SystemExit(1)
