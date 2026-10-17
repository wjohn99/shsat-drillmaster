# Full math audit: Grade 8 test takers

All 183 merged-bank math versions and 50 diagnostic math versions reviewed end to end: **233 versioned records, 197 unique IDs, zero unreviewed math content records**. The audit covers 839 choices, all stems, explanations/traps, answer payloads, and graph/table data. No wrong keyed answer or multiple intended correct answers found. This is a read-only source audit, not educator sign-off or a live-site test.

Disposition: **189 keep, 25 revise, 19 hold**. Hold is a current Grade 8 audience decision, not a math-answer correction. Preserve every held original for possible future 10th-grade-entry SHSAT materials. Do not build that future mode now.

## High-priority explanation and content fixes

- Diagnostic GEO-002: stated partial-dimension error yields 108, not the listed 112; fix the whole distractor/feedback pair. Also split a false equality chain.
- Diagnostic GEO-003: distinguish coordinate displacement (6,8) from scalar distance.
- Diagnostic GEO-004: remove the claim that noninteger dimensions signal wrong work.
- Diagnostic APP-014: explicitly affirm both consistently oriented proportions; replace an unsupported rounding-error rationale.
- Bank NUM-106: 0.4 to 0.0004 is three decimal places, not four; specify mass/volume percentage basis and update all units together.
- Bank DAT-101 and DAT-116: group means do not imply every individual observation equals or falls below the mean; Thursday and Friday in DAT-116 are actually above 33.
- Bank GEO-012: multiply growth factors 1.5 × 1.5, not the two percentage increases.
- Bank ALG-001/002: missing feedback; APP-001 feedback exists only under wp and needs a verified rendering route.
- Diagnostic ALG-002 and ALG-014 have duplicate wrong solution sets; this is distractor quality, not multiple correct answers. Bank ALG-002 has the same wrong-solution duplication.
- Diagnostic APP-011 has equal leg speeds, so a wrong general averaging method also gets 60. Its key is correct; changing rates is an assessment-design revision requiring a full new version.
- GEO-108: retain after the supplied four-triangle area rewrite. Use 100=2r², then area=50π; remove Pythagorean/radical requirements from every feedback field.

Exact fixes and acceptance tests are in math-actionable-findings.csv and full detail in math-full-review.json. Optional editorial and pedagogical judgments are identified separately from factual feedback defects.

## Scope holds (16 unique IDs / 19 versions)

- MATH-ALG-001 (diagnostic): Direct parallel-line/slope knowledge
- MATH-ALG-001 (merged-bank): Direct parallel-line/slope knowledge
- MATH-ALG-006 (diagnostic): Paired simultaneous equations in formal system presentation
- MATH-ALG-006 (merged-bank): Paired simultaneous equations in formal system presentation
- MATH-ALG-105 (merged-bank): Formal substitution system
- MATH-ALG-112 (merged-bank): Formal pair of equations combined to obtain x+y
- MATH-ALG-114 (merged-bank): Assumed function notation f(a), f(2a)
- MATH-GEO-001 (diagnostic): Pythagorean theorem required to find hypotenuse and then altitude
- MATH-GEO-001 (merged-bank): Pythagorean theorem required to find hypotenuse and then altitude
- MATH-GEO-007 (merged-bank): Pythagorean theorem: find hypotenuse
- MATH-GEO-103 (merged-bank): Pythagorean theorem: ladder height
- MATH-GEO-104 (merged-bank): Pythagorean theorem: isosceles-triangle altitude
- MATH-GEO-110 (merged-bank): Direct coordinate slope calculation
- MATH-GEO-111 (merged-bank): Diagonal coordinate distance via Pythagorean reasoning
- MATH-GEO-113 (merged-bank): Diagonal coordinate distance via Pythagorean reasoning
- MATH-GEO-115 (merged-bank): Cylinder volume-to-radius then lateral surface area
- MATH-GEO-116 (merged-bank): Pythagorean theorem: rectangle side from diagonal
- MATH-NUM-110 (merged-bank): Scientific-notation operation and normalization
- MATH-NUM-111 (merged-bank): Radical equation followed by root evaluation

Evidence and uncertainty are in official-scope-evidence.md and every relevant row. Grade 9 samples establish grade separation, not permission to enable these in the current Grade 8 product. No exhaustive DOE prohibited-topic list was found; Pythagorean/radical/cylinder holds are explicit scope-review gates, not claims of a categorical ban.

## Keep distinctions that matter

- ALG-004, ALG-106, ALG-115 are ordinary one-variable/arithmetic stories despite ALG-SYS tags. Keep and retag required demand; avoid imposing a systems prerequisite.
- ALG-005 is a difference-of-bills/unit-rate calculation. ALG-107/108 are specified arithmetic sequences despite ALG-FUN tags.
- Variables on both sides and symbolic fractions appear in current official Grade 8 examples. Keep appropriate items, including ALG-021.
- APP-111 is substitution into a supplied squared formula, not quadratic solving. No required trigonometric ratios or general quadratic solving were found in the audited current math records.

## Version and implementation acceptance gates

1. Keep bank and diagnostic versions separately. All 36 overlapping math IDs differ in content, including three tracker-only overlaps omitted from the batch-only 33-item comparison.
2. Never change only the answer or copy a bank key into an older diagnostic stem. ALG-004 is 25 versus 20; APP-011 is 64 versus 60; GEO-010 is 189 versus 126 in bank versus diagnostic.
3. For every changed question, independently recompute the key and all distractor rationales, then assert exactly one correct MC answer or the stated multi-select count.
4. Check every current Grade 8 selector and export excludes held IDs/versions, including diagnostic. Preserve originals and history outside those routes. Unknown audience/review metadata must not silently publish.
5. Test rendered feedback fallbacks and full stimuli for APP-001 and DAT-DX09, which combines INDY-EE subtype with a CGT table. Verify number/fraction normalization and all DND mappings at runtime.
6. Source-only structure checks passed for answer counts, exact duplicate displayed choice text, EE answer presence, and DND references. This does not prove runtime scoring or access control.
7. A diagnostic cannot remain at 50 math items by simply deleting held questions. Any replacement, form reassembly, or scoring change needs explicit implementation review and full content re-audit.

## Unreviewed boundary

Runtime scorer/renderer, accessibility, deployed Firebase content, actual student visibility, psychometric performance, and final human educator approval were not verified. The 180 batch math records match merged-bank content exactly, and all are source-provisional; the audit itself changes no status.
