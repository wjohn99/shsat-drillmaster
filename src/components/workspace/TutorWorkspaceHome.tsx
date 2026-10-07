import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { workspaceBoardAccentColor } from "@/lib/workspaceBoardColors";
import { fetchAssignmentsForTutor, fetchTutors } from "@/lib/assignmentService";
import { pickLatestCompletedAssignment } from "@/lib/dashboardStats";
import { firstAndLatestDiagnostic } from "@/lib/diagnosticReport";
import { fetchPracticeSessionsForTutor } from "@/lib/practiceSessionService";
import { fetchAllWorkspaceBoards, resolvedAssignedTutorUid } from "@/lib/workspaceService";
import type { TutorOption, WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { WorkspaceBoard } from "@/types/workspace";
import { assignToStudentNavState, WORKSPACE_HOME_PATH } from "@/types/worksheetsNavigation";
import { AddStudentBoardDialog } from "./AddStudentBoardDialog";
import { AssignedTutorSelect } from "./AssignedTutorSelect";
import { AttentionStatusLabel } from "./AttentionStatusLabel";
import { EditBoardDetailsDialog } from "./EditBoardDetailsDialog";
import { StudentQuickActions } from "./StudentQuickActions";

interface TutorWorkspaceHomeProps {
  onBoardCreated?: (boardId: string) => void;
}

export function TutorWorkspaceHome({ onBoardCreated }: TutorWorkspaceHomeProps) {
  const [boards, setBoards] = useState<WorkspaceBoard[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([]);
  const [tutors, setTutors] = useState<TutorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<WorkspaceBoard | null>(null);

  const loadBoards = async () => {
    setLoading(true);
    setError(null);
    try {
      const [boardRows, sessionRows, assignmentRows, tutorRows] = await Promise.all([
        fetchAllWorkspaceBoards(),
        fetchPracticeSessionsForTutor().catch(() => [] as PracticeSessionRecord[]),
        fetchAssignmentsForTutor().catch(() => [] as WorksheetAssignment[]),
        fetchTutors().catch(() => [] as TutorOption[]),
      ]);
      setBoards(boardRows);
      setSessions(sessionRows);
      setAssignments(assignmentRows);
      setTutors(tutorRows);
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

  const boardsByTutor = useMemo(() => {
    const nameFor = (board: WorkspaceBoard) => {
      const uid = resolvedAssignedTutorUid(board);
      const tutor = tutors.find((row) => row.uid === uid);
      return tutor?.displayName || board.assignedTutorName || "Unassigned";
    };
    const groups = new Map<string, { uid: string; name: string; boards: WorkspaceBoard[] }>();
    for (const board of boards) {
      const uid = resolvedAssignedTutorUid(board) || "unassigned";
      const current = groups.get(uid);
      if (current) {
        current.boards.push(board);
      } else {
        groups.set(uid, { uid, name: nameFor(board), boards: [board] });
      }
    }
    return [...groups.values()]
      .map((group) => ({
        ...group,
        boards: [...group.boards].sort((a, b) => a.studentName.localeCompare(b.studentName)),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [boards, tutors]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Workspace"
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
              Add a student who has signed in to create their workspace.
            </p>
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add student
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {boardsByTutor.map((group) => (
            <section key={group.uid} className="space-y-3">
              <div className="flex items-baseline justify-between gap-3 px-1">
                <h2 className="text-sm font-semibold tracking-tight">{group.name}</h2>
                <p className="text-xs text-muted-foreground">
                  {group.boards.length} {group.boards.length === 1 ? "board" : "boards"}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {group.boards.map((board) => {
                  const accent = workspaceBoardAccentColor(board.color);
                  const diagnostic = firstAndLatestDiagnostic(sessions, board.studentUid);
                  return (
                    <Card key={board.id} className="h-full overflow-hidden">
                      <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 space-y-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="h-3 w-3 shrink-0 rounded-full"
                                style={{ backgroundColor: accent }}
                                aria-hidden
                              />
                              <CardTitle className="text-lg truncate">{board.studentName}</CardTitle>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 shrink-0"
                                title="Edit name and color"
                                onClick={() => setEditingBoard(board)}
                              >
                                <Pencil className="h-3.5 w-3.5" />
                                <span className="sr-only">Edit name and color</span>
                              </Button>
                            </div>
                            {board.studentEmail ? (
                              <p className="text-sm text-muted-foreground truncate">
                                {board.studentEmail}
                              </p>
                            ) : null}
                            <AssignedTutorSelect
                              board={board}
                              tutors={tutors}
                              compact
                              onAssigned={(next) => {
                                setBoards((prev) =>
                                  prev.map((row) =>
                                    row.id === board.id ? { ...row, ...next } : row,
                                  ),
                                );
                              }}
                            />
                          </div>
                          <AttentionStatusLabel status={board.roadmap.status} />
                        </div>
                      </CardHeader>
                      <CardContent>
                        <StudentQuickActions
                          studentUid={board.studentUid}
                          lastSession={lastSessionByStudent.get(board.studentUid)}
                          lastCompletedAssignment={lastCompletedByStudent.get(board.studentUid)}
                          firstDiagnostic={diagnostic.first}
                          latestDiagnostic={diagnostic.latest}
                          returnTo={WORKSPACE_HOME_PATH}
                        />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </section>
          ))}
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
      <EditBoardDetailsDialog
        board={editingBoard}
        open={Boolean(editingBoard)}
        onOpenChange={(open) => {
          if (!open) setEditingBoard(null);
        }}
        onSaved={({ studentName, color }) => {
          setBoards((prev) =>
            prev
              .map((row) =>
                row.id === editingBoard?.id ? { ...row, studentName, color } : row,
              )
              .sort((a, b) => a.studentName.localeCompare(b.studentName)),
          );
        }}
      />
    </div>
  );
}
