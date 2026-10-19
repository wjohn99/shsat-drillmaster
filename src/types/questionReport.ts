export const QUESTION_REPORT_COMMENT_MAX = 2000;

export const QUESTION_REPORT_REASONS = [
  { id: "wrong_answer", label: "Wrong answer or explanation" },
  { id: "typo", label: "Typo or unclear wording" },
  { id: "display", label: "Broken display or formatting" },
  { id: "other", label: "Something else" },
] as const;

export type QuestionReportReason = (typeof QUESTION_REPORT_REASONS)[number]["id"];

export type QuestionReportSource =
  | "question"
  | "practice_set"
  | "worksheet"
  | "diagnostic"
  | "blitz"
  | "topic"
  | "review";

export type QuestionReportStatus = "open" | "resolved";

export type QuestionReportRole = "student" | "tutor" | "demo";

export interface QuestionReport {
  id: string;
  questionId: string;
  reporterUid: string;
  reporterName: string;
  reporterEmail: string;
  reporterRole: QuestionReportRole;
  reason: QuestionReportReason;
  comment: string;
  source: QuestionReportSource;
  status: QuestionReportStatus;
  createdAtMs: number;
  updatedAtMs: number;
  resolvedAtMs?: number;
  resolvedByUid?: string;
  resolvedByName?: string;
  contentVersion?: number;
}

export function questionReportReasonLabel(reason: QuestionReportReason): string {
  return QUESTION_REPORT_REASONS.find((item) => item.id === reason)?.label ?? reason;
}
