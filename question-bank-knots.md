# Question bank knots

- App still reads `src/data/mockData.ts`. Firebase is auth/sessions/assignments/workspace only. Tracker/Google Sheet is the content source of truth. Marking Approved does not import anything.
- ScoreSmart `q9+` batch (plus seed `q1`–`q8` and the gardening TEI set) is scaffolding. Tracker IDs (`ELA-*` / `MATH-*`) are the corpus. Strip the rest before beta if original-only stands.
- `Question` has no `module`, no `commonTrap`, no per-choice explanations. Form/sheet already has Module + Common Trap + one explanation. In-app explanation is `solutionExplanation` on some TEI specs only.
- Sync array is a clean seam, not a rewrite. All ~13 consumers import → filter/find → render. Real knots: `navigationData.ts`, `forms`, passage wiring, homepage count — they compute at module load. Plan: `useQuestions()` (or context) that loads once, plus loading gates. Weeks, not months. Do not mix this with building the sheet→Firebase pipeline.
- Sequencing: extend `Question` with optional fields first (`src/types/index.ts` — hours, not the 13 files). Then `useQuestions()` owns the 13 consumers. Field UI (trap / per-choice explanations) waits on that PR or only touches `Question.tsx` + session runner after. Do not have two people in the 13 files the same week. Schema and hook can otherwise run in parallel.
