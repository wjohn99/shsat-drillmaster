# DrillMaster question authoring standard

These are the rules for every item in `content/batches/`. `scripts/export-question-batch.py` checks the mechanical rules automatically. The quality rules are on the writer and the reviewer.

## The bar

- Write in the style of the official Pearson SHSAT: its tone, sentence length, diction, difficulty, and distractor design. Never copy a real Pearson passage or item. Every passage and question must be original.
- Every wrong answer has to come from a specific, realistic student mistake, and its explanation names that mistake. "This results from an arithmetic error" is not allowed.
- Make sure a student can't reach the correct answer through a common mistake. For example, a "doubled base" triangle question fails if forgetting the ½ and forgetting to double the base gives the right number.
- There is exactly one defensible answer. Check the arithmetic in code before you submit.
- Grade 8 reading level for stems. No em dashes in stems, choices, or explanations (use commas). Literary passages may keep them.
- Use the Reviewer Error Standards checklist (Drive, 00 - Canon and Strategy) as the final self-check: no answer guessable without solving, no two choices that mean the same thing, a clear stem, a correct tag, and the correct module.

## Required on every item

| Field | Rule |
|---|---|
| `id` | `MATH-<TYPE>-NNN` or `ELA-<TYPE>-NNN`, unique. TYPE is one of ALG, APP, GEO, NUM, DAT, RC, RE, REB. |
| `subject` | `MATH` or `ELA`, matching the id prefix |
| `module` | `"1"` or `"2"`. Never Easy/Medium/Hard. Module 1 tests the core skill in one or two steps with standard distractors. Module 2 needs more steps, stronger reasoning, or subtler distractors. |
| `tags` | 1–3 canonical skill codes from `src/data/taggingScheme.ts`, primary skill first. Format codes (`INDY-*`) don't go here. |
| `subtype` | See the formats below |
| `stem` | The question |
| `solutionExplanation` | A step-by-step solution in the voice of the Pearson explanation booklets |
| `commonTrap` | The single most tempting wrong path, and why students take it |
| `reviewStatus` | `"provisional"` for anything Jed and Claude have revised. `"final"` only after a second team member reviews it. |
| `revisedBy`, `revisionNotes` | Who worked on the item and what changed (for new items: `"New item."`) |
| `createdAt` | ISO timestamp |

ELA reading items also need a `passageId` that matches a passage in the batch's `passages` array.

## Skill tags

- **ELA reading:** RC-MI, RC-INF, RC-EV, RC-VOC, RC-TXT, RC-THE, RC-SEQ, RC-ANL, RC-THM
- **ELA revising:** RE-WC, RE-SEN, RE-MOD, RE-TEN, RE-RUN, RE-SVA, RE-PRO, RE-COM, RE-COLN, RE-SEM, RE-APP, RE-ORG, RE-CL
- **Math:** NUM-INT, NUM-FR, NUM-EXP, NUM-RAT, NUM-FAC, ALG-LIN, ALG-EXP, ALG-SYS, ALG-FUN, APP-PCT, APP-RTD, APP-PLG, APP-FIN, GEO-ANG, GEO-TRI, GEO-QUAD, GEO-CRC, GEO-ARV, GEO-COO, GEO-3D, GEO-MSC, DAT-GR, DAT-STA, DAT-PROB

## Formats

The app renders all of these today. Specs follow `src/types/index.ts`.

| subtype | Use for | Answer data |
|---|---|---|
| `MC4_A-D` | Standard 4-choice multiple choice | `choices` A–D, exactly one `isCorrect`, each with an `explanation` |
| `INDY-WP` | Multi-step word problem (math) | Same as MC4. `wp: {}` is optional. |
| `INDY-CGT` | Read a table or bar chart | `cgt.visual` (table or barChart) plus MC4 `choices`, or plus `ee` for numeric entry |
| `INDY-MS` | "Select **two**/**three** answers" (exact count, not "all that apply") | `choices` A–E or A–F, `ms.selectCount` equal to the number correct, each choice with an `explanation` |
| `INDY-IC` | Inline dropdown inside a sentence (revising and editing) | `ic.segments`, `ic.slots` (each option has `id`, `text`, `explanation`), `ic.correctMapping` |
| `INDY-DND` | Drag answers into boxes (matching, ordering, placing a sentence) | `dnd.pool` (each item has `id`, `text`, `explanation`), `dnd.zones`, `dnd.correctMapping`. Set `singlePlacement: true` for "where does this sentence belong." |
| `INDY-EE` | Grid-in / numeric entry (the SHSAT's 5 grid-ins) | `ee.acceptableAnswers` (every equivalent form: `"0.75"`, `".75"`, `"3/4"`), plus a top-level `commonWrongAnswers: [{ "answer", "explanation" }]` with at least 2 entries |

Hot spot (`INDY-HS`) and graphing (`INDY-GIF`) need images or plotted figures, so they wait until diagram production is set up. Geometry items have to be fully describable in words until then.

**TEI share:** about 15–20% of items in each batch, matching the digital SHSAT. Every TEI item still needs a `solutionExplanation`, a `commonTrap`, and an explanation for every option, pool item, or common wrong answer.

## Passages

Batch-level `passages: [{ id, title, sourceMeta, body }]`.

- RC passages are 600–700 words and original, unless they're public domain or government text with the source given in `sourceMeta`. Poems run 20–40 lines.
- Number the paragraphs in the body ("1 ", "2 ", ...) so stems can cite them.
- Order the questions in a set from global (main idea) to local (detail, vocabulary) to inferential, and use about six questions per passage.
- Revising/editing passages (Part B) run 250–400 words, with numbered sentences in parentheses: (1), (2), ...
