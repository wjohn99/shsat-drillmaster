import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { questions, allTags, passages } from "@/data/mockData";
import type { Question } from "@/types";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import type { WorksheetAssignment } from "@/types/assignment";
import {
  WORKSHEET_SECTIONS,
  buildWorksheetTagCatalog,
  pickWorksheetQuestions,
} from "@/lib/worksheetTagCatalog";
import { openWorksheetPdfInNewTab } from "@/lib/worksheetPdfExport";
import {
  assignmentDueDateInputToTimestamp,
  createAssignment,
  defaultAssignmentDueDateInput,
  fetchStudents,
  markAssignmentCompleted,
  resolveQuestionsByIds,
  setAssignmentWorkspaceCard,
  toAssignmentDueDateInputValue,
} from "@/lib/assignmentService";
import { logWorksheetAssignedToCard } from "@/lib/workspaceCardContentService";
import {
  fetchWorkspaceBoard,
  fetchWorkspaceCards,
  fetchWorkspaceLists,
  linkAssignmentToWorkspace,
  pickDefaultHomeworkListId,
} from "@/lib/workspaceService";
import type { WorkspaceCard, WorkspaceList } from "@/types/workspace";
import {
  WORKSPACE_NEW_CARD_ID,
  type WorksheetsAssignToWorkspaceState,
} from "@/types/worksheetsNavigation";
import {
  fetchLatestAssignmentSessionForStudent,
  fetchLatestAssignmentSessionForTutor,
  savePracticeSession,
} from "@/lib/practiceSessionService";
import { WorksheetSessionReview } from "@/components/worksheets/WorksheetSessionReview";
import { SessionQuestionRunner } from "@/components/session/SessionQuestionRunner";
import { SessionResultsDashboard } from "@/components/session/SessionResultsDashboard";
import {
  CustomWorksheetBuilder,
  type WorksheetBuilderVariant,
} from "@/components/worksheets/CustomWorksheetBuilder";
import { TutorWorksheetsHome } from "@/components/worksheets/TutorWorksheetsHome";
import { StudentWorksheetsHome } from "@/components/worksheets/StudentWorksheetsHome";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { StudentOption } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type {
  WorksheetsLocationState,
  WorksheetsWorkspaceCompletionTarget,
} from "@/types/worksheetsNavigation";

type Mode = "home" | "build" | "runner" | "results" | "review";
type RunSource = "assignment" | "self" | "tutor-preview";

const Worksheets = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const role = profile?.role;

  const [mode, setMode] = useState<Mode>("home");
  const [buildVariant, setBuildVariant] = useState<WorksheetBuilderVariant>("tutor");
  const [runSource, setRunSource] = useState<RunSource>("tutor-preview");
  const [runKey, setRunKey] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [questionLimit, setQuestionLimit] = useState(10);
  const [worksheetQuestions, setWorksheetQuestions] = useState<Question[]>([]);
  const [sessionEvents, setSessionEvents] = useState<SessionAnalyticsEvent[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<WorksheetAssignment | null>(null);
  const workspaceCompletionTargetRef = useRef<WorksheetsWorkspaceCompletionTarget | null>(
    null,
  );

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentUid, setSelectedStudentUid] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState(defaultAssignmentDueDateInput);
  const minAssignmentDueDate = useMemo(() => toAssignmentDueDateInputValue(new Date()), []);
  const [showOnWorkspace, setShowOnWorkspace] = useState(true);
  const [workspaceBoardExists, setWorkspaceBoardExists] = useState(false);
  const [workspaceLists, setWorkspaceLists] = useState<WorkspaceList[]>([]);
  const [workspaceCards, setWorkspaceCards] = useState<WorkspaceCard[]>([]);
  const [workspaceListsLoading, setWorkspaceListsLoading] = useState(false);
  const [workspaceListId, setWorkspaceListId] = useState("");
  const [workspaceCardTarget, setWorkspaceCardTarget] = useState(WORKSPACE_NEW_CARD_ID);
  const [workspacePlacementLocked, setWorkspacePlacementLocked] = useState(false);
  const [pendingAssignToWorkspace, setPendingAssignToWorkspace] =
    useState<WorksheetsAssignToWorkspaceState | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [assignmentsRefreshKey, setAssignmentsRefreshKey] = useState(0);
  const [reviewSession, setReviewSession] = useState<PracticeSessionRecord | null>(null);
  const [reviewSubtitle, setReviewSubtitle] = useState<string | undefined>();

  const tagCatalog = useMemo(() => buildWorksheetTagCatalog(allTags, questions), []);

  const toggleTag = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const matchingCount = useMemo(() => {
    if (selectedCodes.length === 0) return 0;
    const ids = new Set<string>();
    for (const q of questions) {
      if (q.tags.some((t) => selectedSet.has(t.code))) ids.add(q.id);
    }
    return ids.size;
  }, [selectedCodes, selectedSet]);

  const selectedTagLabels = useMemo(() => {
    return selectedCodes.map((code) => {
      for (const sec of WORKSHEET_SECTIONS) {
        const t = tagCatalog[sec.id].find((x) => x.code === code);
        if (t) return t.label;
      }
      return code;
    });
  }, [selectedCodes, tagCatalog]);

  useEffect(() => {
    if (role !== "tutor" || mode !== "build" || buildVariant !== "tutor") return;

    let cancelled = false;
    (async () => {
      setStudentsLoading(true);
      try {
        const list = await fetchStudents();
        if (!cancelled) setStudents(list);
      } catch (err) {
        if (!cancelled) {
          toast({
            title: "Could not load students",
            description: err instanceof Error ? err.message : "Please try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setStudentsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, mode, buildVariant]);

  useEffect(() => {
    if (role !== "tutor" || !selectedStudentUid) {
      setWorkspaceBoardExists(false);
      setWorkspaceLists([]);
      setWorkspaceCards([]);
      setWorkspaceListId("");
      return;
    }

    let cancelled = false;
    setWorkspaceListsLoading(true);

    void (async () => {
      try {
        const board = await fetchWorkspaceBoard(selectedStudentUid);
        if (cancelled) return;

        if (!board) {
          setWorkspaceBoardExists(false);
          setWorkspaceLists([]);
          setWorkspaceCards([]);
          setWorkspaceListId("");
          if (!workspacePlacementLocked) setShowOnWorkspace(false);
          return;
        }

        setWorkspaceBoardExists(true);
        const [lists, cards] = await Promise.all([
          fetchWorkspaceLists(selectedStudentUid),
          fetchWorkspaceCards(selectedStudentUid),
        ]);
        if (cancelled) return;

        setWorkspaceLists(lists);
        setWorkspaceCards(cards);

        setWorkspaceListId((prev) => {
          if (pendingAssignToWorkspace?.listId) return pendingAssignToWorkspace.listId;
          if (prev && lists.some((l) => l.id === prev)) return prev;
          return pickDefaultHomeworkListId(lists) ?? "";
        });
      } catch {
        if (!cancelled) {
          setWorkspaceBoardExists(false);
          setWorkspaceLists([]);
          setWorkspaceCards([]);
        }
      } finally {
        if (!cancelled) setWorkspaceListsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [role, selectedStudentUid, pendingAssignToWorkspace?.listId, workspacePlacementLocked]);

  useEffect(() => {
    if (pendingAssignToWorkspace?.cardId) {
      setWorkspaceCardTarget(pendingAssignToWorkspace.cardId);
    } else if (!workspacePlacementLocked) {
      setWorkspaceCardTarget(WORKSPACE_NEW_CARD_ID);
    }
  }, [pendingAssignToWorkspace, workspaceListId, workspacePlacementLocked]);

  const openTutorBuild = () => {
    setBuildVariant("tutor");
    setActiveAssignment(null);
    setMode("build");
  };

  const openStudentBuild = () => {
    setBuildVariant("student");
    setActiveAssignment(null);
    setMode("build");
  };

  const pickCurrentQuestions = () =>
    pickWorksheetQuestions(questions, selectedSet, questionLimit);

  const startWorksheetRun = (picked?: Question[]) => {
    const next = picked ?? pickCurrentQuestions();
    setWorksheetQuestions(next);
    setRunKey((k) => k + 1);
    setSessionEvents([]);
    setMode("runner");
  };

  const startTutorOrSelfPreview = () => {
    setActiveAssignment(null);
    setRunSource(buildVariant === "student" ? "self" : "tutor-preview");
    startWorksheetRun();
  };

  const openReviewSession = (session: PracticeSessionRecord, subtitle?: string) => {
    setReviewSession(session);
    setReviewSubtitle(subtitle);
    setMode("review");
  };

  const handleReviewAssignment = async (assignment: WorksheetAssignment) => {
    try {
      const session =
        role === "tutor"
          ? await fetchLatestAssignmentSessionForTutor(assignment.id)
          : await fetchLatestAssignmentSessionForStudent(assignment.id);
      if (!session) {
        toast({
          title: "No saved results yet",
          description:
            role === "tutor"
              ? "The student has not completed this worksheet with saved results."
              : "Complete this worksheet once to save results you can review later.",
          variant: "destructive",
        });
        return;
      }
      const studentName =
        "studentName" in assignment && typeof assignment.studentName === "string"
          ? assignment.studentName
          : undefined;
      const subtitle =
        role === "tutor"
          ? studentName
            ? `${studentName}'s saved attempt`
            : "Student attempt on this assignment"
          : "Your saved assignment attempt";
      openReviewSession(session, subtitle);
    } catch (err) {
      toast({
        title: "Could not load results",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  const startAssignedWorksheet = (
    assignment: WorksheetAssignment,
    workspaceTarget?: WorksheetsWorkspaceCompletionTarget,
  ) => {
    workspaceCompletionTargetRef.current = workspaceTarget ?? null;
    const picked = resolveQuestionsByIds(questions, assignment.questionIds);
    if (picked.length === 0) {
      toast({
        title: "Worksheet unavailable",
        description: "None of the assigned questions could be loaded.",
        variant: "destructive",
      });
      return;
    }
    setActiveAssignment(assignment);
    setRunSource("assignment");
    startWorksheetRun(picked);
  };

  useEffect(() => {
    if (authLoading || !profile) return;

    const navState = location.state as WorksheetsLocationState | null;
    if (!navState) return;

    if (navState.assignToWorkspace && role === "tutor") {
      const target = navState.assignToWorkspace;
      setPendingAssignToWorkspace(target);
      setSelectedStudentUid(target.boardId);
      setWorkspacePlacementLocked(true);
      setShowOnWorkspace(true);
      setWorkspaceListId(target.listId);
      setWorkspaceCardTarget(target.cardId ?? WORKSPACE_NEW_CARD_ID);
      openTutorBuild();
    } else if (navState.openTutorBuild && role === "tutor") {
      openTutorBuild();
    } else if (navState.openStudentBuild && role === "student") {
      openStudentBuild();
    } else if (navState.autoStartAssignment && role === "student") {
      startAssignedWorksheet(
        navState.autoStartAssignment,
        navState.workspaceCompletionTarget,
      );
    } else if (navState.reviewSession) {
      openReviewSession(navState.reviewSession);
    } else if (navState.reviewAssignment) {
      void handleReviewAssignment(navState.reviewAssignment);
    } else {
      return;
    }

    navigate(location.pathname, { replace: true, state: null });
  }, [authLoading, profile, role, location.state, location.pathname, navigate]);

  const handleAssignToStudent = async () => {
    if (!profile || role !== "tutor") return;
    if (!selectedStudentUid) {
      toast({
        title: "Select a student",
        description: "Choose who should receive this worksheet.",
        variant: "destructive",
      });
      return;
    }

    const picked = pickCurrentQuestions();
    if (picked.length === 0) return;

    if (!assignmentDueDate) {
      toast({
        title: "Due date required",
        description: "Choose when this worksheet is due.",
        variant: "destructive",
      });
      return;
    }

    if (assignmentDueDate < minAssignmentDueDate) {
      toast({
        title: "Due date must be today or later",
        variant: "destructive",
      });
      return;
    }

    setAssigning(true);
    try {
      const title =
        selectedTagLabels.length > 0
          ? `Worksheet: ${selectedTagLabels.slice(0, 2).join(", ")}${selectedTagLabels.length > 2 ? "…" : ""}`
          : "Custom worksheet";

      const dueAt = assignmentDueDateInputToTimestamp(assignmentDueDate);
      const placeOnWorkspace =
        showOnWorkspace && workspaceBoardExists && workspaceListId && workspaceCardTarget;

      const assignmentId = await createAssignment({
        questionIds: picked.map((q) => q.id),
        tutorUid: profile.uid,
        assignedToStudentUid: selectedStudentUid,
        title,
        tagCodes: selectedCodes,
        dueAt,
        workspace: placeOnWorkspace
          ? {
              boardId: selectedStudentUid,
              listId: workspaceListId,
              existingCardId:
                workspaceCardTarget !== WORKSPACE_NEW_CARD_ID
                  ? workspaceCardTarget
                  : undefined,
              newCardTitle: title,
            }
          : undefined,
      });

      const dueLabel = new Date(`${assignmentDueDate}T12:00:00`).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });

      if (placeOnWorkspace) {
        const isExistingCard = workspaceCardTarget !== WORKSPACE_NEW_CARD_ID;
        const cardId = await linkAssignmentToWorkspace({
          boardId: selectedStudentUid,
          listId: workspaceListId,
          assignmentId,
          dueAt,
          existingCardId: isExistingCard ? workspaceCardTarget : undefined,
          newCardTitle: isExistingCard ? undefined : title,
        });
        await setAssignmentWorkspaceCard(assignmentId, cardId);
        await logWorksheetAssignedToCard(selectedStudentUid, cardId, title, dueLabel);
      }

      const student = students.find((s) => s.uid === selectedStudentUid);
      toast({
        title: "Assignment sent",
        description: student
          ? placeOnWorkspace
            ? `${student.displayName} can start from Active Assignments or their workspace (due ${dueLabel}).`
            : `${student.displayName} will see this in Active Assignments (due ${dueLabel}).`
          : `The student will see this in Active Assignments (due ${dueLabel}).`,
      });
      setAssignmentsRefreshKey((k) => k + 1);
      setSelectedStudentUid("");
      setAssignmentDueDate(defaultAssignmentDueDateInput());
      setShowOnWorkspace(true);
      setWorkspacePlacementLocked(false);
      setPendingAssignToWorkspace(null);
      setWorkspaceCardTarget(WORKSPACE_NEW_CARD_ID);
    } catch (err) {
      toast({
        title: "Assignment failed",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setAssigning(false);
    }
  };

  const exportWorksheetPdf = () => {
    const picked = pickCurrentQuestions();
    if (picked.length === 0) return;
    const tagPart =
      selectedTagLabels.length > 0 ? selectedTagLabels.join("; ") : "No tags";
    openWorksheetPdfInNewTab(picked, passages, {
      tagSummaryLine: `${new Date().toLocaleString()} — Tags: ${tagPart}`,
    });
  };

  const worksheetCorrect = sessionEvents.filter((e) => e.correct).length;
  const worksheetAccuracyPct = sessionEvents.length
    ? Math.round((worksheetCorrect / sessionEvents.length) * 100)
    : 0;

  const sessionTitle =
    runSource === "assignment"
      ? activeAssignment?.title ?? "Assigned worksheet"
      : runSource === "self"
        ? "Your practice worksheet"
        : "Custom worksheet";

  const storageKeyPrefix =
    runSource === "assignment" && activeAssignment
      ? `assignment-${activeAssignment.id}`
      : runSource === "self"
        ? `worksheet-self-${profile?.uid ?? "anon"}`
        : "worksheet";

  const exitRunner = () => {
    if (runSource === "assignment") {
      setActiveAssignment(null);
      setMode("home");
    } else {
      setMode("build");
    }
  };

  if (mode === "review" && reviewSession) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <WorksheetSessionReview
            session={reviewSession}
            subtitle={reviewSubtitle}
            viewerRole={role === "tutor" ? "tutor" : "student"}
            onBack={() => {
              setReviewSession(null);
              setReviewSubtitle(undefined);
              setMode("home");
            }}
          />
        </div>
      </div>
    );
  }

  if (mode === "runner" && worksheetQuestions.length > 0) {
    return (
      <SessionQuestionRunner
        key={runKey}
        questions={worksheetQuestions}
        sessionTitle={sessionTitle}
        storageKeyPrefix={storageKeyPrefix}
        onExit={exitRunner}
        onComplete={async (events) => {
          setSessionEvents(events);

          if (runSource === "assignment" || runSource === "self") {
            try {
              await savePracticeSession({
                sessionType: runSource === "assignment" ? "assignment" : "self",
                title: sessionTitle,
                tagCodes:
                  runSource === "assignment"
                    ? (activeAssignment?.tagCodes ?? [])
                    : selectedCodes,
                questionIds: worksheetQuestions.map((q) => q.id),
                events,
                assignmentId: activeAssignment?.id ?? null,
                tutorUid:
                  runSource === "assignment" ? (activeAssignment?.tutorUid ?? null) : null,
              });
            } catch (err) {
              toast({
                title: "Could not save practice results",
                description: err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
              });
            }
          }

          if (
            runSource === "assignment" &&
            activeAssignment &&
            activeAssignment.status === "todo"
          ) {
            try {
              const correct = events.filter((e) => e.correct).length;
              const workspaceTarget = workspaceCompletionTargetRef.current ?? undefined;
              await markAssignmentCompleted(activeAssignment.id, {
                score: { correct, total: events.length },
                workspace: workspaceTarget,
              });
              workspaceCompletionTargetRef.current = null;
              setAssignmentsRefreshKey((k) => k + 1);
            } catch (err) {
              toast({
                title: "Could not save completion",
                description: err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
              });
            }
          }
          setMode("results");
        }}
      />
    );
  }

  const resultsTitle =
    runSource === "assignment"
      ? "Assignment complete"
      : runSource === "self"
        ? "Practice complete"
        : "Worksheet complete";

  const backFromResults = () => {
    if (runSource === "assignment") {
      setActiveAssignment(null);
      setMode("home");
    } else if (runSource === "self") {
      setActiveAssignment(null);
      setMode("build");
    } else {
      setActiveAssignment(null);
      setMode("build");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8">
        {mode === "results" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <Button variant="ghost" onClick={backFromResults}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {runSource === "assignment" ? "Back to worksheets" : "Back to builder"}
            </Button>
            <SessionResultsDashboard
              title={resultsTitle}
              events={sessionEvents}
              summaryMetrics={[
                { label: "Questions answered", value: sessionEvents.length },
                { label: "Correct", value: worksheetCorrect },
                { label: "Accuracy", value: `${worksheetAccuracyPct}%` },
              ]}
              footnote={
                runSource === "self"
                  ? "Self-practice results are for your review only — not shared with your tutor."
                  : "Statistics use your answers and time on each question in this worksheet."
              }
              footerActions={
                role === "tutor" ? (
                  <>
                    <Button variant="outline" onClick={() => setMode("build")}>
                      Edit tags
                    </Button>
                    <Button onClick={startTutorOrSelfPreview}>New worksheet (same tags)</Button>
                  </>
                ) : runSource === "self" ? (
                  <>
                    <Button variant="outline" onClick={() => setMode("home")}>
                      Back to worksheets
                    </Button>
                    <Button onClick={startTutorOrSelfPreview}>Practice again</Button>
                  </>
                ) : runSource === "assignment" && activeAssignment ? (
                  <>
                    <Button
                      variant="outline"
                      onClick={() => handleReviewAssignment(activeAssignment)}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Review saved results
                    </Button>
                    <Button onClick={backFromResults}>Back to worksheets</Button>
                  </>
                ) : (
                  <Button onClick={backFromResults}>Back to worksheets</Button>
                )
              }
            />
          </div>
        )}

        {mode === "build" && (role === "tutor" || role === "student") && (
          <div className="mb-12 max-w-6xl mx-auto">
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => {
                setActiveAssignment(null);
                setMode("home");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="mb-8">
              <h2 className="text-3xl font-bold mb-2">
                {buildVariant === "student"
                  ? "Create your own practice"
                  : "Create custom worksheet"}
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                {buildVariant === "student"
                  ? "Pick skill tags and start a worksheet whenever you want to practice."
                  : "Pick skill tags, preview the worksheet, and assign it to a student."}
              </p>
            </div>

            <CustomWorksheetBuilder
              variant={buildVariant}
              selectedCodes={selectedCodes}
              questionLimit={questionLimit}
              tagCatalog={tagCatalog}
              matchingCount={matchingCount}
              onToggleTag={toggleTag}
              onQuestionLimitChange={setQuestionLimit}
              onClearTags={() => setSelectedCodes([])}
              onStart={startTutorOrSelfPreview}
              onExportPdf={exportWorksheetPdf}
              students={students}
              studentsLoading={studentsLoading}
              selectedStudentUid={selectedStudentUid}
              onStudentChange={setSelectedStudentUid}
              assignmentDueDate={assignmentDueDate}
              onAssignmentDueDateChange={setAssignmentDueDate}
              minAssignmentDueDate={minAssignmentDueDate}
              showOnWorkspace={showOnWorkspace}
              onShowOnWorkspaceChange={setShowOnWorkspace}
              workspaceBoardExists={workspaceBoardExists}
              workspaceLists={workspaceLists}
              workspaceListsLoading={workspaceListsLoading}
              workspaceListId={workspaceListId}
              onWorkspaceListIdChange={setWorkspaceListId}
              workspaceCards={workspaceCards}
              workspaceCardTarget={workspaceCardTarget}
              onWorkspaceCardTargetChange={setWorkspaceCardTarget}
              workspacePlacementLocked={workspacePlacementLocked}
              assigning={assigning}
              onAssign={handleAssignToStudent}
            />
          </div>
        )}

        {mode === "home" && (
          <>
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Worksheets</h1>
              <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                {role === "tutor"
                  ? "Create and assign focused practice sessions for your students."
                  : role === "student"
                    ? "Complete tutor assignments and build your own practice anytime."
                    : "Sign in to create or receive assigned worksheets."}
              </p>
            </div>

            {authLoading ? (
              <div className="flex justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : !profile ? (
              <Card className="max-w-lg mx-auto border-dashed">
                <CardContent className="py-10 text-center space-y-4">
                  <p className="text-muted-foreground">
                    Sign in to access role-based worksheet tools.
                  </p>
                  <Button asChild>
                    <Link to="/login">Sign in with Google</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : role === "tutor" ? (
              <TutorWorksheetsHome
                assignmentsRefreshKey={assignmentsRefreshKey}
                onCreateCustom={openTutorBuild}
                onReviewAssignment={handleReviewAssignment}
                onReviewSession={(session) =>
                  openReviewSession(session, "Student assignment attempt")
                }
              />
            ) : (
              <StudentWorksheetsHome
                assignmentsRefreshKey={assignmentsRefreshKey}
                onStartAssignment={startAssignedWorksheet}
                onReviewAssignment={handleReviewAssignment}
                onReviewSession={(session) => openReviewSession(session)}
                onCreateCustomPractice={openStudentBuild}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Worksheets;
