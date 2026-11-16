# Функции-помощники встроенного терминала Kairema. Загружаются перед каждой командой.
ll() { ls -la "$@"; }
la() { ls -A "$@"; }
tree() { find "${1:-.}" 2>/dev/null | sed -e 's|[^/]*/|  |g'; }
calc() { echo $(( $* )); }
help() {
  echo "Встроенный терминал Kairema (Android sh)."
  echo "Папка запоминается между командами: cd работает."
  echo "Есть: ls cat grep sed awk find tar echo mkdir cp mv rm head tail wc sort."
  echo "Помощники: ll (список с подробностями), la (скрытые файлы), tree [папка], calc 2+2*3."
  echo "Нет: python, git, pip, apt, sudo. Для них переключитесь на Termux."
}
