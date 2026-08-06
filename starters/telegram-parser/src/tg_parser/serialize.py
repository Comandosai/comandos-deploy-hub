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
    "topic_id",
    "matched_keywords",
    "sender_id",
    "sender_username",
    "sender_name",
    "text",
    "media_type",
    "views",
    "forwards",
    "reply_to_message_id",
    "local_media_path",
    "markdown_path",
    "markdown_status",
    "markdown_parser",
    "markdown_error",
    "markdown_chars",
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


def message_topic_id(message: Any) -> int | None:
    reply_to = getattr(message, "reply_to", None)
    if not reply_to:
        return None
    top_id = getattr(reply_to, "reply_to_top_id", None)
    if top_id is not None:
        return int(top_id)
    reply_id = getattr(reply_to, "reply_to_msg_id", None)
    if reply_id is not None and getattr(reply_to, "forum_topic", False):
        return int(reply_id)
    return None


def text_matches_keywords(text: str, keywords: tuple[str, ...]) -> list[str]:
    if not keywords:
        return []
    lowered = text.lower()
    return [keyword for keyword in keywords if keyword in lowered]


def message_matches(message: Any, topic_id: int | None, keywords: tuple[str, ...]) -> bool:
    if topic_id is not None and message.id != topic_id and message_topic_id(message) != topic_id:
        return False
    if keywords and not text_matches_keywords(getattr(message, "message", "") or getattr(message, "raw_text", "") or "", keywords):
        return False
    return True


def serialize_message(
    message: Any,
    source: str,
    chat: Any,
    sender: Any = None,
    local_media_path: str = "",
    markdown_result: dict[str, Any] | None = None,
) -> dict[str, Any]:
    chat_id = chat_marked_id(message, chat)
    sender_id = getattr(message, "sender_id", None) or getattr(sender, "id", None)
    sender_username = getattr(sender, "username", None) or ""
    sender_display_name = display_name(sender)
    text = getattr(message, "message", None) or getattr(message, "raw_text", "") or ""
    source_keywords = getattr(source, "keywords", ()) if not isinstance(source, str) else ()
    source_label = source.label if not isinstance(source, str) and hasattr(source, "label") else str(source)
    markdown_result = markdown_result or {}

    return {
        "source": source_label,
        "chat_id": chat_id,
        "chat_title": display_name(chat),
        "chat_username": getattr(chat, "username", None) or "",
        "message_id": message.id,
        "message_link": message_link(chat, chat_id, message.id),
        "message_date": message.date.isoformat() if message.date else "",
        "topic_id": message_topic_id(message),
        "matched_keywords": ", ".join(text_matches_keywords(text, source_keywords)),
        "sender_id": sender_id,
        "sender_username": sender_username,
        "sender_name": sender_display_name,
        "text": text,
        "media_type": media_type(message),
        "views": getattr(message, "views", None),
        "forwards": getattr(message, "forwards", None),
        "reply_to_message_id": getattr(message, "reply_to_msg_id", None),
        "local_media_path": local_media_path,
        "markdown_path": markdown_result.get("markdown_path", ""),
        "markdown_status": markdown_result.get("status", ""),
        "markdown_parser": markdown_result.get("parser_used", ""),
        "markdown_error": markdown_result.get("error", ""),
        "markdown_chars": markdown_result.get("chars", ""),
    }


def append_jsonl(path: Path, row: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(row, ensure_ascii=False) + "\n")
