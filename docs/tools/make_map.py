#!/usr/bin/env python3
"""Обновляет автоматический блок в docs/MAP.md: индекс файлов, события Hooks, мосты Kotlin, ключи localStorage.
Запуск из корня репозитория: python3 docs/tools/make_map.py   (проверка без записи: --check)
Ручные разделы MAP.md не трогает: меняется только текст между <!-- AUTO:START --> и <!-- AUTO:END -->."""
import re, sys, pathlib
R = pathlib.Path(__file__).resolve().parents[2]
UI = R/'app/src/main/assets/ui'; KT = R/'app/src/main/java'
def first_comment(p):
    t = p.read_text(encoding='utf-8', errors='replace')
    if p.suffix == '.kt':
        m = re.search(r'/\*+\s*(.*?)\*/', t, re.S) or re.search(r'//\s*(.+)', t)
    else:
        m = re.search(r'/\*+\s*=*\s*(.*?)\*/', t, re.S)
    if not m: return ''
    s = re.sub(r'\s+', ' ', m.group(1)).strip(' =*')
    s = re.split(r'(?<=[.!?])\s', s)[0] if len(s) > 150 else s
    return s[:170]
def rel(p): return str(p.relative_to(R))
def lines(p): return p.read_text(encoding='utf-8', errors='replace').count('\n')+1
out = []
out.append('### Индекс файлов интерфейса (`app/src/main/assets/ui`)\n')
out.append('| Файл | Строк | Что делает (первый комментарий в файле) |\n|---|---|---|')
for p in sorted(UI.rglob('*')):
    if p.is_file() and p.suffix in ('.js', '.css', '.html', '.sql') and 'brand' not in p.parts:
        out.append(f'| `{p.relative_to(UI)}` | {lines(p)} | {first_comment(p).replace("|","/")} |')
out.append('\n### Индекс файлов Kotlin (`app/src/main/java/com/kairema/app`)\n')
out.append('| Файл | Строк | Описание |\n|---|---|---|')
for p in sorted(KT.rglob('*.kt')):
    out.append(f'| `{p.relative_to(KT/"com/kairema/app")}` | {lines(p)} | {first_comment(p).replace("|","/")} |')
# мосты
out.append('\n### Мосты (`@JavascriptInterface`): как JS вызывает Kotlin\n')
for p in sorted(KT.rglob('*.kt')):
    t = p.read_text(encoding='utf-8', errors='replace')
    ms = re.findall(r'@JavascriptInterface\s+fun\s+(\w+)', t)
    if ms: out.append(f'- `{p.relative_to(KT/"com/kairema/app")}`: ' + ', '.join(f'`{m}`' for m in ms))
reg = re.findall(r'addJavascriptInterface\(([^,]+),\s*"(\w+)"\)', (KT/'com/kairema/app/MainActivity.kt').read_text(encoding='utf-8'))
out.append('\nИмена мостов в WebView: ' + ', '.join(f'`{n}`' for _, n in reg))
# события Hooks
ev = {}
for p in UI.rglob('*.js'):
    t = p.read_text(encoding='utf-8', errors='replace')
    for k, name in re.findall(r"Hooks\.(on|run)\(\s*'([\w:.-]+)'", t):
        ev.setdefault(name, {'on': set(), 'run': set()})[k].add(p.name)
out.append('\n### События Hooks (кто слушает → кто запускает)\n')
out.append('| Событие | Слушают (`Hooks.on`) | Запускают (`Hooks.run`) |\n|---|---|---|')
for n in sorted(ev):
    out.append(f"| `{n}` | {', '.join(sorted(ev[n]['on'])) or '—'} | {', '.join(sorted(ev[n]['run'])) or '—'} |")
# localStorage
ks = {}
for p in UI.rglob('*.js'):
    t = p.read_text(encoding='utf-8', errors='replace')
    for k in re.findall(r"""['"](kairema\.[\w.-]+)['"]""", t): ks.setdefault(k, set()).add(p.name)
out.append('\n### Ключи localStorage с префиксом kairema.\n')
for k in sorted(ks): out.append(f"- `{k}`: {', '.join(sorted(ks[k]))}")
# экраны
sc = set()
for p in UI.rglob('*.js'):
    t = p.read_text(encoding='utf-8', errors='replace')
    for k in re.findall(r"SCREENS\.(\w+)\s*=", t): sc.add(k)
    for k in re.findall(r"SCREENS\s*=\s*\{([^}]*)\}", t):
        sc.update(re.findall(r"(\w+)\s*:", k))
out.append('\n### Экраны (`SCREENS.<имя>`, открываются через `openScreen`)\n' + ', '.join(f'`{s}`' for s in sorted(sc)))
block = '\n'.join(out) + '\n'
mp = R/'docs/MAP.md'; t = mp.read_text(encoding='utf-8')
a, b = '<!-- AUTO:START -->', '<!-- AUTO:END -->'
if a not in t or b not in t: sys.exit('В MAP.md нет маркеров AUTO')
new = t[:t.index(a)+len(a)] + '\n' + block + t[t.index(b):]
if '--check' in sys.argv:
    sys.exit(0 if new == t else 'MAP.md устарел: запусти python3 docs/tools/make_map.py')
mp.write_text(new, encoding='utf-8'); print('MAP.md обновлён,', len(block.splitlines()), 'строк в авто-блоке')
