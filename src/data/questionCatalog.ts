/**
 * Runtime question catalog — single load path for Practice, Worksheets, Bank, and Blitz.
 *
 * Source hierarchy:
 * 1. **Tracker spreadsheet** — Jed Approved bank items in `trackerQuestions.ts`.
 * 2. **Diagnostic holdback** — items/passages from Diagnostic_100_for_John.xlsx are
 *    reserved for `/practice/diagnostic` and are never merged into this catalog,
 *    including tracker rows that reuse a diagnostic form ID.
 * 3. **Legacy (not loaded):** `mockData.ts`, `converted_questions.json`.
 */
import type { Form, Passage, Question } from "@/types";
import type { SubjectNavigation } from "@/types/navigation";
import { normalizeQuestionTags } from "@/data/taggingScheme";
import { buildNavigationData } from "@/data/navigationData";
import { diagnosticPassages } from "@/data/diagnosticPassages";
import { diagnosticQuestions } from "@/data/diagnosticQuestions";
import { DIAGNOSTIC_RESERVED_QUESTION_IDS } from "@/data/shsatDiagnosticForm";
import { trackerQuestions } from "@/data/trackerQuestions";
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

function diagnosticHoldbackQuestionIds(): Set<string> {
  const ids = new Set<string>(DIAGNOSTIC_RESERVED_QUESTION_IDS);
  for (const question of diagnosticQuestions) {
    ids.add(question.id);
  }
  return ids;
}

function diagnosticHoldbackPassageIds(): Set<string> {
  return new Set(diagnosticPassages.map((passage) => passage.id));
}

/** Tracker items students may practice — diagnostic form IDs and passages excluded. */
function publicPracticeQuestions(): Question[] {
  const reservedQuestions = diagnosticHoldbackQuestionIds();
  const reservedPassages = diagnosticHoldbackPassageIds();
  return trackerQuestions.filter((question) => {
    if (reservedQuestions.has(question.id)) return false;
    if (question.passageId && reservedPassages.has(question.passageId)) return false;
    return true;
  });
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

/** Practice catalog only — diagnostic form items are omitted. */
export async function loadQuestionCatalog(): Promise<QuestionCatalog> {
  return buildQuestionCatalog(publicPracticeQuestions(), []);
}

export function loadQuestionCatalogSync(): QuestionCatalog {
  return buildQuestionCatalog(publicPracticeQuestions(), []);
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
