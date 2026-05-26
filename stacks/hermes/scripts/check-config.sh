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

need VPS_IP
need SSH_PORT
need SSH_AUTH_METHOD

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
  key)
    need SSH_USER
    need SSH_KEY_PATH
    ;;
  password)
    need ROOT_USER
    need ROOT_PASSWORD
    ;;
  *)
    errors+=("SSH_AUTH_METHOD must be key or password")
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
  warnings+=("DOMAIN is empty; installer will use https://${VPS_IP:-VPS_IP}.nip.io")
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

public_host="${DOMAIN:-${VPS_IP}.nip.io}"

echo
echo "Resolved plan:"
echo " - VPS: ${VPS_IP}:${SSH_PORT}"
echo " - SSH auth: ${SSH_AUTH_METHOD}"
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
