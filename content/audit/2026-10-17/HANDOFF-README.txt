DrillMaster Claude Code implementation handoff
Prepared October 17, 2026

Start here
1. Extract this ZIP next to your local DrillMaster checkout, or otherwise make the extracted folder available to Claude Code.
2. Paste CLAUDE_CODE_IMPLEMENTATION_PROMPT.txt into Claude Code and point it to the extracted folder and repository.
3. The prompt requests local implementation and testing, preservation of originals/history, and no automatic deployment, Firebase import, publication or human approval.

What is included
- CLAUDE_CODE_IMPLEMENTATION_PROMPT.txt: complete paste-ready implementation request.
- math/: all 233 reviewed math versions, actionable findings, exact fixes and tests.
- ela/: all 209 reviewed ELA versions, passage findings, nine vocabulary-style rewrite directions, and exact fixes/tests.
- evidence/: source commit/paths, ID/version reconciliation, selected historical comparison and current official scope evidence with direct source links.
- coverage/: a single 442-row version index and verified coverage summary.
- PACKAGE_MANIFEST.json: file sizes and SHA-256 checksums for package integrity.

Coverage and limits
442 reviewed content versions cover 402 unique current IDs. All 40 bank/diagnostic overlapping IDs were reviewed as separate content versions. The index normalizes merged-bank to bank only for naming; it does not merge question content. The evidence reconciliation has one extra archival workbook-only ID, ELA-REB-009, which is not part of the current 402-ID corpus.

This is a source snapshot audit of commit 9f58bd15fb5cd9a06983a3f906f05985b27d4a7e. It is not verification of live Firebase data, current deployment, runtime correctness, statistical calibration, copyright clearance or educator approval. The source-snapshot README describes the source-reconciliation stage before content review; the completed content findings are in math/ and ela/.

Disposition counts
Math: 189 keep, 25 revise, 19 scope-held versions (16 unique held IDs).
ELA: 159 keep, 43 revise, 5 scoring holds, 2 conditional linked-part delivery holds.
Keep is a content recommendation, not approval to publish. Passage-level repairs can affect linked questions whose own item wording was otherwise kept. Some rows contain multiple findings; finding counts must not be confused with version counts.

Scope
Current product: Grade 8 test takers seeking Grade 9 entry. Preserve advanced originals for possible future Grade 9 test takers seeking Grade 10 entry, without exposing them in the current product or building that future mode now. Official practice forms are representative, not an exhaustive prohibited-topic list. Nine direct-definition items are style-fidelity rewrites; contextual/figurative language remains supported. Colon/semicolon subskill alignment is unverified, not an automatic exclusion.

No original repository or production content was edited while preparing this handoff. No official practice-test PDF corpus is bundled. Source links and concise evidence support the recommendations.
