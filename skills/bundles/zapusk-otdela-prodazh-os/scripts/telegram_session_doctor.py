#!/usr/bin/env python3
from __future__ import annotations

import argparse
import json
import os
import sqlite3
from pathlib import Path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Find reusable Telethon sessions without exposing their contents."
    )
    parser.add_argument("--project-dir", default=".", help="Current launch workspace.")
    parser.add_argument(
        "--search-root",
        action="append",
        default=[],
        help="Additional directory containing .session files. May be repeated.",
    )
    parser.add_argument("--fix-permissions", action="store_true")
    parser.add_argument("--json", action="store_true", dest="as_json")
    return parser.parse_args()


def candidate_paths(project_dir: Path, extra_roots: list[str]) -> list[Path]:
    patterns = [
        project_dir / ".comandos_os" / "*.session",
        project_dir / ".state" / "*.session",
        project_dir / "sessions" / "*.session",
        project_dir / "*.session",
    ]
    patterns.extend(Path(root).expanduser().resolve() / "*.session" for root in extra_roots)

    found: list[Path] = []
    seen: set[Path] = set()
    for pattern in patterns:
        for path in sorted(pattern.parent.glob(pattern.name)):
            resolved = path.resolve()
            if resolved.is_file() and resolved not in seen:
                seen.add(resolved)
                found.append(resolved)
    return found


def inspect_session(path: Path) -> dict[str, object]:
    result: dict[str, object] = {
        "path": str(path),
        "size_bytes": path.stat().st_size,
        "permissions": oct(path.stat().st_mode & 0o777),
        "has_auth_key": False,
        "readable": True,
    }
    try:
        uri = f"{path.as_uri()}?mode=ro"
        with sqlite3.connect(uri, uri=True) as connection:
            row = connection.execute(
                "SELECT length(auth_key) FROM sessions WHERE auth_key IS NOT NULL LIMIT 1"
            ).fetchone()
        result["has_auth_key"] = bool(row and row[0])
    except (sqlite3.Error, OSError):
        result["readable"] = False
    return result


def main() -> None:
    args = parse_args()
    project_dir = Path(args.project_dir).expanduser().resolve()
    candidates = candidate_paths(project_dir, args.search_root)
    inspected = [inspect_session(path) for path in candidates]

    if args.fix_permissions:
        for item in inspected:
            path = Path(str(item["path"]))
            os.chmod(path, 0o600)
            item["permissions"] = "0o600"

    selected = next((item for item in inspected if item["has_auth_key"]), None)
    payload = {
        "found": bool(selected),
        "selected_session": selected["path"] if selected else None,
        "candidates": inspected,
        "next_action": "run_smoke_test" if selected else "create_session",
    }

    if args.as_json:
        print(json.dumps(payload, ensure_ascii=False, indent=2))
        return

    if selected:
        print(f"Reusable session found: {selected['path']}")
        print("Next action: run the packaged Telegram smoke test.")
    else:
        print("Reusable Telethon session was not found.")
        print("Next action: run login_telethon_session.py.")


if __name__ == "__main__":
    main()
