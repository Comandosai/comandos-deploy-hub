#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Comandosai/comandos-deploy-hub.git}"
BRANCH="${BRANCH:-main}"
STACK_PATH="${STACK_PATH:-stacks/hermes}"
TARGET_DIR="${TARGET_DIR:-$PWD}"

info() { printf '[COMANDOS Hermes] %s\n' "$*"; }
fail() { printf '[COMANDOS Hermes] ERROR: %s\n' "$*" >&2; exit 1; }

if ! command -v git >/dev/null 2>&1; then
  fail "git не найден. Установите git и повторите команду."
fi

tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT

info "Скачиваю установщик из $REPO_URL ($BRANCH)..."
git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$tmp_dir/repo" >/dev/null

src="$tmp_dir/repo/$STACK_PATH"
if [[ ! -d "$src" ]]; then
  fail "в репозитории не найден путь $STACK_PATH"
fi

mkdir -p "$TARGET_DIR"

preserved_env=""
if [[ -f "$TARGET_DIR/comandos-hermes.env" ]]; then
  preserved_env="$tmp_dir/comandos-hermes.env"
  cp "$TARGET_DIR/comandos-hermes.env" "$preserved_env"
fi

if command -v rsync >/dev/null 2>&1; then
  rsync -a --delete --exclude 'comandos-hermes.env' "$src"/ "$TARGET_DIR"/
else
  cp -R "$src"/. "$TARGET_DIR"/
fi

if [[ -n "$preserved_env" ]]; then
  cp "$preserved_env" "$TARGET_DIR/comandos-hermes.env"
elif [[ ! -f "$TARGET_DIR/comandos-hermes.env" ]]; then
  cp "$TARGET_DIR/comandos-hermes.env.example" "$TARGET_DIR/comandos-hermes.env"
fi

chmod +x "$TARGET_DIR/install.sh" "$TARGET_DIR/deploy.sh" "$TARGET_DIR/setup.sh"
find "$TARGET_DIR/scripts" -type f -name '*.sh' -exec chmod +x {} \;

info "Готово. Файлы установщика лежат в текущей папке:"
printf '  %s\n' "$TARGET_DIR"
printf '\nДальше:\n'
printf '  1. Заполните comandos-hermes.env\n'
printf '     Укажите ROOT_IP и SSH_KEY_PATH или ROOT_PASSWORD\n'
printf '  2. Если работаете через агента, вставьте второй текст из AGENT_COMMAND.md\n'
printf '  3. Если работаете через терминал: bash scripts/check-config.sh comandos-hermes.env && ./deploy.sh\n'
