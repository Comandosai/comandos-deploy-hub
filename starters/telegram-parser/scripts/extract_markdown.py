from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "src"))

from tg_parser.config import PROJECT_ROOT
from tg_parser.document_markdown import SUPPORTED_EXTENSIONS, convert_file_to_markdown, is_supported_document


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Преобразовать уже скачанные документы в Markdown через MarkItDown.")
    parser.add_argument("--input", required=True, help="Файл или папка с документами")
    parser.add_argument("--output-dir", default=None, help="Куда сохранить Markdown-файлы")
    parser.add_argument("--manifest", default=None, help="Куда сохранить JSON-отчёт")
    parser.add_argument(
        "--extensions",
        default=",".join(sorted(SUPPORTED_EXTENSIONS)),
        help="Список расширений через запятую",
    )
    return parser.parse_args()


def parse_extensions(value: str) -> set[str]:
    extensions = set()
    for raw in value.split(","):
        item = raw.strip().lower()
        if not item:
            continue
        extensions.add(item if item.startswith(".") else f".{item}")
    return extensions


def iter_documents(input_path: Path, extensions: set[str]) -> list[Path]:
    if input_path.is_file():
        return [input_path] if is_supported_document(input_path, extensions) else []
    return sorted(path for path in input_path.rglob("*") if is_supported_document(path, extensions))


def main() -> None:
    args = parse_args()
    load_dotenv(PROJECT_ROOT / ".env")
    input_path = Path(args.input).expanduser().resolve()
    raw_output_dir = args.output_dir or os.getenv("MARKDOWN_OUTPUT_DIR", "data/analysis/markitdown")
    output_dir = Path(raw_output_dir).expanduser()
    if not output_dir.is_absolute():
        output_dir = PROJECT_ROOT / output_dir
    output_dir = output_dir.resolve()
    manifest_path = Path(args.manifest).expanduser().resolve() if args.manifest else output_dir / "manifest.json"
    extensions = parse_extensions(args.extensions)

    files = iter_documents(input_path, extensions)
    records = [convert_file_to_markdown(path, output_dir) for path in files]
    summary = {
        "input": str(input_path),
        "output_dir": str(output_dir),
        "total": len(records),
        "ok": sum(1 for item in records if item["status"] == "ok"),
        "error": sum(1 for item in records if item["status"] == "error"),
        "skipped": sum(1 for item in records if item["status"] == "skipped"),
    }

    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(
        json.dumps({"summary": summary, "records": records}, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Готово. Документов: {summary['total']}, ok: {summary['ok']}, error: {summary['error']}")
    print(f"Markdown: {output_dir}")
    print(f"Manifest: {manifest_path}")


if __name__ == "__main__":
    main()
