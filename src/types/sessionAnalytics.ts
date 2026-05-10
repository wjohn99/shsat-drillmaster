import type { Difficulty, Question } from "@/types";

/** Normalized row for session analytics (Blitz, worksheets, etc.). */
export interface SessionAnalyticsEvent {
  questionId: string;
  subject: Question["subject"];
  difficulty: Difficulty;
  correct: boolean;
  elapsedSeconds: number;
  tags: string[];
}
