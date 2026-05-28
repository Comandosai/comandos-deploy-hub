from __future__ import annotations

import asyncio
import csv
import sys
from pathlib import Path

from telethon import events, utils

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tg_parser.client import make_client
from tg_parser.config import load_settings, load_sources, parse_chat_identifier
from tg_parser.notify import live_message_html, notifications_enabled, send_html_async
from tg_parser.serialize import CSV_FIELDS, append_jsonl, message_matches, serialize_message


async def async_main() -> None:
    settings = load_settings()
    sources = load_sources(settings.sources_file)
    settings.output_dir.mkdir(parents=True, exist_ok=True)

    jsonl_path = settings.output_dir / "live_messages.jsonl"
    csv_path = settings.output_dir / "live_messages.csv"
    csv_exists = csv_path.exists()
    media_dir = settings.output_dir / "media"

    client = make_client(settings)

    async with client:
        if not await client.is_user_authorized():
            raise RuntimeError("Сначала запустите: python scripts/auth.py")

        chats = []
        specs_by_chat_id = {}
        for source in sources:
            chat = await client.get_entity(parse_chat_identifier(source.chat))
            chats.append(chat)
            chat_id = utils.get_peer_id(chat)
            specs_by_chat_id.setdefault(chat_id, []).append(source)
            title = getattr(chat, "title", None) or getattr(chat, "username", None) or source.chat
            print(f"Слушаю: {title} ({chat_id})")
            if source.topic_id is not None:
                print(f"  Ветка/топик: {source.topic_id}")
            if source.keywords:
                print(f"  Ключевые слова: {', '.join(source.keywords)}")

        csv_file = csv_path.open("a", encoding="utf-8", newline="")
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
        if not csv_exists:
            writer.writeheader()

        @client.on(events.NewMessage(chats=chats))
        async def on_message(event) -> None:
            message = event.message
            chat = await event.get_chat()
            sender = await event.get_sender()
            chat_id = utils.get_peer_id(chat)
            matched_source = None
            for source in specs_by_chat_id.get(chat_id, []):
                if message_matches(message, source.topic_id, source.keywords):
                    matched_source = source
                    break
            if matched_source is None:
                return

            local_media_path = ""
            if settings.download_media and getattr(message, "media", None):
                media_dir.mkdir(parents=True, exist_ok=True)
                downloaded = await client.download_media(
                    message,
                    file=str(media_dir / f"{chat_id}_{message.id}_"),
                )
                local_media_path = downloaded or ""

            row = serialize_message(
                message,
                source=matched_source,
                chat=chat,
                sender=sender,
                local_media_path=local_media_path,
            )
            append_jsonl(jsonl_path, row)
            writer.writerow({field: row.get(field, "") for field in CSV_FIELDS})
            csv_file.flush()
            text = (row.get("text") or "").replace("\n", " ")[:80]
            print(f"Новое: {row['chat_title']} #{row['message_id']} {text}")
            if notifications_enabled(settings):
                await send_html_async(settings, live_message_html(row))

        print("Live-сбор запущен. Остановить: Ctrl+C")
        try:
            await client.run_until_disconnected()
        finally:
            csv_file.close()


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
