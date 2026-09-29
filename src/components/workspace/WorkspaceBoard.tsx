import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { workspaceBoardAccentColor } from "@/lib/workspaceBoardColors";
import {
  fetchAssignmentsForStudent,
  fetchAssignmentsForTutor,
} from "@/lib/assignmentService";
import { fetchDiagnosticProgress, fetchDiagnosticProgressForTutor } from "@/lib/diagnosticProgressService";
import { pickLatestCompletedAssignment } from "@/lib/dashboardStats";
import { firstAndLatestDiagnostic } from "@/lib/diagnosticReport";
import { fetchPracticeSessionsForStudent, fetchPracticeSessionsForTutor } from "@/lib/practiceSessionService";
import { buildStudentRoadmapSnapshot } from "@/lib/studentRoadmap";
import { fetchCardBadgeCounts, persistCardBadgeCounts } from "@/lib/workspaceCardContentService";
import {
  createWorkspaceList,
  fetchWorkspaceBoard,
  fetchWorkspaceCards,
  fetchWorkspaceLists,
  isWorkspaceConflictError,
  updateWorkspaceBoardDiagnosticExtendedTime,
  updateWorkspaceBoardRoadmap,
} from "@/lib/workspaceService";
import { Timestamp } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { StudentRoadmap, WorkspaceBoard as WorkspaceBoardType, WorkspaceCard, WorkspaceList } from "@/types/workspace";
import { BoardListColumn } from "./BoardListColumn";
import { CardDetailModal } from "./CardDetailModal";
import { StudentQuickActions } from "./StudentQuickActions";
import { StudentRoadmapPanel } from "./StudentRoadmapPanel";

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
  const [savingExtendedTime, setSavingExtendedTime] = useState(false);
  const [diagnosticInProgress, setDiagnosticInProgress] = useState(false);
  const [studentAssignments, setStudentAssignments] = useState<WorksheetAssignment[]>([]);
  const [studentSessions, setStudentSessions] = useState<PracticeSessionRecord[]>([]);
  const [savingRoadmap, setSavingRoadmap] = useState(false);
  const roadmapUpdatedAtMsRef = useRef(0);

  const loadBoard = useCallback(async (opts?: { silent?: boolean }) => {
    const silent = opts?.silent ?? false;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [boardRow, listRows, cardRows, assignmentRows, sessionRows, progressFlag] = await Promise.all([
        fetchWorkspaceBoard(boardId),
        fetchWorkspaceLists(boardId),
        fetchWorkspaceCards(boardId),
        readOnly
          ? fetchAssignmentsForStudent().catch(() => [] as WorksheetAssignment[])
          : fetchAssignmentsForTutor().catch(() => [] as WorksheetAssignment[]),
        readOnly
          ? fetchPracticeSessionsForStudent().catch(() => [] as PracticeSessionRecord[])
          : fetchPracticeSessionsForTutor().catch(() => [] as PracticeSessionRecord[]),
        readOnly
          ? fetchDiagnosticProgress(boardId)
              .then((row) => Boolean(row))
              .catch(() => false)
          : fetchDiagnosticProgressForTutor()
              .then((rows) => rows.some((row) => row.userId === boardId))
              .catch(() => false),
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
      roadmapUpdatedAtMsRef.current = boardRow.roadmapUpdatedAt?.toMillis?.() ?? 0;
      setLists(listRows);
      setCards(cardRows);
      setAssignmentById(map);
      setStudentAssignments(studentAssignments);
      setStudentSessions(sessionRows.filter((s) => s.userId === boardRow.studentUid));
      setDiagnosticInProgress(progressFlag);
      setLastSession(sessionRows.find((s) => s.userId === boardRow.studentUid) ?? null);
      const diagnosticPair = firstAndLatestDiagnostic(sessionRows, boardRow.studentUid);
      setFirstDiagnostic(diagnosticPair.first);
      setLatestDiagnostic(diagnosticPair.latest);
      setLastCompletedAssignment(pickLatestCompletedAssignment(studentAssignments));
      setSelectedCard((prev) => {
        if (!prev) return prev;
        return cardRows.find((c) => c.id === prev.id) ?? prev;
      });

      const missingBadgeIds = cardRows
        .filter((card) => card.commentCount == null || card.attachmentCount == null)
        .map((card) => card.id);
      if (missingBadgeIds.length > 0) {
        void fetchCardBadgeCounts(boardId, missingBadgeIds).then((counts) => {
          setCards((prev) =>
            prev.map((card) => {
              const next = counts.get(card.id);
              return next ? { ...card, ...next } : card;
            }),
          );
          if (!readOnly) {
            void persistCardBadgeCounts(boardId, counts).catch(() => undefined);
          }
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load workspace.");
    } finally {
      if (!silent) setLoading(false);
    }
  }, [boardId, readOnly]);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  const handleToggleExtendedTime = async (enabled: boolean) => {
    if (!board || readOnly || savingExtendedTime) return;
    setSavingExtendedTime(true);
    try {
      await updateWorkspaceBoardDiagnosticExtendedTime(board.id, enabled);
      setBoard({ ...board, diagnosticExtendedTime: enabled });
    } catch (err) {
      toast({
        title: "Could not update extended time",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setSavingExtendedTime(false);
    }
  };

  const handleAddList = async () => {
    const title = newListTitle.trim();
    if (!title) return;
    await createWorkspaceList(boardId, title);
    setNewListTitle("");
    setAddingList(false);
    await loadBoard();
  };

  const snapshot = useMemo(() => {
    if (!board) return null;
    return buildStudentRoadmapSnapshot({
      board,
      sessions: studentSessions,
      assignments: studentAssignments,
      diagnosticInProgress,
    });
  }, [board, studentSessions, studentAssignments, diagnosticInProgress]);

  const handleSaveRoadmap = async (roadmap: StudentRoadmap) => {
    setSavingRoadmap(true);
    try {
      const result = await updateWorkspaceBoardRoadmap(boardId, roadmap, {
        expectedUpdatedAtMs: roadmapUpdatedAtMsRef.current,
      });
      roadmapUpdatedAtMsRef.current = result.roadmapUpdatedAtMs;
      setBoard((prev) =>
        prev
          ? {
              ...prev,
              roadmap,
              roadmapUpdatedAt: Timestamp.fromMillis(result.roadmapUpdatedAtMs),
            }
          : prev,
      );
      await loadBoard({ silent: true });
    } catch (err) {
      if (isWorkspaceConflictError(err)) {
        await loadBoard({ silent: true });
      }
      throw err;
    } finally {
      setSavingRoadmap(false);
    }
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
            {!readOnly ? (
              <div className="mt-2 flex items-center gap-2">
                <Switch
                  id={`diagnostic-extended-time-${board.id}`}
                  checked={Boolean(board.diagnosticExtendedTime)}
                  onCheckedChange={(checked) => void handleToggleExtendedTime(checked)}
                  disabled={savingExtendedTime}
                />
                <Label
                  htmlFor={`diagnostic-extended-time-${board.id}`}
                  className="text-xs font-normal text-muted-foreground"
                >
                  Extended time on diagnostic (360 min)
                </Label>
              </div>
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
            returnTo={`/workspace/${board.studentUid}`}
          />
        ) : null}
      </div>

      {snapshot ? (
        <StudentRoadmapPanel
          snapshot={snapshot}
          readOnly={readOnly}
          saving={savingRoadmap}
          onSave={handleSaveRoadmap}
        />
      ) : null}

      <p className="mb-2 px-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Session notes and homework
      </p>
      <div className="flex gap-4 overflow-x-auto pb-6 min-h-[calc(100vh-12rem)] items-start">
        {lists.length === 0 ? (
          <div className="w-72 shrink-0 rounded-xl border border-dashed border-border bg-muted/40 px-4 py-6">
            <p className="text-sm text-muted-foreground">
              {readOnly
                ? "No lists on this board yet."
                : "This board starts empty. Import Trello data or add a list to begin."}
            </p>
          </div>
        ) : null}
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
            onListRenamed={(listId, title) => {
              setLists((prev) =>
                prev.map((row) => (row.id === listId ? { ...row, title } : row)),
              );
            }}
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
                {lists.length === 0 ? "Add a list" : "Add another list"}
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
