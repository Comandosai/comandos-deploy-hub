#!/usr/bin/env bash
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/Comandosai/comandos-deploy-hub.git}"
BRANCH="${BRANCH:-main}"
DEFAULT_TARGET="${HOME}/.codex/skills"

usage() {
  cat <<'USAGE'
Использование:
  skills.sh list [--client codex|claude|gemini|antigravity|terminal]
  skills.sh install <skill_id> [target_dir] [--client codex|claude|gemini|antigravity|terminal]

Примеры:
  skills.sh list
  skills.sh list --client codex
  skills.sh install polnyy-zapusk-otdela-prodazh ~/.codex/skills --client codex
  skills.sh install telegram-testirovanie-bota --client claude
USAGE
}

if [[ $# -lt 1 ]]; then
  usage
  exit 1
fi

CMD="$1"
shift

SKILL_ID=""
TARGET_DIR="$DEFAULT_TARGET"
CLIENT=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --client)
      if [[ $# -lt 2 ]]; then
        echo "Ошибка: укажи значение после --client"
        exit 1
      fi
      CLIENT="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      if [[ -z "$SKILL_ID" && "$CMD" == "install" ]]; then
        SKILL_ID="$1"
      elif [[ "$CMD" == "install" && "$TARGET_DIR" == "$DEFAULT_TARGET" ]]; then
        TARGET_DIR="$1"
      else
        echo "Ошибка: лишний аргумент '$1'"
        usage
        exit 1
      fi
      shift
      ;;
  esac
done

TMP_DIR="$(mktemp -d)"
cleanup() {
  rm -rf "$TMP_DIR"
}
trap cleanup EXIT

if [[ -d "$REPO_URL" ]]; then
  REPO_DIR="$REPO_URL"
else
  echo "Скачиваю репозиторий..."
  git clone --depth 1 --branch "$BRANCH" "$REPO_URL" "$TMP_DIR/repo" >/dev/null
  REPO_DIR="$TMP_DIR/repo"
fi

REGISTRY="$REPO_DIR/registry/skills-index.json"
if [[ ! -f "$REGISTRY" ]]; then
  echo "Ошибка: не найден реестр $REGISTRY"
  exit 1
fi

if [[ "$CMD" == "list" ]]; then
  python3 - "$REGISTRY" "$CLIENT" <<'PY'
import json
import sys

registry_path, client = sys.argv[1], sys.argv[2].strip().lower()
with open(registry_path, encoding="utf-8") as f:
    data = json.load(f)

items = data.get("items", [])
print("Доступные навыки и наборы:\n")
for item in items:
    clients = item.get("clients", [])
    item_type = item.get("type", "unknown")
    clients_str = ", ".join(clients)
    print(f"- {item['id']} ({item_type}) — {item.get('title', '')}")
    if clients_str:
        print(f"  Клиенты: {clients_str}")
PY
  exit 0
fi

if [[ "$CMD" != "install" ]]; then
  usage
  exit 1
fi

if [[ -z "$SKILL_ID" ]]; then
  echo "Ошибка: укажи skill_id"
  usage
  exit 1
fi

mkdir -p "$TARGET_DIR"

python3 - "$REGISTRY" "$REPO_DIR" "$SKILL_ID" "$TARGET_DIR" "$CLIENT" <<'PY'
import json
import os
import shutil
import sys

registry_path, repo_root, root_id, target_dir, client = sys.argv[1:6]
client = client.strip().lower()

with open(registry_path, encoding="utf-8") as f:
    data = json.load(f)

items = {item["id"]: item for item in data.get("items", [])}

if root_id not in items:
    available = ", ".join(sorted(items.keys()))
    raise SystemExit(f"Не найден skill_id '{root_id}'.\nДоступно: {available}")

order = []
visiting = set()
visited = set()

def dfs(skill_id):
    if skill_id in visited:
        return
    if skill_id in visiting:
        raise SystemExit(f"Обнаружен цикл зависимостей: {skill_id}")
    visiting.add(skill_id)
    for dep in items[skill_id].get("depends_on", []):
        if dep not in items:
            raise SystemExit(f"В реестре у '{skill_id}' указана неизвестная зависимость: {dep}")
        dfs(dep)
    visiting.remove(skill_id)
    visited.add(skill_id)
    order.append(skill_id)

dfs(root_id)

print("Будут установлены:")
installed_paths = []
for skill_id in order:
    item = items[skill_id]
    rel_path = item["path"]
    src = os.path.join(repo_root, rel_path)
    if not os.path.exists(src):
        raise SystemExit(f"Путь не найден в репозитории: {rel_path}")

    folder_name = os.path.basename(rel_path.rstrip("/"))
    dst = os.path.join(target_dir, folder_name)

    if os.path.exists(dst):
        if os.path.isdir(dst):
            shutil.rmtree(dst)
        else:
            os.remove(dst)

    shutil.copytree(src, dst)
    installed_paths.append((skill_id, dst))
    print(f"- {skill_id} -> {dst}")

print("\nГотово.")
print(f"Папка установки: {target_dir}")

if client:
    print(f"\nРежим клиента: {client}")

client_file_map = {
    "codex": "AGENTS.md",
    "claude": "CLAUDE.md",
    "gemini": "GEMINI.md",
    "antigravity": os.path.join("installers", "antigravity.md"),
    "terminal": os.path.join("installers", "codex.md"),
}

if client and client in client_file_map:
    rel_hint = client_file_map[client]
    hints = []
    for skill_id, dst in installed_paths:
        hint_path = os.path.join(dst, rel_hint)
        if os.path.exists(hint_path):
            hints.append((skill_id, hint_path))

    if hints:
        print("\nЧто открыть дальше:")
        for skill_id, hint_path in hints:
            print(f"- {skill_id}: {hint_path}")
    else:
        print("\nПодсказка: в установленных навыках нет отдельного файла инструкций для этого клиента.")
PY
