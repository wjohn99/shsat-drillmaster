# Content pipeline

How every new batch gets from idea to the app. Each step catches a different kind of problem; the
2026-10-17 audit showed what slips through when a writer reviews its own work.

| Step | Who | Catches |
|---|---|---|
| 1. Write | Writer (Claude or a tutor), following `AUTHORING.md` | — |
| 2. Validate | `python3 scripts/export-question-batch.py <batch>` then `npm test` | Format, tags, modules, one key, scorer behavior, quotes vs passages, scope holds |
| 3. Independent review | A **different** reviewer using `REVIEW.md`, recording `independentReview` on every item | Ambiguous answers, false rules in explanations, out-of-scope demand, unsupported passage claims, facts |
| 4. Fix and re-review | Writer fixes; reviewer re-checks only the changed items | — |
| 5. Spot check | Jed reads 3 items per batch (one per question type if possible) | Anything the reviewer missed. **If any of the 3 has a real problem, the whole batch goes back to step 3.** |
| 6. Log | Add a row to `content/batches/QUALITY-LOG.md` | Lets us see whether the error rate is falling |

Then the batch goes to John as `reviewStatus: "provisional"`. An item becomes `"final"` only after a
second team member's review, per `AUTHORING.md`.

## Batch size

About 25 items. Small enough to spot-check honestly, large enough to be worth a review pass.

## Running it in Claude Code

Ask Claude to "make a DrillMaster batch" — the project skill in `.claude/skills/drillmaster-content/`
runs these steps, including launching a separate reviewer agent for step 3.
