import type { Question, QuestionModule } from "@/types";

/** Normalized row for session analytics (Blitz, worksheets, etc.). */
export interface SessionAnalyticsEvent {
  questionId: string;
  subject: Question["subject"];
  module: QuestionModule;
  correct: boolean;
  elapsedSeconds: number;
  tags: string[];
  /** Student's submitted response, when stored (diagnostic review). */
  answer?: string;
  /**
   * Content version of the question when it was answered. Missing on older events (treat as 1).
   * Review screens use it to flag answers given to an earlier version; scores are never regraded.
   */
  contentVersion?: number;
}
