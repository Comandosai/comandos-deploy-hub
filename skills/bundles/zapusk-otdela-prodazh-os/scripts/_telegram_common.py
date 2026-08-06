from __future__ import annotations

import getpass
import os
from pathlib import Path


def session_file(path: Path) -> Path:
    return path if path.suffix == ".session" else path.with_suffix(".session")


def session_stem(path: Path) -> str:
    target = session_file(path.expanduser().resolve())
    return str(target.with_suffix(""))


def secure_file(path: Path) -> None:
    if path.exists():
        os.chmod(path, 0o600)


def telegram_api_credentials() -> tuple[int, str]:
    raw_api_id = (os.getenv("TELEGRAM_API_ID") or os.getenv("API_ID") or "").strip()
    api_hash = (os.getenv("TELEGRAM_API_HASH") or os.getenv("API_HASH") or "").strip()

    if not raw_api_id:
        raw_api_id = input("Telegram API ID: ").strip()
    if not api_hash:
        api_hash = getpass.getpass("Telegram API hash: ").strip()

    try:
        api_id = int(raw_api_id)
    except ValueError as exc:
        raise SystemExit("Telegram API ID must be an integer.") from exc

    if not api_hash:
        raise SystemExit("Telegram API hash is empty.")
    return api_id, api_hash


def client_kwargs(lang_code: str, system_lang_code: str) -> dict[str, str]:
    return {
        "lang_code": lang_code,
        "system_lang_code": system_lang_code,
    }
