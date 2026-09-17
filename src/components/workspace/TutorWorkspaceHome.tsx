import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { workspaceBoardAccentColor } from "@/lib/workspaceBoardColors";
import { fetchAssignmentsForTutor } from "@/lib/assignmentService";
import { pickLatestCompletedAssignment } from "@/lib/dashboardStats";
import { firstAndLatestDiagnostic } from "@/lib/diagnosticReport";
import { fetchPracticeSessionsForTutor } from "@/lib/practiceSessionService";
import { fetchAllWorkspaceBoards } from "@/lib/workspaceService";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { WorkspaceBoard } from "@/types/workspace";
import { assignToStudentNavState, WORKSPACE_HOME_PATH } from "@/types/worksheetsNavigation";
import { AddStudentBoardDialog } from "./AddStudentBoardDialog";
import { StudentQuickActions } from "./StudentQuickActions";

interface TutorWorkspaceHomeProps {
  onBoardCreated?: (boardId: string) => void;
}

export function TutorWorkspaceHome({ onBoardCreated }: TutorWorkspaceHomeProps) {
  const [boards, setBoards] = useState<WorkspaceBoard[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const loadBoards = async () => {
    setLoading(true);
    setError(null);
    try {
      const [boardRows, sessionRows, assignmentRows] = await Promise.all([
        fetchAllWorkspaceBoards(),
        fetchPracticeSessionsForTutor().catch(() => [] as PracticeSessionRecord[]),
        fetchAssignmentsForTutor().catch(() => [] as WorksheetAssignment[]),
      ]);
      setBoards(boardRows);
      setSessions(sessionRows);
      setAssignments(assignmentRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspace boards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBoards();
  }, []);

  const lastSessionByStudent = useMemo(() => {
    const map = new Map<string, PracticeSessionRecord>();
    for (const session of sessions) {
      if (!map.has(session.userId)) map.set(session.userId, session);
    }
    return map;
  }, [sessions]);

  const lastCompletedByStudent = useMemo(() => {
    const map = new Map<string, WorksheetAssignment>();
    const byStudent = new Map<string, WorksheetAssignment[]>();
    for (const assignment of assignments) {
      const list = byStudent.get(assignment.assignedToStudentUid) ?? [];
      list.push(assignment);
      byStudent.set(assignment.assignedToStudentUid, list);
    }
    for (const [uid, list] of byStudent) {
      const latest = pickLatestCompletedAssignment(list);
      if (latest) map.set(uid, latest);
    }
    return map;
  }, [assignments]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workspace"
        description="One workspace per student. All tutors can view and edit; students only see their own."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link
                to="/worksheets"
                state={assignToStudentNavState(undefined, { returnTo: WORKSPACE_HOME_PATH })}
              >
                Assign worksheet
              </Link>
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add student
            </Button>
          </>
        }
      />

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      ) : boards.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="space-y-3 py-10 text-center">
            <p className="font-medium">No workspaces yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Add a student who has signed in to create their workspace with default lists
              (Session Summaries and Info).
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add student
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((board) => {
            const accent = workspaceBoardAccentColor(board.color);
            return (
              <Card
                key={board.id}
                className="h-full overflow-hidden"
              >
                <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
                <CardHeader>
                  <div className="flex items-center gap-2 min-w-0">
                    <span
                      className="h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: accent }}
                      aria-hidden
                    />
                    <CardTitle className="text-lg truncate">{board.studentName}</CardTitle>
                  </div>
                  {board.studentEmail ? (
                    <p className="text-sm text-muted-foreground truncate">{board.studentEmail}</p>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <StudentQuickActions
                    studentUid={board.studentUid}
                    lastSession={lastSessionByStudent.get(board.studentUid)}
                    lastCompletedAssignment={lastCompletedByStudent.get(board.studentUid)}
                    firstDiagnostic={firstAndLatestDiagnostic(sessions, board.studentUid).first}
                    latestDiagnostic={firstAndLatestDiagnostic(sessions, board.studentUid).latest}
                    returnTo={WORKSPACE_HOME_PATH}
                  />
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <AddStudentBoardDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={(boardId) => {
          void loadBoards();
          onBoardCreated?.(boardId);
        }}
      />
    </div>
  );
}
