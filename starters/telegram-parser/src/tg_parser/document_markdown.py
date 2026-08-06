from __future__ import annotations

import hashlib
import json
import re
from pathlib import Path
from typing import Any


SUPPORTED_EXTENSIONS = {
    ".csv",
    ".doc",
    ".docx",
    ".htm",
    ".html",
    ".md",
    ".pdf",
    ".ppt",
    ".pptx",
    ".rtf",
    ".txt",
    ".xls",
    ".xlsx",
}


def is_supported_document(path: Path, extensions: set[str] | None = None) -> bool:
    return path.is_file() and path.suffix.lower() in (extensions or SUPPORTED_EXTENSIONS)


def convert_file_to_markdown(file_path: Path, output_dir: Path) -> dict[str, Any]:
    source = Path(file_path).expanduser().resolve()
    record: dict[str, Any] = {
        "source_file": str(source),
        "extension": source.suffix.lower(),
        "parser_used": "markitdown",
        "status": "skipped",
        "markdown_path": "",
        "chars": 0,
        "error": "",
    }

    if not source.exists():
        record.update(status="error", error="Файл не найден")
        return record

    if not is_supported_document(source):
        record.update(status="skipped", error="Расширение не поддерживается")
        return record

    try:
        from markitdown import MarkItDown
    except Exception as exc:
        record.update(
            status="error",
            error=f"MarkItDown не установлен. Установите зависимости: pip install -r requirements.txt. Детали: {exc}",
        )
        return record

    output_dir.mkdir(parents=True, exist_ok=True)
    markdown_path = output_dir / f"{_safe_stem(source)}.md"

    try:
        result = MarkItDown().convert(str(source))
        text = getattr(result, "text_content", None) or str(result)
        content = f"<!-- source_file: {source} -->\n<!-- parser: markitdown -->\n\n{text}".rstrip() + "\n"
        markdown_path.write_text(content, encoding="utf-8")
    except Exception as exc:
        record.update(status="error", error=str(exc))
        return record

    record.update(
        status="ok",
        markdown_path=str(markdown_path),
        chars=len(text),
    )
    return record


def append_markdown_manifest(output_dir: Path, record: dict[str, Any]) -> None:
    output_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = output_dir / "manifest.jsonl"
    with manifest_path.open("a", encoding="utf-8") as file:
        file.write(json.dumps(record, ensure_ascii=False) + "\n")


def _safe_stem(path: Path) -> str:
    stem = re.sub(r"[^A-Za-z0-9._-]+", "_", path.stem).strip("._-") or "document"
    digest = hashlib.sha1(str(path).encode("utf-8")).hexdigest()[:10]
    return f"{stem[:80]}_{digest}"
