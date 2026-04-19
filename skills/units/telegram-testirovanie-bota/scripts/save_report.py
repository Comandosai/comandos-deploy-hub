#!/usr/bin/env python3
import argparse
import json
from pathlib import Path
import re


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Save Telegram sales test report near the docs workspace.")
    parser.add_argument("--docs-dir", required=True, help="Path to the docs directory used for context.")
    parser.add_argument("--report-json", required=True, help="Path to a JSON file containing the report object.")
    parser.add_argument("--base-name", default="telegram_sales_test_report", help="Base output file name without extension.")
    return parser.parse_args()


def next_index(case_dir: Path, base_name: str) -> int:
    pattern = re.compile(rf"^{re.escape(base_name)}_(\d{{3}})\.json$")
    max_index = 0
    for path in case_dir.glob(f"{base_name}_*.json"):
        match = pattern.match(path.name)
        if match:
            max_index = max(max_index, int(match.group(1)))
    return max_index + 1


def main() -> int:
    args = parse_args()
    docs_dir = Path(args.docs_dir).expanduser().resolve()
    report_json = Path(args.report_json).expanduser().resolve()

    if not docs_dir.exists() or not docs_dir.is_dir():
        raise SystemExit(f"Docs directory not found: {docs_dir}")
    if not report_json.exists() or not report_json.is_file():
        raise SystemExit(f"Report JSON not found: {report_json}")

    case_dir = docs_dir.parent
    case_dir.mkdir(parents=True, exist_ok=True)

    report = json.loads(report_json.read_text(encoding="utf-8"))
    report_index = next_index(case_dir, args.base_name)
    indexed_path = case_dir / f"{args.base_name}_{report_index:03d}.json"
    indexed_path.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding="utf-8")

    print(
        json.dumps(
            {
                "indexed_path": str(indexed_path),
                "report_index": report_index,
                "markdown_link": f"[{indexed_path.name}]({indexed_path})",
            },
            ensure_ascii=False,
        )
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
