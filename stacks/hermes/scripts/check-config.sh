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
need TELEGRAM_BOT_TOKEN
need TELEGRAM_USER_ID

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
echo " - Telegram: configured"
echo " - Telegram user ID: ${TELEGRAM_USER_ID}"
echo " - License server: ${COMANDOS_LICENSE_SERVER_URL:-not set}"
echo " - Update manifest: ${COMANDOS_UPDATE_MANIFEST_URL:-default COMANDOS manifest}"
