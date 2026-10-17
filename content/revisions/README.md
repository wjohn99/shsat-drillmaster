# Content revisions

Audited fixes to existing questions and passages. **Original records are never edited.**
`src/data/trackerQuestions.ts`, `content/batches/*`, `src/data/diagnosticQuestions.ts` and
`src/data/diagnosticPassages.ts` keep version 1 of every record. The catalog overlays the highest
revision for each ID on top (`src/data/contentRevisions.ts`).

## Layout

```
content/revisions/bank/<area>.json        revisions to the practice bank (tracker + batches)
content/revisions/diagnostic/<area>.json  revisions to the diagnostic form
```

The bank and diagnostic copies of the same ID are **different content** (for example, MATH-ALG-004 has
answer 25 in the bank and 20 in the diagnostic). A revision applies only to its own track. Never copy
a bank record, key or explanation into the diagnostic, or the other way around.

## File shape

```json
{
  "track": "bank",
  "description": "What this file covers",
  "questions": [ { ...full question record..., "contentVersion": 2, "changeType": "feedback", "auditFindings": ["MATH:bank:MATH-GEO-012:1"], "revisionNotes": "..." } ],
  "passages":  [ { ...full passage record..., "contentVersion": 2, "auditFindings": ["ELA-RC-P01"], "revisionNotes": "..." } ]
}
```

Rules for every revised record:

1. **A full replacement record.** Start from the current original and change only what the finding
   needs. Keep the same `id`, `subject`, `passageId` and track. Tags are codes (`"NUM-INT"`).
2. **`contentVersion`** is one higher than the version it replaces (2 for a first revision).
3. **`changeType`**:
   - `feedback`: only explanations, traps, tags or metadata change. The student sees the same task and the same key.
   - `substantive`: the stem, stimulus, choices or key change.
   - `scope-rewrite`: a substantive rewrite that brings a Grade 8 scope-held item into scope. Its hold
     in `content/scope/grade8-holds.json` names the clearing version.
   - `metadata`: tags or module only.
4. **`auditFindings`**: the finding keys from `content/audit/2026-10-17/findings-index.json` that this
   revision addresses. Every revision cites at least one.
5. **`revisionNotes`**: what changed and why, concretely.
6. **`reviewStatus`** stays `"provisional"`. A revision is never human approval.
7. **Choice and option IDs.** In a `substantive` or `scope-rewrite` revision, any choice, inline-choice
   option or drag item whose text or correctness changed gets a new ID ending in `-v2-<letter or slot>`
   (for example `MATH-GEO-002-v2-b`). Unchanged ones keep their ID. Old stored answers then can never
   look like they picked new content. Feedback-only revisions keep every ID.
8. **Keys.** Do not change an answer unless the finding requires it. Recompute every changed
   calculation and every distractor's stated error path.
9. **Passages.** A passage revision must keep every linked question's quotations and paragraph,
   sentence and line references exact. If a linked question's text has to change, revise that question too.
10. House style for new copy: no em dashes in stems, choices or explanations; dollar signs only on money.

## Ledger

Each area also writes `content/audit/2026-10-17/ledger/<area>.json`: one entry per finding key it owns,

```json
{ "key": "MATH:bank:MATH-GEO-012:1", "disposition": "fixed", "revision": "bank:MATH-GEO-012@2", "note": "..." }
```

with `disposition` one of `fixed`, `already-fixed`, `held`, `deferred`, `rejected`. `deferred` and
`rejected` need a reason; `rejected` needs source-backed evidence that the audit suggestion is wrong.

`npx vitest run` checks all of this.
