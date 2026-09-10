import type { Question, QuestionModule } from "@/types";

/** Normalized row for session analytics (Blitz, worksheets, etc.). */
export interface SessionAnalyticsEvent {
  questionId: string;
  subject: Question["subject"];
  module: QuestionModule;
  correct: boolean;
  elapsedSeconds: number;
  tags: string[];
}
