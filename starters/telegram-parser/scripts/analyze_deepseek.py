from __future__ import annotations

import json
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tg_parser.config import load_settings


def load_messages(path: Path, max_items: int = 800) -> list[dict]:
    if not path.exists():
        raise RuntimeError(f"Не найден файл сообщений: {path}")
    items: list[dict] = []
    for line in path.read_text(encoding="utf-8").splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        if row.get("text"):
            items.append(row)
    return items[-max_items:]


def format_messages(items: list[dict]) -> str:
    lines: list[str] = []
    for item in items:
        author = item.get("sender_username") or item.get("sender_name") or item.get("sender_id") or "-"
        text = str(item.get("text") or "").replace("\n", " ").strip()
        if not text:
            continue
        lines.append(
            f"[{item.get('message_date')}] {item.get('chat_title')} | {author}: {text}"
        )
    return "\n".join(lines)


def main() -> None:
    settings = load_settings()
    if not settings.deepseek_api_key:
        raise RuntimeError("Заполните DEEPSEEK_API_KEY в .env или пропустите этот шаг")

    prompt_path = ROOT / "prompts" / "group_report.md"
    system_prompt = prompt_path.read_text(encoding="utf-8")
    messages_path = settings.output_dir / "messages.jsonl"
    items = load_messages(messages_path)
    content = format_messages(items)
    if not content:
        raise RuntimeError("В messages.jsonl нет текстовых сообщений для анализа")

    response = httpx.post(
        "https://api.deepseek.com/chat/completions",
        headers={
            "Authorization": f"Bearer {settings.deepseek_api_key}",
            "Content-Type": "application/json",
        },
        json={
            "model": settings.deepseek_model,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": content[:120000]},
            ],
            "temperature": 0.2,
        },
        timeout=120,
    )
    response.raise_for_status()
    data = response.json()
    report = data["choices"][0]["message"]["content"]

    report_path = settings.output_dir / "report.md"
    report_path.write_text(report, encoding="utf-8")
    print(f"Отчёт готов: {report_path}")


if __name__ == "__main__":
    main()

