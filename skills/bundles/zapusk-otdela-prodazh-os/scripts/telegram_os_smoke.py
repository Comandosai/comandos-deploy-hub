#!/usr/bin/env python3
from __future__ import annotations

import argparse
import asyncio
import json
from datetime import datetime, timezone
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
        description="Run a deterministic Telegram dialogue smoke test for COMANDOS OS."
    )
    parser.add_argument(
        "--session-path",
        default=".comandos_os/telegram_userbot.session",
        help="Authorized Telethon .session file.",
    )
    parser.add_argument("--target-bot", required=True, help="Bot username, for example @sales_bot.")
    parser.add_argument(
        "--scenario-file",
        help="JSON file with a non-empty messages array built from the confirmed brief.",
    )
    parser.add_argument("--message", action="append", default=[], help="Message; may be repeated.")
    parser.add_argument("--wait-seconds", type=int, default=45)
    parser.add_argument("--log-path", default=".comandos_os/telegram_smoke.json")
    parser.add_argument("--lang-code", default="ru")
    parser.add_argument("--system-lang-code", default="ru-RU")
    return parser.parse_args()


def load_messages(args: argparse.Namespace) -> tuple[str, list[str]]:
    name = "command_line"
    messages = [message.strip() for message in args.message if message.strip()]
    if args.scenario_file:
        scenario_path = Path(args.scenario_file).expanduser().resolve()
        payload = json.loads(scenario_path.read_text(encoding="utf-8"))
        if not isinstance(payload, dict):
            raise SystemExit("Scenario must be a JSON object.")
        name = str(payload.get("name") or scenario_path.stem)
        raw_messages = payload.get("messages")
        if not isinstance(raw_messages, list):
            raise SystemExit("Scenario must contain a messages array.")
        messages.extend(str(message).strip() for message in raw_messages if str(message).strip())

    if not messages:
        raise SystemExit("Pass --scenario-file or at least one --message.")
    if any("[" in message or "]" in message for message in messages):
        raise SystemExit("Scenario still contains [placeholders]. Replace them with confirmed facts.")
    return name, messages


def iso_time(value: datetime | None = None) -> str:
    moment = value or datetime.now(timezone.utc)
    if moment.tzinfo is None:
        moment = moment.replace(tzinfo=timezone.utc)
    return moment.astimezone(timezone.utc).isoformat()


async def async_main() -> None:
    args = parse_args()
    scenario_name, messages = load_messages(args)
    session_path = session_file(Path(args.session_path).expanduser().resolve())
    log_path = Path(args.log_path).expanduser().resolve()
    started_at = iso_time()

    try:
        from telethon import TelegramClient, errors
    except ModuleNotFoundError as exc:
        raise SystemExit(
            "Telethon is not installed. Install scripts/requirements.txt in a local venv."
        ) from exc

    if not session_path.exists():
        raise SystemExit("Session file not found. Run telegram_session_doctor.py or login first.")

    api_id, api_hash = telegram_api_credentials()
    client = TelegramClient(
        session_stem(session_path),
        api_id,
        api_hash,
        **client_kwargs(args.lang_code, args.system_lang_code),
    )
    transcript: list[dict[str, object]] = []
    error: str | None = None
    connected = False
    try:
        await client.connect()
        connected = True
        if not await client.is_user_authorized():
            raise RuntimeError("Session is not authorized. Run login_telethon_session.py.")
        target = await client.get_entity(args.target_bot)
        if not getattr(target, "bot", False):
            raise RuntimeError("Target is not a Telegram bot.")

        async with client.conversation(target, timeout=args.wait_seconds) as conversation:
            for index, text in enumerate(messages, start=1):
                try:
                    outgoing = await conversation.send_message(text)
                    transcript.append(
                        {
                            "step": index,
                            "direction": "client",
                            "message_id": outgoing.id,
                            "timestamp": iso_time(outgoing.date),
                            "text": text,
                        }
                    )
                    incoming = await conversation.get_response()
                    transcript.append(
                        {
                            "step": index,
                            "direction": "assistant",
                            "message_id": incoming.id,
                            "timestamp": iso_time(incoming.date),
                            "text": incoming.raw_text or "",
                        }
                    )
                except asyncio.TimeoutError as exc:
                    raise RuntimeError(
                        f"No bot response at scenario step {index} within {args.wait_seconds} seconds."
                    ) from exc
                except errors.FloodWaitError as exc:
                    raise RuntimeError(
                        f"Telegram rate limit: retry after {exc.seconds} seconds."
                    ) from exc
    except Exception as exc:  # The private report must survive network and bot failures.
        error = f"{type(exc).__name__}: {exc}"
    finally:
        if connected:
            await client.disconnect()

    log_path.parent.mkdir(parents=True, exist_ok=True)
    report = {
        "version": 1,
        "status": "failed" if error else "passed",
        "scenario": scenario_name,
        "target_bot": args.target_bot,
        "started_at": started_at,
        "finished_at": iso_time(),
        "messages_planned": len(messages),
        "messages_sent": sum(1 for item in transcript if item["direction"] == "client"),
        "responses_received": sum(1 for item in transcript if item["direction"] == "assistant"),
        "error": error,
        "transcript": transcript,
    }
    log_path.write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    secure_file(log_path)
    if error:
        print(f"Private failure report: {log_path}")
        raise SystemExit(f"Telegram smoke test failed: {error}")

    print(f"Telegram smoke test completed: {len(messages)} messages, {len(messages)} responses.")
    print(f"Private report: {log_path}")


def main() -> None:
    asyncio.run(async_main())


if __name__ == "__main__":
    main()
