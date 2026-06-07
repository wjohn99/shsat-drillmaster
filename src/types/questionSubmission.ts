import type { Subject } from "@/types";

export type QuestionModule = "1" | "2";

export type QuestionSubmissionType =
  | "RC"
  | "RE"
  | "REB"
  | "ALG"
  | "GEO"
  | "NUM"
  | "APP"
  | "DAT";

export type QuestionSubmissionStatus = "In Review" | "Approved" | "Drafting";

export type QuestionFormatCode =
  | "INDY-MCQ"
  | "INDY-FIB"
  | "INDY-ATA"
  | "INDY-DND"
  | "INDY-EE"
  | "INDY-CGT"
  | "INDY-WP"
  | "INDY-IC"
  | "INDY-HS"
  | "INDY-MS"
  | "INDY-GIF";

export interface QuestionSubmissionInput {
  section: Subject;
  module: QuestionModule;
  type: QuestionSubmissionType;
  format: QuestionFormatCode;
  skillTagCodes: string[];
  author: string;
  passageId: string;
  question: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: string;
  explanation: string;
  commonTrap: string;
}

/**
 * Payload sent to the Google Sheet webhook.
 * Column order: A Question ID (assigned by script) through Q Status.
 */
export interface QuestionSubmissionPayload {
  /** Used for Question ID generation only — not written to a column. */
  type: QuestionSubmissionType;
  passageId: string;
  author: string;
  section: string;
  module: string;
  skillTag: string;
  format: string;
  question: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: string;
  explanation: string;
  commonTrap: string;
  reviewer: string;
  status: QuestionSubmissionStatus;
}

export interface QuestionSubmissionResult {
  questionId: string;
  /** True when the row likely reached the sheet but the browser couldn't read the response. */
  pending?: boolean;
}

export const DEFAULT_SUBMISSION_STATUS: QuestionSubmissionStatus = "In Review";
