/**
 * Runtime question catalog — single load path for the application.
 *
 * Source hierarchy (do not merge at runtime):
 * 1. **Tracker spreadsheet** — source of truth; Jed Approved rows are imported into
 *    `trackerQuestions.ts` via scripts (not fetched live yet).
 * 2. **trackerQuestions.ts** — the only data file the app reads.
 * 3. **Legacy (not loaded):** `mockData.ts` (deprecated re-export), `converted_questions.json`
 *    (old ScoreSmart conversion artifact for scripts only).
 */
import type { Form, Passage, Question } from "@/types";
import type { SubjectNavigation } from "@/types/navigation";
import { normalizeQuestionTags } from "@/data/taggingScheme";
import { buildNavigationData } from "@/data/navigationData";
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

export function buildQuestionCatalog(rawQuestions: Question[]): QuestionCatalog {
  const questions = rawQuestions.map((q) => ({
    ...q,
    tags: normalizeQuestionTags(q),
  }));

  const passages: Passage[] = [];
  for (const passage of passages) {
    passage.questions = questions.filter((q) => q.passageId === passage.id);
  }

  return {
    questions,
    passages,
    forms: buildForms(questions),
    navigationData: buildNavigationData(questions),
  };
}

/** Loads the catalog from tracker-approved imports. Async seam for future live sheet fetch. */
export async function loadQuestionCatalog(): Promise<QuestionCatalog> {
  return buildQuestionCatalog(trackerQuestions);
}

export function loadQuestionCatalogSync(): QuestionCatalog {
  return buildQuestionCatalog(trackerQuestions);
}

export function getFilteredQuestions(
  filters: QuestionFilterInput,
  catalog: Question[],
): Question[] {
  return filterQuestions(filters, catalog);
}
