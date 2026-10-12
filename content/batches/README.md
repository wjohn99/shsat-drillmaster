# Content batches

Question batches ready to load into DrillMaster. Each batch folder has:

- `questions.json`: the source. One object per question, using the app's `Question` shape (`src/types/index.ts`), with skill tags as codes (for example `"NUM-INT"`) instead of `Tag` objects.
- `questions.csv`: generated from the JSON in the tracker's column layout (A–U), plus per-choice explanations and the review status. Don't edit it by hand. Regenerate it:

```sh
python3 scripts/export-question-batch.py content/batches/<batch>/questions.json
```

The script also validates the batch and refuses to write the CSV if anything is wrong: duplicate IDs, a module other than 1 or 2, an unknown skill tag, anything other than exactly one correct choice, a missing explanation, or an em dash in app copy.

## Review status

Every question has a `reviewStatus`:

| Value | Meaning | In the app |
|---|---|---|
| `provisional` | Revised and approved by Jed with Claude | Publish it, with a "Provisional" badge |
| `final` | Also reviewed by a second team member | Publish it with no badge |

Provisional questions are meant to go live. The badge just shows that the team hasn't finished reviewing them yet, so it shouldn't keep a question out of the app.

## Fields beyond `Question`

`reviewStatus`, `originalAuthor`, `trackerReviewer`, `revisedBy`, and `revisionNotes` keep a record of who wrote each question, who reviewed it, and what changed. The app can ignore everything except `reviewStatus`.

## Batches

All items are `provisional`. Items carried over from the tracker keep their tracker IDs. New items use IDs from 101 up.

| Batch | Items | What it is |
|---|---|---|
| `2026-10-11-reviewed-backlog` | 21 | Tracker rows that were "Reviewed" but never approved by Jed, now revised |
| `2026-10-11-backlog-a` | 33 | Tracker "In Review" rows, revised (first half) |
| `2026-10-11-backlog-b` | 32 | Tracker "In Review" rows, revised (second half). ELA-RC-001/002 were placeholders in the tracker and have been rewritten on a new passage. |
| `2026-10-11-ela-revising` | 50 | Standalone revising/editing (ELA-REB-101–150), 10 of them inline-dropdown |
| `2026-10-11-ela-re-passages` | 20 | Passage-based revising, 4 passages (ELA-RE-101–120) |
| `2026-10-11-rc-informational` | 36 | 6 informational passages (ELA-RC-101–136) |
| `2026-10-11-rc-literary` | 36 | 5 stories and 1 poem (ELA-RC-137–172) |
| `2026-10-11-math-num-dat` | 36 | Number, statistics, probability, tables and charts (MATH-NUM/DAT-101+) |
| `2026-10-11-math-alg-app-geo` | 36 | Algebra, word problems, geometry described in words (MATH-ALG/APP/GEO-101+) |
| `2026-10-11-top-up` | 20 | 4 more questions on the bee-swarm passage (RC-P-001, which also appears in `backlog-b`; import it once) and 16 math, mostly Module 2, so practice gets a full 300 |
| `2026-10-12-published-unapproved` | 14 | The 14 July-published items that never got Jed's final sign-off, revised. 13 of them are also diagnostic items (all but MATH-GEO-007), so they replace the diagnostic versions too. |

## Notes for the app

1. **20 of these IDs are also in the diagnostic.** These are MATH-ALG-004/005/006/007/014/016/020/024/032, MATH-APP-005/007/009/010/011, MATH-DAT-003, MATH-GEO-010 and MATH-NUM-002/003/004/005. `questionCatalog.ts` already keeps diagnostic IDs out of practice, so these won't appear in practice. The diagnostic still serves the old versions, and some of those have real flaws:
   - MATH-GEO-010: a student who forgets the ½ and also forgets to double the base still gets the right answer.
   - MATH-APP-010: Choice A's explanation doesn't match its value.
   - MATH-APP-011: both legs are 60 mph, so averaging the speeds also gives the right answer.

   Consider swapping the revised versions into the diagnostic. The `top-up` batch adds 20 extra items so practice still gets 300.
2. **Drag-and-drop holds one item per zone.** Each zone takes exactly one pool item, so "sort into two groups" items aren't possible yet. All drag-and-drop items here are matching or ordering.
3. **Grid-in answers must match the text exactly.** A student who types `1/2` when the accepted answer is `0.5` gets marked wrong. Every grid-in here uses a whole-number answer for now. Comparing numbers by value would let us use fractions and decimals.
