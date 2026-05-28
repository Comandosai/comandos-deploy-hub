from __future__ import annotations

import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tg_parser.config import load_settings
from tg_parser.notify import notifications_enabled, send_html


def main() -> None:
    settings = load_settings()
    if not settings.telegram_bot_token:
        raise RuntimeError("Заполните TELEGRAM_BOT_TOKEN в .env")

    url = f"https://api.telegram.org/bot{settings.telegram_bot_token}/getUpdates"
    response = httpx.get(url, timeout=30)
    response.raise_for_status()
    data = response.json()

    print("Последние чаты, которые писали вашему боту:")
    found = False
    for item in data.get("result", []):
        message = item.get("message") or item.get("edited_message") or {}
        chat = message.get("chat") or {}
        chat_id = chat.get("id")
        if not chat_id:
            continue
        found = True
        title = chat.get("title") or " ".join(
            part for part in [chat.get("first_name"), chat.get("last_name")] if part
        )
        username = chat.get("username")
        username_text = f"@{username}" if username else "-"
        print(f"{chat_id}\t{username_text}\t{title or '-'}")

    if not found:
        print("Пока ничего нет. Напишите /start вашему боту и запустите скрипт ещё раз.")

    if notifications_enabled(settings):
        send_html(
            settings,
            "<b>Тест Telegram-парсера</b>\n\nУведомления настроены. Сюда будут приходить важные сообщения и отчёты.",
        )
        print("Тестовое сообщение отправлено.")
    else:
        print("\nЧтобы отправить тестовое сообщение, заполните TELEGRAM_NOTIFY_CHAT_IDS в .env.")


if __name__ == "__main__":
    main()
