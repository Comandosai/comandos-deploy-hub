from __future__ import annotations

import argparse
import asyncio
import csv
import sys
from pathlib import Path

from telethon import utils

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tg_parser.client import make_client
from tg_parser.config import load_settings, load_sources, parse_chat_identifier
from tg_parser.serialize import CSV_FIELDS, append_jsonl, serialize_message


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Собрать историю сообщений из Telegram.")
    parser.add_argument("--limit", type=int, default=None, help="Сколько сообщений брать из каждого источника")
    parser.add_argument("--out-prefix", default="messages", help="Имя файлов результата без расширения")
    parser.add_argument("--append", action="store_true", help="Дописывать в существующие файлы, а не создавать заново")
    return parser.parse_args()


async def async_main() -> None:
    args = parse_args()
    settings = load_settings()
    sources = load_sources(settings.sources_file)
    limit = args.limit or settings.history_limit

    settings.output_dir.mkdir(parents=True, exist_ok=True)
    jsonl_path = settings.output_dir / f"{args.out_prefix}.jsonl"
    csv_path = settings.output_dir / f"{args.out_prefix}.csv"
    media_dir = settings.output_dir / "media"
    if not args.append:
        jsonl_path.unlink(missing_ok=True)

    written = 0
    csv_mode = "a" if args.append else "w"
    write_header = not args.append or not csv_path.exists()
    with csv_path.open(csv_mode, encoding="utf-8", newline="") as csv_file:
        writer = csv.DictWriter(csv_file, fieldnames=CSV_FIELDS)
        if write_header:
            writer.writeheader()

        async with make_client(settings) as client:
            if not await client.is_user_authorized():
                raise RuntimeError("Сначала запустите: python scripts/auth.py")

            for source in sources:
                identifier = parse_chat_identifier(source)
                chat = await client.get_entity(identifier)
                chat_id = utils.get_peer_id(chat)
                title = getattr(chat, "title", None) or getattr(chat, "username", None) or source
                print(f"Собираю: {title} ({chat_id})")

                async for message in client.iter_messages(chat, limit=limit):
                    local_media_path = ""
                    if settings.download_media and getattr(message, "media", None):
                        media_dir.mkdir(parents=True, exist_ok=True)
                        downloaded = await client.download_media(
                            message,
                            file=str(media_dir / f"{chat_id}_{message.id}_"),
                        )
                        local_media_path = downloaded or ""

                    sender = await message.get_sender()
                    row = serialize_message(
                        message,
                        source=source,
                        chat=chat,
                        sender=sender,
                        local_media_path=local_media_path,
                    )
                    append_jsonl(jsonl_path, row)
                    writer.writerow({field: row.get(field, "") for field in CSV_FIELDS})
                    written += 1

    print(f"Готово. Сообщений: {written}")
    print(f"JSONL: {jsonl_path}")
    print(f"CSV: {csv_path}")


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
