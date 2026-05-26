#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="${1:-$SCRIPT_DIR/comandos-hermes.env}"

info() { printf '[COMANDOS Hermes] %s\n' "$*"; }
fail() { printf '[COMANDOS Hermes] ERROR: %s\n' "$*" >&2; exit 1; }

expand_path() {
  case "$1" in
    "~") printf '%s\n' "$HOME" ;;
    "~/"*) printf '%s/%s\n' "$HOME" "${1#~/}" ;;
    *) printf '%s\n' "$1" ;;
  esac
}

if [[ ! -f "$CONFIG_PATH" ]]; then
  fail "не найден config: $CONFIG_PATH. Скопируйте comandos-hermes.env.example в comandos-hermes.env"
fi

cd "$SCRIPT_DIR"
bash scripts/check-config.sh "$CONFIG_PATH"

set -a
# shellcheck disable=SC1090
source "$CONFIG_PATH"
# shellcheck disable=SC1091
source "$SCRIPT_DIR/comandos-hermes.lock"
set +a

PUBLIC_HOST="${DOMAIN:-${VPS_IP}.nip.io}"
PUBLIC_URL="https://${PUBLIC_HOST}"
HERMES_PASSWORD="${HERMES_PASSWORD:-}"
if [[ -z "$HERMES_PASSWORD" ]]; then
  HERMES_PASSWORD="$(bash "$SCRIPT_DIR/scripts/generate-panel-password.sh")"
fi

tmp_dir="$(mktemp -d)"
cleanup() { rm -rf "$tmp_dir"; }
trap cleanup EXIT

payload="$tmp_dir/comandos-hermes-payload.tgz"
tar -czf "$payload" \
  --exclude 'workspace/node_modules' \
  --exclude 'workspace/dist' \
  --exclude 'workspace/logs' \
  --exclude 'workspace/.runtime' \
  --exclude 'workspace/.git' \
  --exclude '__pycache__' \
  workspace templates scripts comandos-hermes.lock update-manifest.json

resolved_config="$tmp_dir/comandos-hermes.env"
grep -vE '^(HERMES_PASSWORD|PUBLIC_URL|PUBLIC_HOST)=' "$CONFIG_PATH" >"$resolved_config"
{
  printf '\nHERMES_PASSWORD=%q\n' "$HERMES_PASSWORD"
  printf 'PUBLIC_URL=%q\n' "$PUBLIC_URL"
  printf 'PUBLIC_HOST=%q\n' "$PUBLIC_HOST"
} >>"$resolved_config"
chmod 600 "$resolved_config"

remote_user="${SSH_USER:-}"
ssh_base=()
scp_base=()

case "${SSH_AUTH_METHOD:-}" in
  key)
    key_path="$(expand_path "${SSH_KEY_PATH:-}")"
    [[ -f "$key_path" ]] || fail "SSH key не найден: $key_path"
    remote_user="${SSH_USER}"
    ssh_base=(ssh -p "${SSH_PORT}" -i "$key_path" -o StrictHostKeyChecking=accept-new)
    scp_base=(scp -P "${SSH_PORT}" -i "$key_path" -o StrictHostKeyChecking=accept-new)
    ;;
  password)
    command -v sshpass >/dev/null 2>&1 || fail "для SSH_AUTH_METHOD=password нужен sshpass на локальной машине"
    remote_user="${ROOT_USER}"
    ssh_base=(sshpass -p "${ROOT_PASSWORD}" ssh -p "${SSH_PORT}" -o StrictHostKeyChecking=accept-new)
    scp_base=(sshpass -p "${ROOT_PASSWORD}" scp -P "${SSH_PORT}" -o StrictHostKeyChecking=accept-new)
    ;;
  *)
    fail "SSH_AUTH_METHOD должен быть key или password"
    ;;
esac

remote="${remote_user}@${VPS_IP}"
remote_tmp="/tmp/comandos-hermes-$(date +%Y%m%d%H%M%S)"

cat >"$tmp_dir/remote-install.sh" <<'REMOTE'
#!/usr/bin/env bash
set -euo pipefail

REMOTE_TMP="$1"
cd "$REMOTE_TMP"

set -a
# shellcheck disable=SC1091
source comandos-hermes.env
# shellcheck disable=SC1091
source payload/comandos-hermes.lock
set +a

log() { printf '[COMANDOS Hermes VPS] %s\n' "$*"; }
die() { printf '[COMANDOS Hermes VPS] ERROR: %s\n' "$*" >&2; exit 1; }

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  command -v sudo >/dev/null 2>&1 || die "нужен sudo или root-доступ"
  SUDO="sudo"
fi

APP_USER="${REMOTE_APP_USER:-clawd}"
REMOTE_BASE_DIR="${REMOTE_BASE_DIR:-/opt/comandos/hermes}"
REMOTE_WORKSPACE_DIR="${REMOTE_WORKSPACE_DIR:-$REMOTE_BASE_DIR/workspace}"
REMOTE_HERMES_HOME="${REMOTE_HERMES_HOME:-/home/$APP_USER/.hermes}"
WORKSPACE_PORT="${WORKSPACE_PORT:-3030}"
HERMES_GATEWAY_PORT="${HERMES_GATEWAY_PORT:-8642}"
COMANDOS_LICENSE_SESSION_DAYS="${COMANDOS_LICENSE_SESSION_DAYS:-14}"
DEFAULT_PROVIDER="${DEFAULT_PROVIDER:-openai}"
DEFAULT_MODEL="${DEFAULT_MODEL:-gpt-5.4-mini}"
PUBLIC_HOST="${PUBLIC_HOST:-${DOMAIN:-${VPS_IP}.nip.io}}"
PUBLIC_URL="${PUBLIC_URL:-https://$PUBLIC_HOST}"
COMANDOS_STACK_REPO_URL="${COMANDOS_STACK_REPO_URL:-https://github.com/Comandosai/comandos-deploy-hub.git}"
COMANDOS_STACK_REF="${COMANDOS_STACK_REF:-main}"
COMANDOS_STACK_PATH="${COMANDOS_STACK_PATH:-stacks/hermes}"
COMANDOS_UPDATE_MANIFEST_URL="${COMANDOS_UPDATE_MANIFEST_URL:-https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/update-manifest.json}"
COMANDOS_UPDATE_SCRIPT="${COMANDOS_UPDATE_SCRIPT:-$REMOTE_BASE_DIR/install/comandos-update.sh}"
COMANDOS_INSTALLED_STATE="${COMANDOS_INSTALLED_STATE:-$REMOTE_WORKSPACE_DIR/.runtime/comandos-installed.json}"
VITE_UPDATE_CHECK_INTERVAL_MS="${VITE_UPDATE_CHECK_INTERVAL_MS:-60000}"

if ! id "$APP_USER" >/dev/null 2>&1; then
  [[ "$(id -u)" -eq 0 ]] || die "пользователь $APP_USER не найден, а текущий пользователь не root"
  useradd -m -s /bin/bash "$APP_USER"
fi

install_apt() {
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -qq
    DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq \
      ca-certificates curl git jq python3 python3-pip rsync tar gzip build-essential lsof ffmpeg >/dev/null
  fi
}

ensure_node() {
  local major="0"
  if command -v node >/dev/null 2>&1; then
    major="$(node -p 'Number(process.versions.node.split(".")[0])' 2>/dev/null || echo 0)"
  fi
  if [[ "$major" -lt 20 ]]; then
    log "Ставлю Node.js 22..."
    if [[ -n "$SUDO" ]]; then
      curl -fsSL https://deb.nodesource.com/setup_22.x | $SUDO -E bash - >/dev/null
    else
      curl -fsSL https://deb.nodesource.com/setup_22.x | bash - >/dev/null
    fi
    DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq nodejs >/dev/null
  fi
  $SUDO corepack enable >/dev/null 2>&1 || true
}

ensure_caddy() {
  if command -v caddy >/dev/null 2>&1; then
    return
  fi
  log "Ставлю Caddy..."
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get install -y -qq debian-keyring debian-archive-keyring apt-transport-https >/dev/null
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/gpg.key | $SUDO gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
    curl -fsSL https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt | $SUDO tee /etc/apt/sources.list.d/caddy-stable.list >/dev/null
    $SUDO apt-get update -qq
    DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq caddy >/dev/null
  else
    die "не умею автоматически ставить Caddy без apt-get"
  fi
}

as_app_user() {
  if [[ "$(id -un)" == "$APP_USER" ]]; then
    HOME="$(getent passwd "$APP_USER" | cut -d: -f6)" bash -lc "$*"
  elif command -v sudo >/dev/null 2>&1; then
    sudo -u "$APP_USER" -H bash -lc "$*"
  else
    runuser -u "$APP_USER" -- bash -lc "$*"
  fi
}

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
  local agent_dir ref_q
  agent_dir="$REMOTE_HERMES_HOME/hermes-agent"
  printf -v ref_q '%q' "$HERMES_AGENT_REF"
  if ! as_app_user "[[ -d '$agent_dir/.git' ]]"; then
    log "Hermes Agent git-копия не найдена, ref $HERMES_AGENT_REF не закреплён."
    return
  fi
  if as_app_user "cd '$agent_dir' && git fetch origin --tags --prune >/dev/null 2>&1 && git checkout $ref_q >/dev/null 2>&1"; then
    log "Hermes Agent закреплён на ref: $HERMES_AGENT_REF"
  else
    log "Не удалось закрепить Hermes Agent на ref: $HERMES_AGENT_REF"
  fi
}

install_hermes_agent() {
  local existing
  existing="$(as_app_user 'command -v hermes || true')"
  if [[ -z "$existing" ]]; then
    log "Ставлю Hermes Agent официальным установщиком..."
    local installer_args
    installer_args="$(hermes_agent_installer_args)"
    as_app_user "curl -fsSL '$HERMES_AGENT_INSTALLER_URL' | bash -s -- $installer_args"
  fi
  pin_hermes_agent_ref
}

ensure_python_router_deps() {
  if as_app_user "python3 - <<'PY' >/dev/null 2>&1
import faster_whisper
PY"; then
    return
  fi
  log "Ставлю faster-whisper для голосовых сообщений..."
  as_app_user "python3 -m pip install --user -q faster-whisper || python3 -m pip install --user --break-system-packages -q faster-whisper"
}

find_hermes_cli() {
  local cli
  cli="$(as_app_user 'command -v hermes || true')"
  if [[ -z "$cli" ]]; then
    cli="/home/$APP_USER/.local/bin/hermes"
  fi
  [[ -x "$cli" ]] || die "hermes cli не найден: $cli"
  printf '%s\n' "$cli"
}

render_template() {
  local src="$1"
  local dst="$2"
  python3 - "$src" "$dst" <<'PY'
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
}

install_systemd_user_services() {
  local uid systemd_dir
  uid="$(id -u "$APP_USER")"
  systemd_dir="$(getent passwd "$APP_USER" | cut -d: -f6)/.config/systemd/user"
  $SUDO mkdir -p "$systemd_dir"
  export REMOTE_BASE_DIR REMOTE_WORKSPACE_DIR REMOTE_HERMES_HOME HERMES_GATEWAY_PORT HERMES_CLI_PATH NODE_PATH PYTHON_PATH
  render_template "$REMOTE_TMP/payload/templates/systemd/hermes-gateway.service" "$REMOTE_TMP/hermes-gateway.service"
  render_template "$REMOTE_TMP/payload/templates/systemd/comandos-workspace.service" "$REMOTE_TMP/comandos-workspace.service"
  render_template "$REMOTE_TMP/payload/templates/systemd/comandos-telegram.service" "$REMOTE_TMP/comandos-telegram.service"
  $SUDO cp "$REMOTE_TMP/hermes-gateway.service" "$REMOTE_TMP/comandos-workspace.service" "$REMOTE_TMP/comandos-telegram.service" "$systemd_dir/"
  $SUDO chown -R "$APP_USER:$APP_USER" "$systemd_dir"
  $SUDO loginctl enable-linger "$APP_USER" >/dev/null 2>&1 || true
  $SUDO systemctl start "user@$uid.service" >/dev/null 2>&1 || true
  XDG_RUNTIME_DIR="/run/user/$uid" as_app_user "systemctl --user daemon-reload && systemctl --user enable --now hermes-gateway.service comandos-workspace.service comandos-telegram.service"
}

configure_caddy() {
  local block caddyfile backup
  caddyfile="/etc/caddy/Caddyfile"
  backup="/etc/caddy/Caddyfile.backup.$(date +%Y%m%d%H%M%S)"
  export DOMAIN VPS_IP WORKSPACE_PORT PUBLIC_HOST
  if [[ -n "${DOMAIN:-}" ]]; then
    render_template "$REMOTE_TMP/payload/templates/caddy/Caddyfile.domain" "$REMOTE_TMP/caddy-block"
  else
    render_template "$REMOTE_TMP/payload/templates/caddy/Caddyfile.nipio" "$REMOTE_TMP/caddy-block"
  fi
  block="$(cat "$REMOTE_TMP/caddy-block")"
  $SUDO mkdir -p /etc/caddy
  if [[ -f "$caddyfile" ]]; then
    $SUDO cp "$caddyfile" "$backup"
  fi
  local new_caddyfile="$REMOTE_TMP/Caddyfile.new"
  python3 - "$caddyfile" "$block" "$new_caddyfile" <<'PY'
import os
import re
import sys

path, block, tmp = sys.argv[1:4]
old = ""
if os.path.exists(path):
    with open(path, encoding="utf-8") as f:
        old = f.read()
old = re.sub(r"\n?# BEGIN COMANDOS HERMES\n.*?\n# END COMANDOS HERMES\n?", "\n", old, flags=re.S).strip()
new = (old + "\n\n" if old else "") + "# BEGIN COMANDOS HERMES\n" + block.strip() + "\n# END COMANDOS HERMES\n"
with open(tmp, "w", encoding="utf-8") as f:
    f.write(new)
PY
  $SUDO mv "$new_caddyfile" "$caddyfile"
  $SUDO caddy fmt --overwrite "$caddyfile" >/dev/null || true
  $SUDO caddy validate --config "$caddyfile" >/dev/null
  $SUDO systemctl enable --now caddy >/dev/null
  $SUDO systemctl reload caddy || $SUDO systemctl restart caddy
}

write_workspace_env() {
  cat >"$REMOTE_WORKSPACE_DIR/.env" <<EOF
NODE_ENV=production
HOST=127.0.0.1
PORT=$WORKSPACE_PORT
COOKIE_SECURE=1
COMANDOS_SINGLE_PANEL=1
REMOTE_BASE_DIR=$REMOTE_BASE_DIR
REMOTE_WORKSPACE_DIR=$REMOTE_WORKSPACE_DIR
REMOTE_HERMES_HOME=$REMOTE_HERMES_HOME
HERMES_API_URL=http://127.0.0.1:$HERMES_GATEWAY_PORT
HERMES_CLI_PATH=$HERMES_CLI_PATH
HERMES_HOME=$REMOTE_HERMES_HOME
HERMES_PASSWORD=$HERMES_PASSWORD
COMANDOS_LICENSE_REQUIRED=1
COMANDOS_LICENSE_SERVER_URL=$COMANDOS_LICENSE_SERVER_URL
COMANDOS_LICENSE_SESSION_DAYS=$COMANDOS_LICENSE_SESSION_DAYS
COMANDOS_WORKSPACE_VERSION=$COMANDOS_WORKSPACE_VERSION
COMANDOS_HERMES_AGENT_REF=$HERMES_AGENT_REF
COMANDOS_UPDATE_MANIFEST_URL=$COMANDOS_UPDATE_MANIFEST_URL
COMANDOS_UPDATE_SCRIPT=$COMANDOS_UPDATE_SCRIPT
COMANDOS_INSTALLED_STATE=$COMANDOS_INSTALLED_STATE
COMANDOS_STACK_REPO_URL=$COMANDOS_STACK_REPO_URL
COMANDOS_STACK_REF=$COMANDOS_STACK_REF
COMANDOS_STACK_PATH=$COMANDOS_STACK_PATH
HERMES_AGENT_INSTALLER_URL=$HERMES_AGENT_INSTALLER_URL
VITE_UPDATE_CHECK_INTERVAL_MS=$VITE_UPDATE_CHECK_INTERVAL_MS
OPENAI_API_KEY=${OPENAI_API_KEY:-}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
QWEN_API_KEY=${QWEN_API_KEY:-}
MINIMAX_API_KEY=${MINIMAX_API_KEY:-}
DEFAULT_PROVIDER=$DEFAULT_PROVIDER
DEFAULT_MODEL=$DEFAULT_MODEL
EOF
  chmod 600 "$REMOTE_WORKSPACE_DIR/.env"
  $SUDO chown "$APP_USER:$APP_USER" "$REMOTE_WORKSPACE_DIR/.env"
}

write_hermes_env() {
  $SUDO mkdir -p "$REMOTE_HERMES_HOME"
  cat >"$REMOTE_HERMES_HOME/.env" <<EOF
OPENAI_API_KEY=${OPENAI_API_KEY:-}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
QWEN_API_KEY=${QWEN_API_KEY:-}
MINIMAX_API_KEY=${MINIMAX_API_KEY:-}
DEFAULT_PROVIDER=$DEFAULT_PROVIDER
DEFAULT_MODEL=$DEFAULT_MODEL
EOF
  chmod 600 "$REMOTE_HERMES_HOME/.env"
  $SUDO chown -R "$APP_USER:$APP_USER" "$REMOTE_HERMES_HOME"
}

write_telegram_env() {
  $SUDO mkdir -p "$REMOTE_BASE_DIR/telegram"
  $SUDO cp "$REMOTE_TMP/payload/templates/telegram/router.py" "$REMOTE_BASE_DIR/telegram/router.py"
  cat >"$REMOTE_BASE_DIR/telegram/.env" <<EOF
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME:-}
TELEGRAM_BOT_TOKEN_SECOND=${TELEGRAM_BOT_TOKEN_SECOND:-}
TELEGRAM_BOT_USERNAME_SECOND=${TELEGRAM_BOT_USERNAME_SECOND:-}
TELEGRAM_ALLOWED_USERS=${TELEGRAM_ALLOWED_USERS:-}
COMANDOS_WORKSPACE_URL=$PUBLIC_URL
EOF
  chmod 600 "$REMOTE_BASE_DIR/telegram/.env"

  export REMOTE_BASE_DIR REMOTE_WORKSPACE_DIR REMOTE_HERMES_HOME HERMES_WORKDIR TELEGRAM_USER_ID HERMES_TIMEOUT_SECONDS HERMES_POLL_TIMEOUT_SECONDS HERMES_STT_MODEL HERMES_STT_LANGUAGE HERMES_STT_ENABLED HERMES_SHOW_PROFILE_IN_RESPONSE
  python3 - "$REMOTE_BASE_DIR/telegram/config.json" <<'PY'
import json
import os
import sys

out = sys.argv[1]
base = os.environ["REMOTE_BASE_DIR"]
home = os.environ["REMOTE_HERMES_HOME"]
workdir = os.environ.get("HERMES_WORKDIR") or os.environ.get("REMOTE_WORKSPACE_DIR") or "/home/clawd"
telegram_user_id = os.environ["TELEGRAM_USER_ID"].strip()

cfg = {
    "telegram_env_files": [f"{base}/telegram/.env"],
    "profile_env_files": {
        "default": [f"{home}/.env", f"{base}/telegram/.env"]
    },
    "default_profile": "default",
    "restore_profile": "default",
    "bots": [
        {
            "name": "main",
            "token_env": "TELEGRAM_BOT_TOKEN",
            "telegram_env_files": [f"{base}/telegram/.env"],
            "default_profile": "default",
            "routes": {
                telegram_user_id: "default"
            }
        }
    ],
    "workdir": workdir,
    "timeout_seconds": int(os.environ.get("HERMES_TIMEOUT_SECONDS", "240")),
    "poll_timeout_seconds": int(os.environ.get("HERMES_POLL_TIMEOUT_SECONDS", "10")),
    "show_profile_in_response": os.environ.get("HERMES_SHOW_PROFILE_IN_RESPONSE", "false").lower() == "true",
    "stt_enabled": os.environ.get("HERMES_STT_ENABLED", "true").lower() == "true",
    "stt_model": os.environ.get("HERMES_STT_MODEL", "base"),
    "stt_language": os.environ.get("HERMES_STT_LANGUAGE", "ru"),
    "voice_prompt_prefix": "Голосовое сообщение пользователя. Расшифровка:",
    "button_protocol_enabled": True,
    "public_telegram_guard_enabled": True,
    "state_ttl_seconds": 86400,
    "demo_menu_enabled": False
}

if os.environ.get("TELEGRAM_BOT_TOKEN_SECOND"):
    cfg["bots"].append({
        "name": "second",
        "token_env": "TELEGRAM_BOT_TOKEN_SECOND",
        "telegram_env_files": [f"{base}/telegram/.env"],
        "default_profile": "default",
        "routes": {
            telegram_user_id: "default"
        }
    })

with open(out, "w", encoding="utf-8") as f:
    json.dump(cfg, f, ensure_ascii=False, indent=2)
    f.write("\n")
PY
  chmod 600 "$REMOTE_BASE_DIR/telegram/config.json"
  $SUDO chown -R "$APP_USER:$APP_USER" "$REMOTE_BASE_DIR/telegram"
}

install_update_script() {
  $SUDO mkdir -p "$REMOTE_BASE_DIR/install"
  export REMOTE_BASE_DIR REMOTE_WORKSPACE_DIR REMOTE_HERMES_HOME HERMES_AGENT_INSTALLER_URL
  export COMANDOS_STACK_REPO_URL COMANDOS_STACK_REF COMANDOS_STACK_PATH
  render_template "$REMOTE_TMP/payload/templates/update/comandos-update.sh" "$REMOTE_BASE_DIR/install/comandos-update.sh"
  chmod 700 "$REMOTE_BASE_DIR/install/comandos-update.sh"
  $SUDO chown "$APP_USER:$APP_USER" "$REMOTE_BASE_DIR/install/comandos-update.sh"
}

write_installed_state() {
  $SUDO mkdir -p "$REMOTE_WORKSPACE_DIR/.runtime"
  local agent_version=""
  agent_version="$(as_app_user "command -v hermes >/dev/null 2>&1 && hermes --version 2>/dev/null | head -1 || true")"
  export COMANDOS_WORKSPACE_VERSION HERMES_AGENT_REF agent_version COMANDOS_STACK_REPO_URL COMANDOS_STACK_REF COMANDOS_STACK_PATH
  python3 - "$COMANDOS_INSTALLED_STATE" <<'PY'
import json
import os
import sys
from datetime import datetime, timezone

out = sys.argv[1]
state = {
    "workspaceVersion": os.environ.get("COMANDOS_WORKSPACE_VERSION", ""),
    "hermesAgentRef": os.environ.get("HERMES_AGENT_REF", ""),
    "hermesAgentVersion": os.environ.get("agent_version", ""),
    "stackRepoUrl": os.environ.get("COMANDOS_STACK_REPO_URL", ""),
    "stackRef": os.environ.get("COMANDOS_STACK_REF", ""),
    "stackPath": os.environ.get("COMANDOS_STACK_PATH", ""),
    "updatedAt": datetime.now(timezone.utc).isoformat(),
}
with open(out, "w", encoding="utf-8") as f:
    json.dump(state, f, ensure_ascii=False, indent=2)
    f.write("\n")
PY
  chmod 600 "$COMANDOS_INSTALLED_STATE"
  $SUDO chown "$APP_USER:$APP_USER" "$COMANDOS_INSTALLED_STATE"
}

preflight() {
  log "Проверяю систему..."
  install_apt
  ensure_node
  ensure_caddy
  install_hermes_agent
  ensure_python_router_deps
  HERMES_CLI_PATH="$(find_hermes_cli)"
  NODE_PATH="$(command -v node)"
  PYTHON_PATH="$(command -v python3)"
  export HERMES_CLI_PATH NODE_PATH PYTHON_PATH
}

install_workspace() {
  log "Копирую COMANDOS Workspace..."
  $SUDO mkdir -p "$REMOTE_BASE_DIR" "$REMOTE_BASE_DIR/backups" "$REMOTE_BASE_DIR/install"
  if [[ -d "$REMOTE_WORKSPACE_DIR" ]]; then
    local backup="$REMOTE_BASE_DIR/backups/workspace-$(date +%Y%m%d%H%M%S)"
    $SUDO mkdir -p "$backup"
    $SUDO rsync -a --delete "$REMOTE_WORKSPACE_DIR/" "$backup/" || true
  fi
  $SUDO mkdir -p "$REMOTE_WORKSPACE_DIR"
  $SUDO rsync -a --delete "$REMOTE_TMP/payload/workspace/" "$REMOTE_WORKSPACE_DIR/"
  $SUDO rm -rf "$REMOTE_WORKSPACE_DIR/.git" "$REMOTE_WORKSPACE_DIR/node_modules" "$REMOTE_WORKSPACE_DIR/dist" "$REMOTE_WORKSPACE_DIR/logs"
  $SUDO chown -R "$APP_USER:$APP_USER" "$REMOTE_BASE_DIR"
  write_hermes_env
  write_workspace_env
  write_telegram_env
  install_update_script
  log "Собираю панель..."
  as_app_user "cd '$REMOTE_WORKSPACE_DIR' && corepack enable >/dev/null 2>&1 || true; cd '$REMOTE_WORKSPACE_DIR' && ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile && pnpm build"
  write_installed_state
}

checks() {
  local uid
  uid="$(id -u "$APP_USER")"
  log "Проверяю сервисы..."
  XDG_RUNTIME_DIR="/run/user/$uid" as_app_user "systemctl --user is-active hermes-gateway.service"
  XDG_RUNTIME_DIR="/run/user/$uid" as_app_user "systemctl --user is-active comandos-workspace.service"
  XDG_RUNTIME_DIR="/run/user/$uid" as_app_user "systemctl --user is-active comandos-telegram.service"
  $SUDO systemctl is-active caddy
  curl -fsS "http://127.0.0.1:$HERMES_GATEWAY_PORT/health" >/dev/null
  curl -fsS "http://127.0.0.1:$WORKSPACE_PORT" >/dev/null
  curl -k -fsSI "$PUBLIC_URL" >/dev/null
}

mkdir -p "$REMOTE_TMP/payload"
tar -xzf "$REMOTE_TMP/comandos-hermes-payload.tgz" -C "$REMOTE_TMP/payload"

preflight
install_workspace
install_systemd_user_services
configure_caddy
checks

cat <<EOF

COMANDOS Hermes готов.

URL панели: $PUBLIC_URL
Пароль панели: $HERMES_PASSWORD
Лицензия: вводится пользователем при входе
Hermes gateway: active
Workspace service: active
Telegram bot: active
Версии зафиксированы: да
Автообновление: выключено
Уведомления об обновлениях: включены
EOF
REMOTE

info "Подключаюсь к VPS: $remote"
"${ssh_base[@]}" "$remote" "mkdir -p '$remote_tmp'"
"${scp_base[@]}" "$payload" "$remote:$remote_tmp/comandos-hermes-payload.tgz" >/dev/null
"${scp_base[@]}" "$resolved_config" "$remote:$remote_tmp/comandos-hermes.env" >/dev/null
"${scp_base[@]}" "$tmp_dir/remote-install.sh" "$remote:$remote_tmp/remote-install.sh" >/dev/null
"${ssh_base[@]}" "$remote" "chmod 700 '$remote_tmp' && chmod +x '$remote_tmp/remote-install.sh' && mkdir -p '$remote_tmp/payload' && '$remote_tmp/remote-install.sh' '$remote_tmp'"

printf '\nЛокальная проверка завершена.\n'
printf 'Панель: %s\n' "$PUBLIC_URL"
printf 'Пароль панели: %s\n' "$HERMES_PASSWORD"
