#!/usr/bin/env bash
set -euo pipefail

CONFIG_PATH="${1:-comandos-hermes.env}"

if [[ ! -f "$CONFIG_PATH" ]]; then
  echo "ERROR: config file not found: $CONFIG_PATH"
  echo "Run: cp comandos-hermes.env.example comandos-hermes.env"
  exit 1
fi

set -a
# shellcheck disable=SC1090
source "$CONFIG_PATH"
set +a

errors=()
warnings=()

trim_value() {
  local value="${1:-}"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

has_value() {
  [[ -n "$(trim_value "${1:-}")" ]]
}

need() {
  local name="$1"
  local value="${!name:-}"
  if [[ -z "$value" ]]; then
    errors+=("$name is required")
  fi
}

resolve_ssh_alias() {
  local command_text="${SSH_CONNECT_COMMAND:-}"
  local alias="${SSH_HOST_ALIAS:-}"

  if has_value "$command_text"; then
    local parts=()
    # shellcheck disable=SC2206
    parts=($command_text)
    if [[ "${parts[0]:-}" != "ssh" ]]; then
      errors+=("SSH_CONNECT_COMMAND must start with ssh")
      return 1
    fi
    alias="${parts[$((${#parts[@]} - 1))]}"
  fi

  if ! has_value "$alias"; then
    errors+=("SSH_HOST_ALIAS or SSH_CONNECT_COMMAND is required for SSH_AUTH_METHOD=ssh_config")
    return 1
  fi

  printf '%s\n' "$alias"
}

ssh_config_value() {
  local alias="$1"
  local key="$2"
  ssh -G "$alias" 2>/dev/null | awk -v key="$key" '$1 == key {print $2; exit}'
}

detect_ssh_auth_method() {
  if has_value "${SSH_AUTH_METHOD:-}"; then
    printf '%s\n' "$SSH_AUTH_METHOD"
  elif has_value "${SSH_CONNECT_COMMAND:-}" || has_value "${SSH_HOST_ALIAS:-}"; then
    printf '%s\n' "ssh_config"
  elif has_value "${ROOT_PASSWORD:-}"; then
    printf '%s\n' "password"
  elif has_value "${SSH_KEY_PATH:-}" || has_value "${SSH_USER:-}"; then
    printf '%s\n' "key"
  else
    printf '%s\n' ""
  fi
}

SSH_AUTH_METHOD="$(detect_ssh_auth_method)"
has_value "$SSH_AUTH_METHOD" || errors+=("SSH access is required: set SSH_CONNECT_COMMAND, SSH alias, key fields, or root password")

resolved_vps_ip="${VPS_IP:-}"
resolved_ssh_port="${SSH_PORT:-}"
resolved_ssh_user="${SSH_USER:-}"

telegram_token_set=0
telegram_user_set=0
has_value "${TELEGRAM_BOT_TOKEN:-}" && telegram_token_set=1
has_value "${TELEGRAM_USER_ID:-}" && telegram_user_set=1
if [[ "$telegram_token_set" -ne "$telegram_user_set" ]]; then
  errors+=("Telegram requires both TELEGRAM_BOT_TOKEN and TELEGRAM_USER_ID, or neither")
elif [[ "$telegram_token_set" -eq 0 ]]; then
  warnings+=("Telegram router is disabled; set TELEGRAM_BOT_TOKEN and TELEGRAM_USER_ID to enable it")
fi

case "${SSH_AUTH_METHOD:-}" in
  ssh_config)
    ssh_alias="$(resolve_ssh_alias || true)"
    if has_value "$ssh_alias"; then
      if ! command -v ssh >/dev/null 2>&1; then
        errors+=("ssh command is required for SSH_AUTH_METHOD=ssh_config")
      else
        ssh_host="$(ssh_config_value "$ssh_alias" hostname)"
        ssh_user="$(ssh_config_value "$ssh_alias" user)"
        ssh_port="$(ssh_config_value "$ssh_alias" port)"
        has_value "$ssh_host" || errors+=("cannot resolve HostName from ssh config for alias: $ssh_alias")
        has_value "$ssh_user" || errors+=("cannot resolve User from ssh config for alias: $ssh_alias")
        resolved_vps_ip="${resolved_vps_ip:-$ssh_host}"
        resolved_ssh_user="${resolved_ssh_user:-$ssh_user}"
        resolved_ssh_port="${ssh_port:-${resolved_ssh_port:-22}}"
      fi
    fi
    ;;
  key)
    need VPS_IP
    need SSH_PORT
    need SSH_USER
    need SSH_KEY_PATH
    resolved_vps_ip="$VPS_IP"
    resolved_ssh_port="$SSH_PORT"
    resolved_ssh_user="$SSH_USER"
    ;;
  password)
    need VPS_IP
    need SSH_PORT
    need ROOT_USER
    need ROOT_PASSWORD
    resolved_vps_ip="$VPS_IP"
    resolved_ssh_port="$SSH_PORT"
    resolved_ssh_user="$ROOT_USER"
    ;;
  *)
    errors+=("SSH_AUTH_METHOD must be ssh_config, key or password")
    ;;
esac

if [[ -z "${OPENAI_API_KEY:-}" && -z "${DEEPSEEK_API_KEY:-}" && -z "${QWEN_API_KEY:-}" && -z "${MINIMAX_API_KEY:-}" ]]; then
  errors+=("At least one model key is required: OPENAI_API_KEY, DEEPSEEK_API_KEY, QWEN_API_KEY or MINIMAX_API_KEY")
fi

resolved_provider="$(trim_value "${DEFAULT_PROVIDER:-}")"
resolved_model="$(trim_value "${DEFAULT_MODEL:-}")"

if [[ "$resolved_provider" == "openai" && "$resolved_model" == "gpt-5.4-mini" && -z "${OPENAI_API_KEY:-}" ]]; then
  resolved_provider=""
  resolved_model=""
fi

if [[ -z "$resolved_provider" || -z "$resolved_model" ]]; then
  if has_value "${MINIMAX_API_KEY:-}"; then
    resolved_provider="${resolved_provider:-minimax}"
    resolved_model="${resolved_model:-MiniMax-M2.7}"
  elif has_value "${DEEPSEEK_API_KEY:-}"; then
    resolved_provider="${resolved_provider:-deepseek}"
    resolved_model="${resolved_model:-deepseek-chat}"
  elif has_value "${OPENAI_API_KEY:-}"; then
    resolved_provider="${resolved_provider:-openai}"
    resolved_model="${resolved_model:-gpt-5.4-mini}"
  elif has_value "${QWEN_API_KEY:-}"; then
    resolved_provider="${resolved_provider:-qwen}"
    resolved_model="${resolved_model:-qwen-max}"
  fi
fi

if [[ -n "$resolved_provider" && -z "$resolved_model" ]]; then
  errors+=("DEFAULT_MODEL is required when DEFAULT_PROVIDER is set")
fi

if [[ -z "$resolved_provider" && -n "$resolved_model" ]]; then
  errors+=("DEFAULT_PROVIDER is required when DEFAULT_MODEL is set")
fi

case "$resolved_provider" in
  openai)
    has_value "${OPENAI_API_KEY:-}" || errors+=("DEFAULT_PROVIDER=openai requires OPENAI_API_KEY")
    ;;
  deepseek)
    has_value "${DEEPSEEK_API_KEY:-}" || errors+=("DEFAULT_PROVIDER=deepseek requires DEEPSEEK_API_KEY")
    ;;
  minimax)
    has_value "${MINIMAX_API_KEY:-}" || errors+=("DEFAULT_PROVIDER=minimax requires MINIMAX_API_KEY")
    ;;
  qwen)
    has_value "${QWEN_API_KEY:-}" || errors+=("DEFAULT_PROVIDER=qwen requires QWEN_API_KEY")
    ;;
esac

if [[ -z "${DOMAIN:-}" ]]; then
  warnings+=("DOMAIN is empty; installer will use https://${resolved_vps_ip:-VPS_IP}.nip.io")
fi

if [[ -z "${HERMES_PASSWORD:-}" ]]; then
  warnings+=("HERMES_PASSWORD is empty; installer must generate a 24-symbol password")
fi

if [[ "${WORKSPACE_PORT:-}" == "${HERMES_GATEWAY_PORT:-}" && -n "${WORKSPACE_PORT:-}" ]]; then
  errors+=("WORKSPACE_PORT and HERMES_GATEWAY_PORT must be different")
fi

if ((${#errors[@]} > 0)); then
  echo "Config check: FAILED"
  printf ' - %s\n' "${errors[@]}"
  if ((${#warnings[@]} > 0)); then
    echo
    echo "Warnings:"
    printf ' - %s\n' "${warnings[@]}"
  fi
  exit 1
fi

echo "Config check: OK"

if ((${#warnings[@]} > 0)); then
  echo
  echo "Warnings:"
  printf ' - %s\n' "${warnings[@]}"
fi

public_host="${DOMAIN:-${resolved_vps_ip}.nip.io}"

echo
echo "Resolved plan:"
echo " - VPS: ${resolved_vps_ip}:${resolved_ssh_port}"
echo " - SSH auth: ${SSH_AUTH_METHOD}"
if [[ "${SSH_AUTH_METHOD:-}" == "ssh_config" ]]; then
  echo " - SSH alias: ${ssh_alias:-not resolved}"
  echo " - SSH user: ${resolved_ssh_user:-not resolved}"
fi
echo " - Public URL: https://${public_host}"
echo " - Workspace port: ${WORKSPACE_PORT:-3030}"
echo " - Hermes gateway port: ${HERMES_GATEWAY_PORT:-8642}"
if [[ "$telegram_token_set" -eq 1 ]]; then
  echo " - Telegram: configured"
  echo " - Telegram user ID: ${TELEGRAM_USER_ID}"
else
  echo " - Telegram: disabled"
fi
echo " - License server: ${COMANDOS_LICENSE_SERVER_URL:-not set}"
echo " - Update manifest: ${COMANDOS_UPDATE_MANIFEST_URL:-default COMANDOS manifest}"
echo " - Default model: ${resolved_provider:-not resolved}/${resolved_model:-not resolved}"
