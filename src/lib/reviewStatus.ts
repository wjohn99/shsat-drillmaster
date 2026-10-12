import type { Question, ReviewStatus } from "@/types";

export function questionReviewStatus(question: Question): ReviewStatus {
  return question.reviewStatus === "provisional" ? "provisional" : "final";
}

export function isProvisionalQuestion(question: Question): boolean {
  return questionReviewStatus(question) === "provisional";
}
