#!/usr/bin/env python3
import argparse
import json
import re
import sys
import zipfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable, List
from xml.etree import ElementTree


BASE_DIR = Path(__file__).resolve().parent
SKILL_DIR = BASE_DIR.parent
STATE_DIR = SKILL_DIR / ".state"
DEFAULT_MANIFEST_PATH = STATE_DIR / "context_manifest.json"
DEFAULT_BUNDLE_PATH = STATE_DIR / "context_bundle.txt"

TEXT_EXTENSIONS = {".md", ".txt", ".json", ".yaml", ".yml", ".csv", ".tsv"}
DOCX_EXTENSIONS = {".docx"}


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def ensure_state_dir() -> None:
    STATE_DIR.mkdir(parents=True, exist_ok=True)


def read_docx(path: Path) -> str:
    with zipfile.ZipFile(path) as archive:
        xml_bytes = archive.read("word/document.xml")
    root = ElementTree.fromstring(xml_bytes)
    chunks: List[str] = []
    for node in root.iter():
        if node.tag.endswith("}t") and node.text:
            chunks.append(node.text)
        elif node.tag.endswith("}p"):
            chunks.append("\n")
    return "".join(chunks)


def read_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix in DOCX_EXTENSIONS:
        return read_docx(path)
    return path.read_text(encoding="utf-8", errors="ignore")


def compact_text(value: str) -> str:
    value = value.replace("\r", "\n")
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def iter_supported_files(root: Path) -> Iterable[Path]:
    for path in sorted(root.rglob("*")):
        if not path.is_file():
            continue
        if path.name.startswith("."):
            continue
        suffix = path.suffix.lower()
        if suffix in TEXT_EXTENSIONS or suffix in DOCX_EXTENSIONS:
            yield path


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build a compact local context bundle from a documents folder.")
    parser.add_argument("docs_dir", help="Path to the local documents folder.")
    parser.add_argument("--max-files", type=int, default=40, help="Maximum number of files to include.")
    parser.add_argument("--max-chars-per-file", type=int, default=12000, help="Maximum chars extracted per file.")
    parser.add_argument("--manifest-path", default=str(DEFAULT_MANIFEST_PATH), help="Path for JSON manifest output.")
    parser.add_argument("--bundle-path", default=str(DEFAULT_BUNDLE_PATH), help="Path for combined text output.")
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    ensure_state_dir()

    docs_dir = Path(args.docs_dir).expanduser().resolve()
    if not docs_dir.exists() or not docs_dir.is_dir():
        print(f"Docs directory not found: {docs_dir}", file=sys.stderr)
        return 1

    files = list(iter_supported_files(docs_dir))[: args.max_files]
    manifest = {
        "generated_at": utc_now_iso(),
        "docs_dir": str(docs_dir),
        "file_count": len(files),
        "files": [],
    }
    bundle_sections: List[str] = []

    for path in files:
        try:
            raw_text = read_text(path)
        except Exception as exc:
            manifest["files"].append(
                {
                    "path": str(path),
                    "relative_path": str(path.relative_to(docs_dir)),
                    "error": str(exc),
                }
            )
            continue

        text = compact_text(raw_text)[: args.max_chars_per_file]
        item = {
            "path": str(path),
            "relative_path": str(path.relative_to(docs_dir)),
            "suffix": path.suffix.lower(),
            "chars": len(text),
            "preview": text[:400],
        }
        manifest["files"].append(item)
        bundle_sections.append(f"# FILE: {item['relative_path']}\n\n{text}\n")

    manifest_path = Path(args.manifest_path).expanduser().resolve()
    bundle_path = Path(args.bundle_path).expanduser().resolve()
    manifest_path.parent.mkdir(parents=True, exist_ok=True)
    bundle_path.parent.mkdir(parents=True, exist_ok=True)
    manifest_path.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8")
    bundle_path.write_text("\n".join(bundle_sections), encoding="utf-8")

    print(json.dumps({"manifest_path": str(manifest_path), "bundle_path": str(bundle_path), "file_count": len(manifest["files"])}, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
