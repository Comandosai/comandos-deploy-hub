#!/usr/bin/env python3
import argparse
import asyncio
import contextlib
import json
import os
import shlex
import sys
from collections import deque
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Deque, Optional

from telethon import TelegramClient, events
from telethon.errors import SessionPasswordNeededError
from telethon.tl.custom.message import Message


DEFAULT_API_ID = 11987141
DEFAULT_API_HASH = "792e34400c6ec95e1220a6689d447d78"

BASE_DIR = Path(__file__).resolve().parent
SKILL_DIR = BASE_DIR.parent
STATE_DIR = SKILL_DIR / ".state"
DEFAULT_ENV_PATH = STATE_DIR / ".env"
DEFAULT_LOG_PATH = STATE_DIR / "dialog_events.jsonl"
DEFAULT_SESSION_STEM = STATE_DIR / "telegram_userbot"


def load_env_file(path: Path) -> None:
    if not path.exists():
        return

    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip("'").strip('"'))


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def truncate_text(value: str, limit: int = 240) -> str:
    compact = " ".join(value.split())
    if len(compact) <= limit:
        return compact
    return f"{compact[: limit - 3]}..."


async def ainput(prompt: str = "") -> str:
    loop = asyncio.get_running_loop()
    return await loop.run_in_executor(None, lambda: input(prompt))


def ensure_state_dir() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def pick_phone_number(explicit: Optional[str]) -> str:
    if explicit:
        return explicit.strip()
    env_phone = os.getenv("PHONE_NUMBER", "").strip()
    if env_phone:
        return env_phone
    return ""


@dataclass
class HarnessConfig:
    api_id: int
    api_hash: str
    phone_number: str
    target_chat: Optional[str]
    session_stem: Path
    log_path: Path


class TelegramHarness:
    def __init__(self, client: TelegramClient, config: HarnessConfig) -> None:
        self.client = client
        self.config = config
        self.target_entity = None
        self.target_label = config.target_chat
        self.recent_messages: Deque[dict] = deque(maxlen=50)
        self.command_task: Optional[asyncio.Task] = None
        self.stop_event = asyncio.Event()

    async def start(self) -> None:
        await self._ensure_authorized()
        if self.config.target_chat:
            await self.set_target(self.config.target_chat)
        self.client.add_event_handler(self.on_new_message, events.NewMessage(incoming=True))
        self.command_task = asyncio.create_task(self.command_loop())
        self.print_banner()
        await self.stop_event.wait()

    async def shutdown(self) -> None:
        if self.command_task:
            self.command_task.cancel()
            with contextlib.suppress(asyncio.CancelledError):
                await self.command_task
        await self.client.disconnect()

    async def _ensure_authorized(self) -> None:
        await self.client.connect()
        if await self.client.is_user_authorized():
            return

        phone_number = self.config.phone_number
        while not phone_number:
            phone_number = (await ainput("Telegram phone number: ")).strip()
        self.config.phone_number = phone_number

        await self.client.send_code_request(self.config.phone_number)
        code = await ainput("Telegram code: ")
        try:
            await self.client.sign_in(self.config.phone_number, code.strip())
        except SessionPasswordNeededError:
            password = await ainput("Telegram 2FA password: ")
            await self.client.sign_in(password=password.strip())

    async def set_target(self, target: str) -> None:
        entity = await self.client.get_entity(target)
        self.target_entity = entity
        username = getattr(entity, "username", None)
        self.target_label = username or getattr(entity, "title", None) or str(getattr(entity, "id", target))
        print(f"[system] target set to {self.target_label}")

    async def send_text(self, text: str) -> None:
        if not self.target_entity:
            raise RuntimeError("Target chat is not set. Use /target <username|id|invite> first.")
        message = await self.client.send_message(self.target_entity, text)
        payload = self._message_payload(message, direction="outgoing")
        self.recent_messages.append(payload)
        self._append_log(payload)
        print(f"[sent {payload['timestamp']}] {truncate_text(text)}")

    async def on_new_message(self, event: events.NewMessage.Event) -> None:
        message = event.message
        if self.target_entity and event.chat_id != getattr(self.target_entity, "id", None):
            return
        payload = self._message_payload(message, direction="incoming")
        self.recent_messages.append(payload)
        self._append_log(payload)
        sender = payload["sender"] or str(payload["chat_id"])
        print(f"\n[incoming {payload['timestamp']}] {sender}: {payload['text']}\n> ", end="", flush=True)

    def _message_payload(self, message: Message, direction: str) -> dict:
        sender = None
        if getattr(message, "sender", None):
            sender = getattr(message.sender, "username", None)
            if not sender:
                first_name = getattr(message.sender, "first_name", None) or ""
                last_name = getattr(message.sender, "last_name", None) or ""
                sender = " ".join(part for part in [first_name, last_name] if part).strip() or None
        return {
            "timestamp": utc_now_iso(),
            "direction": direction,
            "chat_id": message.chat_id,
            "message_id": message.id,
            "sender": sender,
            "text": message.message or "",
        }

    def _append_log(self, payload: dict) -> None:
        self.config.log_path.parent.mkdir(parents=True, exist_ok=True)
        with self.config.log_path.open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(payload, ensure_ascii=False) + "\n")

    def print_banner(self) -> None:
        print("[system] telegram harness is ready")
        print(f"[system] session: {self.config.session_stem}")
        print(f"[system] log: {self.config.log_path}")
        if self.target_label:
            print(f"[system] active target: {self.target_label}")
        print("[system] commands: /target <chat>, /send <text>, /history [n], /status, /exit")
        print("> ", end="", flush=True)

    async def command_loop(self) -> None:
        while not self.stop_event.is_set():
            try:
                raw = await ainput("> ")
            except EOFError:
                self.stop_event.set()
                return
            command = raw.strip()
            if not command:
                continue
            try:
                await self.handle_command(command)
            except Exception as exc:
                print(f"[error] {exc}")

    async def handle_command(self, command: str) -> None:
        if command.startswith("/target "):
            await self.set_target(command.split(" ", 1)[1].strip())
            return
        if command.startswith("/send "):
            await self.send_text(command.split(" ", 1)[1])
            return
        if command.startswith("/reply "):
            await self.send_text(command.split(" ", 1)[1])
            return
        if command.startswith("/history"):
            parts = shlex.split(command)
            limit = int(parts[1]) if len(parts) > 1 else 10
            self.print_history(limit)
            return
        if command == "/status":
            self.print_status()
            return
        if command == "/exit":
            self.stop_event.set()
            return

        await self.send_text(command)

    def print_history(self, limit: int) -> None:
        for item in list(self.recent_messages)[-limit:]:
            direction = "<<" if item["direction"] == "incoming" else ">>"
            sender = item["sender"] or item["chat_id"]
            print(f"[{direction} {item['timestamp']}] {sender}: {item['text']}")

    def print_status(self) -> None:
        print(f"[system] target: {self.target_label or 'not set'}")
        print(f"[system] recent messages buffered: {len(self.recent_messages)}")
        print(f"[system] log path: {self.config.log_path}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Interactive Telegram harness for live testing.")
    parser.add_argument("--env-file", default=str(DEFAULT_ENV_PATH), help="Optional path to .env file.")
    parser.add_argument("--target-chat", default=None, help="Telegram username/id/invite link to bind on startup.")
    parser.add_argument("--session-stem", default=None, help="Path stem for Telethon session storage.")
    parser.add_argument("--log-path", default=None, help="Path to JSONL log file.")
    parser.add_argument("--phone-number", default=None, help="Phone number for first-time login.")
    return parser.parse_args()


def build_config(args: argparse.Namespace) -> HarnessConfig:
    ensure_state_dir()
    env_path = Path(args.env_file).expanduser().resolve()
    load_env_file(env_path)

    target_chat = args.target_chat or os.getenv("TARGET_CHAT", "").strip() or None
    session_stem = Path(args.session_stem or os.getenv("SESSION_PATH", str(DEFAULT_SESSION_STEM))).expanduser().resolve()
    log_path = Path(args.log_path or os.getenv("LOG_PATH", str(DEFAULT_LOG_PATH))).expanduser().resolve()
    phone_number = pick_phone_number(args.phone_number)

    api_id = int(os.getenv("API_ID", str(DEFAULT_API_ID)).strip() or DEFAULT_API_ID)
    api_hash = os.getenv("API_HASH", DEFAULT_API_HASH).strip() or DEFAULT_API_HASH

    return HarnessConfig(
        api_id=api_id,
        api_hash=api_hash,
        phone_number=phone_number,
        target_chat=target_chat,
        session_stem=session_stem,
        log_path=log_path,
    )


async def async_main() -> int:
    args = parse_args()
    config = build_config(args)
    client = TelegramClient(str(config.session_stem), config.api_id, config.api_hash)
    harness = TelegramHarness(client, config)
    try:
        await harness.start()
    finally:
        await harness.shutdown()
    return 0


def main() -> int:
    try:
        return asyncio.run(async_main())
    except KeyboardInterrupt:
        return 130
    except Exception as exc:
        print(f"[fatal] {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
