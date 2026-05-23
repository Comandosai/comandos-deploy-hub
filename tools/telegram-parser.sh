#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Comandosai/comandos-deploy-hub.git}"
BRANCH="${BRANCH:-main}"
TARGET_DIR="telegram-parser-starter"
RUN_AUTH=1

usage() {
  cat <<'USAGE'
Использование:
  telegram-parser.sh [target_dir] [--no-auth]

Примеры:
  telegram-parser.sh
  telegram-parser.sh my-parser
  telegram-parser.sh --no-auth
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --no-auth)
      RUN_AUTH=0
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      TARGET_DIR="$1"
      shift
      ;;
  esac
done

if [[ -e "$TARGET_DIR" ]]; then
  if [[ ! -d "$TARGET_DIR" ]]; then
    echo "Ошибка: '$TARGET_DIR' уже существует и это не папка."
    exit 1
  fi
  if [[ -n "$(find "$TARGET_DIR" -mindepth 1 -maxdepth 1)" ]]; then
    echo "Ошибка: папка '$TARGET_DIR' уже существует и не пустая."
    echo "Укажи другую папку: telegram-parser.sh my-parser"
    exit 1
  fi
fi

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

echo "Скачиваю заготовку Telegram-парсера..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMP_DIR/repo" >/dev/null

STARTER_DIR="$TMP_DIR/repo/starters/telegram-parser"
if [[ ! -d "$STARTER_DIR" ]]; then
  echo "Ошибка: не найдена заготовка $STARTER_DIR"
  exit 1
fi

mkdir -p "$TARGET_DIR"
(cd "$STARTER_DIR" && tar cf - .) | (cd "$TARGET_DIR" && tar xf -)

cd "$TARGET_DIR"
bash setup.sh

if [[ "$RUN_AUTH" == "1" ]]; then
  echo
  echo "Запускаю авторизацию Telegram."
  echo "Телефон вводи в международном формате, например: +78001234567"
  . .venv/bin/activate
  python scripts/auth.py
fi

echo
echo "Готово."
echo "Папка проекта: $(pwd)"
echo
echo "Следующие команды:"
echo "cd $(pwd)"
echo "source .venv/bin/activate"
echo "python scripts/list_sources.py"
