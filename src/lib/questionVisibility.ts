import { diagnosticPassages } from "@/data/diagnosticPassages";
import { diagnosticQuestions } from "@/data/diagnosticQuestions";
import { DIAGNOSTIC_RESERVED_QUESTION_IDS } from "@/data/shsatDiagnosticForm";
import { isProvisionalQuestion } from "@/lib/reviewStatus";
import type { Question } from "@/types";
import type { UserRole } from "@/types/auth";

const reservedQuestionIds = new Set<string>([
  ...DIAGNOSTIC_RESERVED_QUESTION_IDS,
  ...diagnosticQuestions.map((question) => question.id),
]);

const reservedPassageIds = new Set(diagnosticPassages.map((passage) => passage.id));

export function isDiagnosticHoldbackQuestion(question: Question): boolean {
  if (reservedQuestionIds.has(question.id)) return true;
  if (question.passageId && reservedPassageIds.has(question.passageId)) return true;
  return false;
}

/**
 * Practice, Bank, Worksheets, and Blitz visibility.
 * Provisional items stay in the bank for every role. Diagnostic holdbacks stay
 * out of student and demo practice; tutors can still open batch revisions of those IDs.
 */
export function isQuestionVisibleToViewer(
  question: Question,
  role?: UserRole | null,
): boolean {
  const tutor = role === "tutor";
  if (isDiagnosticHoldbackQuestion(question)) {
    return tutor && isProvisionalQuestion(question);
  }
  return true;
}
