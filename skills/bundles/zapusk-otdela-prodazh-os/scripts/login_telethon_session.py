#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import getpass
from pathlib import Path

from _telegram_common import (
    client_kwargs,
    secure_file,
    session_file,
    session_stem,
    telegram_api_credentials,
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Create a Telethon session for COMANDOS Telegram smoke tests."
    )
    parser.add_argument(
        "--session-path",
        default=".comandos_os/telegram_userbot.session",
        help="Target .session file. It must stay outside Git.",
    )
    parser.add_argument("--phone", default="", help="Optional phone number; otherwise prompt.")
    parser.add_argument("--lang-code", default="ru")
    parser.add_argument("--system-lang-code", default="ru-RU")
    return parser.parse_args()


def masked_phone(phone: str) -> str:
    digits = "".join(character for character in phone if character.isdigit())
    if len(digits) < 6:
        return "set"
    return f"+{digits[:1]}...{digits[-4:]}"


async def async_main() -> None:
    args = parse_args()
    try:
        from telethon import TelegramClient, errors
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "Telethon is not installed. Install scripts/requirements.txt in a local venv."
        ) from exc

    target = session_file(Path(args.session_path).expanduser().resolve())
    target.parent.mkdir(parents=True, exist_ok=True)
    api_id, api_hash = telegram_api_credentials()

    print(f"Session file: {target}")
    print(f"Telegram client language: {args.lang_code} / {args.system_lang_code}")
    print("Enter phone, login code and 2FA only in this terminal. They are not saved.")

    client = TelegramClient(
        session_stem(target),
        api_id,
        api_hash,
        **client_kwargs(args.lang_code, args.system_lang_code),
    )
    await client.connect()
    try:
        if not await client.is_user_authorized():
            phone = args.phone.strip() or input("Phone number: ").strip()
            if not phone:
                raise SystemExit("Phone number is empty.")
            print(f"Sending Telegram login code to {masked_phone(phone)}")
            try:
                await client.send_code_request(phone)
            except errors.PhoneNumberInvalidError as exc:
                raise SystemExit("Telegram rejected the phone number.") from exc
            except errors.FloodWaitError as exc:
                raise SystemExit(f"Telegram rate limit: retry after {exc.seconds} seconds.") from exc

            code = getpass.getpass("Telegram login code: ").strip().replace(" ", "")
            if not code:
                raise SystemExit("Telegram login code is empty.")
            try:
                await client.sign_in(phone=phone, code=code)
            except errors.SessionPasswordNeededError:
                password = getpass.getpass("Telegram 2FA password: ")
                await client.sign_in(password=password)
            except errors.PhoneCodeInvalidError as exc:
                raise SystemExit("Telegram rejected the login code.") from exc
            except errors.PhoneCodeExpiredError as exc:
                raise SystemExit("Telegram login code expired.") from exc

        account = await client.get_me()
        secure_file(target)
        username = f"@{account.username}" if getattr(account, "username", None) else "not set"
        print(f"Session authorized. User id: {account.id}; username: {username}")
        print("Session permissions: 600")
    finally:
        await client.disconnect()


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
