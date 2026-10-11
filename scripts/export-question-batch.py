#!/usr/bin/env python3
"""Validate a content batch and write its tracker-layout CSV.

The batch's questions.json is the source. The CSV is generated from it so the
two never drift. Columns follow the SHSAT Question Bank Tracker (A–U), plus
per-choice explanations and the review status.

Usage:
  python3 scripts/export-question-batch.py content/batches/<batch>/questions.json
"""

from __future__ import annotations

import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCHEME_PATH = ROOT / "src/data/taggingScheme.ts"
REVIEW_STATUSES = {"provisional", "final"}
FORMAT_LABELS = {"MC4_A-D": "Multiple Choice Question"}

COLUMNS = [
    "Question ID", "Passage ID", "Author", "Type", "Module", "Skill Tag", "Format",
    "Passage", "Question", "Choice A", "Choice B", "Choice C", "Choice D",
    "Correct Answer", "Explanation", "Common Trap", "Reviewer", "Status",
    "Error", "Suggested Change", "Published Date",
    "Choice A Explanation", "Choice B Explanation", "Choice C Explanation",
    "Choice D Explanation", "Revised By", "Revision Notes",
]


def known_skill_tags() -> set[str]:
    return set(re.findall(r"code: '([A-Z0-9-]+)'", SCHEME_PATH.read_text(encoding="utf-8")))


def validate(questions: list[dict]) -> list[str]:
    tags = known_skill_tags()
    errors: list[str] = []
    seen: set[str] = set()
    for q in questions:
        qid = q.get("id", "?")
        if qid in seen:
            errors.append(f"{qid}: duplicate id")
        seen.add(qid)
        if q.get("module") not in {"1", "2"}:
            errors.append(f"{qid}: module must be '1' or '2'")
        if q.get("reviewStatus") not in REVIEW_STATUSES:
            errors.append(f"{qid}: reviewStatus must be one of {sorted(REVIEW_STATUSES)}")
        for code in q.get("tags", []):
            if code not in tags:
                errors.append(f"{qid}: unknown skill tag {code}")
        choices = q.get("choices", [])
        if [c.get("label") for c in choices] != ["A", "B", "C", "D"]:
            errors.append(f"{qid}: choices must be labeled A–D in order")
        if sum(1 for c in choices if c.get("isCorrect")) != 1:
            errors.append(f"{qid}: exactly one choice must be correct")
        for c in choices:
            if not c.get("explanation"):
                errors.append(f"{qid}: choice {c.get('label')} has no explanation")
        for field in ("stem", "solutionExplanation", "commonTrap"):
            if not q.get(field):
                errors.append(f"{qid}: missing {field}")
            elif "—" in q[field]:
                errors.append(f"{qid}: em dash in {field} (app copy uses commas)")
    return errors


def tracker_row(q: dict) -> dict:
    choices = {c["label"]: c for c in q["choices"]}
    correct = next(c["label"] for c in q["choices"] if c["isCorrect"])
    return {
        "Question ID": q["id"],
        "Passage ID": q.get("passageId", ""),
        "Author": q.get("originalAuthor", ""),
        "Type": q["id"].split("-")[1],
        "Module": f"Module {q['module']}",
        "Skill Tag": "; ".join(q["tags"]),
        "Format": FORMAT_LABELS.get(q["subtype"], q["subtype"]),
        "Passage": "",
        "Question": q["stem"],
        **{f"Choice {k}": choices[k]["text"] for k in "ABCD"},
        "Correct Answer": correct,
        "Explanation": q["solutionExplanation"],
        "Common Trap": q["commonTrap"],
        "Reviewer": q.get("trackerReviewer", ""),
        "Status": q["reviewStatus"].capitalize(),
        "Error": "",
        "Suggested Change": "",
        "Published Date": "",
        **{f"Choice {k} Explanation": choices[k]["explanation"] for k in "ABCD"},
        "Revised By": ", ".join(q.get("revisedBy", [])),
        "Revision Notes": q.get("revisionNotes", ""),
    }


def main() -> int:
    if len(sys.argv) != 2:
        print(__doc__)
        return 2
    src = Path(sys.argv[1]).resolve()
    batch = json.loads(src.read_text(encoding="utf-8"))
    questions = batch["questions"]

    errors = validate(questions)
    if errors:
        print("\n".join(errors))
        return 1

    out = src.with_suffix(".csv")
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS)
        writer.writeheader()
        writer.writerows(tracker_row(q) for q in questions)
    print(f"{len(questions)} questions valid. Wrote {out.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
