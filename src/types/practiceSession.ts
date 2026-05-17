import type { Timestamp } from "firebase/firestore";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

export type PracticeSessionType = "assignment" | "self" | "tutor-preview";

export interface PracticeSessionRecord {
  id: string;
  userId: string;
  sessionType: PracticeSessionType;
  assignmentId: string | null;
  tutorUid: string | null;
  title: string;
  tagCodes: string[];
  questionIds: string[];
  questionsAnswered: number;
  correctCount: number;
  accuracyPct: number;
  totalTimeSeconds: number;
  events: SessionAnalyticsEvent[];
  completedAt: Timestamp;
}

export interface SavePracticeSessionInput {
  sessionType: PracticeSessionType;
  title: string;
  tagCodes: string[];
  questionIds: string[];
  events: SessionAnalyticsEvent[];
  assignmentId?: string | null;
  tutorUid?: string | null;
}
