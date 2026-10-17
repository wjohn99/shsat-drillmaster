# Independent review checklist

The reviewer is never the writer. Read each item cold, as a strict SHSAT editor trying to break it.
For each item, record a verdict (`pass`, `fix`, or `reject`) and every issue found. An item passes
only when every box below is true. Built from the defects found by the 2026-10-17 audit.

## 1. Exactly one defensible answer

- [ ] Solve it yourself before reading the key. Your answer matches.
- [ ] Try to defend each wrong choice. If a careful student could argue for one, it fails.
- [ ] ELA: the error the question asks about actually exists, and only in the keyed spot. Every
      "correct" sentence really is correct.
- [ ] Inline choice: try every option combination; only the key fits the context *given in the prompt*.
- [ ] Multi-select: exactly `selectCount` choices are right.
- [ ] No common mistake lands on the correct answer.
- [ ] No two wrong choices are the same mistake (same solution, same meaning).

## 2. Grade 8 scope and style (`AUTHORING.md`)

- [ ] The required solution uses nothing on the out-of-scope list (Pythagorean, slope, f(x),
      formal systems, scientific-notation operations, radicals, quadratics, trig, cylinder radius).
- [ ] Not a dictionary/synonym vocabulary question.
- [ ] Answerable on its own (no "Part A" dependency).
- [ ] Tag matches what the item actually tests (a two-quantity story solved in one variable is not ALG-SYS).
- [ ] Module 1 vs 2 matches the definitions.

## 3. Explanations teach only true things

- [ ] Each wrong-choice explanation reproduces that exact choice from the named mistake (recompute it).
- [ ] No rule is stated more broadly than it is true.
- [ ] No claim about the passage that the passage doesn't support, no typography the student can't see,
      no premise invented in the explanation.
- [ ] "Unsupported" vs "contradicted" used correctly. Valid alternative methods are not called wrong.
- [ ] The explanation itself has no grammar errors (comma splices, run-ons).
- [ ] Nested explanations match the top-level one. No false printed equalities.

## 4. Passages

- [ ] Every quotation in a stem, choice or explanation appears verbatim; every paragraph, sentence and
      line number points where the quote really is.
- [ ] Every real-world fact is confirmed (sources noted) or cut/hedged.
- [ ] Internally consistent (places, numbers, sequence of events).
- [ ] After any passage change, every linked question was rechecked.

## 5. Mechanics (`npm test` and `scripts/export-question-batch.py` catch these)

- [ ] Validator and test suite pass.

## Recording the review

Add to each question in the batch JSON:

```json
"independentReview": {
  "reviewer": "claude-reviewer",
  "reviewedAt": "2026-10-18",
  "verdict": "pass",
  "issuesFound": 2,
  "notes": "Replaced choice C (same solution as B); fixed the semicolon rule in D's explanation."
}
```

`verdict` must be `pass` before the batch is merged. `npm test` enforces this for every batch created
after 2026-10-17.
