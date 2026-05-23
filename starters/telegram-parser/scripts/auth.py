from __future__ import annotations

import asyncio
import sys
from pathlib import Path

from telethon.errors import SessionPasswordNeededError

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tg_parser.client import make_client
from tg_parser.config import load_settings


async def async_main() -> None:
    settings = load_settings()
    client = make_client(settings)
    await client.connect()
    try:
        if not await client.is_user_authorized():
            phone = input("Telegram phone number: ").strip()
            await client.send_code_request(phone)
            code = input("Telegram code: ").strip()
            try:
                await client.sign_in(phone, code)
            except SessionPasswordNeededError:
                password = input("Telegram 2FA password: ").strip()
                await client.sign_in(password=password)

        me = await client.get_me()
        username = getattr(me, "username", None) or "-"
        name = " ".join(
            part for part in [getattr(me, "first_name", None), getattr(me, "last_name", None)] if part
        )
        print("Сессия создана.")
        print(f"Аккаунт: {name or '-'} @{username} id={me.id}")
        print(f"Файл сессии лежит в: {settings.sessions_dir}")
    finally:
        await client.disconnect()


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
