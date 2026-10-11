#!/usr/bin/env python3
"""Validate a content batch and write its tracker-layout CSV.

The batch's questions.json is the source. The CSV is generated from it so the
two never drift. Columns follow the SHSAT Question Bank Tracker (A–U), plus
per-choice explanations, the review status, and the raw TEI spec for
technology-enhanced items. Rules are documented in content/AUTHORING.md.

Usage:
  python3 scripts/export-question-batch.py content/batches/<batch>/questions.json [...]
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
ID_RE = re.compile(r"^(MATH|ELA)-(ALG|APP|GEO|NUM|DAT|RC|RE|REB)-\d{3}$")

FORMAT_LABELS = {
    "MC4_A-D": "Multiple Choice Question",
    "INDY-WP": "Word Problem",
    "INDY-CGT": "Charts, Graphs, or Tables",
    "INDY-MS": "Multi-Select",
    "INDY-IC": "Inline Choice / Dropdown",
    "INDY-DND": "Drag and Drop",
    "INDY-EE": "Equation Editor",
}
CHOICE_SUBTYPES = {"MC4_A-D", "INDY-WP", "INDY-CGT", "INDY-MS"}
SPEC_KEYS = {"INDY-WP": "wp", "INDY-CGT": "cgt", "INDY-MS": "ms", "INDY-IC": "ic",
             "INDY-DND": "dnd", "INDY-EE": "ee"}
# Copy fields checked for em dashes. Passages are exempt (literary text may use them).
COPY_FIELDS = ("stem", "solutionExplanation", "commonTrap")

COLUMNS = [
    "Question ID", "Passage ID", "Author", "Type", "Module", "Skill Tag", "Format",
    "Passage", "Question", "Choice A", "Choice B", "Choice C", "Choice D",
    "Correct Answer", "Explanation", "Common Trap", "Reviewer", "Status",
    "Error", "Suggested Change", "Published Date",
    "Choice A Explanation", "Choice B Explanation", "Choice C Explanation",
    "Choice D Explanation", "Choice E", "Choice E Explanation", "Choice F",
    "Choice F Explanation", "TEI Spec (JSON)", "Revised By", "Revision Notes",
]


def skill_tags() -> set[str]:
    codes = set(re.findall(r"code: '([A-Z0-9-]+)'", SCHEME_PATH.read_text(encoding="utf-8")))
    return {c for c in codes if not c.startswith("INDY-")}


def no_em_dash(qid: str, where: str, text: str, errors: list[str]) -> None:
    if "—" in text:
        errors.append(f"{qid}: em dash in {where} (app copy uses commas)")


def validate_choices(q: dict, errors: list[str]) -> None:
    qid, choices = q["id"], q.get("choices") or []
    labels = [c.get("label") for c in choices]
    if q["subtype"] == "INDY-MS":
        if labels not in (list("ABCDE"), list("ABCDEF")):
            errors.append(f"{qid}: multi-select choices must be labeled A–E or A–F")
        want = (q.get("ms") or {}).get("selectCount")
        got = sum(1 for c in choices if c.get("isCorrect"))
        if not isinstance(want, int) or want < 2 or want != got:
            errors.append(f"{qid}: ms.selectCount ({want}) must be ≥ 2 and equal the {got} correct choices")
    else:
        if labels != list("ABCD"):
            errors.append(f"{qid}: choices must be labeled A–D in order")
        if sum(1 for c in choices if c.get("isCorrect")) != 1:
            errors.append(f"{qid}: exactly one choice must be correct")
    texts = [c.get("text", "").strip() for c in choices]
    if len(set(texts)) != len(texts):
        errors.append(f"{qid}: duplicate choice text")
    for c in choices:
        if not c.get("explanation"):
            errors.append(f"{qid}: choice {c.get('label')} has no explanation")
        else:
            no_em_dash(qid, f"choice {c.get('label')} explanation", c["explanation"], errors)
        if c.get("id") != f"{qid}-{str(c.get('label', '')).lower()}":
            errors.append(f"{qid}: choice id should be {qid}-{str(c.get('label', '')).lower()}")


def validate_ic(q: dict, errors: list[str]) -> None:
    qid, ic = q["id"], q.get("ic") or {}
    slots = {s.get("slotId"): s for s in ic.get("slots", [])}
    seg_slots = [s.get("slotId") for s in ic.get("segments", []) if s.get("type") == "slot"]
    mapping = ic.get("correctMapping", {})
    if not slots or sorted(seg_slots) != sorted(slots) or sorted(mapping) != sorted(slots):
        errors.append(f"{qid}: ic segments, slots, and correctMapping must name the same slots")
    for sid, slot in slots.items():
        opts = slot.get("options", [])
        if len(opts) < 3:
            errors.append(f"{qid}: slot {sid} needs at least 3 options")
        if mapping.get(sid) not in {o.get("id") for o in opts}:
            errors.append(f"{qid}: slot {sid} correct option is not one of its options")
        for o in opts:
            if not o.get("explanation"):
                errors.append(f"{qid}: option {o.get('id')} has no explanation")


def validate_dnd(q: dict, errors: list[str]) -> None:
    qid, dnd = q["id"], q.get("dnd") or {}
    pool = {p.get("id") for p in dnd.get("pool", [])}
    zones = {z.get("id") for z in dnd.get("zones", [])}
    mapping = dnd.get("correctMapping", {})
    if not pool or not zones or not mapping:
        errors.append(f"{qid}: dnd needs pool, zones, and correctMapping")
    if not set(mapping) <= zones or not set(mapping.values()) <= pool:
        errors.append(f"{qid}: dnd correctMapping must map zone ids to pool ids")
    if not dnd.get("singlePlacement") and set(mapping) != zones:
        errors.append(f"{qid}: every zone needs a correct item (or set singlePlacement)")
    for p in dnd.get("pool", []):
        if not p.get("explanation"):
            errors.append(f"{qid}: pool item {p.get('id')} has no explanation")


def validate_ee(q: dict, errors: list[str]) -> None:
    qid = q["id"]
    if not (q.get("ee") or {}).get("acceptableAnswers"):
        errors.append(f"{qid}: ee.acceptableAnswers is empty")
    wrong = q.get("commonWrongAnswers") or []
    if len(wrong) < 2 or not all(w.get("answer") and w.get("explanation") for w in wrong):
        errors.append(f"{qid}: needs ≥ 2 commonWrongAnswers with answer and explanation")


def validate(batch: dict) -> list[str]:
    tags = skill_tags()
    errors: list[str] = []
    passages = {p.get("id"): p for p in batch.get("passages", [])}
    for pid, p in passages.items():
        if not (p.get("title") and p.get("body")):
            errors.append(f"passage {pid}: needs title and body")
    seen: set[str] = set()
    for q in batch["questions"]:
        qid = q.get("id", "?")
        m = ID_RE.match(qid)
        if not m:
            errors.append(f"{qid}: id must look like MATH-ALG-001 / ELA-RC-001")
        elif m.group(1) != q.get("subject"):
            errors.append(f"{qid}: subject does not match id prefix")
        if qid in seen:
            errors.append(f"{qid}: duplicate id")
        seen.add(qid)
        if q.get("module") not in {"1", "2"}:
            errors.append(f"{qid}: module must be '1' or '2'")
        if q.get("reviewStatus") not in REVIEW_STATUSES:
            errors.append(f"{qid}: reviewStatus must be one of {sorted(REVIEW_STATUSES)}")
        qtags = q.get("tags", [])
        if not 1 <= len(qtags) <= 3:
            errors.append(f"{qid}: needs 1–3 skill tags")
        for code in qtags:
            if code not in tags:
                errors.append(f"{qid}: unknown skill tag {code}")
        if q.get("passageId") and q["passageId"] not in passages:
            errors.append(f"{qid}: passageId {q['passageId']} not in batch passages")
        for field in COPY_FIELDS:
            if not q.get(field):
                errors.append(f"{qid}: missing {field}")
            else:
                no_em_dash(qid, field, q[field], errors)

        subtype = q.get("subtype")
        if subtype not in FORMAT_LABELS:
            errors.append(f"{qid}: unsupported subtype {subtype}")
            continue
        spec = SPEC_KEYS.get(subtype)
        if spec and spec != "wp" and not q.get(spec):
            errors.append(f"{qid}: {subtype} needs a '{spec}' spec")
        if subtype == "INDY-CGT" and not (q.get("cgt") or {}).get("visual"):
            errors.append(f"{qid}: INDY-CGT needs cgt.visual")
        if subtype in CHOICE_SUBTYPES and not (subtype == "INDY-CGT" and q.get("ee")):
            validate_choices(q, errors)
        elif subtype == "INDY-CGT":
            validate_ee(q, errors)
        if subtype == "INDY-IC":
            validate_ic(q, errors)
        elif subtype == "INDY-DND":
            validate_dnd(q, errors)
        elif subtype == "INDY-EE":
            validate_ee(q, errors)
    return errors


def tei_spec(q: dict) -> str:
    spec = {k: q[k] for k in ("cgt", "ms", "ic", "dnd", "ee", "commonWrongAnswers") if k in q}
    return json.dumps(spec, ensure_ascii=False) if spec else ""


def tracker_row(q: dict, passages: dict) -> dict:
    choices = {c["label"]: c for c in q.get("choices") or []}
    correct = ", ".join(c["label"] for c in q.get("choices") or [] if c["isCorrect"])
    if not correct and q.get("ee"):
        correct = q["ee"]["acceptableAnswers"][0]
    row = {
        "Question ID": q["id"],
        "Passage ID": q.get("passageId", ""),
        "Author": q.get("originalAuthor", "Jed Levine"),
        "Type": q["id"].split("-")[1],
        "Module": f"Module {q['module']}",
        "Skill Tag": "; ".join(q["tags"]),
        "Format": FORMAT_LABELS[q["subtype"]],
        "Passage": passages.get(q.get("passageId"), {}).get("body", ""),
        "Question": q["stem"],
        "Correct Answer": correct or "See TEI Spec",
        "Explanation": q["solutionExplanation"],
        "Common Trap": q["commonTrap"],
        "Reviewer": q.get("trackerReviewer", ""),
        "Status": q["reviewStatus"].capitalize(),
        "TEI Spec (JSON)": tei_spec(q),
        "Revised By": ", ".join(q.get("revisedBy", [])),
        "Revision Notes": q.get("revisionNotes", ""),
    }
    for label, c in choices.items():
        row[f"Choice {label}"] = c["text"]
        row[f"Choice {label} Explanation"] = c["explanation"]
    return row


def export(src: Path) -> bool:
    batch = json.loads(src.read_text(encoding="utf-8"))
    errors = validate(batch)
    if errors:
        print(f"{src}:\n  " + "\n  ".join(errors))
        return False
    passages = {p["id"]: p for p in batch.get("passages", [])}
    out = src.with_suffix(".csv")
    with out.open("w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=COLUMNS, restval="")
        writer.writeheader()
        writer.writerows(tracker_row(q, passages) for q in batch["questions"])
    print(f"{len(batch['questions'])} questions valid. Wrote {out.relative_to(ROOT)}")
    return True


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    ok = [export(Path(p).resolve()) for p in sys.argv[1:]]
    return 0 if all(ok) else 1


if __name__ == "__main__":
    sys.exit(main())
