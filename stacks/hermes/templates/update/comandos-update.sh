#!/usr/bin/env bash
set -euo pipefail

PRODUCT="${1:-all}"

log() { printf '[COMANDOS update] %s\n' "$*"; }
die() { printf '[COMANDOS update] ERROR: %s\n' "$*" >&2; exit 1; }

REMOTE_BASE_DIR="${REMOTE_BASE_DIR:-}"
REMOTE_WORKSPACE_DIR="${REMOTE_WORKSPACE_DIR:-}"
REMOTE_HERMES_HOME="${REMOTE_HERMES_HOME:-}"
HERMES_AGENT_INSTALLER_URL="${HERMES_AGENT_INSTALLER_URL:-}"
COMANDOS_STACK_REPO_URL="${COMANDOS_STACK_REPO_URL:-https://github.com/Comandosai/comandos-deploy-hub.git}"
COMANDOS_STACK_REF="${COMANDOS_STACK_REF:-main}"
COMANDOS_STACK_PATH="${COMANDOS_STACK_PATH:-stacks/hermes}"
WORKSPACE_RESTART_DELAY_SECONDS="${COMANDOS_WORKSPACE_RESTART_DELAY_SECONDS:-30}"

if [[ -z "$REMOTE_BASE_DIR" ]]; then
  REMOTE_BASE_DIR="{{REMOTE_BASE_DIR}}"
fi
if [[ -z "$REMOTE_WORKSPACE_DIR" ]]; then
  REMOTE_WORKSPACE_DIR="{{REMOTE_WORKSPACE_DIR}}"
fi
if [[ -z "$REMOTE_HERMES_HOME" ]]; then
  REMOTE_HERMES_HOME="{{REMOTE_HERMES_HOME}}"
fi
if [[ -z "$HERMES_AGENT_INSTALLER_URL" ]]; then
  HERMES_AGENT_INSTALLER_URL="{{HERMES_AGENT_INSTALLER_URL}}"
fi

require_resolved_value() {
  local name="$1"
  local value="$2"
  case "$value" in
    ''|*'{{'*|*'}}'*)
      die "$name не настроен. Запустите установленный скрипт или передайте $name через env."
      ;;
  esac
}

require_resolved_value REMOTE_BASE_DIR "$REMOTE_BASE_DIR"
require_resolved_value REMOTE_WORKSPACE_DIR "$REMOTE_WORKSPACE_DIR"
require_resolved_value REMOTE_HERMES_HOME "$REMOTE_HERMES_HOME"

case "$PRODUCT" in
  workspace|agent|all) ;;
  *) die "unknown product: $PRODUCT" ;;
esac

tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT

uid="$(id -u)"
export XDG_RUNTIME_DIR="${XDG_RUNTIME_DIR:-/run/user/$uid}"

log "Скачиваю проверенный стек: $COMANDOS_STACK_REPO_URL ($COMANDOS_STACK_REF)"
git clone --depth 1 --branch "$COMANDOS_STACK_REF" "$COMANDOS_STACK_REPO_URL" "$tmp_dir/repo" >/dev/null

src="$tmp_dir/repo/$COMANDOS_STACK_PATH"
[[ -d "$src" ]] || die "stack path not found: $COMANDOS_STACK_PATH"

# shellcheck disable=SC1091
source "$src/comandos-hermes.lock"
export COMANDOS_WORKSPACE_VERSION HERMES_AGENT_REF HERMES_AGENT_INSTALLER_URL
export COMANDOS_STACK_REPO_URL COMANDOS_STACK_REF COMANDOS_STACK_PATH

if [[ "$PRODUCT" == "agent" || "$PRODUCT" == "all" ]]; then
  require_resolved_value HERMES_AGENT_INSTALLER_URL "$HERMES_AGENT_INSTALLER_URL"
fi

sync_update_script() {
  local template="$src/templates/update/comandos-update.sh"
  local target="${COMANDOS_UPDATE_SCRIPT:-$REMOTE_BASE_DIR/install/comandos-update.sh}"
  [[ -f "$template" ]] || return

  mkdir -p "$(dirname "$target")" || {
    log "Не удалось подготовить папку для скрипта обновления: $target"
    return
  }

  local tmp_target="${target}.tmp.$$"
  export REMOTE_BASE_DIR REMOTE_WORKSPACE_DIR REMOTE_HERMES_HOME HERMES_AGENT_INSTALLER_URL
  export COMANDOS_STACK_REPO_URL COMANDOS_STACK_REF COMANDOS_STACK_PATH
  python3 - "$template" "$tmp_target" <<'PY'
import os
import sys

src, dst = sys.argv[1:3]
with open(src, encoding="utf-8") as f:
    text = f.read()
for key, value in os.environ.items():
    text = text.replace("{{" + key + "}}", value)
with open(dst, "w", encoding="utf-8") as f:
    f.write(text)
PY
  chmod 755 "$tmp_target" || true
  if mv "$tmp_target" "$target"; then
    log "Скрипт обновления синхронизирован: $target"
  else
    rm -f "$tmp_target"
    log "Не удалось обновить скрипт обновления: $target"
  fi
}

cache_update_manifest() {
  local manifest="$src/update-manifest.json"
  local target="${COMANDOS_UPDATE_MANIFEST_CACHE:-$REMOTE_WORKSPACE_DIR/.runtime/update-manifest-cache.json}"
  [[ -f "$manifest" ]] || return

  mkdir -p "$(dirname "$target")" || {
    log "Не удалось подготовить папку для кэша manifest: $target"
    return
  }

  local tmp_target="${target}.tmp.$$"
  if cp "$manifest" "$tmp_target" && mv "$tmp_target" "$target"; then
    log "Manifest обновления сохранён в кэш: $target"
  else
    rm -f "$tmp_target"
    log "Не удалось сохранить manifest обновления в кэш: $target"
  fi
}

sync_update_script
cache_update_manifest

is_commitish_ref() {
  [[ "${1:-}" =~ ^[0-9a-fA-F]{7,40}$ ]]
}

hermes_agent_installer_args() {
  local args=(--skip-setup)
  if [[ -n "${HERMES_AGENT_REF:-}" ]] && ! is_commitish_ref "$HERMES_AGENT_REF"; then
    args+=(--branch "$HERMES_AGENT_REF")
  fi
  printf '%q ' "${args[@]}"
}

pin_hermes_agent_ref() {
  if [[ -z "${HERMES_AGENT_REF:-}" || "$HERMES_AGENT_REF" == "main" ]]; then
    return
  fi
  local agent_dir
  agent_dir="$REMOTE_HERMES_HOME/hermes-agent"
  [[ -d "$agent_dir/.git" ]] || {
    log "Hermes Agent git-копия не найдена, ref $HERMES_AGENT_REF не закреплён."
    return
  }
  if git -C "$agent_dir" fetch origin --tags --prune >/dev/null 2>&1 && git -C "$agent_dir" checkout "$HERMES_AGENT_REF" >/dev/null 2>&1; then
    log "Hermes Agent закреплён на ref: $HERMES_AGENT_REF"
  else
    log "Не удалось закрепить Hermes Agent на ref: $HERMES_AGENT_REF"
  fi
}

write_state() {
  mkdir -p "$REMOTE_WORKSPACE_DIR/.runtime"
  local agent_version=""
  agent_version="$(command -v hermes >/dev/null 2>&1 && hermes --version 2>/dev/null | head -1 || true)"
  export AGENT_VERSION="$agent_version"
  python3 - "$REMOTE_WORKSPACE_DIR/.runtime/comandos-installed.json" <<PY
import json
import os
import sys
from datetime import datetime, timezone

out = sys.argv[1]
state = {
    "workspaceVersion": os.environ.get("COMANDOS_WORKSPACE_VERSION", ""),
    "hermesAgentRef": os.environ.get("HERMES_AGENT_REF", ""),
    "hermesAgentVersion": os.environ.get("AGENT_VERSION", ""),
    "stackRepoUrl": os.environ.get("COMANDOS_STACK_REPO_URL", ""),
    "stackRef": os.environ.get("COMANDOS_STACK_REF", ""),
    "stackPath": os.environ.get("COMANDOS_STACK_PATH", ""),
    "updatedAt": datetime.now(timezone.utc).isoformat(),
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(state, f, ensure_ascii=False, indent=2)
    f.write("\\n")
PY
}

workspace_version_order() {
  python3 - "$1" "$2" <<'PY'
import re
import sys

def parse(value):
    match = re.match(
        r"^(\d+)\.(\d+)\.(\d+)(?:[-._](?:comandos|komandos)\.(\d+))?$",
        (value or "").strip().lower(),
    )
    if not match:
        return None
    return (
        int(match.group(1)),
        int(match.group(2)),
        int(match.group(3)),
        int(match.group(4) or 0),
    )

current = parse(sys.argv[1])
target = parse(sys.argv[2])
if current is None or target is None:
    print("unknown")
elif target > current:
    print("upgrade")
elif target == current:
    print("same")
else:
    print("downgrade")
PY
}

assert_workspace_not_downgrade() {
  local state_path="$REMOTE_WORKSPACE_DIR/.runtime/comandos-installed.json"
  [[ -f "$state_path" ]] || return 0

  local installed order
  installed="$(python3 - "$state_path" <<'PY'
import json
import sys

try:
    with open(sys.argv[1], "r", encoding="utf-8") as f:
        print(json.load(f).get("workspaceVersion", ""))
except Exception:
    print("")
PY
)"
  [[ -n "$installed" ]] || return 0

  order="$(workspace_version_order "$installed" "$COMANDOS_WORKSPACE_VERSION")"
  if [[ "$order" == "downgrade" && "${COMANDOS_ALLOW_DOWNGRADE:-0}" != "1" ]]; then
    die "refuse workspace downgrade: $installed -> $COMANDOS_WORKSPACE_VERSION"
  fi
}

ensure_workspace_runtime_deps() {
  if command -v sqlite3 >/dev/null 2>&1; then
    return
  fi

  if ! command -v apt-get >/dev/null 2>&1; then
    log "sqlite3 не найден, а apt-get недоступен. Задачи могут работать не полностью."
    return
  fi

  local sudo_cmd=()
  if [[ "$(id -u)" -ne 0 ]]; then
    if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
      sudo_cmd=(sudo -n)
    else
      log "sqlite3 не найден. Установите пакет sqlite3 от root, иначе задачи могут работать не полностью."
      return
    fi
  fi

  log "Ставлю системную зависимость sqlite3 для задач..."
  "${sudo_cmd[@]}" apt-get update -qq
  DEBIAN_FRONTEND=noninteractive "${sudo_cmd[@]}" apt-get install -y -qq sqlite3 >/dev/null
}

backup_workspace() {
  local backup="$1"
  log "Делаю облегчённый backup без node_modules/dist/logs"
  rsync -a --delete \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude 'logs' \
    "$REMOTE_WORKSPACE_DIR/" "$backup/" || true
}

prune_workspace_backups() {
  local keep="${1:-6}"
  [[ -d "$REMOTE_BASE_DIR/backups" ]] || return 0

  find "$REMOTE_BASE_DIR/backups" \
    -maxdepth 1 \
    -mindepth 1 \
    -type d \
    -name 'workspace-update-*' \
    -printf '%T@ %p\n' 2>/dev/null |
    sort -rn |
    awk -v keep="$keep" 'NR > keep { sub(/^[^ ]+ /, ""); print }' |
    while IFS= read -r backup_path; do
      [[ -n "$backup_path" ]] || continue
      rm -rf -- "$backup_path"
    done || true
}

repair_tree_ownership() {
  local path="$1"
  [[ -e "$path" ]] || return 0

  local current_user current_group foreign_owner
  current_user="$(id -un)"
  current_group="$(id -gn)"
  foreign_owner="$(find "$path" ! -user "$current_user" -printf '%u %p\n' -quit 2>/dev/null || true)"
  [[ -n "$foreign_owner" ]] || return 0

  if command -v sudo >/dev/null 2>&1 && sudo -n true >/dev/null 2>&1; then
    log "Исправляю владельца файлов в $path для пользователя $current_user..."
    sudo -n chown -R "$current_user:$current_group" "$path"
    return
  fi

  die "в $path есть файлы другого владельца ($foreign_owner). Запустите от root: chown -R $current_user:$current_group $path"
}

validate_workspace_build() {
  local server_dir="$REMOTE_WORKSPACE_DIR/dist/server"
  local server_entry="$server_dir/server.js"
  [[ -s "$server_entry" ]] || die "сборка панели повреждена: нет $server_entry"

  local zero_count
  zero_count="$(find "$server_dir" -name '*.js' -size 0 | wc -l | tr -d '[:space:]')"
  if [[ "$zero_count" != "0" ]]; then
    find "$server_dir" -name '*.js' -size 0 -print >&2
    die "сборка панели повреждена: найдено пустых JS-файлов: $zero_count"
  fi

  local check_log="$tmp_dir/comandos-workspace-node-check.log"
  if ! find "$server_dir" -name '*.js' -print0 \
    | xargs -0 -r -n 1 node --check >"$check_log" 2>&1; then
    cat "$check_log" >&2 || true
    die "сборка панели повреждена: node --check не прошёл"
  fi
}

restart_workspace_service_later() {
  local delay="$1"
  if ! command -v systemctl >/dev/null 2>&1; then
    log "systemctl не найден; перезапустите панель вручную."
    return
  fi

  local service_user="${REMOTE_SERVICE_USER:-}"
  if [[ -z "$service_user" ]]; then
    case "$REMOTE_HERMES_HOME" in
      /home/*/.hermes*)
        service_user="${REMOTE_HERMES_HOME#/home/}"
        service_user="${service_user%%/*}"
        ;;
    esac
  fi

  if [[ -n "$service_user" ]] && ! id "$service_user" >/dev/null 2>&1; then
    service_user=""
  fi

  if [[ -z "$service_user" ]]; then
    local service_file
    for service_file in /home/*/.config/systemd/user/comandos-workspace.service; do
      if [[ -f "$service_file" ]] && grep -Fq "$REMOTE_WORKSPACE_DIR" "$service_file"; then
        service_user="${service_file#/home/}"
        service_user="${service_user%%/*}"
        break
      fi
    done
  fi

  if [[ -z "$service_user" ]]; then
    local workspace_owner
    workspace_owner="$(stat -c '%U' "$REMOTE_WORKSPACE_DIR" 2>/dev/null || true)"
    if [[ -n "$workspace_owner" && "$workspace_owner" != "root" ]]; then
      service_user="$workspace_owner"
    fi
  fi

  if [[ -z "$service_user" ]]; then
    service_user="$(id -un)"
  fi

  if [[ "$service_user" == "$(id -un)" ]]; then
    log "Перезапускаю панель через $delay сек..."
    nohup bash -c 'sleep "$1"; systemctl --user restart comandos-workspace.service >/dev/null 2>&1 || true' \
      _ "$delay" >/dev/null 2>&1 </dev/null &
    return
  fi

  if ! command -v sudo >/dev/null 2>&1 || ! sudo -n true >/dev/null 2>&1; then
    log "Не удалось перезапустить user-service $service_user автоматически; перезапустите comandos-workspace.service вручную."
    return
  fi

  local service_uid
  service_uid="$(id -u "$service_user" 2>/dev/null || true)"
  if [[ -z "$service_uid" ]]; then
    log "Пользователь сервиса $service_user не найден; перезапустите comandos-workspace.service вручную."
    return
  fi

  log "Перезапускаю панель пользователя $service_user через $delay сек..."
  nohup bash -c 'sleep "$1"; sudo -n -u "$2" XDG_RUNTIME_DIR="/run/user/$3" systemctl --user restart comandos-workspace.service >/dev/null 2>&1 || true' \
    _ "$delay" "$service_user" "$service_uid" >/dev/null 2>&1 </dev/null &
}

update_workspace() {
  log "Обновляю COMANDOS Workspace до $COMANDOS_WORKSPACE_VERSION"
  assert_workspace_not_downgrade
  ensure_workspace_runtime_deps
  mkdir -p "$REMOTE_BASE_DIR/backups" "$REMOTE_WORKSPACE_DIR"
  repair_tree_ownership "$REMOTE_WORKSPACE_DIR"
  repair_tree_ownership "$REMOTE_BASE_DIR/backups"
  prune_workspace_backups 6
  if [[ -d "$REMOTE_WORKSPACE_DIR" ]]; then
    backup="$REMOTE_BASE_DIR/backups/workspace-update-$(date +%Y%m%d%H%M%S)"
    mkdir -p "$backup"
    backup_workspace "$backup"
    log "Backup: $backup"
    prune_workspace_backups 6
  fi

  rm -rf "$REMOTE_WORKSPACE_DIR/node_modules" "$REMOTE_WORKSPACE_DIR/dist" "$REMOTE_WORKSPACE_DIR/logs"
  rsync -a --delete \
    --exclude '.env' \
    --exclude '.runtime' \
    --exclude '.git' \
    --exclude 'node_modules' \
    --exclude 'dist' \
    --exclude 'logs' \
    "$src/workspace/" "$REMOTE_WORKSPACE_DIR/"

  cd "$REMOTE_WORKSPACE_DIR"
  corepack enable >/dev/null 2>&1 || true
  ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile
  pnpm build
  validate_workspace_build
  write_state
  restart_workspace_service_later "$WORKSPACE_RESTART_DELAY_SECONDS"
}

update_agent() {
  log "Обновляю Hermes Agent до $HERMES_AGENT_REF"
  # shellcheck disable=SC2046
  curl -fsSL "$HERMES_AGENT_INSTALLER_URL" | bash -s -- $(hermes_agent_installer_args)
  pin_hermes_agent_ref
  AGENT_VERSION="$(command -v hermes >/dev/null 2>&1 && hermes --version 2>/dev/null | head -1 || true)"
  export AGENT_VERSION
  write_state

  if command -v systemctl >/dev/null 2>&1; then
    log "Перезапускаю Hermes gateway..."
    systemctl --user restart hermes-gateway.service >/dev/null 2>&1 || true
  fi
}

case "$PRODUCT" in
  workspace)
    update_workspace
    ;;
  agent)
    update_agent
    ;;
  all)
    update_agent
    update_workspace
    ;;
esac

log "Готово."
