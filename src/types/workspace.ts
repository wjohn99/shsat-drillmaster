import type { Timestamp } from "firebase/firestore";

export type WorkspaceListKind = "sessions" | "tests" | "info" | "custom";

export interface WorkspaceBoard {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  createdByUid: string;
  createdAt: Timestamp;
  archivedAt?: Timestamp | null;
  deletedAt?: Timestamp | null;
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
  /** Google Drive, Dropbox, etc. — stored in Firestore only (no Storage billing). */
  externalUrl?: string | null;
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

export const DEFAULT_WORKSPACE_LISTS: { title: string; kind: WorkspaceListKind; position: number }[] =
  [
    { title: "Session Summaries", kind: "sessions", position: 0 },
    { title: "Info", kind: "info", position: 1 },
  ];
