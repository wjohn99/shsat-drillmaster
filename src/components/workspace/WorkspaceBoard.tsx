import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { workspaceBoardAccentColor } from "@/lib/workspaceBoardColors";
import {
  fetchAssignmentsForStudent,
  fetchAssignmentsForTutor,
} from "@/lib/assignmentService";
import { pickLatestCompletedAssignment } from "@/lib/dashboardStats";
import { firstAndLatestDiagnostic } from "@/lib/diagnosticReport";
import { fetchPracticeSessionsForStudent, fetchPracticeSessionsForTutor } from "@/lib/practiceSessionService";
import {
  createWorkspaceList,
  fetchWorkspaceBoard,
  fetchWorkspaceCards,
  fetchWorkspaceLists,
} from "@/lib/workspaceService";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { WorkspaceBoard as WorkspaceBoardType, WorkspaceCard, WorkspaceList } from "@/types/workspace";
import { WORKSPACE_HOME_PATH } from "@/types/worksheetsNavigation";
import { BoardListColumn } from "./BoardListColumn";
import { CardDetailModal } from "./CardDetailModal";
import { StudentQuickActions } from "./StudentQuickActions";

interface WorkspaceBoardProps {
  boardId: string;
  readOnly?: boolean;
  showBackLink?: boolean;
}

export function WorkspaceBoard({ boardId, readOnly = false, showBackLink = false }: WorkspaceBoardProps) {
  const [board, setBoard] = useState<WorkspaceBoardType | null>(null);
  const [lists, setLists] = useState<WorkspaceList[]>([]);
  const [cards, setCards] = useState<WorkspaceCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<WorkspaceCard | null>(null);
  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [selectedListTitle, setSelectedListTitle] = useState<string | undefined>();
  const [addingList, setAddingList] = useState(false);
  const [newListTitle, setNewListTitle] = useState("");
  const [assignmentById, setAssignmentById] = useState<Map<string, WorksheetAssignment>>(
    () => new Map(),
  );
  const [lastSession, setLastSession] = useState<PracticeSessionRecord | null>(null);
  const [firstDiagnostic, setFirstDiagnostic] = useState<PracticeSessionRecord | null>(null);
  const [latestDiagnostic, setLatestDiagnostic] = useState<PracticeSessionRecord | null>(null);
  const [lastCompletedAssignment, setLastCompletedAssignment] =
    useState<WorksheetAssignment | null>(null);

  const loadBoard = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [boardRow, listRows, cardRows, assignmentRows, sessionRows] = await Promise.all([
        fetchWorkspaceBoard(boardId),
        fetchWorkspaceLists(boardId),
        fetchWorkspaceCards(boardId),
        readOnly
          ? fetchAssignmentsForStudent().catch(() => [] as WorksheetAssignment[])
          : fetchAssignmentsForTutor().catch(() => [] as WorksheetAssignment[]),
        readOnly
          ? fetchPracticeSessionsForStudent().catch(() => [] as PracticeSessionRecord[])
          : fetchPracticeSessionsForTutor().catch(() => [] as PracticeSessionRecord[]),
      ]);
      if (!boardRow) {
        setError("Workspace board not found.");
        return;
      }
      const studentAssignments = readOnly
        ? assignmentRows
        : assignmentRows.filter((a) => a.assignedToStudentUid === boardRow.studentUid);
      const map = new Map(studentAssignments.map((a) => [a.id, a]));
      setBoard(boardRow);
      setLists(listRows);
      setCards(cardRows);
      setAssignmentById(map);
      setLastSession(sessionRows.find((s) => s.userId === boardRow.studentUid) ?? null);
      const diagnosticPair = firstAndLatestDiagnostic(sessionRows, boardRow.studentUid);
      setFirstDiagnostic(diagnosticPair.first);
      setLatestDiagnostic(diagnosticPair.latest);
      setLastCompletedAssignment(pickLatestCompletedAssignment(studentAssignments));
      setSelectedCard((prev) => {
        if (!prev) return prev;
        return cardRows.find((c) => c.id === prev.id) ?? prev;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspace.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [boardId, readOnly]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const handleAddList = async () => {
    const title = newListTitle.trim();
    if (!title) return;
    await createWorkspaceList(boardId, title);
    setNewListTitle("");
    setAddingList(false);
    await loadBoard();
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !board) {
    return (
      <div className="text-center py-16 text-muted-foreground">
        <p>{error ?? "Board not found."}</p>
        {showBackLink ? (
          <Button variant="outline" className="mt-4" asChild>
            <Link to="/workspace">Back to Workspace</Link>
          </Button>
        ) : null}
      </div>
    );
  }

  const boardAccent = workspaceBoardAccentColor(board.color);

  return (
    <>
      <div className="flex items-start justify-between gap-4 mb-4 px-1 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          {showBackLink ? (
            <Button variant="ghost" size="sm" className="shrink-0" asChild>
              <Link to="/workspace">
                <ArrowLeft className="h-4 w-4 mr-1" />
                Workspace
              </Link>
            </Button>
          ) : null}
          <div
            className="h-9 w-1.5 shrink-0 rounded-full"
            style={{ backgroundColor: boardAccent }}
            aria-hidden
          />
          <div className="min-w-0">
            <h1 className="text-xl font-bold truncate">{board.studentName}</h1>
            {board.studentEmail ? (
              <p className="text-sm text-muted-foreground truncate">{board.studentEmail}</p>
            ) : null}
          </div>
        </div>
        {!readOnly ? (
          <StudentQuickActions
            className="shrink-0 justify-end"
            studentUid={board.studentUid}
            lastSession={lastSession}
            lastCompletedAssignment={lastCompletedAssignment}
            firstDiagnostic={firstDiagnostic}
            latestDiagnostic={latestDiagnostic}
            showOpenBoard={false}
            returnTo={WORKSPACE_HOME_PATH}
          />
        ) : null}
      </div>

      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[calc(100vh-12rem)] items-start">
        {lists.map((list) => (
          <BoardListColumn
            key={list.id}
            boardId={boardId}
            list={list}
            cards={cards}
            assignmentById={assignmentById}
            readOnly={readOnly}
            onCardClick={(card) => {
              setSelectedCard(card);
              setSelectedListTitle(list.title);
              setCardModalOpen(true);
            }}
            onCardsChanged={() => void loadBoard({ silent: true })}
            onListChanged={() => void loadBoard({ silent: true })}
          />
        ))}

        {!readOnly && (
          <div className="w-72 shrink-0">
            {addingList ? (
              <div className="rounded-xl bg-muted/80 border border-border p-3 space-y-2">
                <Input
                  value={newListTitle}
                  onChange={(e) => setNewListTitle(e.target.value)}
                  placeholder="List title"
                  autoFocus
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleAddList}>
                    Add list
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setAddingList(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingList(true)}
                className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground bg-muted/80 border border-border hover:bg-accent/50 transition-colors w-full"
              >
                <Plus className="h-4 w-4" />
                Add another list
              </button>
            )}
          </div>
        )}
      </div>

      <CardDetailModal
        boardId={boardId}
        card={selectedCard}
        listTitle={selectedListTitle}
        defaultStudentName={board?.studentName}
        open={cardModalOpen}
        readOnly={readOnly}
        onOpenChange={setCardModalOpen}
        onUpdated={() => void loadBoard({ silent: true })}
      />
    </>
  );
}
