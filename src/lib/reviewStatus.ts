import type { Question, ReviewStatus } from "@/types";
import type { QuestionReviewState } from "@/types/questionReview";

/** Missing reviewStatus is final. Tracker and original diagnostic items were already reviewed. */
export function questionReviewStatus(question: Question): ReviewStatus {
  return question.reviewStatus === "provisional" ? "provisional" : "final";
}

export function isProvisionalQuestion(question: Question): boolean {
  return questionReviewStatus(question) === "provisional";
}

/** Jed's final approval overlays the static catalog and removes the Provisional tag. */
export function applyJedApprovalsToQuestions(
  questions: Question[],
  states: Map<string, QuestionReviewState>,
): Question[] {
  if (states.size === 0) return questions;
  let changed = false;
  const next = questions.map((question) => {
    const state = states.get(question.id);
    if (!state?.jedApproved || question.reviewStatus !== "provisional") {
      return question;
    }
    changed = true;
    return { ...question, reviewStatus: "final" as const };
  });
  return changed ? next : questions;
}

export function needsJedApproval(
  question: Question,
  state?: QuestionReviewState | null,
): boolean {
  if (state?.jedApproved) return false;
  if (!isProvisionalQuestion(question)) return false;
  return Boolean(state?.awaitingJedApproval || (state?.reviewerUids.length ?? 0) > 0);
}

/** Provisional items that no tutor has reviewed yet. */
export function needsTutorReview(
  question: Question,
  state?: QuestionReviewState | null,
): boolean {
  return isProvisionalQuestion(question) && !needsJedApproval(question, state);
}
