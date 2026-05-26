#!/usr/bin/env bash
set -euo pipefail

PRODUCT="${1:-all}"

log() { printf '[COMANDOS update] %s\n' "$*"; }
die() { printf '[COMANDOS update] ERROR: %s\n' "$*" >&2; exit 1; }

REMOTE_BASE_DIR="${REMOTE_BASE_DIR:-{{REMOTE_BASE_DIR}}}"
REMOTE_WORKSPACE_DIR="${REMOTE_WORKSPACE_DIR:-{{REMOTE_WORKSPACE_DIR}}}"
REMOTE_HERMES_HOME="${REMOTE_HERMES_HOME:-{{REMOTE_HERMES_HOME}}}"
HERMES_AGENT_INSTALLER_URL="${HERMES_AGENT_INSTALLER_URL:-{{HERMES_AGENT_INSTALLER_URL}}}"
COMANDOS_STACK_REPO_URL="${COMANDOS_STACK_REPO_URL:-https://github.com/Comandosai/comandos-deploy-hub.git}"
COMANDOS_STACK_REF="${COMANDOS_STACK_REF:-main}"
COMANDOS_STACK_PATH="${COMANDOS_STACK_PATH:-stacks/hermes}"

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

update_workspace() {
  log "Обновляю COMANDOS Workspace до $COMANDOS_WORKSPACE_VERSION"
  mkdir -p "$REMOTE_BASE_DIR/backups" "$REMOTE_WORKSPACE_DIR"
  if [[ -d "$REMOTE_WORKSPACE_DIR" ]]; then
    backup="$REMOTE_BASE_DIR/backups/workspace-update-$(date +%Y%m%d%H%M%S)"
    mkdir -p "$backup"
    rsync -a --delete "$REMOTE_WORKSPACE_DIR/" "$backup/" || true
    log "Backup: $backup"
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
  write_state

  if command -v systemctl >/dev/null 2>&1; then
    log "Перезапускаю панель через 2 секунды..."
    (sleep 2; systemctl --user restart comandos-workspace.service >/dev/null 2>&1 || true) &
  else
    log "systemctl не найден; перезапустите панель вручную."
  fi
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
