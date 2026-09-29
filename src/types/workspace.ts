import type { Timestamp } from "firebase/firestore";

export type WorkspaceListKind = "sessions" | "tests" | "info" | "custom";

export type StudentAttentionStatus =
  | "follow_up"
  | "next_session"
  | "active_work"
  | "on_track";

export const ATTENTION_STATUS_LABEL: Record<StudentAttentionStatus, string> = {
  follow_up: "Follow-up needed",
  next_session: "Next session",
  active_work: "Active assignment",
  on_track: "On track",
};

export const ATTENTION_STATUS_ORDER: StudentAttentionStatus[] = [
  "follow_up",
  "next_session",
  "active_work",
  "on_track",
];

export interface RoadmapFollowUp {
  id: string;
  text: string;
  open: boolean;
  createdAtMs: number;
}

/** Tutor-owned plan fields on the student board. Live scores/sessions are joined at read time. */
export interface StudentRoadmap {
  /** Tutor override; empty falls back to first diagnostic accuracy. */
  startingPoint: string;
  /** Tutor override; empty falls back to latest diagnostic accuracy. */
  currentScores: string;
  targetComposite: number | null;
  targetSchool: string;
  testDate: string;
  currentPriority: string;
  longTermPriorities: string;
  strengthsNotes: string;
  growthNotes: string;
  nextSessionDate: string;
  nextSessionTime: string;
  nextSessionNotes: string;
  followUps: RoadmapFollowUp[];
  /** Tutor-chosen status. Shown as a colored label on the workspace homepage. */
  status: StudentAttentionStatus | null;
  /** Legacy. Status is always tutor-chosen now. */
  statusManual: boolean;
}

export interface WorkspaceBoard {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  /** Hex accent (e.g. #0ea5e9) — set when the board is created. */
  color?: string;
  createdByUid: string;
  createdAt: Timestamp;
    archivedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
  /** Tutor-assigned 2x diagnostic timing. Students cannot turn this on themselves. */
  diagnosticExtendedTime?: boolean;
  roadmap: StudentRoadmap;
  /** Used to refuse stale roadmap saves from another tab. */
  roadmapUpdatedAt?: Timestamp | null;
}

export interface WorkspaceList {
  id: string;
  boardId: string;
  title: string;
  position: number;
  kind: WorkspaceListKind;
  createdAt: Timestamp;
}

export interface WorkspaceCardSessionMeta {
  studentName?: string;
  sessionDate?: string;
  startTime?: string;
  duration?: string;
  location?: string;
}

export interface WorkspaceCard {
  id: string;
  boardId: string;
  listId: string;
  title: string;
  description: string;
  sessionMeta?: WorkspaceCardSessionMeta;
  position: number;
  completed: boolean;
  dueAt?: Timestamp | null;
  /** Linked DrillMaster worksheet assignment (assigned from Worksheets tab). */
  assignmentId?: string | null;
  /** Present on cards imported from a Trello board JSON export. */
  trelloCardId?: string;
  /** Active comments (hidden when 0). */
  commentCount?: number;
  /** Active file and link attachments (hidden when 0). */
  attachmentCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  deletedAt?: Timestamp | null;
}

export type WorkspaceAttachmentKind = "link" | "file";

export interface WorkspaceCardAttachment {
  id: string;
  boardId: string;
  cardId: string;
  kind: WorkspaceAttachmentKind;
  fileName: string;
  /** External share link (Google Drive, Dropbox, etc.). */
  externalUrl?: string | null;
  /** Firebase Storage path for uploaded PDFs (`workspace/...`). */
  storagePath?: string | null;
  contentType: string;
  sizeBytes: number;
  uploadedByUid: string;
  uploadedByName: string;
  /** Optional due date for homework / external links (not DrillMaster worksheets). */
  dueAt?: Timestamp | null;
  createdAt: Timestamp;
  deletedAt?: Timestamp | null;
}

export interface WorkspaceAttachmentSubmission {
  id: string;
  boardId: string;
  cardId: string;
  attachmentId: string;
  submissionUrl: string;
  notes: string;
  submittedByUid: string;
  submittedByName: string;
  submittedAt: Timestamp;
}

export interface WorkspaceCardComment {
  id: string;
  boardId: string;
  cardId: string;
  body: string;
  authorUid: string;
  authorName: string;
  createdAt: Timestamp;
  updatedAt?: Timestamp;
  deletedAt?: Timestamp | null;
}

export type WorkspaceCardActivityType =
  | "comment"
  | "attachment_added"
  | "attachment_removed"
  | "card_updated"
  | "worksheet_assigned"
  | "worksheet_completed"
  | "attachment_submitted";

export interface WorkspaceCardActivity {
  id: string;
  boardId: string;
  cardId: string;
  type: WorkspaceCardActivityType;
  message: string;
  actorUid: string;
  actorName: string;
  createdAt: Timestamp;
}

export type CardFeedItem =
  | { kind: "comment"; data: WorkspaceCardComment }
  | { kind: "activity"; data: WorkspaceCardActivity };

