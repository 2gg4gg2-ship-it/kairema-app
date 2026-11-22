"""Тест 0.46.1 (папка проекта от домашней, повтор при плохой сети). Основа — agent044. Тест 0.44.0: хуки проекта, навыки (/init, /review, свои), журнал прошлых запусков в истории, read_image и картинки пользователя. Мост подменён: «модель» идёт по сценарию,
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
NOGIT = [0]; CWD = [None]
def host_shell(cmd):
    env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
    if NOGIT[0]: env['PATH'] = BIN
    env['HOME'] = WORK
    r = subprocess.run(['bash', '-c', cmd], cwd=CWD[0] or WORK, env=env, capture_output=True, text=True, timeout=60)
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
   setTimeout(()=>{if(t.text)KairemaNative.chunk(id,t.text);if(t.calls)KairemaNative.chunk(id,'\u0004'+JSON.stringify(t.calls.map((c,i)=>({id:'c'+window.__reqs.length+'_'+i,name:c.name,args:typeof c.args==='string'?c.args:JSON.stringify(c.args)}))));KairemaNative.done(id,t.err||null)},10)},
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
    NOERR = lambda: None
    # --- 1. папка проекта не вкладывается сама в себя ---
    reset()
    # имитируем «запомненную» текущую папку: команды терминала уже ушли внутрь проекта
    os.makedirs(os.path.join(PROJ, 'kairema-work'), exist_ok=True)
    cmds = [{'calls': [{'name': 'run_command', 'args': {'command': 'pwd'}}]}, {'calls': [{'name': 'write_file', 'args': {'path': 'AGENTS.md', 'content': 'hi'}}]}, {'text': 'ок'}]
    CWD[0] = PROJ  # оболочка стартует не из корня, а из самой папки проекта (как после запомненного cd)
    r = run(cmds)
    CWD[0] = None
    out = pg.evaluate("window.__reqs")[1]['msgs']
    pw = [x for x in out if x.get('role') == 'tool'][0]['content']
    check('агент: папка проекта считается от домашней, а не от текущей (нет kairema-work/kairema-work)', 'kairema-work/kairema-work' not in pw.replace('\n', ''), pw)
    check('агент: AGENTS.md записан в папке проекта', os.path.exists(os.path.join(PROJ, 'AGENTS.md')) and not os.path.exists(os.path.join(PROJ, 'kairema-work', 'kairema-work')))
    # --- 2. один сбой сети: агент повторяет сам и заканчивает работу ---
    reset()
    pg.evaluate("Coder._net(3,1)")
    r = run([{'err': 'нет соединения или неверный адрес'}, {'text': 'после сбоя ответил'}])
    n = len(pg.evaluate("window.__reqs"))
    check('сбой сети: запрос повторён (2 обращения), итог получен, ошибки нет', n == 2 and r['t'] == 'после сбоя ответил' and not r['err'], (n, r))
    # --- 3. сбои 5xx и таймаут тоже повторяются, 401 — нет ---
    r = run([{'err': 'ошибка 503: overloaded'}, {'err': 'время ожидания истекло: модель не ответила, повторите или выберите другую'}, {'text': 'готово'}])
    check('503 и таймаут: два повтора подряд, затем успех', r['t'] == 'готово' and not r['err'], r)
    r = run([{'err': 'ключ отклонён (401): проверьте ключ'}, {'text': 'не должно дойти'}])
    n = len(pg.evaluate("window.__reqs"))
    check('401 не повторяется (1 обращение, ошибка показана)', n == 1 and r['err'] and '401' in r['t'], (n, r))
    # --- 4. сети нет совсем: после лимита повторов — ошибка с подсказкой «продолжай» ---
    pg.evaluate("Coder._net(2,1)")
    r = run([{'err': 'нет соединения или неверный адрес'}] * 5)
    n = len(pg.evaluate("window.__reqs"))
    check('сети нет: 3 обращения (1 + 2 повтора), затем ошибка с подсказкой «продолжай»', n == 3 and r['err'] and 'продолжай' in r['t'], (n, r))
    # --- 5. «Стоп» во время ожидания повтора прерывает его сразу ---
    pg.evaluate("Coder._net(5,30)")
    start([{'err': 'нет соединения или неверный адрес'}, {'text': 'не должно дойти'}])
    pg.wait_for_function("(()=>{const b=document.querySelector('#v-api .msgs');return b&&/Повтор 1\\/5/.test(b.innerText)})()", timeout=15000)
    txt = pg.evaluate("document.querySelector('#v-api .msgs').innerText")
    check('на экране виден статус «Нет связи… Повтор 1/5 через N с»', 'Нет связи' in txt and 'Повтор 1/5' in txt, txt[-200:])
    pg.evaluate("GEN.stop()")
    pg.wait_for_function('window.__done===true', timeout=10000)
    n = len(pg.evaluate("window.__reqs"))
    check('«Стоп» во время ожидания: новый запрос не отправлен, запуск завершён быстро', n == 1, n)
    pg.evaluate("Coder._net(7,3)")
    check('нет ошибок страницы', not errs, errs)
    b.close()
print('\nИТОГ:', OK, 'ок,', len(BAD), 'провалов')
if BAD: print(BAD); raise SystemExit(1)
