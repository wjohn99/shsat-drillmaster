# ELA content corrections and acceptance tests

## Scope and evidence boundary

Audit snapshot: commit `9f58bd15fb5cd9a06983a3f906f05985b27d4a7e`.

- Reviewed **all 209 current ELA content versions / 205 unique IDs**, including **159 merged-bank versions and 50 diagnostic versions**.
- Reviewed **all 24 associated passages**: 17 bank and 7 diagnostic. No current item or passage remains unread.
- The 154 batch ELA records match their merged-bank versions except provenance fields. The four bank/diagnostic overlaps (`ELA-REB-001`, `003`, `004`, `005`) differ and were reviewed separately.
- Reading comprehension: 118 versions, 19 passages. Revising/editing: 91 versions, 5 passages.
- This is source-content review, not live deployment, psychometric calibration, comprehensive copyright/provenance verification, or human approval. External fact-checking was targeted. No original source, repository, database or production content was changed.

Use the complete per-version findings in `ela-rc-audit.json`, `ela-rc-findings.csv`, `ela-revision-audit.json`, and `ela-revision-audit-findings.csv`. The IDs below are version-specific. **Do not replace diagnostic content automatically with a same-ID bank record, or mark content approved merely because a fix is implemented.**

## Priority 1: stop scoring ambiguous or invalid bank items until repaired

| ID/version | Defect | Proposed repair | Acceptance test |
|---|---|---|---|
| ELA-REB-004, bank/tracker only | All four sentences are grammatical; sentence 2 says **woke**, so the keyed tense error does not exist. | Restore the intended erroneous **wakes** in the question draft, then provide correct teaching feedback. The diagnostic version already has the intentional error and should remain separate. | Exactly one sentence contains the requested tense error; B identifies it. Corrected sentence uses woke. Bank and diagnostic version identities remain explicit. |
| ELA-REB-143, bank | Both **team's** and **teams'** can modify a locker room; no context specifies one team. | Add explicit one-team context, or replace the plural-possessive distractor with an unambiguously wrong form. | A reader can establish singular ownership from the prompt, not the explanation. Only one option fits each inline slot; slot 2 stays its. |
| ELA-REB-007, bank | **They** has the natural joint antecedent school board and teachers' union. The question presumes that only one issued the statement. | State which party alone issued it, or ask which revision makes that intended meaning clear. | The intended referent is established. Do not teach that two groups followed by they automatically creates an error. |
| ELA-REB-124, bank | Nonrestrictive commas are grammatical if all students failed to return permission slips; the required subset premise is absent. | Add that most students returned slips, or ask for a revision limiting the ban to students who have not returned them. | Context rules out the all-students interpretation. Only sentence 2 needs the intended restrictive-clause edit. |
| ELA-REB-145, bank | The comma choice permits an appositive-list reading. Colon is clearer, but the stem asks only for correct punctuation. Medium-confidence ambiguity, unlike 004's certain no-answer defect. | Replace the comma option with a clearly invalid alternative, or ask which punctuation most clearly introduces the list. | Exactly one defensible completion; no rationale claims comma apposition is categorically ungrammatical. |

### Conditional delivery hold: ELA-RC-135 / ELA-RC-136, bank

Q135 contains Part A; Q136 refers to Part A without restating its question/claim. Content records contain no explicit linked-pair metadata beyond passageId. This is a **dependency risk, not a verified claim that the live app orphans the item**.

Preferred content-only repair: remove the two-part wrapper from Q135 and make Q136 self-contained by naming the claim whose evidence is requested. Alternatively, add explicit atomic grouping and guaranteed A-before-B delivery in every question-selection path.

Acceptance: standalone, filtered, randomized, adaptive, question-limit, review and restored-session paths cannot display a contextless Part B or reverse the pair. Both answers must remain explicitly scored if retained as a pair. See the source reconciliation review for any subsequently verified delivery behavior.

## Priority 2: repair feedback and passage-support defects

### Reading comprehension

- **ELA-RC-141 bank:** the story changes windowsills and suggests the first trial was warmer. Remove the invented claim that the March plants moved **near** the radiator. Fix the choice C explanation, top-level solution and nested `ms.solutionExplanation`. Keys remain C/E.
- **ELA-RC-135/136 bank:** a later pooled result does not prove the original result false, and failure to disprove it does not prove a real effect. Reword Q135's key to “Their result cannot be assumed to occur in every setting.” Keep Q136's evidence aligned. Remove the claim that an average near zero by itself points toward the original study being wrong.
- **RC-DX-INF1-Q7 diagnostic:** the table mixes 1947 one-day beach turtles with worldwide annual nests and Texas counts. Revise the key to say it gathers reported counts and identifies **where, when and what** was counted. Do not present the 1947→1985 rows as a direct numeric decline. Valid comparable increases are 1985→2009 worldwide nests and 1996→2012 Texas nests. Align with Q6's correct warning about incompatible units.
- **RC-DX-MEM-Q4 diagnostic:** the explanation analyzes italics on **feel**, but those italics are absent from the supplied passage body. Smallest fix: remove the typography claim and explain the explicit understood/feel contrast. If restoring emphasis, verify actual student rendering.
- **ELA-RC-103 bank:** similarity of climate/geology supports the causal inference; it does not rule out all possible environmental causes.
- **ELA-RC-129 bank:** “countless” collapsed structures does not establish that a majority collapsed. Call choice A unsupported rather than logically contradicted.
- **ELA-RC-140 bank:** remove the unverified “On the SHSAT ... almost always” simile shortcut; teach this passage's suspense.
- **ELA-RC-147/159 bank:** change “Which sentence” to “Which quotation”; both keyed quotations contain two sentences.
- **RC-DX-INF2-Q6 diagnostic:** replace the claim that warmth does not affect moisture-sensitive trees with the narrower point that these ring data support dryness, not an inference about unusual warmth.
- **RC-DX-MEM-Q1 diagnostic:** choice C's explanation must not say the narrator never changes behavior; paragraph 3 explicitly describes striving to conduct herself as a citizen. Reject C's specific honesty/punishment claim instead.
- **RC-DX-POEM-Q3 diagnostic:** B says the city **looks as if** it spins, so rejecting it because the speaker is the moving object is invalid. Explain that B accounts for whirling alone but misses the increasing uncertainty conveyed by guess. D remains the fuller answer; recheck the final wording for one best answer.
- **RC-DX-POEM-Q4 diagnostic:** “shaken with a giddy laughter” describes laughter. Cite **afraid** as fear and **blissfully/giddy laughter** as delight. Key B stays.

### Revising/editing

Apply every detailed row in the RE findings file, particularly:

- **ELA-REB-002/003/004/005 bank:** add missing solution, trap and all per-choice explanations. Missing status is not evidence of approval. Resolve 004's invalid stem first.
- **ELA-RE-112 bank / RE-P103:** supply context that the AAP issued nonbinding advice, then test the accurate verb. Lack of enforcement power does not mean an organization cannot insist or demand. Rejection of insists must rely on the actual supplied statement/tone.
- **ELA-REB-131 bank:** option B does not create the claimed comma splice; therefore alone is not a clause. A best preserves the intended cause→result relation, but B is syntactically arguable. Safest repair is an unequivocally incorrect B plus accurate feedback.
- **ELA-REB-001 diagnostic:** “By the end of the day” is a temporal modifier, not a phrase describing Marcus. Restrict the subject-attachment rule to the actual participial modifier in sentence 2.
- Correct the wrong trap-option ordinal in **ELA-REB-141**, the missing comma in the deletion-only repair for **ELA-REB-101**, the false no-pronouns claim in **ELA-REB-008**, diagnostic feedback comma splices and overbroad grammatical claims identified in the per-version ledger.

Acceptance for every feedback-only change: preserve the independently verified key; explain the actual error in each distractor; do not introduce incorrect grammar in the feedback; synchronize duplicate nested explanations.

## Priority 3: factual/copy repairs in passages, with linked questions synchronized

1. **RC-BRB-001 diagnostic, paragraph 6, and RC-BRB-001-Q7 choice C:** replace “thousands of additional wires” with **additional high-quality wire**. The National Register nomination gives 152 extra wires per cable, hundreds across four cables. Preserve the inference about adapting to defective wire. Recheck all nine linked questions and exact quotations. [National Register nomination, PDF page 6](https://npgallery.nps.gov/GetAsset/763eefb2-3e0e-44e3-be5e-c7bdd9608e7b/)
2. **RC-P104 bank, paragraph 7:** qualify “no new cases” after 1977 as **no further naturally occurring cases**, because laboratory-associated cases occurred in 1978. Recheck ELA-RC-119–124. [WHO](https://www.who.int/news-room/questions-and-answers/item/smallpox)
3. **RC-P106 bank, paragraph 2:** replace the claim that 24- versus six-jam conditions occurred on different days with **the researchers alternated between the two displays**. Iyengar's own account describes switches within hours. Preserve the percentages and their denominators. Recheck ELA-RC-131–136. [Author's account, Columbia-hosted PDF page 4](https://business.columbia.edu/sites/default/files-efs/pubfiles/5228/better%20choosing%20experience.pdf)
4. **RC-P111 bank, paragraphs 2–3, and ELA-RC-164 quotation:** reconcile the saw being in the middle of the room versus in the corner. “Stood nearby” preserves the comparison. Update all exact quotations.
5. **RE-P102:** the ancient-honey claim was flagged for sourcing or replacement, not confirmed factually false by this audit. Do not present it as an established defect without checking an authoritative source.

## Alignment judgment: rewrite nine direct-definition items for current SHSAT style

The official-scope reviewer searched **all 200 ELA items in current practice forms A–D** and found word-choice effect, contribution, contextual paraphrase and inference questions, but no direct dictionary/synonym-choice stems. This supports a style-fidelity revision; it does **not** establish a DOE ban on contextual vocabulary.

**Nine direct-definition IDs:**

| ID/version | Current target | Proposed replacement direction |
|---|---|---|
| ELA-RC-001 bank | sound → reliable | Why a sound group decision is possible despite limited individual knowledge |
| ELA-RC-104 bank | in check → held within limits | How contrasting controlled/multiplying urchins develops the cascade explanation |
| ELA-RC-111 bank | drew → obtained | What contrasting cart-delivered water and public pumps shows about access |
| ELA-RC-116 bank | recognition → praise and honor | How medal, newspapers and academy election develop international recognition |
| ELA-RC-122 bank | retreated → became less widespread | Effect of portraying disease as retreating during a worldwide campaign |
| ELA-RC-128 bank | sets → hardens | How the reinterpretation of lime lumps develops scientific investigation; avoid duplicating the existing paragraph-7 limitation question |
| ELA-RC-134 bank | striking → attention-grabbing | How memorable results are contrasted with the beginning of an investigation |
| RC-BRB-001-Q3 diagnostic | ambitious → bold and difficult | How evaluative word choices portray the engineering project |
| RC-DX-MEM-Q2 diagnostic | inimitable → impossible to copy/equal | How the comparison between friends and Washington develops humility/admiration |

These are revision directions, **not finished replacement questions**. Draft complete stems, four options, uniquely supported keys, explanations and traps; then independently reread each against its passage. Do not merely swap “means” for “suggests” while retaining synonym options.

**Keep contextual/figurative tasks rather than deleting all RC-VOC records:** bank ELA-RC-140, 146, 152, 158, 164, 170; diagnostic RC-DX-INF1-Q2, RC-DX-INF2-Q3, RC-DX-LIT-Q2, RC-DX-POEM-Q3. Apply their separate feedback repairs where listed. No standalone memorized-vocabulary task was found among the 118 reading-comprehension items.

## Final acceptance gate

- Reconcile back to all **209 version rows / 205 IDs / 24 passages**; no accidental deletion or cross-version overwrite.
- Every revised MC4 item has exactly one defensible best answer; MS counts and DND/IC mappings agree with the response payload.
- Every passage quotation, paragraph/line/sentence reference and copied explanation matches the final source.
- Test presentation and scoring of each changed TEI, and test the Part A/B dependency path if retained.
- Preserve editorial status until a named reviewer approves; generate a before/after diff with item ID, version, reason and validation result.
- Separate **confirmed correctness defects**, **editorial refinements**, **conditional runtime risks** and **alignment judgments** in the implementation report. Do not describe unchanged keep items as officially approved or statistically calibrated.
