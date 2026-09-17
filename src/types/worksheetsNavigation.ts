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

export const WORKSPACE_HOME_PATH = "/workspace";

export type WorksheetsLocationState = {
  openTutorBuild?: boolean;
  openStudentBuild?: boolean;
  /** Prefill the student picker when opening the tutor builder. */
  assignToStudentUid?: string;
  autoStartAssignment?: WorksheetAssignment;
  /** When starting from a workspace card, used to log completion on that card. */
  workspaceCompletionTarget?: WorksheetsWorkspaceCompletionTarget;
  reviewAssignment?: WorksheetAssignment;
  reviewSession?: PracticeSessionRecord;
  /** Open tutor builder prefilled to assign a worksheet onto a workspace card. */
  assignToWorkspace?: WorksheetsAssignToWorkspaceState;
  /** After assign / back / exit, land here instead of worksheets home. */
  returnTo?: string;
};

export function assignToStudentNavState(
  studentUid?: string,
  options?: { returnTo?: string },
): WorksheetsLocationState {
  return {
    openTutorBuild: true,
    ...(studentUid ? { assignToStudentUid: studentUid } : {}),
    ...(options?.returnTo ? { returnTo: options.returnTo } : {}),
  };
}

export function viewLastResultsNavState(
  session?: PracticeSessionRecord | null,
  assignment?: WorksheetAssignment | null,
  options?: { returnTo?: string },
): WorksheetsLocationState | null {
  const base: WorksheetsLocationState | null =
    session && session.sessionType !== "diagnostic"
      ? { reviewSession: session }
      : assignment
        ? { reviewAssignment: assignment }
        : null;
  if (!base) return null;
  return options?.returnTo ? { ...base, returnTo: options.returnTo } : base;
}

/** Select value for creating a new workspace card when assigning a worksheet. */
export const WORKSPACE_NEW_CARD_ID = "__new__";
