#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REGISTRY="$ROOT_DIR/registry/skills-index.json"

python3 - "$ROOT_DIR" "$REGISTRY" <<'PY'
import json
import os
import sys

root_dir, registry_path = sys.argv[1:3]

with open(registry_path, encoding="utf-8") as f:
    data = json.load(f)

allowed_clients = set(data.get("allowed_clients", []))
if not allowed_clients:
    raise SystemExit("В реестре пустой allowed_clients")

items = data.get("items", [])
by_id = {}
errors = []

for item in items:
    sid = item.get("id")
    if not sid:
        errors.append("Есть элемент без id")
        continue
    if sid in by_id:
        errors.append(f"Дублируется id: {sid}")
    by_id[sid] = item

for sid, item in by_id.items():
    rel_path = item.get("path", "")
    full_path = os.path.join(root_dir, rel_path)
    if not os.path.exists(full_path):
        errors.append(f"{sid}: не найден путь {rel_path}")

    clients = item.get("clients", [])
    if not clients:
        errors.append(f"{sid}: пустой список clients")
    else:
        unknown = sorted(set(clients) - allowed_clients)
        if unknown:
            errors.append(f"{sid}: неизвестные clients: {', '.join(unknown)}")

    for dep in item.get("depends_on", []):
        if dep not in by_id:
            errors.append(f"{sid}: неизвестная зависимость {dep}")

# Проверяем новую структуру:
# skills/units/* и skills/bundles/* должны быть синхронизированы с реестром.
skills_root = os.path.join(root_dir, "skills")
units_root = os.path.join(skills_root, "units")
bundles_root = os.path.join(skills_root, "bundles")

if not os.path.isdir(units_root):
    errors.append("Отсутствует каталог skills/units")
if not os.path.isdir(bundles_root):
    errors.append("Отсутствует каталог skills/bundles")

def list_real_dirs(path):
    if not os.path.isdir(path):
        return []
    return sorted(
        d for d in os.listdir(path)
        if os.path.isdir(os.path.join(path, d))
    )

unit_dirs = list_real_dirs(units_root)
bundle_dirs = list_real_dirs(bundles_root)
all_dirs = unit_dirs + bundle_dirs

registry_skill_dirs = set()
for sid, item in by_id.items():
    rel_path = item.get("path", "")
    if rel_path.startswith("skills/units/") or rel_path.startswith("skills/bundles/"):
        parts = rel_path.split("/")
        if len(parts) >= 3 and parts[2]:
            registry_skill_dirs.add(parts[2])
    else:
        errors.append(
            f"{sid}: путь должен быть в skills/units/* или skills/bundles/*, сейчас: {rel_path}"
        )

for dirname in all_dirs:
    if dirname not in registry_skill_dirs:
        errors.append(
            f"skills/*/{dirname}: каталог есть, но его нет в registry/skills-index.json"
        )

# И обратная проверка: каталог навыка должен иметь SKILL.md,
# кроме технических библиотек (например prompt-architecture).
skip_skill_md = {"prompt-architecture"}
for dirname in all_dirs:
    if dirname in skip_skill_md:
        continue
    if dirname in unit_dirs:
        skill_md = os.path.join(units_root, dirname, "SKILL.md")
    else:
        skill_md = os.path.join(bundles_root, dirname, "SKILL.md")
    if not os.path.isfile(skill_md):
        errors.append(f"{dirname}: отсутствует SKILL.md")

visiting = set()
visited = set()

def dfs(sid):
    if sid in visited:
        return
    if sid in visiting:
        errors.append(f"Цикл зависимостей, зацикливание на {sid}")
        return
    visiting.add(sid)
    for dep in by_id[sid].get("depends_on", []):
        if dep in by_id:
            dfs(dep)
    visiting.remove(sid)
    visited.add(sid)

for sid in by_id:
    dfs(sid)

if errors:
    print("Найдены проблемы:")
    for e in errors:
        print(f"- {e}")
    raise SystemExit(1)

print("Проверка пройдена: реестр и зависимости в порядке.")
PY
