#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CONFIG_PATH="${1:-$SCRIPT_DIR/comandos-hermes.env}"

info() { printf '[COMANDOS Hermes] %s\n' "$*"; }
fail() { printf '[COMANDOS Hermes] ERROR: %s\n' "$*" >&2; exit 1; }

if [[ $# -eq 0 && -f "$SCRIPT_DIR/comandos-hermes.env.example" ]]; then
  if ! bash "$SCRIPT_DIR/scripts/check-config.sh" "$CONFIG_PATH" >/dev/null 2>&1 &&
    bash "$SCRIPT_DIR/scripts/check-config.sh" "$SCRIPT_DIR/comandos-hermes.env.example" >/dev/null 2>&1; then
    CONFIG_PATH="$SCRIPT_DIR/comandos-hermes.env.example"
    info "Использую comandos-hermes.env.example: основной comandos-hermes.env не заполнен."
  fi
fi

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

SSH_KEY_PATH="${SSH_KEY_PATH:-${SSH_KEY_PAT:-}}"
VPS_IP="${VPS_IP:-${ROOT_IP:-}}"
SSH_PORT="${SSH_PORT:-22}"
ROOT_USER="${ROOT_USER:-root}"

resolve_ssh_alias() {
  local command_text="${SSH_CONNECT_COMMAND:-}"
  local alias="${SSH_HOST_ALIAS:-}"

  if [[ -n "$command_text" ]]; then
    local parts=()
    # shellcheck disable=SC2206
    parts=($command_text)
    [[ "${parts[0]:-}" == "ssh" ]] || fail "SSH_CONNECT_COMMAND должен начинаться с ssh"
    alias="${parts[$((${#parts[@]} - 1))]}"
  fi

  [[ -n "$alias" ]] || fail "для SSH_AUTH_METHOD=ssh_config укажите SSH_HOST_ALIAS или SSH_CONNECT_COMMAND"
  printf '%s\n' "$alias"
}

ssh_config_value() {
  local alias="$1"
  local key="$2"
  ssh -G "$alias" 2>/dev/null | awk -v key="$key" '$1 == key {print $2; exit}'
}

detect_ssh_auth_method() {
  if [[ -n "${SSH_AUTH_METHOD:-}" ]]; then
    printf '%s\n' "$SSH_AUTH_METHOD"
  elif [[ -n "${SSH_CONNECT_COMMAND:-}" || -n "${SSH_HOST_ALIAS:-}" ]]; then
    printf '%s\n' "ssh_config"
  elif [[ -n "${SSH_KEY_PATH:-}" || -n "${SSH_KEY_PAT:-}" ]]; then
    printf '%s\n' "key"
  elif [[ -n "${ROOT_PASSWORD:-}" ]]; then
    printf '%s\n' "password"
  elif [[ -n "${SSH_USER:-}" ]]; then
    printf '%s\n' "key"
  else
    printf '%s\n' ""
  fi
}

SSH_AUTH_METHOD="$(detect_ssh_auth_method)"

remote_user="${SSH_USER:-$ROOT_USER}"
remote=""
ssh_base=()
scp_base=()

case "${SSH_AUTH_METHOD:-}" in
  ssh_config)
    ssh_alias="$(resolve_ssh_alias)"
    resolved_host="$(ssh_config_value "$ssh_alias" hostname)"
    resolved_user="$(ssh_config_value "$ssh_alias" user)"
    resolved_port="$(ssh_config_value "$ssh_alias" port)"
    [[ -n "$resolved_host" ]] || fail "не удалось прочитать HostName для SSH alias: $ssh_alias"
    [[ -n "$resolved_user" ]] || fail "не удалось прочитать User для SSH alias: $ssh_alias"
    VPS_IP="${VPS_IP:-$resolved_host}"
    SSH_PORT="${resolved_port:-${SSH_PORT:-22}}"
    remote_user="$resolved_user"
    remote="$ssh_alias"
    ssh_base=(ssh -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ServerAliveCountMax=6)
    scp_base=(scp -o StrictHostKeyChecking=accept-new)
    ;;
  key)
    key_path="$(expand_path "${SSH_KEY_PATH:-}")"
    [[ -f "$key_path" ]] || fail "SSH key не найден: $key_path"
    remote_user="${SSH_USER:-$ROOT_USER}"
    [[ -n "$VPS_IP" ]] || fail "ROOT_IP не задан"
    remote="${remote_user}@${VPS_IP}"
    ssh_base=(ssh -p "${SSH_PORT}" -i "$key_path" -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ServerAliveCountMax=6)
    scp_base=(scp -P "${SSH_PORT}" -i "$key_path" -o StrictHostKeyChecking=accept-new)
    ;;
  password)
    command -v sshpass >/dev/null 2>&1 || fail "для SSH_AUTH_METHOD=password нужен sshpass на локальной машине"
    remote_user="${ROOT_USER}"
    [[ -n "$VPS_IP" ]] || fail "ROOT_IP не задан"
    remote="${remote_user}@${VPS_IP}"
    ssh_base=(sshpass -p "${ROOT_PASSWORD}" ssh -p "${SSH_PORT}" -o StrictHostKeyChecking=accept-new -o ServerAliveInterval=30 -o ServerAliveCountMax=6)
    scp_base=(sshpass -p "${ROOT_PASSWORD}" scp -P "${SSH_PORT}" -o StrictHostKeyChecking=accept-new)
    ;;
  *)
    fail "SSH_AUTH_METHOD должен быть ssh_config, key или password"
    ;;
esac

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
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$payload" \
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
  printf 'VPS_IP=%q\n' "$VPS_IP"
  printf 'SSH_PORT=%q\n' "$SSH_PORT"
  printf 'SSH_USER=%q\n' "$remote_user"
  printf 'PUBLIC_URL=%q\n' "$PUBLIC_URL"
  printf 'PUBLIC_HOST=%q\n' "$PUBLIC_HOST"
} >>"$resolved_config"
chmod 600 "$resolved_config"

remote_tmp="/tmp/comandos-hermes-$(date +%Y%m%d%H%M%S)"
deploy_bundle="$tmp_dir/comandos-hermes-deploy-bundle.tgz"

retry_command() {
  local label="$1"
  shift
  local attempt=1
  local max_attempts="${COMANDOS_SSH_RETRIES:-5}"
  local delay="${COMANDOS_SSH_RETRY_DELAY_SECONDS:-8}"
  local rc=0
  [[ "$max_attempts" =~ ^[0-9]+$ ]] || max_attempts=5
  [[ "$delay" =~ ^[0-9]+$ ]] || delay=8
  while (( attempt <= max_attempts )); do
    if "$@"; then
      return 0
    else
      rc=$?
    fi
    if [[ "$rc" -ne 255 ]]; then
      fail "$label: команда завершилась ошибкой без повтора (exit $rc)"
    fi
    if (( attempt >= max_attempts )); then
      fail "$label: не удалось выполнить после $max_attempts попыток (exit $rc)"
    fi
    info "$label: соединение не прошло, повтор $((attempt + 1))/$max_attempts через ${delay}s"
    sleep "$delay"
    attempt=$((attempt + 1))
  done
}

cat >"$tmp_dir/remote-install.sh" <<'REMOTE'
#!/usr/bin/env bash
set -euo pipefail

REMOTE_TMP="$1"
cd "$REMOTE_TMP"

set -a
# shellcheck disable=SC1091
source comandos-hermes.env
# shellcheck disable=SC1091
source comandos-hermes.lock
set +a

log() { printf '[COMANDOS Hermes VPS] %s\n' "$*"; }
die() { printf '[COMANDOS Hermes VPS] ERROR: %s\n' "$*" >&2; exit 1; }

SUDO=""
if [[ "$(id -u)" -ne 0 ]]; then
  command -v sudo >/dev/null 2>&1 || die "нужен sudo или root-доступ"
  SUDO="sudo"
fi

APP_USER="${REMOTE_APP_USER:-hermes}"
REMOTE_BASE_DIR="${REMOTE_BASE_DIR:-/opt/comandos/hermes}"
REMOTE_WORKSPACE_DIR="${REMOTE_WORKSPACE_DIR:-$REMOTE_BASE_DIR/workspace}"
REMOTE_HERMES_HOME="${REMOTE_HERMES_HOME:-/home/$APP_USER/.hermes}"
WORKSPACE_PORT="${WORKSPACE_PORT:-3030}"
HERMES_GATEWAY_PORT="${HERMES_GATEWAY_PORT:-8642}"
COMANDOS_CADDY_BLOCK_ID="${COMANDOS_CADDY_BLOCK_ID:-COMANDOS HERMES}"
COMANDOS_LICENSE_SESSION_DAYS="${COMANDOS_LICENSE_SESSION_DAYS:-14}"
DEFAULT_PROVIDER="${DEFAULT_PROVIDER:-}"
DEFAULT_MODEL="${DEFAULT_MODEL:-}"
PUBLIC_HOST="${PUBLIC_HOST:-${DOMAIN:-${VPS_IP}.nip.io}}"
PUBLIC_URL="${PUBLIC_URL:-https://$PUBLIC_HOST}"
COMANDOS_STACK_REPO_URL="${COMANDOS_STACK_REPO_URL:-https://github.com/Comandosai/comandos-deploy-hub.git}"
COMANDOS_STACK_REF="${COMANDOS_STACK_REF:-main}"
COMANDOS_STACK_PATH="${COMANDOS_STACK_PATH:-stacks/hermes}"
COMANDOS_UPDATE_MANIFEST_URL="${COMANDOS_UPDATE_MANIFEST_URL:-https://raw.githubusercontent.com/Comandosai/comandos-deploy-hub/main/stacks/hermes/update-manifest.json}"
COMANDOS_UPDATE_SCRIPT="${COMANDOS_UPDATE_SCRIPT:-$REMOTE_BASE_DIR/install/comandos-update.sh}"
COMANDOS_INSTALLED_STATE="${COMANDOS_INSTALLED_STATE:-$REMOTE_WORKSPACE_DIR/.runtime/comandos-installed.json}"
COMANDOS_UPDATE_CHECK_INTERVAL_MS="${COMANDOS_UPDATE_CHECK_INTERVAL_MS:-${VITE_UPDATE_CHECK_INTERVAL_MS:-60000}}"
VITE_UPDATE_CHECK_INTERVAL_MS="${VITE_UPDATE_CHECK_INTERVAL_MS:-60000}"

trim_value() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

has_value() {
  [[ -n "$(trim_value "${1:-}")" ]]
}

telegram_enabled() {
  has_value "${TELEGRAM_BOT_TOKEN:-}" && has_value "${TELEGRAM_USER_ID:-}"
}

resolve_default_model() {
  DEFAULT_PROVIDER="$(trim_value "${DEFAULT_PROVIDER:-}")"
  DEFAULT_MODEL="$(trim_value "${DEFAULT_MODEL:-}")"

  # Older env files had OpenAI as an example default. If no OpenAI key is set,
  # treat that pair as "not chosen" and select from the keys the user actually filled.
  if [[ "$DEFAULT_PROVIDER" == "openai" && "$DEFAULT_MODEL" == "gpt-5.4-mini" && -z "${OPENAI_API_KEY:-}" ]]; then
    DEFAULT_PROVIDER=""
    DEFAULT_MODEL=""
  fi

  if [[ -z "$DEFAULT_PROVIDER" || -z "$DEFAULT_MODEL" ]]; then
    if has_value "${MINIMAX_API_KEY:-}"; then
      DEFAULT_PROVIDER="${DEFAULT_PROVIDER:-minimax}"
      DEFAULT_MODEL="${DEFAULT_MODEL:-MiniMax-M2.7}"
    elif has_value "${DEEPSEEK_API_KEY:-}"; then
      DEFAULT_PROVIDER="${DEFAULT_PROVIDER:-deepseek}"
      DEFAULT_MODEL="${DEFAULT_MODEL:-deepseek-chat}"
    elif has_value "${OPENAI_API_KEY:-}"; then
      DEFAULT_PROVIDER="${DEFAULT_PROVIDER:-openai}"
      DEFAULT_MODEL="${DEFAULT_MODEL:-gpt-5.4-mini}"
    elif has_value "${QWEN_API_KEY:-}"; then
      DEFAULT_PROVIDER="${DEFAULT_PROVIDER:-qwen}"
      DEFAULT_MODEL="${DEFAULT_MODEL:-qwen-max}"
    fi
  fi

  [[ -n "$DEFAULT_PROVIDER" ]] || die "DEFAULT_PROVIDER не выбран и ключ модели не найден"
  [[ -n "$DEFAULT_MODEL" ]] || die "DEFAULT_MODEL не выбран и ключ модели не найден"

  case "$DEFAULT_PROVIDER" in
    openai)
      has_value "${OPENAI_API_KEY:-}" || die "DEFAULT_PROVIDER=openai требует OPENAI_API_KEY"
      ;;
    deepseek)
      has_value "${DEEPSEEK_API_KEY:-}" || die "DEFAULT_PROVIDER=deepseek требует DEEPSEEK_API_KEY"
      ;;
    minimax)
      has_value "${MINIMAX_API_KEY:-}" || die "DEFAULT_PROVIDER=minimax требует MINIMAX_API_KEY"
      ;;
    qwen)
      has_value "${QWEN_API_KEY:-}" || die "DEFAULT_PROVIDER=qwen требует QWEN_API_KEY"
      ;;
  esac

  export DEFAULT_PROVIDER DEFAULT_MODEL
  log "Модель по умолчанию: $DEFAULT_PROVIDER / $DEFAULT_MODEL"
}

if ! id "$APP_USER" >/dev/null 2>&1; then
  log "Создаю пользователя $APP_USER..."
  $SUDO useradd -m -s /bin/bash "$APP_USER"
fi

install_apt() {
  if command -v apt-get >/dev/null 2>&1; then
    $SUDO apt-get update -qq
    DEBIAN_FRONTEND=noninteractive $SUDO apt-get install -y -qq \
      ca-certificates curl git jq python3 python3-pip python3-dev libffi-dev rsync tar gzip build-essential lsof ffmpeg ripgrep sqlite3 >/dev/null
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

ensure_swap() {
  case "${COMANDOS_CREATE_SWAP:-auto}" in
    0|false|False|FALSE|no|No|NO)
      return
      ;;
  esac

  local mem_kb swap_kb swap_file swap_size
  mem_kb="$(awk '/MemTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
  swap_kb="$(awk '/SwapTotal/ {print $2}' /proc/meminfo 2>/dev/null || echo 0)"
  if [[ "$mem_kb" -ge 1800000 || "$swap_kb" -ge 524288 ]]; then
    return
  fi

  swap_file="${COMANDOS_SWAP_FILE:-/swapfile-comandos-hermes}"
  swap_size="${COMANDOS_SWAP_SIZE:-2G}"
  log "Памяти мало, добавляю swap $swap_size для сборки панели..."

  if [[ ! -f "$swap_file" ]]; then
    if ! $SUDO fallocate -l "$swap_size" "$swap_file" 2>/dev/null; then
      if ! $SUDO dd if=/dev/zero of="$swap_file" bs=1M count=2048 status=none 2>/dev/null; then
        log "Не удалось создать swap-файл. Продолжаю без swap, сборка может упасть на слабом VPS."
        $SUDO rm -f "$swap_file" 2>/dev/null || true
        return
      fi
    fi
    $SUDO chmod 600 "$swap_file"
    $SUDO mkswap "$swap_file" >/dev/null
  fi

  if ! swapon --show=NAME | grep -qxF "$swap_file"; then
    $SUDO swapon "$swap_file" || {
      log "Не удалось включить swap. Продолжаю без swap, сборка может упасть на слабом VPS."
      return
    }
  fi

  if [[ -w /etc/fstab ]] || [[ -n "$SUDO" ]]; then
    local fstab_line="$swap_file none swap sw 0 0"
    if ! grep -qxF "$fstab_line" /etc/fstab 2>/dev/null; then
      printf '%s\n' "$fstab_line" | $SUDO tee -a /etc/fstab >/dev/null
    fi
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

ensure_user_systemd() {
  local uid runtime_dir bus_path
  uid="$(id -u "$APP_USER")"
  runtime_dir="/run/user/$uid"
  bus_path="$runtime_dir/bus"

  $SUDO loginctl enable-linger "$APP_USER" >/dev/null 2>&1 || true
  $SUDO systemctl start "user@$uid.service" >/dev/null 2>&1 || true

  for _ in $(seq 1 60); do
    if [[ -S "$bus_path" ]] || as_app_user "export XDG_RUNTIME_DIR='$runtime_dir'; export DBUS_SESSION_BUS_ADDRESS='unix:path=$bus_path'; systemctl --user list-units >/dev/null 2>&1"; then
      return 0
    fi
    sleep 1
  done

  die "user-systemd для $APP_USER не поднялся: systemctl --user недоступен"
}

as_app_user_systemd() {
  local uid
  uid="$(id -u "$APP_USER")"
  as_app_user "export XDG_RUNTIME_DIR='/run/user/$uid'; export DBUS_SESSION_BUS_ADDRESS='unix:path=/run/user/$uid/bus'; $*"
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
  as_app_user "python3 -m pip install --user -q 'numpy<2' faster-whisper || python3 -m pip install --user --break-system-packages -q 'numpy<2' faster-whisper"
}

find_hermes_cli() {
  local cli cli_q candidate candidate_q
  cli="$(as_app_user 'command -v hermes || true')"
  if [[ -n "$cli" ]]; then
    printf -v cli_q '%q' "$cli"
    if as_app_user "test -x $cli_q"; then
      printf '%s\n' "$cli"
      return
    fi
  fi
  for candidate in "/home/$APP_USER/.local/bin/hermes" "$REMOTE_HERMES_HOME/hermes-agent/hermes"; do
    printf -v candidate_q '%q' "$candidate"
    if as_app_user "test -x $candidate_q"; then
      printf '%s\n' "$candidate"
      return
    fi
  done
  die "hermes cli не найден для пользователя $APP_USER"
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

install_app_file() {
  local src="$1"
  local dst="$2"
  local mode="${3:-600}"
  $SUDO install -o "$APP_USER" -g "$APP_USER" -m "$mode" "$src" "$dst"
}

install_systemd_user_services() {
  local systemd_dir service_names
  systemd_dir="$(getent passwd "$APP_USER" | cut -d: -f6)/.config/systemd/user"
  $SUDO mkdir -p "$systemd_dir"
  export REMOTE_BASE_DIR REMOTE_WORKSPACE_DIR REMOTE_HERMES_HOME HERMES_GATEWAY_PORT HERMES_CLI_PATH NODE_PATH PYTHON_PATH
  render_template "$REMOTE_TMP/payload/templates/systemd/hermes-gateway.service" "$REMOTE_TMP/hermes-gateway.service"
  render_template "$REMOTE_TMP/payload/templates/systemd/comandos-workspace.service" "$REMOTE_TMP/comandos-workspace.service"
  service_names="hermes-gateway.service comandos-workspace.service"
  if telegram_enabled; then
    render_template "$REMOTE_TMP/payload/templates/systemd/comandos-telegram.service" "$REMOTE_TMP/comandos-telegram.service"
    $SUDO cp "$REMOTE_TMP/hermes-gateway.service" "$REMOTE_TMP/comandos-workspace.service" "$REMOTE_TMP/comandos-telegram.service" "$systemd_dir/"
    service_names="$service_names comandos-telegram.service"
  else
    $SUDO cp "$REMOTE_TMP/hermes-gateway.service" "$REMOTE_TMP/comandos-workspace.service" "$systemd_dir/"
    $SUDO rm -f "$systemd_dir/comandos-telegram.service"
  fi
  $SUDO chown -R "$APP_USER:$APP_USER" "$systemd_dir"
  ensure_user_systemd
  as_app_user_systemd "systemctl --user daemon-reload && systemctl --user enable --now $service_names"
}

configure_caddy() {
  local block caddyfile backup begin_marker end_marker
  caddyfile="/etc/caddy/Caddyfile"
  backup="/etc/caddy/Caddyfile.backup.$(date +%Y%m%d%H%M%S)"
  begin_marker="# BEGIN $COMANDOS_CADDY_BLOCK_ID"
  end_marker="# END $COMANDOS_CADDY_BLOCK_ID"
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
  python3 - "$caddyfile" "$block" "$new_caddyfile" "$begin_marker" "$end_marker" <<'PY'
import os
import re
import sys

path, block, tmp, begin_marker, end_marker = sys.argv[1:6]
old = ""
if os.path.exists(path):
    with open(path, encoding="utf-8") as f:
        old = f.read()
pattern = r"\n?" + re.escape(begin_marker) + r"\n.*?\n" + re.escape(end_marker) + r"\n?"
old = re.sub(pattern, "\n", old, flags=re.S).strip()
new = (old + "\n\n" if old else "") + begin_marker + "\n" + block.strip() + "\n" + end_marker + "\n"
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
  local env_tmp="$REMOTE_TMP/workspace.env"
  cat >"$env_tmp" <<EOF
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
COMANDOS_UPDATE_CHECK_INTERVAL_MS=$COMANDOS_UPDATE_CHECK_INTERVAL_MS
HERMES_AGENT_INSTALLER_URL=$HERMES_AGENT_INSTALLER_URL
VITE_UPDATE_CHECK_INTERVAL_MS=$VITE_UPDATE_CHECK_INTERVAL_MS
OPENAI_API_KEY=${OPENAI_API_KEY:-}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
QWEN_API_KEY=${QWEN_API_KEY:-}
MINIMAX_API_KEY=${MINIMAX_API_KEY:-}
DEFAULT_PROVIDER=$DEFAULT_PROVIDER
DEFAULT_MODEL=$DEFAULT_MODEL
HERMES_DEFAULT_PROVIDER=$DEFAULT_PROVIDER
HERMES_DEFAULT_MODEL=$DEFAULT_MODEL
CLAUDE_DEFAULT_MODEL=$DEFAULT_MODEL
EOF
  install_app_file "$env_tmp" "$REMOTE_WORKSPACE_DIR/.env" 600
}

write_hermes_env() {
  local env_tmp="$REMOTE_TMP/hermes.env"
  $SUDO mkdir -p "$REMOTE_HERMES_HOME"
  $SUDO chown "$APP_USER:$APP_USER" "$REMOTE_HERMES_HOME"
  cat >"$env_tmp" <<EOF
OPENAI_API_KEY=${OPENAI_API_KEY:-}
DEEPSEEK_API_KEY=${DEEPSEEK_API_KEY:-}
QWEN_API_KEY=${QWEN_API_KEY:-}
MINIMAX_API_KEY=${MINIMAX_API_KEY:-}
DEFAULT_PROVIDER=$DEFAULT_PROVIDER
DEFAULT_MODEL=$DEFAULT_MODEL
HERMES_DEFAULT_PROVIDER=$DEFAULT_PROVIDER
HERMES_DEFAULT_MODEL=$DEFAULT_MODEL
CLAUDE_DEFAULT_MODEL=$DEFAULT_MODEL
EOF
  install_app_file "$env_tmp" "$REMOTE_HERMES_HOME/.env" 600
}

write_hermes_config() {
  local config_path config_tmp existing_tmp
  $SUDO mkdir -p "$REMOTE_HERMES_HOME"
  $SUDO chown "$APP_USER:$APP_USER" "$REMOTE_HERMES_HOME"
  config_path="$REMOTE_HERMES_HOME/config.yaml"
  config_tmp="$REMOTE_TMP/hermes-config.yaml"
  existing_tmp="$REMOTE_TMP/hermes-config-existing.yaml"
  if $SUDO test -f "$config_path"; then
    $SUDO cp "$config_path" "$config_path.backup.$(date +%Y%m%d%H%M%S)"
    $SUDO cat "$config_path" >"$existing_tmp"
  else
    : >"$existing_tmp"
  fi
  python3 - "$existing_tmp" "$config_tmp" "$DEFAULT_PROVIDER" "$DEFAULT_MODEL" <<'PY'
import json
import os
import re
import sys

source_path, out_path, provider, model = sys.argv[1:5]
raw = ""
if os.path.exists(source_path):
    with open(source_path, encoding="utf-8") as f:
        raw = f.read()

def strip_top_level_key(text: str, key: str) -> str:
    lines = text.splitlines()
    out = []
    i = 0
    pattern = re.compile(rf"^{re.escape(key)}\s*:")
    while i < len(lines):
        line = lines[i]
        if pattern.match(line):
            i += 1
            while i < len(lines):
                nxt = lines[i]
                if nxt.startswith((" ", "\t")):
                    i += 1
                    continue
                if not nxt.strip():
                    i += 1
                    continue
                break
            continue
        out.append(line)
        i += 1
    return "\n".join(out).strip()

body = strip_top_level_key(raw, "provider")
body = strip_top_level_key(body, "model")
head = f"provider: {json.dumps(provider, ensure_ascii=False)}\nmodel: {json.dumps(model, ensure_ascii=False)}"
next_text = head + ("\n\n" + body if body else "") + "\n"

with open(out_path, "w", encoding="utf-8") as f:
    f.write(next_text)
PY
  install_app_file "$config_tmp" "$config_path" 600
}

write_telegram_env() {
  local env_tmp config_tmp
  env_tmp="$REMOTE_TMP/telegram.env"
  config_tmp="$REMOTE_TMP/telegram-config.json"
  $SUDO mkdir -p "$REMOTE_BASE_DIR/telegram"
  $SUDO chown "$APP_USER:$APP_USER" "$REMOTE_BASE_DIR/telegram"
  install_app_file "$REMOTE_TMP/payload/templates/telegram/router.py" "$REMOTE_BASE_DIR/telegram/router.py" 644
  cat >"$env_tmp" <<EOF
TELEGRAM_BOT_TOKEN=$TELEGRAM_BOT_TOKEN
TELEGRAM_BOT_USERNAME=${TELEGRAM_BOT_USERNAME:-}
TELEGRAM_BOT_TOKEN_SECOND=${TELEGRAM_BOT_TOKEN_SECOND:-}
TELEGRAM_BOT_USERNAME_SECOND=${TELEGRAM_BOT_USERNAME_SECOND:-}
TELEGRAM_ALLOWED_USERS=${TELEGRAM_ALLOWED_USERS:-}
HERMES_INLINE_BUTTONS_ENABLED=${HERMES_INLINE_BUTTONS_ENABLED:-false}
COMANDOS_WORKSPACE_URL=$PUBLIC_URL
EOF
  install_app_file "$env_tmp" "$REMOTE_BASE_DIR/telegram/.env" 600

  export REMOTE_BASE_DIR REMOTE_WORKSPACE_DIR REMOTE_HERMES_HOME HERMES_WORKDIR TELEGRAM_USER_ID HERMES_TIMEOUT_SECONDS HERMES_POLL_TIMEOUT_SECONDS HERMES_STT_MODEL HERMES_STT_LANGUAGE HERMES_STT_ENABLED HERMES_SHOW_PROFILE_IN_RESPONSE HERMES_INLINE_BUTTONS_ENABLED
  python3 - "$config_tmp" <<'PY'
import json
import os
import sys

def env_bool(name, default=False):
    raw = os.environ.get(name)
    if raw is None or raw.strip() == "":
        return default
    return raw.strip().lower() in {"1", "true", "yes", "on", "y", "да"}

out = sys.argv[1]
base = os.environ["REMOTE_BASE_DIR"]
home = os.environ["REMOTE_HERMES_HOME"]
workdir = os.environ.get("HERMES_WORKDIR") or os.environ.get("REMOTE_WORKSPACE_DIR") or "/home/hermes"
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
    "button_protocol_enabled": env_bool("HERMES_INLINE_BUTTONS_ENABLED", False),
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
  install_app_file "$config_tmp" "$REMOTE_BASE_DIR/telegram/config.json" 600
}

install_update_script() {
  local script_tmp="$REMOTE_TMP/comandos-update.sh"
  $SUDO mkdir -p "$REMOTE_BASE_DIR/install"
  $SUDO chown "$APP_USER:$APP_USER" "$REMOTE_BASE_DIR/install"
  export REMOTE_BASE_DIR REMOTE_WORKSPACE_DIR REMOTE_HERMES_HOME HERMES_AGENT_INSTALLER_URL
  export COMANDOS_STACK_REPO_URL COMANDOS_STACK_REF COMANDOS_STACK_PATH
  render_template "$REMOTE_TMP/payload/templates/update/comandos-update.sh" "$script_tmp"
  install_app_file "$script_tmp" "$REMOTE_BASE_DIR/install/comandos-update.sh" 755
}

write_installed_state() {
  local state_tmp="$REMOTE_TMP/installed-state.json"
  $SUDO mkdir -p "$REMOTE_WORKSPACE_DIR/.runtime"
  $SUDO chown "$APP_USER:$APP_USER" "$REMOTE_WORKSPACE_DIR/.runtime"
  local agent_version=""
  agent_version="$(as_app_user "command -v hermes >/dev/null 2>&1 && hermes --version 2>/dev/null | head -1 || true")"
  export COMANDOS_WORKSPACE_VERSION HERMES_AGENT_REF agent_version COMANDOS_STACK_REPO_URL COMANDOS_STACK_REF COMANDOS_STACK_PATH
  python3 - "$state_tmp" <<'PY'
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
  install_app_file "$state_tmp" "$COMANDOS_INSTALLED_STATE" 600
}

cleanup_build_space() {
  $SUDO apt-get clean >/dev/null 2>&1 || true
  $SUDO rm -rf /var/cache/apt/archives/*.deb /var/cache/apt/*.bin 2>/dev/null || true
  $SUDO find /tmp -maxdepth 1 -type d -name 'comandos-hermes-*' ! -path "$REMOTE_TMP" -exec rm -rf {} + 2>/dev/null || true
  as_app_user "rm -rf ~/.cache/pnpm ~/.cache/node ~/.npm/_cacache" || true

  local available_kb
  available_kb="$(df -Pk / | awk 'NR==2 {print $4}')"
  if [[ "${available_kb:-0}" -lt 2097152 ]]; then
    log "Свободного места меньше 2 ГБ, очищаю кеш браузера Hermes для сборки панели..."
    as_app_user "rm -rf ~/.cache/ms-playwright" || true
  fi
}

wait_http() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"
  local delay="${4:-2}"

  for _ in $(seq 1 "$attempts"); do
    if curl -fsS "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done

  die "$label не ответил: $url"
}

wait_http_head() {
  local url="$1"
  local label="$2"
  local attempts="${3:-60}"
  local delay="${4:-2}"

  for _ in $(seq 1 "$attempts"); do
    if curl -k -fsSI "$url" >/dev/null 2>&1; then
      return 0
    fi
    sleep "$delay"
  done

  die "$label не ответил: $url"
}

preflight() {
  log "Проверяю систему..."
  resolve_default_model
  ensure_swap
  install_apt
  ensure_node
  ensure_caddy
  install_hermes_agent
  if telegram_enabled; then
    ensure_python_router_deps
  else
    log "Telegram router выключен: TELEGRAM_BOT_TOKEN и TELEGRAM_USER_ID не заданы"
  fi
  HERMES_CLI_PATH="$(find_hermes_cli)"
  NODE_PATH="$(command -v node)"
  PYTHON_PATH="$(command -v python3)"
  export HERMES_CLI_PATH NODE_PATH PYTHON_PATH
}

install_workspace() {
  log "Копирую COMANDOS Workspace..."
  $SUDO mkdir -p "$REMOTE_BASE_DIR" "$REMOTE_BASE_DIR/backups" "$REMOTE_BASE_DIR/install"
  if [[ -d "$REMOTE_WORKSPACE_DIR" ]]; then
    if [[ -f "$COMANDOS_INSTALLED_STATE" ]]; then
      local backup="$REMOTE_BASE_DIR/backups/workspace-$(date +%Y%m%d%H%M%S)"
      $SUDO mkdir -p "$backup"
      $SUDO rsync -a --delete \
        --exclude node_modules \
        --exclude dist \
        --exclude logs \
        --exclude .runtime \
        "$REMOTE_WORKSPACE_DIR/" "$backup/" || true
    else
      log "Предыдущая установка не завершена, удаляю черновик workspace без backup..."
      $SUDO rm -rf "$REMOTE_WORKSPACE_DIR"
    fi
  fi
  $SUDO mkdir -p "$REMOTE_WORKSPACE_DIR"
  $SUDO rsync -a --delete "$REMOTE_TMP/payload/workspace/" "$REMOTE_WORKSPACE_DIR/"
  $SUDO rm -rf "$REMOTE_WORKSPACE_DIR/.git" "$REMOTE_WORKSPACE_DIR/node_modules" "$REMOTE_WORKSPACE_DIR/dist" "$REMOTE_WORKSPACE_DIR/logs"
  $SUDO chown -R "$APP_USER:$APP_USER" "$REMOTE_BASE_DIR"
  write_hermes_env
  write_hermes_config
  write_workspace_env
  if telegram_enabled; then
    write_telegram_env
  else
    $SUDO rm -rf "$REMOTE_BASE_DIR/telegram"
  fi
  install_update_script
  log "Собираю панель..."
  as_app_user "cd '$REMOTE_WORKSPACE_DIR' && corepack enable >/dev/null 2>&1 || true; cd '$REMOTE_WORKSPACE_DIR' && CI=true ELECTRON_SKIP_BINARY_DOWNLOAD=1 pnpm install --frozen-lockfile"
  cleanup_build_space
  as_app_user "cd '$REMOTE_WORKSPACE_DIR' && CI=true pnpm build"
}

checks() {
  log "Проверяю сервисы..."
  ensure_user_systemd
  as_app_user_systemd "systemctl --user is-active hermes-gateway.service"
  as_app_user_systemd "systemctl --user is-active comandos-workspace.service"
  if telegram_enabled; then
    as_app_user_systemd "systemctl --user is-active comandos-telegram.service"
  fi
  $SUDO systemctl is-active caddy
  wait_http "http://127.0.0.1:$HERMES_GATEWAY_PORT/health" "Hermes Gateway"
  wait_http "http://127.0.0.1:$WORKSPACE_PORT" "COMANDOS Workspace"
  wait_http_head "$PUBLIC_URL" "Публичная панель"
}

mkdir -p "$REMOTE_TMP/payload"
tar -xzf "$REMOTE_TMP/comandos-hermes-payload.tgz" -C "$REMOTE_TMP/payload"

preflight
install_workspace
install_systemd_user_services
configure_caddy
checks
write_installed_state

telegram_status="disabled"
if telegram_enabled; then
  telegram_status="active"
fi

cat <<EOF

COMANDOS Hermes готов.

URL панели: $PUBLIC_URL
Пароль панели: $HERMES_PASSWORD
Лицензия: вводится пользователем при входе
Hermes gateway: active
Workspace service: active
Telegram bot: $telegram_status
Версии зафиксированы: да
Автообновление: выключено
Уведомления об обновлениях: включены
EOF
REMOTE

cp "$SCRIPT_DIR/comandos-hermes.lock" "$tmp_dir/comandos-hermes.lock"
COPYFILE_DISABLE=1 tar --no-xattrs -czf "$deploy_bundle" -C "$tmp_dir" \
  comandos-hermes-payload.tgz \
  comandos-hermes.env \
  comandos-hermes.lock \
  remote-install.sh

upload_and_run_remote_install() {
  "${ssh_base[@]}" "$remote" "rm -rf '$remote_tmp' && mkdir -p '$remote_tmp' && tar -xzf - -C '$remote_tmp' && chmod 700 '$remote_tmp' && chmod 600 '$remote_tmp/comandos-hermes.env' && chmod +x '$remote_tmp/remote-install.sh' && mkdir -p '$remote_tmp/payload' && '$remote_tmp/remote-install.sh' '$remote_tmp'" <"$deploy_bundle"
}

info "Подключаюсь к VPS: $remote"
retry_command "SSH upload/install" upload_and_run_remote_install

printf '\nЛокальная проверка завершена.\n'
printf 'Панель: %s\n' "$PUBLIC_URL"
printf 'Пароль панели: %s\n' "$HERMES_PASSWORD"
