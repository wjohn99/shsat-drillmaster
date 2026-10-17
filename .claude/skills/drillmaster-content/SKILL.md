---
name: drillmaster-content
description: Write, review, and ship a batch of DrillMaster SHSAT questions through the content pipeline (write, validate, independent review, fix, spot-check sample, log). Use whenever asked to create, revise, or add questions, passages, or a question batch for DrillMaster.
---

# DrillMaster content batch

Follow `content/PIPELINE.md`. Read `content/AUTHORING.md` and `content/REVIEW.md` in full first.
Audience: Grade 8 test takers seeking Grade 9 entry.

## 1. Plan

- Batch of about 25 items, in one folder: `content/batches/<YYYY-MM-DD>-<topic>/questions.json`.
- Check existing IDs (`content/batches/`, `src/data/trackerQuestions.ts`, `src/data/diagnosticQuestions.ts`)
  and pick an unused ID range. Never reuse an ID.
- Read the sibling questions on any passage you add to, so the new ones don't duplicate them.

## 2. Write

- Follow every rule in `AUTHORING.md`, especially the Grade 8 scope list, style fidelity, and
  explanation accuracy sections.
- For passages, fact-check real-world claims and put the sources in the batch's `factCheck` array.
- Recompute every key and every wrong-answer path in a script (exact fractions for math).

## 3. Validate

```sh
python3 scripts/export-question-batch.py content/batches/<batch>/questions.json
npm test
```

Both must pass except for the review gate, which step 4 satisfies.

## 4. Independent review (a different agent)

Launch a **separate** reviewer agent (Agent tool). Do not review your own items. Give it:
the batch path, `content/REVIEW.md`, `content/AUTHORING.md`, and this instruction:

> Review every item in <batch> against content/REVIEW.md as a strict SHSAT editor trying to break
> it. Solve each item before reading its key. For each item report verdict pass/fix/reject and every
> issue, with the exact fix. Recompute every wrong-answer explanation. Check every quotation and
> paragraph/sentence/line reference against the passage. Do not edit files.

Apply the fixes, then send only the changed items back to the reviewer. Repeat until every item is
`pass`. Record `independentReview` on each item (`reviewer` is the reviewer's name, never the writer's;
`issuesFound` counts what it caught).

## 5. Spot check

Pick 3 items (different question types if possible) and show them to Jed in full with their keys and
explanations. If Jed finds a real problem in any of them, send the whole batch back to step 4.

## 6. Log and hand off

- Add a row to `content/batches/QUALITY-LOG.md`.
- Re-run step 3 so everything passes, including the review gate.
- Commit, push to the working branch, and tell John where the batch is. Items stay
  `reviewStatus: "provisional"`; never mark anything final.
