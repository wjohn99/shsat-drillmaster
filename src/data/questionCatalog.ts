/**
 * Runtime question catalog — single load path for Practice, Worksheets, Bank, and Blitz.
 *
 * Source hierarchy:
 * 1. **Tracker spreadsheet** — Jed Approved bank items in `trackerQuestions.ts`.
 * 2. **Content batches** — JSON files under content/batches. Same ID replaces the tracker row.
 * 3. **Diagnostic holdback** — items/passages from Diagnostic_100_for_John.xlsx stay
 *    reserved for `/practice/diagnostic`, except tutors can review batch revisions.
 * 4. **Legacy (not loaded):** `mockData.ts`, `converted_questions.json`.
 *
 * Provisional batch items stay in the student and demo banks. Only the Provisional label is tutor-only.
 */
import type { Form, Passage, Question } from "@/types";
import type { UserRole } from "@/types/auth";
import type { SubjectNavigation } from "@/types/navigation";
import { loadContentBatches } from "@/data/contentBatches";
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

/** Tracker first, then batches (batch wins on ID). Passages come from batches. */
function mergedPracticeBank(): { questions: Question[]; passages: Passage[] } {
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

/** Full practice bank, including provisional tutor-review items. */
export function loadFullPracticeCatalog(): QuestionCatalog {
  const bank = mergedPracticeBank();
  return buildQuestionCatalog(bank.questions, bank.passages);
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

/** Diagnostic exam only. Do not pass this catalog into Practice, Worksheets, Bank, or Blitz. */
export function loadDiagnosticQuestionCatalog(): QuestionCatalog {
  return buildQuestionCatalog(diagnosticQuestions, diagnosticPassages);
}

export function getFilteredQuestions(
  filters: QuestionFilterInput,
  catalog: Question[],
): Question[] {
  return filterQuestions(filters, catalog);
}
