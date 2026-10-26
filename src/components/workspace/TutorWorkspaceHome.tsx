import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Loader2, Pencil, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/PageHeader";
import { workspaceBoardAccentColor } from "@/lib/workspaceBoardColors";
import { fetchAssignmentsForTutor, fetchTutors } from "@/lib/assignmentService";
import { pickLatestCompletedAssignment } from "@/lib/dashboardStats";
import { firstAndLatestDiagnostic } from "@/lib/diagnosticReport";
import { fetchPracticeSessionsForTutor } from "@/lib/practiceSessionService";
import {
  fetchAllWorkspaceBoards,
  isDemoAccountBoard,
  resolvedAssignedTutorUid,
} from "@/lib/workspaceService";
import { ensureDemoSandbox } from "@/lib/demoSandbox";
import { useAuth } from "@/contexts/AuthContext";
import type { TutorOption, WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { WorkspaceBoard } from "@/types/workspace";
import { assignToStudentNavState, WORKSPACE_HOME_PATH } from "@/types/worksheetsNavigation";
import { AddStudentBoardDialog } from "./AddStudentBoardDialog";
import { AttentionStatusLabel } from "./AttentionStatusLabel";
import { EditBoardDetailsDialog } from "./EditBoardDetailsDialog";
import { StudentQuickActions } from "./StudentQuickActions";

interface TutorWorkspaceHomeProps {
  onBoardCreated?: (boardId: string) => void;
  /** Parents can open every board, without tutor actions. */
  readOnly?: boolean;
}

export function TutorWorkspaceHome({ onBoardCreated, readOnly = false }: TutorWorkspaceHomeProps) {
  const { profile } = useAuth();
  const isDemo = profile?.role === "demo";
  const [boards, setBoards] = useState<WorkspaceBoard[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([]);
  const [tutors, setTutors] = useState<TutorOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editingBoard, setEditingBoard] = useState<WorkspaceBoard | null>(null);

  const loadBoards = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (isDemo && profile?.uid) {
        const boardRows = await ensureDemoSandbox(profile.uid);
        const assignmentRows = await fetchAssignmentsForTutor().catch(
          () => [] as WorksheetAssignment[],
        );
        const sandboxUids = new Set(boardRows.map((board) => board.studentUid));
        setBoards(boardRows);
        setSessions([]);
        setAssignments(
          assignmentRows.filter((assignment) => sandboxUids.has(assignment.assignedToStudentUid)),
        );
        setTutors([]);
        return;
      }
      const [boardRows, sessionRows, assignmentRows, tutorRows] = await Promise.all([
        fetchAllWorkspaceBoards(),
        readOnly
          ? Promise.resolve([] as PracticeSessionRecord[])
          : fetchPracticeSessionsForTutor().catch(() => [] as PracticeSessionRecord[]),
        readOnly
          ? Promise.resolve([] as WorksheetAssignment[])
          : fetchAssignmentsForTutor().catch(() => [] as WorksheetAssignment[]),
        fetchTutors().catch(() => [] as TutorOption[]),
      ]);
      setBoards(boardRows.filter((board) => !isDemoAccountBoard(board, profile?.uid)));
      setSessions(sessionRows);
      setAssignments(assignmentRows);
      setTutors(tutorRows);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspace boards.");
    } finally {
      setLoading(false);
    }
  }, [isDemo, profile?.uid, readOnly]);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

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
          readOnly ? undefined : (
          <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto">
            <Button variant="outline" className="w-full sm:w-auto" asChild>
              <Link
                to="/worksheets"
                state={assignToStudentNavState(undefined, { returnTo: WORKSPACE_HOME_PATH })}
              >
                Assign worksheet
              </Link>
            </Button>
            {isDemo ? null : (
            <Button className="w-full sm:w-auto" onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add student
            </Button>
            )}
          </div>
          )
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
              {readOnly
                ? "No student workspaces yet."
                : "Add a student who has signed in to create their workspace."}
            </p>
            {readOnly || isDemo ? null : (
            <Button onClick={() => setAddOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" />
              Add student
            </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-10">
          {boardsByTutor.map((group) => (
            <section key={group.uid} className="space-y-4">
              <div className="flex items-end justify-between gap-3 border-b border-border/70 pb-2">
                <h2 className="text-lg font-semibold tracking-tight">{group.name}</h2>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {group.boards.length} {group.boards.length === 1 ? "board" : "boards"}
                </p>
              </div>
              <div data-tour="sample-boards" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {group.boards.map((board, boardIndex) => {
                  const isTourBoard = group === boardsByTutor[0] && boardIndex === 0;
                  const accent = workspaceBoardAccentColor(board.color);
                  const diagnostic = firstAndLatestDiagnostic(sessions, board.studentUid);
                  const lastSession = lastSessionByStudent.get(board.studentUid);
                  return (
                    <Card
                      key={board.id}
                      className="group flex min-h-[9.5rem] overflow-hidden transition-[transform,box-shadow] duration-300 ease-out motion-safe:sm:hover:-translate-y-1 hover:shadow-[0_18px_36px_-16px_hsl(220_40%_16%/0.28),inset_0_1px_0_hsl(0_0%_100%/0.72)] sm:min-h-44"
                    >
                      <div
                        className="w-1.5 shrink-0"
                        style={{ backgroundColor: accent }}
                        aria-hidden
                      />
                      <div className="flex min-w-0 flex-1 flex-col">
                        <div
                          className="relative flex flex-1"
                          style={{
                            backgroundImage: `linear-gradient(180deg, ${accent}24 0%, transparent 100%)`,
                          }}
                        >
                          <Link
                            to={`/workspace/${board.studentUid}`}
                            data-tour={isTourBoard ? "sample-board-link" : undefined}
                            aria-label={`Open ${board.studentName}`}
                            className="absolute inset-0 z-[1] rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          />
                          <div className="pointer-events-none relative z-[2] flex w-full items-start gap-2 px-4 py-5">
                            <div className="min-w-0 flex-1">
                              <CardTitle className="truncate text-xl">{board.studentName}</CardTitle>
                              {board.studentEmail ? (
                                <p className="mt-1 truncate text-sm text-muted-foreground">
                                  {board.studentEmail}
                                </p>
                              ) : null}
                            </div>
                            <div className="flex shrink-0 flex-col items-end gap-2">
                              <AttentionStatusLabel status={board.roadmap.status} />
                              {readOnly ? null : (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="pointer-events-auto h-8 w-8 text-muted-foreground max-sm:h-10 max-sm:w-10"
                                  title="Edit name and color"
                                  onClick={() => setEditingBoard(board)}
                                >
                                  <Pencil className="h-3.5 w-3.5" />
                                  <span className="sr-only">Edit name and color</span>
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                        {readOnly ? null : (
                          <div className="border-t border-border/70 bg-background/50 px-3 py-4">
                            <StudentQuickActions
                              compact
                              studentUid={board.studentUid}
                              studentName={board.studentName}
                              studentEmail={board.studentEmail}
                              lastSession={lastSession}
                              lastCompletedAssignment={lastCompletedByStudent.get(board.studentUid)}
                              firstDiagnostic={diagnostic.first}
                              latestDiagnostic={diagnostic.latest}
                              showOpenBoard={false}
                              showFirstDiagnostic={false}
                              returnTo={WORKSPACE_HOME_PATH}
                            />
                          </div>
                        )}
                      </div>
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
