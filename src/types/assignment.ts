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
}

export interface StudentOption {
  uid: string;
  displayName: string;
  email: string;
  lastActiveAt?: Timestamp;
}

export interface TutorAssignmentRow extends WorksheetAssignment {
  studentName: string;
}
