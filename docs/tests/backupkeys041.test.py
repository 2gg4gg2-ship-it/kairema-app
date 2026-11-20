"""Тест: резервная копия с зашифрованными API-ключами (features/backup). Мост подменён, шифрование настоящее (WebCrypto Chromium)."""
import os, json
from playwright.sync_api import sync_playwright
UI = os.path.abspath(os.path.join(os.path.dirname(__file__), '../../app/src/main/assets/ui/index.html'))
OK = 0; BAD = []
def check(n, c, i=''):
    global OK
    if c: OK += 1; print('ok  ', n)
    else: BAD.append(n); print('FAIL', n, i)
SECRET = 'sk-test-SECRET-123456'
INIT = r"""
if (window === window.top) {
 localStorage.setItem('ko','1'); localStorage.setItem('kna','1'); localStorage.setItem('kairema.welcome.v1','1');
 localStorage.setItem('kairema.providers.v1', JSON.stringify({c:[{id:'p1',name:'X',model:'m',url:'https://api.groq.com/openai/v1',ok:true},{id:'p2',name:'Y',model:'m',url:'https://api.openai.com/v1',ok:true}],s:[{id:'s1',name:'Tavily',url:'https://api.tavily.com'}]}));
 localStorage.setItem('kact','p1');
 window.__store={p1:'sk-test-SECRET-123456',s1:'tvly-SEARCH-KEY-9999'};window.__saved=null;window.__calls=[];
 window.KairemaBridge = {hasKey:()=>true,cancel(){},copyText:()=>true,saveKey(){},deleteKey(){},termuxStatus:()=>'{}',setOrientation(){},
  keysExport(a,b){const ids=JSON.parse(b===undefined?a:b);window.__calls.push(['export',ids]);const o={};ids.forEach(i=>{if(window.__store[i])o[i]=window.__store[i]});return JSON.stringify(o)},
  keysImport(a,b){const j=JSON.parse(b===undefined?a:b);const add=[];for(const k in j){if(window.__store[k])continue;window.__store[k]=j[k];add.push(k)}window.__calls.push(['import',add]);return JSON.stringify(add)},
  saveFile(...a){const j=a[a.length-1];window.__saved=j;return true},shareFile(...a){window.__saved=a[a.length-1];return true}};
}"""
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 360, 'height': 780}); ctx.add_init_script(INIT)
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e))); pg.set_default_timeout(15000)
    pg.goto('file://' + UI); pg.wait_for_timeout(5500)
    pg.evaluate("document.querySelectorAll('[data-screen=onboarding]').forEach(x=>x.remove());show('api')"); pg.wait_for_timeout(400)
    check('WebCrypto доступен', pg.evaluate("BackupKeys.available()"))

    # --- чистое шифрование ---
    r = pg.evaluate("""(async()=>{const env=await BackupKeys.pack('пароль-12345',{a:'k1',b:'ключ-2'});const s=JSON.stringify(env);
      const ok=await BackupKeys.unpack(env,'пароль-12345');let bad='',bad2='';try{await BackupKeys.unpack(env,'другой-пароль')}catch(e){bad=e.message}
      const env2=await BackupKeys.pack('пароль-12345',{a:'k1',b:'ключ-2'});
      try{await BackupKeys.unpack({v:2},'x')}catch(e){bad2=e.message}
      const t=JSON.parse(JSON.stringify(env));t.ct=t.ct.slice(0,-6)+'AAAAAA';let tam='';try{await BackupKeys.unpack(t,'пароль-12345')}catch(e){tam=e.message}
      return{ok,bad,bad2,tam,hasPlain:s.includes('k1')||s.includes('ключ'),iter:env.iter,diff:env.ct!==env2.ct&&env.salt!==env2.salt&&env.iv!==env2.iv}})()""")
    check('шифрование: верный пароль возвращает ключи (юникод)', r['ok'] == {'a': 'k1', 'b': 'ключ-2'}, r)
    check('шифрование: неверный пароль даёт bad-password', r['bad'] == 'bad-password', r)
    check('шифрование: испорченный шифртекст не расшифровывается', r['tam'] == 'bad-password', r)
    check('шифрование: чужой формат отвергается', r['bad2'] == 'bad-file', r)
    check('шифрование: в файле нет открытого текста, соль/iv/шифртекст разные при каждом вызове', not r['hasPlain'] and r['diff'] and r['iter'] == 250000, r)

    # --- по умолчанию ключей в копии нет ---
    pg.evaluate("Backup.save()"); pg.wait_for_timeout(600)
    j = pg.evaluate("window.__saved")
    check('по умолчанию в копии нет ключей и нет keysEnc', j and SECRET not in j and 'keysEnc' not in j and 'tvly-' not in j)
    check('по умолчанию ключи у Kotlin не запрашивались', pg.evaluate("window.__calls.filter(c=>c[0]==='export').length") == 0)

    # --- с ключами ---
    pg.evaluate("window.__saved=null;openScreen('backup')"); pg.wait_for_timeout(700)
    check('на экране копии есть переключатель ключей', pg.locator('[data-screen=backup] [data-k]').count() == 1)
    pg.locator('[data-k]').click(); pg.wait_for_timeout(200)
    check('переключатель включается', pg.locator('[data-k] .sw.on').count() == 1)
    pg.locator('[data-s]').click(); pg.wait_for_timeout(500)
    check('открылось окно пароля с полем повтора', pg.locator('.sheet [data-p]').count() == 1 and pg.locator('.sheet [data-q]').is_visible())
    pg.locator('[data-p]').fill('short'); pg.locator('[data-q]').fill('short'); pg.locator('.sheet [data-o]').click(); pg.wait_for_timeout(200)
    check('короткий пароль отвергнут', 'короче 8' in pg.locator('[data-e]').inner_text())
    pg.locator('[data-p]').fill('Надёжный-пароль-1'); pg.locator('[data-q]').fill('Другой-пароль-2'); pg.locator('.sheet [data-o]').click(); pg.wait_for_timeout(200)
    check('несовпадение паролей отвергнуто', 'не совпадают' in pg.locator('[data-e]').inner_text())
    pg.locator('[data-q]').fill('Надёжный-пароль-1'); pg.locator('.sheet [data-o]').click(); pg.wait_for_timeout(4000)
    j = pg.evaluate("window.__saved")
    d = json.loads(j)
    check('копия сохранена с keysEnc и keysN=2 (чат-провайдер и поиск)', 'keysEnc' in d and d['keysN'] == 2, list(d.keys()))
    check('в файле нет открытых ключей', SECRET not in j and 'tvly-' not in j and 'SEARCH-KEY' not in j)
    exp = pg.evaluate("window.__calls.filter(c=>c[0]==='export')")
    check('Kotlin попросили ключи всех провайдеров (p1, p2, s1)', exp and sorted(exp[0][1]) == ['p1', 'p2', 's1'], exp)

    # --- восстановление на «чистом» телефоне ---
    pg.evaluate("window.__store={};window.__calls=[];S.providers.forEach(p=>p.ok=false);0")
    pg.evaluate("(async()=>{window.__rk=await Backup.restoreKeys(%s)})();0" % j)
    pg.wait_for_selector('.sheet [data-p]'); pg.wait_for_timeout(300)
    check('окно пароля при восстановлении без поля повтора', not pg.locator('.sheet [data-q]').is_visible() and 'зашифрованные' in pg.locator('.sheet [data-n]').inner_text())
    pg.locator('[data-p]').fill('не-тот-пароль'); pg.locator('.sheet [data-o]').click(); pg.wait_for_timeout(2500)
    check('неверный пароль: окно спрашивает снова, ключи не импортированы', pg.locator('.sheet [data-p]').count() == 1 and pg.evaluate("window.__calls.filter(c=>c[0]==='import').length") == 0)
    pg.locator('[data-p]').fill('Надёжный-пароль-1'); pg.locator('.sheet [data-o]').click(); pg.wait_for_timeout(3500)
    check('верный пароль: ключи возвращены в хранилище', pg.evaluate("window.__store") == {'p1': SECRET, 's1': 'tvly-SEARCH-KEY-9999'}, pg.evaluate("window.__store"))
    check('восстановлено 2 ключа (p2 в этом тесте не было ключа)', pg.evaluate("window.__rk") == 2, pg.evaluate("window.__rk"))
    check('провайдеры с вернувшимся ключом помечены рабочими', pg.evaluate("S.providers.find(p=>p.id==='p1').ok") is True)
    # существующий ключ не перезаписывается
    pg.evaluate("window.__store={p1:'ДРУГОЙ-УЖЕ-ЕСТЬ'};window.__calls=[];(async()=>{window.__rk=await Backup.restoreKeys(%s)})();0" % j)
    pg.wait_for_selector('.sheet [data-p]'); pg.locator('[data-p]').fill('Надёжный-пароль-1'); pg.locator('.sheet [data-o]').click(); pg.wait_for_timeout(3500)
    check('уже имеющийся ключ не перезаписывается', pg.evaluate("window.__store.p1") == 'ДРУГОЙ-УЖЕ-ЕСТЬ' and pg.evaluate("window.__rk") == 1, pg.evaluate("window.__store"))
    # отмена
    pg.evaluate("window.__calls=[];(async()=>{window.__rk=await Backup.restoreKeys(%s)})();0" % j)
    pg.wait_for_selector('.sheet [data-p]'); pg.locator('.sheet [data-c]').click(); pg.wait_for_timeout(500)
    check('отмена: ключи не трогаются', pg.evaluate("window.__rk") == 0 and pg.evaluate("window.__calls.length") == 0)
    # копия без ключей по-прежнему восстанавливается без вопросов о пароле
    pg.evaluate("(async()=>{window.__rk=await Backup.restoreKeys({app:'kairema',v:1,chats:[]})})()"); pg.wait_for_timeout(300)
    check('копия без ключей: пароль не спрашивается', pg.locator('.sheet [data-p]').count() == 0 and pg.evaluate("window.__rk") == 0)
    check('нет ошибок страницы', not errs, errs)
    b.close()
print('\nИТОГ: %d ок, %d провалов' % (OK, len(BAD)))
if BAD: print('Провалы:', BAD); raise SystemExit(1)
