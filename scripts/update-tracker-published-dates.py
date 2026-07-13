#!/usr/bin/env python3
"""Set column U (Published Date) on the SHSAT Question Bank Tracker spreadsheet."""

from __future__ import annotations

import re
import shutil
import sys
import zipfile
from pathlib import Path

HEADER = "Published Date"
PUBLISHED_DATE = "6/26/2026"
PUBLISHED_ROWS = [2, 3, 4, 5, 6, 7, 8, 15]

DEFAULT_SOURCE = Path.home() / "Downloads" / "SHSAT Question Bank Tracker.xlsx"
DEFAULT_OUTPUT = Path(__file__).resolve().parent.parent / "SHSAT Question Bank Tracker.xlsx"


def inline_cell(ref: str, value: str, style: str = "2") -> str:
    escaped = (
        value.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )
    return f'<c r="{ref}" s="{style}" t="inlineStr"><is><t>{escaped}</t></is></c>'


def update_sheet_xml(xml: str) -> str:
    updated = xml
    updated = re.sub(
        r'<c r="U1" s="2"/>',
        inline_cell("U1", HEADER),
        updated,
        count=1,
    )
    for row in PUBLISHED_ROWS:
        updated = re.sub(
            rf'<c r="U{row}" s="2"/>',
            inline_cell(f"U{row}", PUBLISHED_DATE),
            updated,
            count=1,
        )
    return updated


def patch_workbook(source: Path, output: Path) -> None:
    with zipfile.ZipFile(source, "r") as zin:
        sheet_name = "xl/worksheets/sheet1.xml"
        sheet_xml = zin.read(sheet_name).decode("utf-8")
        patched_sheet = update_sheet_xml(sheet_xml)

        output.parent.mkdir(parents=True, exist_ok=True)
        with zipfile.ZipFile(output, "w", compression=zipfile.ZIP_DEFLATED) as zout:
            for item in zin.infolist():
                data = patched_sheet.encode("utf-8") if item.filename == sheet_name else zin.read(item.filename)
                zout.writestr(item, data)


def main() -> int:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_SOURCE
    output = Path(sys.argv[2]) if len(sys.argv) > 2 else source

    if not source.exists():
        print(f"Source not found: {source}", file=sys.stderr)
        return 1

    if output.resolve() != source.resolve():
        patch_workbook(source, output)
    else:
        temp = source.with_suffix(".tmp.xlsx")
        patch_workbook(source, temp)
        shutil.move(temp, source)

    print(f"Updated column U in: {output}")
    print(f"  Header: {HEADER}")
    print(f"  Rows: {', '.join(str(r) for r in PUBLISHED_ROWS)} -> {PUBLISHED_DATE}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
