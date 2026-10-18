export const JED_REVIEW_EMAIL = "jed@steppreptutoring.com";

export interface QuestionReviewEntry {
  tutorUid: string;
  tutorName: string;
  tutorEmail: string;
  approved: boolean;
  comment: string;
  suggestedEdits: string;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface QuestionReviewState {
  questionId: string;
  reviewerUids: string[];
  awaitingJedApproval: boolean;
  jedApproved: boolean;
  jedApprovedAtMs?: number;
  jedApprovedByUid?: string;
  jedApprovedByEmail?: string;
  entries: QuestionReviewEntry[];
  updatedAtMs: number;
}
