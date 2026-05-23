from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

from .defaults import DEFAULT_API_HASH, DEFAULT_API_ID, DEFAULT_SESSION_NAME

PROJECT_ROOT = Path(__file__).resolve().parents[2]


def _bool(name: str, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip().lower() in {"1", "true", "yes", "y", "on"}


def _int(name: str, default: int = 0) -> int:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return int(value)


def _path(name: str, default: str) -> Path:
    value = Path(os.getenv(name, default).strip() or default).expanduser()
    if value.is_absolute():
        return value
    return PROJECT_ROOT / value


@dataclass(frozen=True)
class Settings:
    api_id: int
    api_hash: str
    session_name: str
    sessions_dir: Path
    sources_file: Path
    output_dir: Path
    history_limit: int
    download_media: bool
    deepseek_api_key: str
    deepseek_model: str


def load_settings() -> Settings:
    load_dotenv(PROJECT_ROOT / ".env")
    api_id = _int("TELEGRAM_API_ID", DEFAULT_API_ID)
    api_hash = os.getenv("TELEGRAM_API_HASH", DEFAULT_API_HASH).strip() or DEFAULT_API_HASH
    if api_id <= 0 or not api_hash:
        raise RuntimeError("Заполните TELEGRAM_API_ID и TELEGRAM_API_HASH в .env")

    return Settings(
        api_id=api_id,
        api_hash=api_hash,
        session_name=os.getenv("TELEGRAM_SESSION_NAME", DEFAULT_SESSION_NAME).strip() or DEFAULT_SESSION_NAME,
        sessions_dir=_path("SESSIONS_DIR", "sessions"),
        sources_file=_path("SOURCES_FILE", "sources.txt"),
        output_dir=_path("OUTPUT_DIR", "data"),
        history_limit=_int("HISTORY_LIMIT", 500),
        download_media=_bool("DOWNLOAD_MEDIA", False),
        deepseek_api_key=os.getenv("DEEPSEEK_API_KEY", "").strip(),
        deepseek_model=os.getenv("DEEPSEEK_MODEL", "deepseek-chat").strip() or "deepseek-chat",
    )


def load_sources(path: Path) -> list[str]:
    if not path.exists():
        raise RuntimeError(f"Не найден файл источников: {path}")

    sources: list[str] = []
    for raw in path.read_text(encoding="utf-8").splitlines():
        line = raw.strip()
        if not line or line.startswith("#"):
            continue
        sources.append(normalize_source(line))
    if not sources:
        raise RuntimeError(f"В {path} нет источников")
    return sources


def normalize_source(value: str) -> str:
    item = value.strip()
    if item.startswith("https://t.me/"):
        item = item.removeprefix("https://t.me/").split("/", 1)[0]
    if item.startswith("http://t.me/"):
        item = item.removeprefix("http://t.me/").split("/", 1)[0]
    if item.startswith("t.me/"):
        item = item.removeprefix("t.me/").split("/", 1)[0]
    if item.startswith("@"):
        item = item[1:]
    return item.strip()


def parse_chat_identifier(value: str) -> int | str:
    item = normalize_source(value)
    if item.lstrip("-").isdigit():
        return int(item)
    return item
