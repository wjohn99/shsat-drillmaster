import { fetchAssignmentsForTutor } from "@/lib/assignmentService";
import { fetchDiagnosticProgress } from "@/lib/diagnosticProgressService";
import { fetchPracticeSessionsForTutor } from "@/lib/practiceSessionService";
import { fetchWorkspaceBoard } from "@/lib/workspaceService";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { WorkspaceBoard } from "@/types/workspace";

export interface TutorVisibleStudentView {
  assignments: WorksheetAssignment[];
  sessions: PracticeSessionRecord[];
  board: WorkspaceBoard | null;
  diagnosticInProgress: boolean;
}

/** Assignments, submitted results, and diagnostic access a tutor can see for one student. */
export async function loadTutorVisibleStudentView(
  studentUid: string,
): Promise<TutorVisibleStudentView> {
  const [assignmentRows, sessionRows, board] = await Promise.all([
    fetchAssignmentsForTutor()
      .then((rows) => rows.filter((row) => row.assignedToStudentUid === studentUid))
      .catch(() => [] as WorksheetAssignment[]),
    fetchPracticeSessionsForTutor()
      .then((rows) => rows.filter((row) => row.userId === studentUid))
      .catch(() => [] as PracticeSessionRecord[]),
    fetchWorkspaceBoard(studentUid).catch(() => null),
  ]);

  let diagnosticInProgress = false;
  try {
    diagnosticInProgress = Boolean(await fetchDiagnosticProgress(studentUid));
  } catch {
    diagnosticInProgress = false;
  }

  return {
    assignments: assignmentRows,
    sessions: sessionRows,
    board,
    diagnosticInProgress,
  };
}
