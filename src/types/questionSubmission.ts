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
  passage: string;
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
 * Maps to columns B–R (A Question ID is assigned by Apps Script).
 * S Error and T Suggested Change are manual-only — not written by the form.
 */
export interface QuestionSubmissionPayload {
  /** D Type — RC, RE, REB, ALG, etc. Also used for Question ID generation. */
  type: QuestionSubmissionType;
  /** B Passage ID */
  passageId: string;
  /** C Author */
  author: string;
  /** E Module */
  module: string;
  /** F Skill Tag — canonical codes, e.g. RC-INF; RE-SEN */
  skillTag: string;
  /** G Format */
  format: string;
  /** H Passage */
  passage: string;
  /** I Question */
  question: string;
  /** J–M Choice A–D */
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  /** N Correct Answer */
  correctAnswer: string;
  /** O Explanation */
  explanation: string;
  /** P Common Trap */
  commonTrap: string;
  /** Q Reviewer — always blank from form */
  reviewer: string;
  /** R Status */
  status: QuestionSubmissionStatus;
}

export interface QuestionSubmissionResult {
  questionId: string;
  /** True when the row likely reached the sheet but the browser couldn't read the response. */
  pending?: boolean;
}

export const DEFAULT_SUBMISSION_STATUS: QuestionSubmissionStatus = "In Review";
