#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import shlex
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKFLOW_DIR = ROOT / "assets" / "workflows"

WF0 = "CyberSEO / ВФ 0: МАСТЕР"
WF1 = "CyberSEO / ВФ 1: МОЗГ"
WF2 = "CyberSEO / ВФ 2: ЗАЦЕП (HOOK)"
WF3 = "CyberSEO / ВФ 3: ТЕЛО"
WF4 = "CyberSEO / ВФ 4: ГЕНЕРАЦИЯ ИЗОБРАЖЕНИЯ"
NODES = "Узлы"

EXPECTED_NAMES = [WF0, WF1, WF2, WF3, WF4, NODES]

LINKS = {
    WF0: {
        "ВФ 1": WF1,
        "ВФ 2": WF2,
        "ВФ 3": WF3,
    },
    WF2: {
        "Генерация изображения": WF4,
    },
    WF3: {
        "Генерация изображения": WF4,
    },
}


def run(cmd: list[str], *, input_text: str | None = None, check: bool = True) -> subprocess.CompletedProcess[str]:
    p = subprocess.run(
        cmd,
        input=input_text,
        text=True,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
    )
    if check and p.returncode != 0:
        raise SystemExit(
            "Команда завершилась с ошибкой:\n"
            + " ".join(shlex.quote(x) for x in cmd)
            + "\n\nSTDOUT:\n"
            + p.stdout
            + "\nSTDERR:\n"
            + p.stderr
        )
    return p


def sanitize_key_name(host: str) -> str:
    keep = []
    for ch in host:
        if ch.isalnum() or ch in {"-", "_", "."}:
            keep.append(ch)
        elif ch in {"@", ":"}:
            keep.append("_")
    name = "".join(keep).strip("._-")
    return name or "server"


def ensure_ssh_key(host: str) -> None:
    check = run(
        ["ssh", "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", host, "true"],
        check=False,
    )
    if check.returncode == 0:
        print(f"SSH-ключ уже работает. Вход: ssh {host}")
        return

    key_dir = Path.home() / ".ssh"
    key_dir.mkdir(mode=0o700, exist_ok=True)
    key_path = key_dir / f"ssh_server_{sanitize_key_name(host)}"

    if not key_path.exists():
        print(f"Создаю локальный SSH-ключ: {key_path}")
        run(["ssh-keygen", "-t", "ed25519", "-f", str(key_path), "-N", "", "-C", f"ssh-server-{host}"])
    else:
        print(f"Локальный SSH-ключ уже есть: {key_path}")

    copy = run(["ssh-copy-id", "-i", str(key_path) + ".pub", host], check=False)
    if copy.returncode != 0:
        pub = (str(key_path) + ".pub")
        script = (
            "mkdir -p ~/.ssh && chmod 700 ~/.ssh && "
            "cat >> ~/.ssh/authorized_keys && "
            "chmod 600 ~/.ssh/authorized_keys"
        )
        pub_text = Path(pub).read_text(encoding="utf-8")
        manual = run(["ssh", host, script], input_text=pub_text, check=False)
        if manual.returncode != 0:
            raise SystemExit(
                "Не удалось поставить SSH-ключ на сервер.\n"
                "Проверь, что парольный вход доступен, или добавь ключ вручную:\n"
                f"{pub}\n\n"
                f"ssh-copy-id -i {shlex.quote(pub)} {shlex.quote(host)}"
            )

    final = run(
        ["ssh", "-i", str(key_path), "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", host, "true"],
        check=False,
    )
    if final.returncode != 0:
        raise SystemExit(f"Ключ создан, но вход по нему не проверился. Команда для проверки: ssh -i {key_path} {host}")

    print("Создал ключ соединения.")
    print(f"Теперь можно входить на сервер так: ssh -i {key_path} {host}")


def ssh(host: str, script: str, *, check: bool = True) -> str:
    return run(["ssh", host, "bash", "-s"], input_text=script, check=check).stdout


def ssh_cmd(host: str, cmd: str, *, check: bool = True) -> str:
    return run(["ssh", host, cmd], check=check).stdout


def scp_to(host: str, src: Path, dst: str) -> None:
    run(["scp", "-r", str(src), f"{host}:{dst}"])


def load_templates(workflow_dir: Path) -> dict[str, dict]:
    workflows: dict[str, dict] = {}
    for path in sorted(workflow_dir.glob("*.json")):
        data = json.loads(path.read_text(encoding="utf-8"))
        name = data.get("name")
        if name in EXPECTED_NAMES:
            workflows[name] = data
    missing = [name for name in EXPECTED_NAMES if name not in workflows]
    if missing:
        raise SystemExit("Не хватает workflow-файлов: " + ", ".join(missing))
    return workflows


def detect_remote(host: str) -> dict[str, str]:
    script = r'''
set -euo pipefail
n8n_container="$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($0) ~ /n8n/ && $2 ~ /n8nio\/n8n/ && $1 !~ /worker/ {print $1; exit}')"
if [ -z "${n8n_container:-}" ]; then
  n8n_container="$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($0) ~ /n8n/ && $2 ~ /n8nio\/n8n/ {print $1; exit}')"
fi
if [ -z "${n8n_container:-}" ]; then
  echo "ERROR: n8n container not found" >&2
  exit 2
fi
pg_container="$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($0) ~ /postgres|pgvector/ && $1 ~ /n8n/ {print $1; exit}')"
if [ -z "${pg_container:-}" ]; then
  pg_container="$(docker ps --format '{{.Names}} {{.Image}}' | awk 'tolower($0) ~ /postgres|pgvector/ {print $1; exit}')"
fi
if [ -z "${pg_container:-}" ]; then
  echo "ERROR: postgres container not found" >&2
  exit 3
fi
db_name="$(docker exec "$n8n_container" printenv DB_POSTGRESDB_DATABASE 2>/dev/null || true)"
db_user="$(docker exec "$n8n_container" printenv DB_POSTGRESDB_USER 2>/dev/null || true)"
n8n_version="$(docker exec -u node "$n8n_container" n8n --version 2>/dev/null || docker exec -u node "$n8n_container" n8n -v 2>/dev/null || true)"
db_name="${db_name:-n8n}"
db_user="${db_user:-n8n}"
printf '{"n8n_container":"%s","pg_container":"%s","db_name":"%s","db_user":"%s","n8n_version":"%s"}\n' "$n8n_container" "$pg_container" "$db_name" "$db_user" "$n8n_version"
'''
    out = ssh(host, script).strip()
    return json.loads(out)


def n8n_major(version: str | None) -> int:
    if not version:
        return 0
    head = version.strip().split()[0]
    try:
        return int(head.split(".", 1)[0])
    except ValueError:
        return 0


def psql(host: str, remote: dict[str, str], sql: str) -> str:
    cmd = (
        "docker exec -i "
        + shlex.quote(remote["pg_container"])
        + " psql -U "
        + shlex.quote(remote["db_user"])
        + " -d "
        + shlex.quote(remote["db_name"])
        + " -v ON_ERROR_STOP=1 -t -A"
    )
    return ssh(host, cmd, check=True) if False else run(["ssh", host, cmd], input_text=sql, check=True).stdout


def psql_json(host: str, remote: dict[str, str], sql: str):
    out = psql(host, remote, sql).strip()
    if not out:
        return None
    return json.loads(out)


def sql_literal(value) -> str:
    text = json.dumps(value, ensure_ascii=False)
    return "'" + text.replace("'", "''") + "'"


def read_existing(host: str, remote: dict[str, str]) -> list[dict]:
    sql = """
select coalesce(json_agg(row_to_json(t)), '[]'::json)
from (
  select distinct
    we.id,
    we.name,
    we.active,
    we.nodes::jsonb as nodes,
    we.connections::jsonb as connections,
    we.settings::jsonb as settings
  from workflow_entity we
  cross join lateral json_array_elements(we.nodes) node
  where node->>'name' = 'Установка ID таблицы'
  order by we.name
) t;
"""
    return psql_json(host, remote, sql) or []


def extract_set_values(workflows: list[dict]) -> dict[str, str]:
    ordered = sorted(
        workflows,
        key=lambda w: 0 if w.get("name") == WF0 else 1,
    )
    for workflow in ordered:
        for node in workflow.get("nodes") or []:
            if node.get("name") != "Установка ID таблицы":
                continue
            assignments = (((node.get("parameters") or {}).get("assignments") or {}).get("assignments") or [])
            result = {}
            for item in assignments:
                if item.get("name") in {"table", "domen"}:
                    result[item["name"]] = item.get("value", "")
            if result.get("table") and result.get("domen"):
                result["_source_workflow"] = workflow.get("name", "")
                result["_source_workflow_id"] = workflow.get("id", "")
                return result
    return {}


def live_credentials(host: str, remote: dict[str, str]) -> dict[tuple[str, str], str]:
    sql = """
select coalesce(json_agg(row_to_json(t)), '[]'::json)
from (
  select id, name, type
  from credentials_entity
  order by "updatedAt" desc nulls last
) t;
"""
    rows = psql_json(host, remote, sql) or []
    result: dict[tuple[str, str], str] = {}
    for row in rows:
        key = (row.get("type") or "", row.get("name") or "")
        if key[0] and key[1] and key not in result:
            result[key] = row.get("id")
    return result


def detect_project_id(host: str, remote: dict[str, str]) -> str | None:
    sql = """
select id
from project
order by
  case when type = 'personal' then 0 else 1 end,
  "createdAt" asc
limit 1;
"""
    out = psql(host, remote, sql).strip()
    return out or None


def set_assignment(workflow: dict, key: str, value: str) -> None:
    for node in workflow.get("nodes") or []:
        if node.get("name") != "Установка ID таблицы":
            continue
        assignments = node.setdefault("parameters", {}).setdefault("assignments", {}).setdefault("assignments", [])
        for item in assignments:
            if item.get("name") == key:
                item["value"] = value
                return
        assignments.append({"id": key, "name": key, "value": value, "type": "string"})
        return


def patch_links(workflows: dict[str, dict], id_by_name: dict[str, str]) -> None:
    for source_name, node_map in LINKS.items():
        wf = workflows[source_name]
        for node in wf.get("nodes") or []:
            target_name = node_map.get(node.get("name"))
            if not target_name:
                continue
            target_id = id_by_name[target_name]
            workflow_id = node.setdefault("parameters", {}).setdefault("workflowId", {})
            if isinstance(workflow_id, dict):
                workflow_id["value"] = target_id
                workflow_id["cachedResultUrl"] = f"/workflow/{target_id}"
                workflow_id["cachedResultName"] = target_name
                workflow_id["mode"] = "list"
                workflow_id["__rl"] = True
            else:
                node["parameters"]["workflowId"] = target_id


def patch_credentials(workflows: dict[str, dict], creds: dict[tuple[str, str], str]) -> list[str]:
    unresolved = []
    for wf in workflows.values():
        for node in wf.get("nodes") or []:
            for cred_type, cred_ref in (node.get("credentials") or {}).items():
                if not isinstance(cred_ref, dict):
                    continue
                name = cred_ref.get("name")
                if not name:
                    continue
                found_id = creds.get((cred_type, name))
                if found_id:
                    cred_ref["id"] = found_id
                elif not cred_ref.get("id"):
                    unresolved.append(f"{wf.get('name')} / {node.get('name')} / {cred_type} / {name}")
    return unresolved


def write_prepared(workflows: dict[str, dict], target_dir: Path) -> None:
    target_dir.mkdir(parents=True, exist_ok=True)
    for idx, name in enumerate(EXPECTED_NAMES):
        path = target_dir / f"{idx:02d}-{safe_name(name)}.json"
        path.write_text(json.dumps(workflows[name], ensure_ascii=False, indent=2), encoding="utf-8")


def safe_name(name: str) -> str:
    return (
        name.replace("/", "-")
        .replace(":", "")
        .replace(" ", "_")
        .replace("(", "")
        .replace(")", "")
    )


def import_remote(host: str, remote: dict[str, str], local_dir: Path, project_id: str | None, dry_run: bool) -> None:
    remote_dir = "/tmp/cyberseo-workflows-prepared"
    ssh_cmd(host, f"rm -rf {remote_dir} && mkdir -p {remote_dir}")
    scp_to(host, local_dir, "/tmp/")
    if dry_run:
        return
    project_arg = f"--projectId={shlex.quote(project_id)}" if project_id else ""
    script = f'''
set -euo pipefail
docker exec {shlex.quote(remote["n8n_container"])} mkdir -p /tmp/cyberseo-workflows-prepared
docker cp {remote_dir}/. {shlex.quote(remote["n8n_container"])}:/tmp/cyberseo-workflows-prepared/
docker exec -u node {shlex.quote(remote["n8n_container"])} n8n import:workflow --separate --input=/tmp/cyberseo-workflows-prepared {project_arg}
'''
    ssh(host, script)


def update_db_rows(host: str, remote: dict[str, str], workflows: dict[str, dict], dry_run: bool) -> None:
    if dry_run:
        return
    for name, wf in workflows.items():
        sql = f"""
update workflow_entity
set
  nodes = {sql_literal(wf.get("nodes") or [])}::json,
  connections = {sql_literal(wf.get("connections") or {})}::json,
  settings = {sql_literal(wf.get("settings") or {})}::json,
  active = {str(bool(wf.get("active"))).lower()}
where id = '{wf.get("id", "").replace("'", "''")}';
"""
        psql(host, remote, sql)


def set_activation(host: str, remote: dict[str, str], workflows: dict[str, dict], dry_run: bool) -> None:
    major = n8n_major(remote.get("n8n_version"))
    if major >= 2:
        activate_names = [WF0, WF1, WF2, WF3, WF4]
        mode = "n8n 2+: publish + active для ВФ 0-4"
    else:
        activate_names = [WF0]
        mode = "n8n ниже 2: active только для ВФ 0"

    print(f"Режим включения: {mode}")

    if dry_run:
        return

    values = [(wf["id"], name in activate_names) for name, wf in workflows.items()]
    statements = []
    for workflow_id, active in values:
        statements.append(f"update workflow_entity set active = {str(active).lower()} where id = '{workflow_id.replace(chr(39), chr(39)*2)}';")
    psql(host, remote, "\n".join(statements))

    if major >= 2:
        publish_lines = []
        for name in activate_names:
            workflow_id = workflows[name]["id"]
            publish_lines.append(
                f"docker exec -u node {shlex.quote(remote['n8n_container'])} n8n publish:workflow --id={shlex.quote(workflow_id)}"
            )
            publish_lines.append(
                f"docker exec -u node {shlex.quote(remote['n8n_container'])} n8n update:workflow --id={shlex.quote(workflow_id)} --active=true"
            )
        ssh(host, "set -euo pipefail\n" + "\n".join(publish_lines))
    else:
        master_id = workflows[WF0]["id"]
        ssh(
            host,
            "set -euo pipefail\n"
            + f"docker exec -u node {shlex.quote(remote['n8n_container'])} n8n update:workflow --id={shlex.quote(master_id)} --active=true\n",
        )


def backup_remote(host: str, remote: dict[str, str], dry_run: bool) -> str:
    backup_dir = "/root/cyberseo-workflow-backups/$(date +%Y%m%d-%H%M%S)"
    script = f'''
set -euo pipefail
backup_dir={backup_dir}
mkdir -p "$backup_dir"
docker exec {shlex.quote(remote["pg_container"])} pg_dump -U {shlex.quote(remote["db_user"])} -d {shlex.quote(remote["db_name"])} -t workflow_entity -t credentials_entity > "$backup_dir/n8n-workflows-credentials.sql"
docker exec {shlex.quote(remote["pg_container"])} psql -U {shlex.quote(remote["db_user"])} -d {shlex.quote(remote["db_name"])} -t -A -c "select coalesce(json_agg(row_to_json(t)), '[]'::json) from (select id,name,active,nodes,connections,settings from workflow_entity where name like 'CyberSEO / ВФ%' or name='Узлы') t;" > "$backup_dir/cyberseo-workflows.json"
echo "$backup_dir"
'''
    if dry_run:
        return "/root/cyberseo-workflow-backups/<dry-run>"
    return ssh(host, script).strip().splitlines()[-1]


def main() -> None:
    parser = argparse.ArgumentParser(description="Обновляет CyberSEO workflow в n8n на удаленном сервере.")
    parser.add_argument("--ssh-host", required=True, help="SSH host или алиас, например Main или root@1.2.3.4")
    parser.add_argument("--workflow-dir", default=str(DEFAULT_WORKFLOW_DIR), help="Папка с JSON workflow")
    parser.add_argument("--skip-ssh-key-setup", action="store_true", help="Не настраивать вход по SSH-ключу")
    parser.add_argument("--dry-run", action="store_true", help="Только проверка и подготовка, без импорта")
    args = parser.parse_args()

    workflow_dir = Path(args.workflow_dir).expanduser().resolve()
    if not workflow_dir.exists():
        raise SystemExit(f"Папка workflow не найдена: {workflow_dir}")

    if not args.skip_ssh_key_setup:
        ensure_ssh_key(args.ssh_host)

    print("Проверяю SSH и n8n...")
    remote = detect_remote(args.ssh_host)
    print(f"n8n: {remote['n8n_container']}")
    print(f"Версия n8n: {remote.get('n8n_version') or 'не определена'}")
    print(f"Postgres: {remote['pg_container']}")
    project_id = detect_project_id(args.ssh_host, remote)
    if project_id:
        print(f"projectId: {project_id}")
    else:
        print("projectId не найден, импорт пойдет без явной привязки к проекту.")

    templates = load_templates(workflow_dir)
    existing = read_existing(args.ssh_host, remote)

    settings = extract_set_values(existing)
    if not settings.get("table") or not settings.get("domen"):
        found_names = ", ".join(row.get("name", "") for row in existing) or "ничего"
        raise SystemExit(
            'Не нашел table/domen в старых workflow. Я уже искал не только точное имя "CyberSEO / ВФ 0: МАСТЕР", '
            'но и любой workflow с узлом "Установка ID таблицы". '
            f"Найденные кандидаты: {found_names}. "
            "Проверь, что старый ВФ 0 есть в этом n8n."
        )

    print(f"Найден table: {settings['table']}")
    print(f"Найден domen: {settings['domen']}")
    if settings.get("_source_workflow"):
        print(f"Источник настроек: {settings['_source_workflow']} ({settings.get('_source_workflow_id', '')})")

    backup_dir = backup_remote(args.ssh_host, remote, args.dry_run)
    print(f"Резервная копия: {backup_dir}")

    id_by_name = {name: wf["id"] for name, wf in templates.items()}
    set_assignment(templates[WF0], "table", settings["table"])
    set_assignment(templates[WF0], "domen", settings["domen"])
    patch_links(templates, id_by_name)

    creds = live_credentials(args.ssh_host, remote)
    unresolved = patch_credentials(templates, creds)

    with tempfile.TemporaryDirectory() as tmp:
        prepared = Path(tmp) / "cyberseo-workflows-prepared"
        write_prepared(templates, prepared)
        print("Импортирую новые workflow..." if not args.dry_run else "Проверочный режим: импорт пропущен.")
        import_remote(args.ssh_host, remote, prepared, project_id, args.dry_run)

    update_db_rows(args.ssh_host, remote, templates, args.dry_run)
    set_activation(args.ssh_host, remote, templates, args.dry_run)

    print("\nГотово." if not args.dry_run else "\nПроверка завершена.")
    print("Workflow в пакете:")
    for name in EXPECTED_NAMES:
        print(f"- {name}: {templates[name]['id']}")

    if unresolved:
        print("\nОстались подключения без найденного id:")
        for item in unresolved:
            print(f"- {item}")
        print("\nИх нужно создать или выбрать в n8n, потом повторить запуск.")
        sys.exit(4)

    print("\nПодключения по именам найдены и проставлены.")


if __name__ == "__main__":
    main()
