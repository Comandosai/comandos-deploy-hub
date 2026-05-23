#!/usr/bin/env bash
set -euo pipefail

python3 -m venv .venv
. .venv/bin/activate
python -m pip install --upgrade pip
python -m pip install -r requirements.txt

if [ ! -f .env ]; then
  cp .env.example .env
fi

if [ ! -f sources.txt ]; then
  cp sources.example.txt sources.txt
fi

mkdir -p sessions data logs

echo "Готово. Telegram API уже задан в конфиге проекта."
echo "Дальше запустите:"
echo "source .venv/bin/activate"
echo "python scripts/auth.py"
