from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from telethon import utils


CSV_FIELDS = [
    "source",
    "chat_id",
    "chat_title",
    "chat_username",
    "message_id",
    "message_link",
    "message_date",
    "sender_id",
    "sender_username",
    "sender_name",
    "text",
    "media_type",
    "views",
    "forwards",
    "reply_to_message_id",
    "local_media_path",
]


def display_name(entity: Any) -> str:
    if not entity:
        return ""
    title = getattr(entity, "title", None)
    if title:
        return str(title)
    first = getattr(entity, "first_name", None) or ""
    last = getattr(entity, "last_name", None) or ""
    name = f"{first} {last}".strip()
    return name or getattr(entity, "username", None) or ""


def media_type(message: Any) -> str:
    media = getattr(message, "media", None)
    if media is None:
        return ""
    return type(media).__name__


def chat_marked_id(message: Any, chat: Any) -> int | None:
    chat_id = getattr(message, "chat_id", None)
    if chat_id is not None:
        return int(chat_id)
    try:
        return int(utils.get_peer_id(chat))
    except Exception:
        raw_id = getattr(chat, "id", None)
        return int(raw_id) if raw_id is not None else None


def message_link(chat: Any, chat_id: int | None, message_id: int) -> str:
    username = getattr(chat, "username", None)
    if username:
        return f"https://t.me/{username}/{message_id}"

    if isinstance(chat_id, int) and str(chat_id).startswith("-100"):
        internal_id = str(chat_id)[4:]
        return f"https://t.me/c/{internal_id}/{message_id}"

    return ""


def serialize_message(
    message: Any,
    source: str,
    chat: Any,
    sender: Any = None,
    local_media_path: str = "",
) -> dict[str, Any]:
    chat_id = chat_marked_id(message, chat)
    sender_id = getattr(message, "sender_id", None) or getattr(sender, "id", None)
    sender_username = getattr(sender, "username", None) or ""
    sender_display_name = display_name(sender)

    return {
        "source": source,
        "chat_id": chat_id,
        "chat_title": display_name(chat),
        "chat_username": getattr(chat, "username", None) or "",
        "message_id": message.id,
        "message_link": message_link(chat, chat_id, message.id),
        "message_date": message.date.isoformat() if message.date else "",
        "sender_id": sender_id,
        "sender_username": sender_username,
        "sender_name": sender_display_name,
        "text": getattr(message, "message", None) or getattr(message, "raw_text", "") or "",
        "media_type": media_type(message),
        "views": getattr(message, "views", None),
        "forwards": getattr(message, "forwards", None),
        "reply_to_message_id": getattr(message, "reply_to_msg_id", None),
        "local_media_path": local_media_path,
    }


def append_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(row, ensure_ascii=False) + "\n")
