from __future__ import annotations

from html import escape
from typing import Iterable

import httpx

from .config import Settings

MAX_MESSAGE_LENGTH = 3900


def notifications_enabled(settings: Settings) -> bool:
    return bool(settings.telegram_bot_token and settings.telegram_notify_chat_ids)


def compact(value: object, limit: int = 1200) -> str:
    text = " ".join(str(value or "").split())
    if len(text) <= limit:
        return text
    return text[: limit - 3] + "..."


def split_plain_text(text: str, limit: int = MAX_MESSAGE_LENGTH) -> Iterable[str]:
    value = str(text or "").strip()
    if not value:
        return []
    return (value[index : index + limit] for index in range(0, len(value), limit))


def live_message_html(row: dict) -> str:
    title = escape(str(row.get("chat_title") or "Telegram"))
    author = escape(str(row.get("sender_username") or row.get("sender_name") or row.get("sender_id") or "-"))
    text = escape(compact(row.get("text"), 1400))
    link = str(row.get("message_link") or "").strip()
    topic_id = row.get("topic_id")
    matched_keywords = str(row.get("matched_keywords") or "").strip()

    lines = [
        "<b>Новое важное сообщение</b>",
        f"<b>Источник:</b> {title}",
        f"<b>Автор:</b> {author}",
    ]
    if topic_id:
        lines.append(f"<b>Ветка:</b> {escape(str(topic_id))}")
    if matched_keywords:
        lines.append(f"<b>Ключевые слова:</b> {escape(matched_keywords)}")
    if text:
        lines.append("")
        lines.append(text)
    if link:
        lines.append("")
        lines.append(f'<a href="{escape(link, quote=True)}">Открыть сообщение</a>')
    return "\n".join(lines)


def report_message_html(report: str, part: int, total: int) -> str:
    suffix = f" {part}/{total}" if total > 1 else ""
    return f"<b>Отчёт Telegram-парсера{suffix}</b>\n\n<pre>{escape(report)}</pre>"


async def send_html_async(settings: Settings, html_text: str) -> None:
    if not notifications_enabled(settings):
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    async with httpx.AsyncClient(timeout=30) as client:
        for chat_id in settings.telegram_notify_chat_ids:
            response = await client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": html_text,
                    "parse_mode": settings.telegram_bot_parse_mode,
                    "disable_web_page_preview": True,
                },
            )
            response.raise_for_status()


def send_html(settings: Settings, html_text: str) -> None:
    if not notifications_enabled(settings):
        return

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/sendMessage"
    with httpx.Client(timeout=30) as client:
        for chat_id in settings.telegram_notify_chat_ids:
            response = client.post(
                url,
                json={
                    "chat_id": chat_id,
                    "text": html_text,
                    "parse_mode": settings.telegram_bot_parse_mode,
                    "disable_web_page_preview": True,
                },
            )
            response.raise_for_status()


def send_report(settings: Settings, report: str) -> None:
    if not notifications_enabled(settings):
        return

    chunks = list(split_plain_text(report, 3300))
    total = len(chunks)
    for index, chunk in enumerate(chunks, start=1):
        send_html(settings, report_message_html(chunk, index, total))
