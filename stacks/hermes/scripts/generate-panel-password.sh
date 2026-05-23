#!/usr/bin/env bash
set -euo pipefail

if command -v openssl >/dev/null 2>&1; then
  openssl rand -base64 48 | tr -dc 'A-Za-z0-9' | head -c 24
  printf '\n'
  exit 0
fi

LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 24
printf '\n'

