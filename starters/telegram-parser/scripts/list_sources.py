from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tg_parser.client import make_client
from tg_parser.config import load_settings


async def async_main() -> None:
    settings = load_settings()
    async with make_client(settings) as client:
        if not await client.is_user_authorized():
            raise RuntimeError("Сначала запустите: python scripts/auth.py")

        print("Доступные чаты, группы и каналы:\n")
        async for dialog in client.iter_dialogs():
            entity = dialog.entity
            chat_id = dialog.id
            title = getattr(entity, "title", None) or getattr(entity, "first_name", "") or ""
            username = getattr(entity, "username", None)
            entity_type = type(entity).__name__
            username_text = f"@{username}" if username else "-"
            print(f"{chat_id}\t{username_text}\t{entity_type}\t{title}")

    print("\nСкопируйте нужные @username или ID в sources.txt, по одному на строку.")


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
