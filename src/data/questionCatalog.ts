/**
 * Runtime question catalog — single load path for Practice, Worksheets, Bank, and Blitz.
 *
 * Source hierarchy:
 * 1. **Tracker spreadsheet** — Jed Approved bank items in `trackerQuestions.ts`.
 * 2. **Content batches** — JSON files under content/batches. Same ID replaces the tracker row.
 * 3. **Diagnostic holdback** — items/passages from Diagnostic_100_for_John.xlsx stay
 *    reserved for `/practice/diagnostic`, except tutors can review batch revisions.
 * 4. **Audited revisions** — content/revisions/<track>/*.json replace a record by ID within
 *    its own track (bank or diagnostic). Originals stay untouched in their source files.
 * 5. **Grade 8 scope holds** — content/scope/grade8-holds.json. Held versions are excluded
 *    from every current pool and kept for review via `loadHeldAdvancedArchive()`.
 * 6. **Legacy (not loaded):** `mockData.ts`, `converted_questions.json`.
 *
 * Provisional batch items stay in the student and demo banks. Only the Provisional label is tutor-only.
 */
import type { Form, Passage, Question } from "@/types";
import type { UserRole } from "@/types/auth";
import type { SubjectNavigation } from "@/types/navigation";
import { loadContentBatches } from "@/data/contentBatches";
import { overlayRevisions, passageRevisions, questionRevisions } from "@/data/contentRevisions";
import { annotateScopeHolds, GRADE8_SCOPE_HOLDS, isHeldFromCurrentProduct } from "@/data/scopeHolds";
import { normalizeQuestionTags } from "@/data/taggingScheme";
import { buildNavigationData } from "@/data/navigationData";
import { diagnosticPassages } from "@/data/diagnosticPassages";
import { diagnosticQuestions } from "@/data/diagnosticQuestions";
import { trackerQuestions } from "@/data/trackerQuestions";
import { isQuestionVisibleToViewer } from "@/lib/questionVisibility";
import { filterQuestions, type QuestionFilterInput } from "@/lib/questionFilters";

export type QuestionCatalog = {
  questions: Question[];
  passages: Passage[];
  forms: Form[];
  navigationData: SubjectNavigation[];
};

function buildForms(questions: Question[]): Form[] {
  return [
    {
      id: "form-1",
      name: "Ratios & Proportions Drill",
      description: "Practice problems focusing on ratios, proportions, and percent calculations",
      questions: questions.filter((q) => q.tags.some((t) => t.code === "NUM-RAT")),
      timeLimit: 15,
    },
    {
      id: "form-2",
      name: "ELA Inference Practice",
      description: "Reading comprehension questions that require making inferences from text",
      questions: questions.filter((q) => q.tags.some((t) => t.code === "RC-INF")),
      timeLimit: 20,
    },
  ];
}

/** Tracker first, then batches (batch wins on ID). Passages come from batches. Version 1 only. */
function originalPracticeBank(): { questions: Question[]; passages: Passage[] } {
  const batches = loadContentBatches();
  const questionsById = new Map<string, Question>();
  for (const question of trackerQuestions) {
    questionsById.set(question.id, question);
  }
  for (const question of batches.questions) {
    questionsById.set(question.id, question);
  }
  return {
    questions: [...questionsById.values()],
    passages: batches.passages,
  };
}

/** Current bank: originals with bank revisions applied and scope holds annotated. Includes held versions. */
export function loadRevisedBank(): { questions: Question[]; passages: Passage[] } {
  const original = originalPracticeBank();
  return {
    questions: annotateScopeHolds(
      overlayRevisions(original.questions, questionRevisions("bank")),
      "bank",
    ),
    passages: overlayRevisions(original.passages, passageRevisions("bank")),
  };
}

export function buildQuestionCatalog(
  rawQuestions: Question[],
  rawPassages: Passage[] = [],
): QuestionCatalog {
  const questions = rawQuestions.map((q) => ({
    ...q,
    tags: normalizeQuestionTags(q),
  }));

  const passages: Passage[] = rawPassages.map((passage) => ({
    ...passage,
    questions: questions.filter((q) => q.passageId === passage.id),
  }));

  return {
    questions,
    passages,
    forms: buildForms(questions),
    navigationData: buildNavigationData(questions),
  };
}

/**
 * Full current practice bank, including provisional tutor-review items.
 * Grade 8 scope-held versions are excluded here, so no practice, bank, worksheet,
 * Blitz, or assigned-set path can serve them.
 */
export function loadFullPracticeCatalog(): QuestionCatalog {
  const bank = loadRevisedBank();
  const questions = bank.questions.filter((question) => !isHeldFromCurrentProduct(question));
  return buildQuestionCatalog(questions, bank.passages);
}

/**
 * Held advanced originals, kept for review and a possible future Grade 9 test-taker product.
 * Not used by any current student, demo, or tutor pool.
 */
export function loadHeldAdvancedArchive(): { track: "bank" | "diagnostic"; question: Question }[] {
  const bankOriginals = new Map(originalPracticeBank().questions.map((q) => [q.id, q]));
  const diagnosticOriginals = new Map(diagnosticQuestions.map((q) => [q.id, q]));
  return GRADE8_SCOPE_HOLDS.flatMap((entry) => {
    const source = entry.track === "bank" ? bankOriginals : diagnosticOriginals;
    const original = source.get(entry.id);
    if (!original) return [];
    return [{ track: entry.track, question: annotateScopeHolds([original], entry.track)[0] }];
  });
}

export function filterCatalogForViewer(
  catalog: QuestionCatalog,
  role?: UserRole | null,
): QuestionCatalog {
  const questions = catalog.questions.filter((question) =>
    isQuestionVisibleToViewer(question, role),
  );
  const passageIds = new Set(
    questions.map((question) => question.passageId).filter((id): id is string => Boolean(id)),
  );
  const passages = catalog.passages.filter((passage) => passageIds.has(passage.id));
  return buildQuestionCatalog(questions, passages);
}

/** Practice catalog for a viewer. Omit role to get the student-safe bank. */
export async function loadQuestionCatalog(
  role?: UserRole | null,
): Promise<QuestionCatalog> {
  return filterCatalogForViewer(loadFullPracticeCatalog(), role);
}

export function loadQuestionCatalogSync(role?: UserRole | null): QuestionCatalog {
  return filterCatalogForViewer(loadFullPracticeCatalog(), role);
}

/**
 * Diagnostic exam only. Do not pass this catalog into Practice, Worksheets, Bank, or Blitz.
 * Diagnostic revisions replace a slot's record in place (same ID, same position); held versions
 * are annotated, and `assembleDiagnosticExam` refuses to serve them.
 */
export function loadDiagnosticQuestionCatalog(): QuestionCatalog {
  const questions = annotateScopeHolds(
    overlayRevisions(diagnosticQuestions, questionRevisions("diagnostic")),
    "diagnostic",
  );
  const passages = overlayRevisions(diagnosticPassages, passageRevisions("diagnostic"));
  return buildQuestionCatalog(questions, passages);
}

export function getFilteredQuestions(
  filters: QuestionFilterInput,
  catalog: Question[],
): Question[] {
  return filterQuestions(filters, catalog);
}
