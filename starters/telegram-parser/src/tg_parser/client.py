from __future__ import annotations

from telethon import TelegramClient

from .config import Settings


def make_client(settings: Settings) -> TelegramClient:
    settings.sessions_dir.mkdir(parents=True, exist_ok=True)
    session_stem = settings.sessions_dir / settings.session_name
    return TelegramClient(str(session_stem), settings.api_id, settings.api_hash)
