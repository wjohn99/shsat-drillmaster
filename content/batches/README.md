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

| Batch | Questions | Status |
|---|---|---|
| `2026-10-11-reviewed-backlog` | 21 tracker rows that were "Reviewed" but never approved by Jed | All provisional |
