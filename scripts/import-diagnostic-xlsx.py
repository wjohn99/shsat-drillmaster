#!/usr/bin/env python3
"""Import Diagnostic_100_for_John.xlsx into src/data diagnostic catalog files.

Reads all four workbook tabs. Questions (Diagnostic Slot 1–100) is the form
order. Passages supplies RC/RE passage bodies. Blueprint and Math Selection are
cross-checks, not alternate forms.

Usage:
  python3 scripts/import-diagnostic-xlsx.py [path/to/Diagnostic_100_for_John.xlsx]
"""

from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import pandas as pd

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_XLSX = Path.home() / "Downloads" / "Diagnostic_100_for_John.xlsx"
QUESTIONS_OUT = ROOT / "src/data/diagnosticQuestions.ts"
PASSAGES_OUT = ROOT / "src/data/diagnosticPassages.ts"
SCHEME_PATH = ROOT / "src/data/taggingScheme.ts"

LETTER_TO_INDEX = {"A": 0, "B": 1, "C": 2, "D": 3}
TABLE_BLOCK_RE = re.compile(
    r"(?:^|\n)(\|[^\n]+\|(?:\n\|[-:\s|]+\|)(?:\n\|[^\n]+\|)+)",
    re.MULTILINE,
)


def cell_text(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)) or pd.isna(value):
        return ""
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    if isinstance(value, int):
        return str(value)
    return str(value).replace("\r\n", "\n").replace("\r", "\n").strip()


def js(value) -> str:
    return json.dumps(value, ensure_ascii=False)


def known_skill_tags() -> set[str]:
    text = SCHEME_PATH.read_text(encoding="utf-8")
    return set(re.findall(r"code: '([A-Z0-9-]+)'", text))


def convert_inline_markdown(text: str) -> str:
    text = text.replace("\r\n", "\n").replace("\r", "\n")
    text = text.replace("\\*\\*\\*", "⟦F3⟧")
    text = text.replace("\\*\\*", "⟦F2⟧")
    text = text.replace("\\*", "⟦F1⟧")
    text = re.sub(r"```[^\n]*\n?", "", text)
    text = text.replace("```", "")
    text = re.sub(r"\*\*(.+?)\*\*", r"\1", text)

    unwrapped_lines: list[str] = []
    for line in text.split("\n"):
        if (
            line.startswith("*")
            and line.endswith("*")
            and len(line) > 2
            and not line.startswith("* ")
        ):
            unwrapped_lines.append(line[1:-1])
        else:
            unwrapped_lines.append(line)
    text = "\n".join(unwrapped_lines)

    text = re.sub(r"(?m)^\* ", "• ", text)
    text = re.sub(r"(?m)^\*([A-Za-z])", r"\1", text)
    text = re.sub(r"(?<!\*)\*(?!\*)([^*\n]+?)\*(?!\*)", r"\1", text)
    text = re.sub(r"\*([A-Za-z])", r"\1", text)
    text = text.replace("⟦F3⟧", "***")
    text = text.replace("⟦F2⟧", "**")
    text = text.replace("⟦F1⟧", "*")
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def split_table_row(line: str) -> list[str]:
    return [part.strip() for part in line.strip().strip("|").split("|")]


def is_separator_row(line: str) -> bool:
    compact = line.replace("|", "").replace(":", "").replace("-", "").replace(" ", "")
    return compact == ""


def parse_markdown_table(block: str) -> dict | None:
    lines = [ln.strip() for ln in block.strip().split("\n") if ln.strip()]
    rows: list[list[str]] = []
    for line in lines:
        if is_separator_row(line):
            continue
        rows.append(split_table_row(line))
    if len(rows) < 2:
        return None
    width = max(len(row) for row in rows)
    padded = [row + [""] * (width - len(row)) for row in rows]
    return {"headers": padded[0], "rows": padded[1:]}


def ascii_table(headers: list[str], rows: list[list[str]]) -> str:
    grid = [headers, *rows]
    width = max(len(row) for row in grid)
    grid = [row + [""] * (width - len(row)) for row in grid]
    col_widths = [max(len(grid[r][c]) for r in range(len(grid))) for c in range(width)]

    def fmt(row: list[str]) -> str:
        return "  ".join(cell.ljust(col_widths[i]) for i, cell in enumerate(row))

    rule = "  ".join("-" * col_widths[i] for i in range(width))
    return "\n".join([fmt(grid[0]), rule, *[fmt(r) for r in grid[1:]]])


def replace_markdown_tables(text: str) -> str:
    def repl(match: re.Match[str]) -> str:
        parsed = parse_markdown_table(match.group(1))
        if not parsed:
            return match.group(0)
        return "\n\n" + ascii_table(parsed["headers"], parsed["rows"]) + "\n"

    return TABLE_BLOCK_RE.sub(repl, text)


def extract_stem_table(stem: str) -> tuple[str, dict | None]:
    match = TABLE_BLOCK_RE.search(stem)
    if not match:
        return stem.strip(), None
    parsed = parse_markdown_table(match.group(1))
    without = (stem[: match.start()] + "\n\n" + stem[match.end() :]).strip()
    without = re.sub(r"\n{3,}", "\n\n", without)
    return without, parsed


def format_numbered_paragraph_stem(stem: str) -> str:
    markers = re.findall(r"\((\d+)\)", stem)
    if len(markers) < 2:
        return stem
    if "paragraph" in stem.lower() and len(markers) < 4 and not re.search(r"\(1\)", stem):
        return stem
    stem = re.sub(r"([.?])\s+(\(1\))", r"\1\n\n\2", stem)
    stem = re.sub(r"(?<!\n)\((\d+)\)", r"\n(\1)", stem)
    stem = re.sub(r"\n{3,}", "\n\n", stem)
    return stem.strip()


def parse_module(raw: str) -> str:
    match = re.search(r"([12])", raw or "")
    return match.group(1) if match else "1"


def subject_from_section(section: str) -> str:
    return "ELA" if section.startswith("ELA") else "MATH"


def parse_published(raw: str) -> str:
    if not raw:
        return "2026-09-17T12:00:00Z"
    match = re.match(r"(\d{1,2})/(\d{1,2})(?:/(\d{2,4}))?", raw)
    if not match:
        return "2026-09-17T12:00:00Z"
    month, day, year = match.group(1), match.group(2), match.group(3)
    year_i = int(year) if year else 2026
    if year_i < 100:
        year_i += 2000
    return f"{year_i:04d}-{int(month):02d}-{int(day):02d}T12:00:00Z"


def parse_numeric_answers(raw: str) -> list[str]:
    answers: list[str] = []
    acceptable = re.search(r"acceptable:\s*([^)]+)", raw, re.I)
    leading = re.match(r"\s*([0-9]+(?:\.[0-9]+)?)", raw)
    if leading:
        answers.append(leading.group(1))
    if acceptable:
        for part in acceptable.group(1).split(","):
            token = part.strip()
            if token and token not in answers:
                answers.append(token)
    if not answers:
        answers.append(raw.strip())
    return answers


def time_to_solve(subject: str, skill: str, numeric: bool) -> int:
    if numeric:
        return 150
    if skill.startswith("RC-"):
        return 150
    if skill.startswith("RE-"):
        return 90
    return 90


def emit_choices(choices: list[dict]) -> str:
    chunks = ["    choices: ["]
    for choice in choices:
        parts = [
            f"      {{\n        id: {js(choice['id'])},",
            f"        label: {js(choice['label'])},",
            f"        text: {js(choice['text'])},",
            f"        isCorrect: {'true' if choice['isCorrect'] else 'false'},",
        ]
        if choice.get("explanation"):
            parts.append(f"        explanation: {js(choice['explanation'])},")
        parts.append("      },")
        chunks.append("\n".join(parts))
    chunks.append("    ],")
    return "\n".join(chunks)


def emit_cgt(table: dict) -> str:
    visual = {
        "type": "table",
        "headers": table["headers"],
        "rows": table["rows"],
    }
    visual_ts = json.dumps(visual, ensure_ascii=False, indent=2).replace("\n", "\n      ")
    return f"    cgt: {{\n      visual: {visual_ts},\n    }},"


def emit_ee(answers: list[str], instruction: str | None) -> str:
    lines = ["    ee: {"]
    if instruction:
        lines.append(f"      instruction: {js(instruction)},")
    lines.append(f"      acceptableAnswers: {js(answers)},")
    lines.append("    },")
    return "\n".join(lines)


def emit_question(q: dict) -> str:
    lines = [
        "  {",
        f"    id: {js(q['id'])},",
        f"    subject: {js(q['subject'])},",
        f"    module: {js(q['module'])},",
        f"    subtype: {js(q['subtype'])},",
        f"    stem: {js(q['stem'])},",
    ]
    if q.get("solutionExplanation"):
        lines.append(f"    solutionExplanation: {js(q['solutionExplanation'])},")
    if q.get("commonTrap"):
        lines.append(f"    commonTrap: {js(q['commonTrap'])},")
    if q.get("passageId"):
        lines.append(f"    passageId: {js(q['passageId'])},")
    if q.get("choices"):
        lines.append(emit_choices(q["choices"]))
    if q.get("cgt"):
        lines.append(emit_cgt(q["cgt"]))
    if q.get("ee"):
        lines.append(emit_ee(q["ee"]["acceptableAnswers"], q["ee"].get("instruction")))
    tag_args = ", ".join(f"tag({js(code)})" for code in q["tagCodes"])
    lines.append(f"    tags: [{tag_args}],")
    lines.append(f"    timeToSolve: {q['timeToSolve']},")
    lines.append(f"    createdAt: {js(q['createdAt'])},")
    lines.append("  },")
    return "\n".join(lines)


def convert_passage_body(raw: str) -> str:
    body = replace_markdown_tables(raw)
    return convert_inline_markdown(body)


def convert_questions(
    frame: pd.DataFrame, tags: set[str]
) -> tuple[list[dict], list[str], list[str], list[str]]:
    rows = frame.sort_values("Diagnostic Slot")
    questions: list[dict] = []
    ela_ids: list[str] = []
    math_ids: list[str] = []
    errors: list[str] = []

    for _, row in rows.iterrows():
        qid = cell_text(row["Question ID"])
        slot = int(row["Diagnostic Slot"])
        section = cell_text(row["Diagnostic Section"])
        subject = subject_from_section(section)
        skill = cell_text(row["Skill Tag"])
        fmt = cell_text(row["Format"])
        stem_raw = cell_text(row["Question"])
        passage_id = cell_text(row["Passage ID"]) or None
        correct_raw = cell_text(row["Correct Answer"])
        numeric = fmt.lower().startswith("numeric")

        if skill not in tags:
            errors.append(f"{qid}: unknown skill tag {skill}")

        stem, table = extract_stem_table(stem_raw)
        stem = convert_inline_markdown(stem)
        stem = format_numbered_paragraph_stem(stem)

        subtype = "MC4_A-D"
        cgt = table
        ee = None
        choices = None

        if numeric:
            subtype = "INDY-EE"
            answers = parse_numeric_answers(correct_raw)
            instruction = None
            enter = re.search(r"(Enter your answer[^.]*\.)", stem, re.I)
            if enter:
                instruction = enter.group(1).strip()
            elif "percent" in stem.lower():
                instruction = "Enter a whole number of percent, without the percent sign."
            else:
                instruction = "Enter your answer as a number."
            ee = {"acceptableAnswers": answers, "instruction": instruction}
        else:
            letter = correct_raw.strip().upper()
            if letter not in LETTER_TO_INDEX:
                errors.append(f"{qid}: expected A–D, got {correct_raw!r}")
                letter = "A"
            labels = ["A", "B", "C", "D"]
            texts = [
                cell_text(row["Choice A"]),
                cell_text(row["Choice B"]),
                cell_text(row["Choice C"]),
                cell_text(row["Choice D"]),
            ]
            if any(not t for t in texts):
                errors.append(f"{qid}: missing MC choice text")
            expls = [
                cell_text(row["Explanation A"]),
                cell_text(row["Explanation B"]),
                cell_text(row["Explanation C"]),
                cell_text(row["Explanation D"]),
            ]
            choices = []
            for i, label in enumerate(labels):
                choice = {
                    "id": f"{qid}-{label.lower()}",
                    "label": label,
                    "text": texts[i],
                    "isCorrect": i == LETTER_TO_INDEX[letter],
                }
                if expls[i]:
                    choice["explanation"] = expls[i]
                choices.append(choice)
            if table:
                subtype = "INDY-CGT"

        question = {
            "id": qid,
            "subject": subject,
            "module": parse_module(cell_text(row["Module"])),
            "subtype": subtype,
            "stem": stem,
            "solutionExplanation": convert_inline_markdown(cell_text(row["Explanation"])),
            "commonTrap": convert_inline_markdown(cell_text(row["Common Trap"])),
            "passageId": passage_id,
            "choices": choices,
            "cgt": cgt,
            "ee": ee,
            "tagCodes": [skill],
            "timeToSolve": time_to_solve(subject, skill, numeric),
            "createdAt": parse_published(cell_text(row["Published Date"])),
            "slot": slot,
            "section": section,
        }
        questions.append(question)
        if subject == "ELA":
            ela_ids.append(qid)
        else:
            math_ids.append(qid)

    return questions, ela_ids, math_ids, errors


def convert_passages(frame: pd.DataFrame) -> list[dict]:
    passages = []
    for _, row in frame.iterrows():
        pid = cell_text(row["Passage ID"])
        title = cell_text(row["Title"])
        genre = cell_text(row["Genre"])
        source = cell_text(row["Source"])
        body = convert_passage_body(cell_text(row["Passage text"]))
        source_meta = " · ".join(part for part in [genre, source] if part)
        passages.append(
            {
                "id": pid,
                "title": title,
                "sourceMeta": source_meta,
                "body": body,
            }
        )
    return passages


def validate(
    questions: list[dict],
    ela_ids: list[str],
    math_ids: list[str],
    passages: list[dict],
    blueprint: pd.DataFrame,
    math_selection: pd.DataFrame,
) -> list[str]:
    errors: list[str] = []
    if len(questions) != 100:
        errors.append(f"expected 100 questions, got {len(questions)}")
    if len(ela_ids) != 50:
        errors.append(f"expected 50 ELA IDs, got {len(ela_ids)}")
    if len(math_ids) != 50:
        errors.append(f"expected 50 Math IDs, got {len(math_ids)}")
    if len(set(ela_ids + math_ids)) != 100:
        errors.append("question IDs are not unique")
    slots = [q["slot"] for q in questions]
    if slots != list(range(1, 101)):
        errors.append(f"slots are not 1–100 in order: {slots[:5]}…")

    passage_ids = {p["id"] for p in passages}
    used_passages = {q["passageId"] for q in questions if q.get("passageId")}
    missing_passages = used_passages - passage_ids
    unused_passages = passage_ids - used_passages
    if missing_passages:
        errors.append(f"questions reference missing passages: {sorted(missing_passages)}")
    if unused_passages:
        errors.append(f"unused passages: {sorted(unused_passages)}")
    if len(passages) != 7:
        errors.append(f"expected 7 passages, got {len(passages)}")

    for q in questions:
        if q["subject"] == "ELA" and q["slot"] > 50:
            errors.append(f"{q['id']} ELA after slot 50")
        if q["subject"] == "MATH" and q["slot"] <= 50:
            errors.append(f"{q['id']} Math before slot 51")
        if q["subtype"] == "INDY-EE":
            if not q.get("ee", {}).get("acceptableAnswers"):
                errors.append(f"{q['id']} numeric missing acceptable answers")
            if q.get("choices"):
                errors.append(f"{q['id']} numeric should not have choices")
        else:
            choices = q.get("choices") or []
            if len(choices) != 4:
                errors.append(f"{q['id']} expected 4 choices")
            correct = [c for c in choices if c["isCorrect"]]
            if len(correct) != 1:
                errors.append(f"{q['id']} expected exactly one correct choice")
        if q.get("cgt") and q["subtype"] not in {"INDY-CGT", "INDY-EE"}:
            errors.append(f"{q['id']} table visual on unexpected subtype {q['subtype']}")
        for leftover in ("|---|", "```", "**The "):
            if leftover in q["stem"]:
                errors.append(f"{q['id']} stem still has {leftover!r}")

    # consecutive passage sets in ELA
    ela_questions = [q for q in questions if q["subject"] == "ELA"]
    seen_passages: set[str] = set()
    prev_pid = None
    for q in ela_questions:
        pid = q.get("passageId")
        if pid != prev_pid and pid in seen_passages:
            errors.append(f"passage {pid} is not consecutive in form order")
        if pid:
            seen_passages.add(pid)
        prev_pid = pid

    ms_ids = [cell_text(v) for v in math_selection["Question ID"]]
    if ms_ids != math_ids:
        errors.append("Math Selection IDs do not match Questions math slots 51–100")

    bp_sections = blueprint[blueprint["Section"].astype(str).str.upper() != "TOTAL"]
    ela_target = int(bp_sections[bp_sections["Section"].astype(str).str.startswith("ELA")]["Target"].sum())
    math_target = int(bp_sections[bp_sections["Section"].astype(str).str.startswith("Math")]["Target"].sum())
    if ela_target != 50:
        errors.append(f"Blueprint ELA target is {ela_target}, not 50")
    if math_target != 50:
        errors.append(f"Blueprint Math target is {math_target}, not 50")

    for p in passages:
        if "|---" in p["body"] or "```" in p["body"]:
            errors.append(f"passage {p['id']} still has markdown table/fence markers")
        if len(p["body"]) < 400:
            errors.append(f"passage {p['id']} body looks too short ({len(p['body'])})")
        if re.search(r"[A-Za-z]\.\*$", p["body"], re.M):
            errors.append(f"passage {p['id']} still has a leftover closing italic *")

    return errors


def write_questions_file(questions: list[dict], ela_ids: list[str], math_ids: list[str]) -> None:
    parts = [
        "/**",
        " * Fall 2026 SHSAT diagnostic form items.",
        " * Generated by scripts/import-diagnostic-xlsx.py from Diagnostic_100_for_John.xlsx.",
        " * Holdback: these items are only used by the diagnostic exam.",
        " * Do not edit by hand — re-run the importer.",
        " */",
        "import { Question } from '@/types';",
        "import { tag } from '@/data/taggingScheme';",
        "",
        f"export const DIAGNOSTIC_FORM_ELA_IDS = {js(ela_ids)} as const;",
        "",
        f"export const DIAGNOSTIC_FORM_MATH_IDS = {js(math_ids)} as const;",
        "",
        "export const diagnosticQuestions: Question[] = [",
    ]
    for q in questions:
        parts.append(emit_question(q))
    parts.append("];")
    parts.append("")
    QUESTIONS_OUT.write_text("\n".join(parts), encoding="utf-8")


def write_passages_file(passages: list[dict]) -> None:
    parts = [
        "/**",
        " * Passages for the Fall 2026 SHSAT diagnostic form.",
        " * Generated by scripts/import-diagnostic-xlsx.py from Diagnostic_100_for_John.xlsx.",
        " * Holdback: these passages are only used by the diagnostic exam.",
        " * Do not edit by hand — re-run the importer.",
        " */",
        "import { Passage } from '@/types';",
        "",
        "export const diagnosticPassages: Passage[] = [",
    ]
    for p in passages:
        parts.append("  {")
        parts.append(f"    id: {js(p['id'])},")
        parts.append(f"    title: {js(p['title'])},")
        parts.append(f"    sourceMeta: {js(p['sourceMeta'])},")
        parts.append(f"    body: {js(p['body'])},")
        parts.append("    questions: [],")
        parts.append("  },")
    parts.append("];")
    parts.append("")
    PASSAGES_OUT.write_text("\n".join(parts), encoding="utf-8")


def main() -> int:
    source = Path(sys.argv[1]) if len(sys.argv) > 1 else DEFAULT_XLSX
    if not source.exists():
        print(f"Workbook not found: {source}", file=sys.stderr)
        return 1

    sheets = pd.ExcelFile(source).sheet_names
    expected = ["Blueprint", "Questions", "Passages", "Math Selection"]
    if sheets != expected:
        print(f"Unexpected sheets {sheets}; expected {expected}", file=sys.stderr)
        return 1

    blueprint = pd.read_excel(source, sheet_name="Blueprint")
    questions_df = pd.read_excel(source, sheet_name="Questions")
    passages_df = pd.read_excel(source, sheet_name="Passages")
    math_selection = pd.read_excel(source, sheet_name="Math Selection")
    tags = known_skill_tags()

    questions, ela_ids, math_ids, convert_errors = convert_questions(questions_df, tags)
    passages = convert_passages(passages_df)
    errors = convert_errors + validate(
        questions, ela_ids, math_ids, passages, blueprint, math_selection
    )
    if errors:
        print("Import failed:", file=sys.stderr)
        for err in errors:
            print(f"  - {err}", file=sys.stderr)
        return 1

    write_questions_file(questions, ela_ids, math_ids)
    write_passages_file(passages)

    table_q = [q["id"] for q in questions if q.get("cgt")]
    ee_q = [q["id"] for q in questions if q.get("ee")]
    print(f"Imported {len(questions)} questions ({len(ela_ids)} ELA, {len(math_ids)} Math)")
    print(f"Imported {len(passages)} passages: {', '.join(p['id'] for p in passages)}")
    print(f"Numeric entry: {', '.join(ee_q)}")
    print(f"Table visuals: {', '.join(table_q)}")
    print(f"Wrote {QUESTIONS_OUT.relative_to(ROOT)}")
    print(f"Wrote {PASSAGES_OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
