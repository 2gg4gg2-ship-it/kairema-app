"""Тесты 0.27.0: терминал и модели. Кнопка «Выполнить» для кривых ответов, агент с настоящей оболочкой /bin/sh, зацикливание,
незакрытый блок, опасная команда, сжатие длинного вывода, подсказка «команда не найдена», инструкция для модели.
Запуск: python3 docs/tests/term027.test.py   (нужны playwright и Chromium; оболочка берётся с этой машины, это не Android).
Настоящий Android и Kotlin не запускает."""
import json, os, subprocess, sys, tempfile
from playwright.sync_api import sync_playwright

UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
WORK = tempfile.mkdtemp(prefix='kwork')
OK = 0; BAD = []
def check(name, cond, info=''):
    global OK
    if cond: OK += 1; print('ok  ', name)
    else: BAD.append(name); print('FAIL', name, info)

INIT = r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'OpenRouter',model:'x/y:free',url:'https://openrouter.ai/api/v1',ok:true}],s:[]}));
 localStorage.setItem('kact','p1');
 window.__replies = []; window.__sent = []; window.__sys = '';
 window.KairemaBridge = {
  hasKey: () => true, cancel(){}, copyText: () => true,
  saveKey(){}, deleteKey(){}, termuxStatus: () => '{}',
  chat(id, prov, msgs) { const P = JSON.parse(prov); window.__sys = P.system; const h = JSON.parse(msgs); window.__sent.push(h[h.length-1].content);
    const r = window.__replies.length ? window.__replies.shift() : 'Готово.';
    setTimeout(() => { KairemaNative.chunk(id, r); KairemaNative.done(id, null) }, 10) },
  shell(id, cmd, to) { window.hostShell(cmd, to).then(r => { KairemaNative.chunk(id, r.out + '\n\u0001exit:' + r.code); KairemaNative.done(id, null) }) },
 };
}
"""
def host_shell(cmd, to):
    if 'NOISE' in cmd:
        return {'out': '/data/user/0/com.kairema.app/files/work/.kcmd_r7.sh: 1: foo: not found\nok', 'code': 127}
    # как Kotlin Shell.kt: команда в файл, запуск через обёртку из assets/terminal (папка запоминается)
    ASSETS = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/terminal'))
    script = os.path.join(WORK, '.kcmd_test.sh')
    open(script, 'w').write(cmd + '\n')
    try:
        p = subprocess.run(['/bin/sh', os.path.join(ASSETS, 'kairema-wrap.sh'), WORK, script, os.path.join(WORK, '.kcwd'), os.path.join(ASSETS, 'kairemarc.sh')],
                           cwd=WORK, capture_output=True, timeout=min(int(to), 20), stdin=subprocess.DEVNULL)
        return {'out': (p.stdout + p.stderr).decode('utf-8', 'replace'), 'code': p.returncode}
    except subprocess.TimeoutExpired:
        return {'out': '[остановлено: время вышло]', 'code': 137}

def reply(pg, text):
    pg.evaluate('t => window.__replies.push(t)', text)

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 360, 'height': 780})
    ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.expose_function('hostShell', host_shell)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)

    # 1. Инструкция для модели
    pg.evaluate("Chat.send('привет')"); pg.wait_for_timeout(500)
    sysm = pg.evaluate('window.__sys')
    check('инструкция: есть блок TERMINAL', 'TERMINAL' in sysm and '```bash' in sysm)
    check('инструкция: нет python в Android-оболочке', 'NO python' in sysm)

    # 2. Какие блоки получают кнопку «Выполнить»
    cases = {
      'bash': ('```bash\nls\n```', 1),
      'без языка': ('```\nls -la\n```', 1),
      'сеанс с $': ('```console\n$ ls\nfile\n```', 1),
      'python': ('```python\nprint(1)\n```', 0),
      'вывод без языка': ('```\ntotal 4\ndrwx 2 u g 4096 a\n```', 0),
      'text с обычным словом': ('```text\nПривет, мир\n```', 0),
    }
    for name, (txt, want) in cases.items():
        reply(pg, txt)
        pg.evaluate("Chat.send('x')"); pg.wait_for_timeout(500)
        got = pg.evaluate("document.querySelectorAll('.msg.a')[document.querySelectorAll('.msg.a').length-1].querySelectorAll('.runbar .rb').length>0?1:0")
        check('кнопка: ' + name, got == want, got)

    # 3. Агент ведёт задачу по шагам с настоящей оболочкой
    def start_agent(first, rest=()):
        pg.evaluate('window.__replies.length=0')
        reply(pg, first)
        for r_ in rest: reply(pg, r_)
        pg.evaluate("Chat.send('сделай')"); pg.wait_for_timeout(500)
        pg.evaluate("[...document.querySelectorAll('.runbar .rb')].pop().click()"); pg.wait_for_timeout(400)
        pg.click('.sheet [data-a]')
    pg.evaluate('window.__sent.length=0')
    subprocess.run(['sh', '-c', 'echo привет > a.txt'], cwd=WORK)
    start_agent('Смотрю.\n```\n$ cat a.txt\nпривет\n```\nГотово',
        ['Ок, теперь проверим:\n```sh\nls -la | head -3\n```', 'Всё выполнено, файл на месте.'])
    pg.wait_for_timeout(5000)
    sent = pg.evaluate('window.__sent')
    check('агент: сеанс с «$ » выполнен как команда cat', any('cat a.txt' in s and 'привет' in s and 'exit code: 0' in s for s in sent), sent)
    check('агент: второй шаг получил результат ls', any('Command results' in s and 'ls -la' in s and 'exit code: 0' in s for s in sent), sent)
    check('агент: закончился без блока', not pg.evaluate('Agent.active()'))

    # 4. Зацикливание: одна и та же ошибка
    pg.evaluate('window.__sent.length=0')
    start_agent('Начнём:\n```bash\nnonexistentcmd --x\n```', ['Попробую ещё раз:\n```bash\nnonexistentcmd --x\n```']*6)
    pg.wait_for_timeout(7000)
    sent = pg.evaluate('window.__sent')
    check('зацикливание: агент остановлен', not pg.evaluate('Agent.active()'))
    check('зацикливание: не больше 4 повторов', len([s for s in sent if 'Command results' in s]) <= 4, len(sent))
    check('подсказка «не найдено» дошла до модели', any('Hint:' in s and 'nonexistentcmd' in s for s in sent), sent[:1])
    pg.evaluate('Agent.stop()')

    # 5. Незакрытый блок: просим повторить, команда не выполняется
    pg.evaluate('window.__sent.length=0')
    start_agent('Первый шаг:\n```bash\necho ok0\n```', ['Теперь вот:\n```bash\necho NOT_RUN_SHOULD_NOT_APPEAR', 'Хорошо.\n```bash\necho ok2\n```', 'Готово.'])
    pg.wait_for_timeout(6000)
    sent = pg.evaluate('window.__sent')
    check('незакрытый блок: просьба прислать полный блок', any('not closed' in s for s in sent), sent)
    check('незакрытый блок: после повтора выполнена команда ok2', any('ok2' in s and 'exit code: 0' in s for s in sent), sent)
    check('незакрытый блок: команда не выполнена', not any('$ echo NOT_RUN' in s for s in sent), sent)
    pg.evaluate('Agent.stop()')

    # 6. Опасная команда в плане: агент не запускает
    pg.evaluate('window.__sent.length=0')
    start_agent('Начнём:\n```bash\necho start\n```', ['Теперь удалим:\n```bash\nrm -rf /data/data/x\n```'])
    pg.wait_for_timeout(4000)
    check('опасная команда: агент остановлен', not pg.evaluate('Agent.active()'))
    pg.evaluate('Agent.stop()')

    # 7. Длинный вывод сжимается
    fb = pg.evaluate("Term.feedback('seq 1 5000',{out:Array.from({length:5000},(_,i)=>i+1).join('\\n'),code:0})")
    check('вывод сжат', 'characters skipped' in fb and len(fb) < 3200, len(fb))

    # 8. Кнопка «Выполнить» вручную: sudo убирается, результат понятен
    reply(pg, '```sh\nsudo echo ручной\n```')
    pg.evaluate("Chat.send('y')"); pg.wait_for_timeout(500)
    pg.evaluate("[...document.querySelectorAll('.runbar .rb')].pop().click()"); pg.wait_for_timeout(400)
    pg.click('.sheet [data-o]'); pg.wait_for_timeout(800)
    txt = pg.evaluate("[...document.querySelectorAll('.runout')].pop().textContent")
    check('sudo убран, команда выполнена', 'ручной' in txt, txt)

    # 9. Самопроверка терминала (на настоящей оболочке этой машины)
    pg.evaluate("Term.activate(true)")
    res = pg.evaluate("Term.selfTest()")
    check('самопроверка: все пункты пройдены', res and res['pass'] == res['total'], res)
    check('самопроверка: пунктов не меньше 12', res and res['total'] >= 12, res)
    r = pg.evaluate("Term.exec('NOISE').then(r=>r.out)")
    check('служебные пути обёртки убраны из вывода', '.kcmd_' not in r and 'foo: not found' in r, r)
    check('нет ошибок в консоли', not errs, errs)
    b.close()
print('\nпройдено', OK, 'провалено', len(BAD), BAD)
sys.exit(1 if BAD else 0)
