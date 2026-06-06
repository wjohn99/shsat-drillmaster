import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";

export type WorksheetsAssignToWorkspaceState = {
  boardId: string;
  listId: string;
  /** Omit to create a new card; set to attach to this card. */
  cardId?: string;
};

export type WorksheetsWorkspaceCompletionTarget = {
  boardId: string;
  cardId: string;
};

export type WorksheetsLocationState = {
  openTutorBuild?: boolean;
  openStudentBuild?: boolean;
  autoStartAssignment?: WorksheetAssignment;
  /** When starting from a workspace card, used to log completion on that card. */
  workspaceCompletionTarget?: WorksheetsWorkspaceCompletionTarget;
  reviewAssignment?: WorksheetAssignment;
  reviewSession?: PracticeSessionRecord;
  /** Open tutor builder prefilled to assign a worksheet onto a workspace card. */
  assignToWorkspace?: WorksheetsAssignToWorkspaceState;
};

/** Select value for creating a new workspace card when assigning a worksheet. */
export const WORKSPACE_NEW_CARD_ID = "__new__";
