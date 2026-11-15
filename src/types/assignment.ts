import type { Timestamp } from "firebase/firestore";

export type AssignmentStatus = "todo" | "completed";

export interface WorksheetAssignment {
  id: string;
  questionIds: string[];
  tutorUid: string;
  assignedToStudentUid: string;
  status: AssignmentStatus;
  createdAt: Timestamp;
  completedAt?: Timestamp;
  /** End of the due date (local calendar day) in the tutor's timezone when assigned. */
  dueAt?: Timestamp | null;
  workspaceBoardId?: string | null;
  workspaceListId?: string | null;
  workspaceCardId?: string | null;
  title: string;
  tagCodes: string[];
  /**
   * When false, the student does not see correct answers or explanations
   * while taking the worksheet (cold diagnostic). Missing means show them.
   */
  revealAnswers: boolean;
  /**
   * When true, the student can jump to any question from the navigator.
   * Missing or false keeps the worksheet in order.
   */
  allowSkip?: boolean;
}

export interface StudentOption {
  uid: string;
  displayName: string;
  email: string;
  lastActiveAt?: Timestamp;
  /** Signed up from the diagnostic link. */
  diagnosticAssigned?: boolean;
}

export interface TutorOption {
  uid: string;
  displayName: string;
  email: string;
}

export interface TutorAssignmentRow extends WorksheetAssignment {
  studentName: string;
}
