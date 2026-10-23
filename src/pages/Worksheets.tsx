import { useEffect, useMemo, useRef, useState } from "react";
import { Link, Navigate, useLocation, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { PageHeader } from "@/components/layout/PageHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Eye, Loader2 } from "lucide-react";
import { QuestionsStatus } from "@/components/questions/QuestionsStatus";
import { useQuestions } from "@/contexts/QuestionsContext";
import { allTags } from "@/data/taggingScheme";
import type { Passage, Question } from "@/types";
import {
  buildWorksheetPresets,
  type WorksheetPreset,
} from "@/data/worksheetPresets";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import type { WorksheetAssignment } from "@/types/assignment";
import {
  WORKSHEET_QUESTION_CAP,
  WORKSHEET_SECTIONS,
  buildWorksheetTagCatalog,
  contentSkillCodes,
  contentSkillLabels,
  listWorksheetPool,
  pickWorksheetQuestions,
  worksheetQuestionsFromIds,
} from "@/lib/worksheetTagCatalog";
import type { WorksheetQuestionPickMode } from "@/components/worksheets/WorksheetQuestionPicker";
import { fetchDemoStudents } from "@/lib/demoSandbox";
import { loadTutorVisibleStudentView } from "@/lib/studentView";
import { useViewAsStudent } from "@/contexts/ViewAsStudentContext";
import { openWorksheetPrintTab } from "@/lib/worksheetPrint";
import {
  assignmentDueDateInputToTimestamp,
  assignmentRevealsAnswers,
  createAssignment,
  defaultAssignmentDueDateInput,
  fetchAssignedQuestionIdsForStudent,
  fetchAssignmentById,
  fetchStudents,
  markAssignmentCompleted,
  setAssignmentWorkspaceCard,
  toAssignmentDueDateInputValue,
} from "@/lib/assignmentService";
import { logWorksheetAssignedToCard } from "@/lib/workspaceCardContentService";
import {
  forgetActiveWorksheet,
  markWorksheetResumeAfterReload,
  rememberActiveWorksheet,
} from "@/lib/worksheetResume";
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
  WORKSHEETS_PATH,
  parseWorksheetAttemptParam,
  worksheetAttemptSearch,
  type WorksheetsAssignToWorkspaceState,
} from "@/types/worksheetsNavigation";
import {
  fetchLatestAssignmentSessionForStudent,
  fetchLatestAssignmentSessionForTutor,
  savePracticeSession,
} from "@/lib/practiceSessionService";
import {
  clearWorksheetProgress,
  fetchWorksheetProgress,
  saveWorksheetProgress,
} from "@/lib/worksheetProgressService";
import {
  WORKSHEET_SELF_SCOPE_ID,
  clearWorksheetProgressLocal,
  loadWorksheetProgressLocal,
  persistWorksheetProgressLocal,
  pickNewerWorksheetProgress,
  type WorksheetProgressSave,
} from "@/lib/worksheetProgressStorage";
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
  const {
    questions,
    passages,
    loading: questionsLoading,
    getQuestionsByIds,
    getPassagesForQuestions,
  } = useQuestions();
  const location = useLocation();
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();
  const { viewAs } = useViewAsStudent();
  const role = profile?.role;
  const tutorTools = role === "tutor" || role === "demo";

  const [mode, setMode] = useState<Mode>("home");
  const [buildVariant, setBuildVariant] = useState<WorksheetBuilderVariant>("tutor");
  const [runSource, setRunSource] = useState<RunSource>("tutor-preview");
  const [runKey, setRunKey] = useState(0);
  const [selectedCodes, setSelectedCodes] = useState<string[]>([]);
  const [questionLimit, setQuestionLimit] = useState(10);
  const [questionPickMode, setQuestionPickMode] = useState<WorksheetQuestionPickMode>("random");
  const [chosenQuestionIds, setChosenQuestionIds] = useState<string[]>([]);
  const [worksheetQuestions, setWorksheetQuestions] = useState<Question[]>([]);
  const [runnerPassages, setRunnerPassages] = useState<Passage[] | undefined>();
  const [presetTitle, setPresetTitle] = useState<string | null>(null);
  const [sessionEvents, setSessionEvents] = useState<SessionAnalyticsEvent[]>([]);
  const [activeAssignment, setActiveAssignment] = useState<WorksheetAssignment | null>(null);
  const workspaceCompletionTargetRef = useRef<WorksheetsWorkspaceCompletionTarget | null>(
    null,
  );
  const returnToRef = useRef<string | null>(null);

  const [students, setStudents] = useState<StudentOption[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [selectedStudentUid, setSelectedStudentUid] = useState("");
  const [assignmentDueDate, setAssignmentDueDate] = useState(defaultAssignmentDueDateInput);
  const minAssignmentDueDate = useMemo(() => toAssignmentDueDateInputValue(new Date()), []);
  const [showOnWorkspace, setShowOnWorkspace] = useState(true);
  const [revealAnswers, setRevealAnswers] = useState(false);
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
  const [excludedQuestionIds, setExcludedQuestionIds] = useState<Set<string>>(() => new Set());
  const [excludedAssignedLoading, setExcludedAssignedLoading] = useState(false);
  const excludedQuestionIdsRef = useRef<Set<string>>(new Set());
  const excludedReadyRef = useRef(true);
  const [assignmentsRefreshKey, setAssignmentsRefreshKey] = useState(0);
  const [reviewSession, setReviewSession] = useState<PracticeSessionRecord | null>(null);
  const [reviewSubtitle, setReviewSubtitle] = useState<string | undefined>();
  const [runnerInitialProgress, setRunnerInitialProgress] = useState<WorksheetProgressSave | null>(
    null,
  );
  const [activeScopeId, setActiveScopeId] = useState<string | null>(null);
  const [viewAsSnapshot, setViewAsSnapshot] = useState<Awaited<
    ReturnType<typeof loadTutorVisibleStudentView>
  > | null>(null);
  const resumeLockRef = useRef<string | null>(null);
  const ignoreAttemptRestoreRef = useRef(false);
  const attemptParam = parseWorksheetAttemptParam(location.search);

  const replaceAttemptUrl = (scopeId: string | null) => {
    const search = scopeId ? worksheetAttemptSearch(scopeId) : "";
    if (location.pathname === WORKSHEETS_PATH && (location.search || "") === search) return;
    navigate({ pathname: WORKSHEETS_PATH, search }, { replace: true });
  };

  const leaveWorksheets = (fallback: Mode = "home") => {
    const to = returnToRef.current;
    if (to) {
      returnToRef.current = null;
      resumeLockRef.current = null;
      navigate(to);
      return;
    }
    if (attemptParam) {
      ignoreAttemptRestoreRef.current = true;
      resumeLockRef.current = null;
      replaceAttemptUrl(null);
    }
    if (fallback === "home") {
      setActiveAssignment(null);
    }
    setActiveScopeId(null);
    setMode(fallback);
  };

  const tagCatalog = useMemo(() => buildWorksheetTagCatalog(allTags, questions), [questions]);
  const worksheetPresets = useMemo(() => buildWorksheetPresets(questions), [questions]);

  const toggleTag = (code: string) => {
    setSelectedCodes((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  };

  const selectedSet = useMemo(() => new Set(selectedCodes), [selectedCodes]);

  const assignedExclusion =
    buildVariant === "tutor" && selectedStudentUid ? excludedQuestionIds : undefined;
  const poolQuestions = useMemo(
    () => listWorksheetPool(questions, selectedSet, assignedExclusion),
    [questions, selectedSet, assignedExclusion],
  );
  const matchingCount = poolQuestions.length;
  const chosenQuestions = useMemo(
    () => worksheetQuestionsFromIds(questions, chosenQuestionIds, assignedExclusion),
    [questions, chosenQuestionIds, assignedExclusion],
  );

  const setChosenQuestionIdsCapped = (ids: string[]) => {
    const unique: string[] = [];
    const seen = new Set<string>();
    for (const id of ids) {
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(id);
      if (unique.length >= WORKSHEET_QUESTION_CAP) break;
    }
    setChosenQuestionIds(unique);
  };

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
    if (!viewAs) {
      setViewAsSnapshot(null);
      return;
    }
    let cancelled = false;
    void loadTutorVisibleStudentView(viewAs.uid).then((snapshot) => {
      if (!cancelled) setViewAsSnapshot(snapshot);
    });
    return () => {
      cancelled = true;
    };
  }, [viewAs]);

  useEffect(() => {
    if (!viewAs) return;
    if (mode === "build" || mode === "runner") setMode("home");
  }, [viewAs, mode]);

  useEffect(() => {
    if (!tutorTools || mode !== "build" || buildVariant !== "tutor") return;

    let cancelled = false;
    (async () => {
      setStudentsLoading(true);
      try {
        const list =
          role === "demo" && profile ? await fetchDemoStudents(profile.uid) : await fetchStudents();
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
  }, [profile, role, mode, buildVariant, tutorTools]);

  useEffect(() => {
    if (!tutorTools || buildVariant !== "tutor" || !selectedStudentUid) {
      const empty = new Set<string>();
      setExcludedQuestionIds(empty);
      excludedQuestionIdsRef.current = empty;
      excludedReadyRef.current = true;
      setExcludedAssignedLoading(false);
      return;
    }

    let cancelled = false;
    const empty = new Set<string>();
    setExcludedQuestionIds(empty);
    excludedQuestionIdsRef.current = empty;
    excludedReadyRef.current = false;
    setExcludedAssignedLoading(true);
    void fetchAssignedQuestionIdsForStudent(selectedStudentUid, role === "tutor")
      .then((ids) => {
        if (cancelled) return;
        setExcludedQuestionIds(ids);
        excludedQuestionIdsRef.current = ids;
        excludedReadyRef.current = true;
        setChosenQuestionIds((prev) => {
          const next = prev.filter((id) => !ids.has(id));
          return next.length === prev.length ? prev : next;
        });
      })
      .catch((err) => {
        if (cancelled) return;
        excludedReadyRef.current = false;
        toast({
          title: "Could not check earlier worksheets",
          description: err instanceof Error ? err.message : "Select the student again.",
          variant: "destructive",
        });
      })
      .finally(() => {
        if (!cancelled) setExcludedAssignedLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tutorTools, buildVariant, role, selectedStudentUid]);

  useEffect(() => {
    if (!tutorTools || !selectedStudentUid) {
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
    setPresetTitle(null);
    setMode("build");
  };

  const openTutorBuildFromPreset = (preset: WorksheetPreset) => {
    setBuildVariant("tutor");
    setActiveAssignment(null);
    setSelectedCodes(preset.tagCodes);
    setQuestionLimit(preset.questionLimit);
    setQuestionPickMode("random");
    setChosenQuestionIds([]);
    setPresetTitle(preset.title);
    setMode("build");
    toast({
      title: `${preset.title} pre-set loaded`,
      description: "Pick a student and due date, then assign.",
    });
  };

  const openStudentBuild = () => {
    setBuildVariant("student");
    setActiveAssignment(null);
    setMode("build");
  };

  const pickCurrentQuestions = () =>
    questionPickMode === "chosen"
      ? chosenQuestions
      : pickWorksheetQuestions(questions, selectedSet, questionLimit, assignedExclusion);

  const startWorksheetRun = (
    picked?: Question[],
    extraPassages?: Passage[],
    initialProgress?: WorksheetProgressSave | null,
  ) => {
    const next = picked ?? pickCurrentQuestions();
    setRunnerInitialProgress(initialProgress ?? null);
    setWorksheetQuestions(next);
    setRunnerPassages(extraPassages);
    setRunKey((k) => k + 1);
    setSessionEvents([]);
    setMode("runner");
  };

  const loadAccountWorksheetProgress = async (
    userId: string,
    scopeId: string,
  ): Promise<WorksheetProgressSave | null> => {
    const local = loadWorksheetProgressLocal(userId, scopeId);
    try {
      const remote = await fetchWorksheetProgress(userId, scopeId);
      return pickNewerWorksheetProgress(local, remote);
    } catch {
      return local;
    }
  };

  const clearAccountWorksheetProgress = async (userId: string, scopeId: string) => {
    clearWorksheetProgressLocal(userId, scopeId);
    try {
      await clearWorksheetProgress(userId, scopeId);
    } catch {
      // Local progress is already cleared. Account cleanup can retry next complete.
    }
  };

  const previewPreset = (preset: WorksheetPreset) => {
    const picked = pickWorksheetQuestions(
      questions,
      new Set(preset.tagCodes),
      preset.questionLimit,
    );
    if (picked.length === 0) {
      toast({
        title: "No questions in this pre-set",
        description: "Try another set, or build a custom worksheet.",
        variant: "destructive",
      });
      return;
    }
    setPresetTitle(preset.title);
    setActiveAssignment(null);
    setRunSource("tutor-preview");
    startWorksheetRun(picked);
  };

  const seedSelfProgress = (picked: Question[]) => {
    if (!profile?.uid || viewAs) return;
    const now = Date.now();
    const save: WorksheetProgressSave = {
      userId: profile.uid,
      scopeId: WORKSHEET_SELF_SCOPE_ID,
      runSource: "self",
      assignmentId: null,
      title: "Your practice worksheet",
      tagCodes:
        questionPickMode === "chosen" ? contentSkillCodes(picked) : selectedCodes,
      questionIds: picked.map((question) => question.id),
      currentQuestionIndex: 0,
      answers: {},
      flagged: [],
      lockedQuestionIds: [],
      eliminated: {},
      events: [],
      notepad: "",
      revealAnswers: true,
      tutorUid: null,
      startedAt: now,
      updatedAt: now,
    };
    persistWorksheetProgressLocal(save);
    void saveWorksheetProgress(save).catch(() => undefined);
  };

  const startTutorOrSelfPreview = () => {
    if (buildVariant === "tutor" && selectedStudentUid && !excludedReadyRef.current) {
      toast({
        title: "Still checking earlier worksheets",
        description: "Wait until questions already assigned to this student are left out.",
      });
      return;
    }
    const picked = pickCurrentQuestions().filter(
      (question) => buildVariant !== "tutor" || !excludedQuestionIdsRef.current.has(question.id),
    );
    setActiveAssignment(null);
    if (buildVariant === "student" && profile?.uid && !viewAs) {
      resumeLockRef.current = WORKSHEET_SELF_SCOPE_ID;
      setActiveScopeId(WORKSHEET_SELF_SCOPE_ID);
      replaceAttemptUrl(WORKSHEET_SELF_SCOPE_ID);
      seedSelfProgress(picked);
      setRunSource("self");
      startWorksheetRun(picked, undefined, null);
      return;
    }
    resumeLockRef.current = null;
    setActiveScopeId(null);
    replaceAttemptUrl(null);
    setRunSource("tutor-preview");
    startWorksheetRun(picked, undefined, null);
  };

  const resumeSelfPractice = async () => {
    if (!profile?.uid) return;
    const save = await loadAccountWorksheetProgress(profile.uid, WORKSHEET_SELF_SCOPE_ID);
    if (!save) {
      toast({
        title: "No saved custom practice",
        description: "Build a worksheet to start a new set.",
      });
      ignoreAttemptRestoreRef.current = true;
      resumeLockRef.current = null;
      replaceAttemptUrl(null);
      return;
    }
    const picked = getQuestionsByIds(save.questionIds);
    if (picked.length === 0) {
      toast({
        title: "Worksheet unavailable",
        description: "None of the saved questions could be loaded.",
        variant: "destructive",
      });
      ignoreAttemptRestoreRef.current = true;
      resumeLockRef.current = null;
      replaceAttemptUrl(null);
      return;
    }
    resumeLockRef.current = WORKSHEET_SELF_SCOPE_ID;
    setActiveScopeId(WORKSHEET_SELF_SCOPE_ID);
    replaceAttemptUrl(WORKSHEET_SELF_SCOPE_ID);
    setActiveAssignment(null);
    setRunSource("self");
    startWorksheetRun(picked, getPassagesForQuestions(picked), save);
  };

  const openReviewSession = (session: PracticeSessionRecord, subtitle?: string) => {
    setReviewSession(session);
    setReviewSubtitle(subtitle);
    setMode("review");
  };

  const handleReviewAssignment = async (assignment: WorksheetAssignment) => {
    try {
      const session =
        tutorTools || viewAs
          ? await fetchLatestAssignmentSessionForTutor(assignment.id)
          : await fetchLatestAssignmentSessionForStudent(assignment.id);
      if (viewAs && session && session.userId !== viewAs.uid) {
        toast({
          title: "No saved results yet",
          description: `${viewAs.displayName} has not submitted this worksheet.`,
          variant: "destructive",
        });
        return;
      }
      if (!session) {
        toast({
          title: "No saved results yet",
          description: viewAs
            ? `${viewAs.displayName} has not submitted this worksheet.`
            : tutorTools
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
      const subtitle = viewAs
        ? "Your saved assignment attempt"
        : tutorTools
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

  const startAssignedWorksheet = async (
    assignment: WorksheetAssignment,
    workspaceTarget?: WorksheetsWorkspaceCompletionTarget,
  ) => {
    workspaceCompletionTargetRef.current = workspaceTarget ?? null;
    const picked = getQuestionsByIds(assignment.questionIds);
    if (picked.length === 0) {
      toast({
        title: "Worksheet unavailable",
        description: "None of the assigned questions could be loaded.",
        variant: "destructive",
      });
      if (resumeLockRef.current === assignment.id || attemptParam === assignment.id) {
        ignoreAttemptRestoreRef.current = true;
        resumeLockRef.current = null;
        replaceAttemptUrl(null);
      }
      return;
    }
    if (profile?.uid && !viewAs) {
      resumeLockRef.current = assignment.id;
      setActiveScopeId(assignment.id);
      replaceAttemptUrl(assignment.id);
    }
    const initial =
      profile?.uid && !viewAs
        ? await loadAccountWorksheetProgress(profile.uid, assignment.id)
        : null;
    setActiveAssignment(assignment);
    setRunSource("assignment");
    startWorksheetRun(picked, getPassagesForQuestions(picked), initial);
  };

  const printAssignedWorksheet = (assignment: { title: string; questionIds: string[] }) => {
    const picked = getQuestionsByIds(assignment.questionIds);
    if (picked.length === 0) {
      toast({
        title: "Worksheet unavailable",
        description: "None of the assigned questions could be loaded.",
        variant: "destructive",
      });
      return;
    }
    try {
      openWorksheetPrintTab({
        title: assignment.title || "SHSAT practice worksheet",
        questions: picked,
        passages: getPassagesForQuestions(picked),
      });
    } catch (err) {
      toast({
        title: "Could not open print view",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (authLoading || !profile) return;

    const navState = location.state as WorksheetsLocationState | null;
    if (!navState) return;

    if (navState.returnTo) {
      returnToRef.current = navState.returnTo;
    }

    if (navState.assignToWorkspace && tutorTools) {
      const target = navState.assignToWorkspace;
      setPendingAssignToWorkspace(target);
      setSelectedStudentUid(target.boardId);
      setWorkspacePlacementLocked(true);
      setShowOnWorkspace(true);
      setWorkspaceListId(target.listId);
      setWorkspaceCardTarget(target.cardId ?? WORKSPACE_NEW_CARD_ID);
      if (navState.suggestedTagCodes?.length) {
        setSelectedCodes(navState.suggestedTagCodes);
      }
      openTutorBuild();
    } else if (
      (navState.openTutorBuild || navState.assignToStudentUid) &&
      tutorTools
    ) {
      if (navState.assignToStudentUid) {
        setSelectedStudentUid(navState.assignToStudentUid);
      }
      if (navState.suggestedTagCodes?.length) {
        setSelectedCodes(navState.suggestedTagCodes);
      }
      openTutorBuild();
    } else if (navState.openStudentBuild && role === "student") {
      openStudentBuild();
    } else if (navState.autoStartAssignment && role === "student") {
      startAssignedWorksheet(
        navState.autoStartAssignment,
        navState.workspaceCompletionTarget,
      );
    } else if (navState.reviewSession) {
      openReviewSession(
        navState.reviewSession,
        role === "parent" ? "Saved student attempt" : undefined,
      );
    } else if (navState.reviewAssignment) {
      void handleReviewAssignment(navState.reviewAssignment);
    } else {
      return;
    }

    const nextSearch =
      navState.autoStartAssignment && role === "student"
        ? worksheetAttemptSearch(navState.autoStartAssignment.id)
        : location.search;
    navigate({ pathname: location.pathname, search: nextSearch }, { replace: true, state: null });
    // Keep search out of deps. Auto-start writes the attempt query itself.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile, role, location.state, location.pathname, navigate]);

  useEffect(() => {
    if (!attemptParam) {
      ignoreAttemptRestoreRef.current = false;
    }
  }, [attemptParam]);

  useEffect(() => {
    if (authLoading || !profile || questionsLoading || viewAs) return;
    if (!attemptParam) return;
    if (ignoreAttemptRestoreRef.current) return;
    if (mode === "runner" || mode === "results" || mode === "review") return;
    if (resumeLockRef.current === attemptParam) return;
    if (role !== "student") {
      ignoreAttemptRestoreRef.current = true;
      replaceAttemptUrl(null);
      return;
    }

    let cancelled = false;
    resumeLockRef.current = attemptParam;

    void (async () => {
      try {
        if (attemptParam === WORKSHEET_SELF_SCOPE_ID) {
          await resumeSelfPractice();
          return;
        }
        const assignment = await fetchAssignmentById(attemptParam).catch(() => null);
        if (cancelled) return;
        if (assignment) {
          if (assignment.status === "completed") {
            ignoreAttemptRestoreRef.current = true;
            resumeLockRef.current = null;
            replaceAttemptUrl(null);
            return;
          }
          await startAssignedWorksheet(assignment);
          return;
        }
        const save = await loadAccountWorksheetProgress(profile.uid, attemptParam);
        if (cancelled) return;
        const picked = save ? getQuestionsByIds(save.questionIds) : [];
        if (!save || picked.length === 0) {
          ignoreAttemptRestoreRef.current = true;
          resumeLockRef.current = null;
          replaceAttemptUrl(null);
          toast({
            title: "Could not resume worksheet",
            description: "Open it again from Worksheets.",
          });
          return;
        }
        setActiveAssignment(null);
        setActiveScopeId(save.scopeId);
        setRunSource(save.runSource);
        startWorksheetRun(picked, getPassagesForQuestions(picked), save);
      } catch {
        if (cancelled) return;
        ignoreAttemptRestoreRef.current = true;
        resumeLockRef.current = null;
        replaceAttemptUrl(null);
      }
    })();

    return () => {
      cancelled = true;
      if (resumeLockRef.current === attemptParam) resumeLockRef.current = null;
    };
    // Restore from the attempt query after a refresh. Starters set resumeLockRef first.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, profile, questionsLoading, viewAs, attemptParam, role, mode]);

  useEffect(() => {
    if (mode !== "runner" || viewAs || !activeScopeId) return;
    if (attemptParam === activeScopeId) return;
    replaceAttemptUrl(activeScopeId);
  }, [mode, viewAs, activeScopeId, attemptParam]);

  useEffect(() => {
    if (role !== "student" || viewAs || mode !== "runner" || !profile?.uid || !activeScopeId) return;
    if (runSource !== "assignment" && runSource !== "self") return;
    const uid = profile.uid;
    const scopeId = activeScopeId;
    rememberActiveWorksheet(uid, scopeId);
    const onHide = () => {
      markWorksheetResumeAfterReload(uid, scopeId);
      const next = `${WORKSHEETS_PATH}${worksheetAttemptSearch(scopeId)}`;
      if (`${window.location.pathname}${window.location.search}` !== next) {
        window.history.replaceState(window.history.state, "", next);
      }
    };
    window.addEventListener("pagehide", onHide);
    return () => window.removeEventListener("pagehide", onHide);
  }, [role, viewAs, mode, profile?.uid, activeScopeId, runSource]);

  const handleAssignToStudent = async () => {
    if (!profile || !tutorTools) return;
    if (!selectedStudentUid) {
      toast({
        title: "Select a student",
        description: "Choose who should receive this worksheet.",
        variant: "destructive",
      });
      return;
    }

    if (!excludedReadyRef.current) {
      toast({
        title: "Still checking earlier worksheets",
        description: "Wait until questions already assigned to this student are left out.",
      });
      return;
    }

    const picked = pickCurrentQuestions().filter(
      (question) => !excludedQuestionIdsRef.current.has(question.id),
    );
    if (picked.length === 0) {
      toast({
        title: "Nothing to assign",
        description:
          questionPickMode === "chosen"
            ? "Add at least one question."
            : "Select skill tags that match questions in the bank.",
        variant: "destructive",
      });
      return;
    }

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
      const skillLabels =
        questionPickMode === "chosen" ? contentSkillLabels(picked) : selectedTagLabels;
      const title =
        presetTitle ??
        (skillLabels.length > 0
          ? `Worksheet: ${skillLabels.slice(0, 2).join(", ")}${skillLabels.length > 2 ? "…" : ""}`
          : "Custom worksheet");

      const dueAt = assignmentDueDateInputToTimestamp(assignmentDueDate);
      const placeOnWorkspace =
        showOnWorkspace && workspaceBoardExists && workspaceListId && workspaceCardTarget;

      const assignmentId = await createAssignment({
        questionIds: picked.map((q) => q.id),
        tutorUid: profile.uid,
        assignedToStudentUid: selectedStudentUid,
        title,
        tagCodes: questionPickMode === "chosen" ? contentSkillCodes(picked) : selectedCodes,
        dueAt,
        revealAnswers,
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
        description: `${
          student
            ? placeOnWorkspace
              ? `${student.displayName} can start from Active Assignments or their workspace (due ${dueLabel}).`
              : `${student.displayName} will see this in Active Assignments (due ${dueLabel}).`
            : `The student will see this in Active Assignments (due ${dueLabel}).`
        }${revealAnswers ? "" : " Answers and explanations stay hidden."}`,
      });
      setAssignmentsRefreshKey((k) => k + 1);
      setSelectedStudentUid("");
      setAssignmentDueDate(defaultAssignmentDueDateInput());
      setShowOnWorkspace(true);
      setWorkspacePlacementLocked(false);
      setPendingAssignToWorkspace(null);
      setWorkspaceCardTarget(WORKSPACE_NEW_CARD_ID);

      if (returnToRef.current) {
        const to = returnToRef.current;
        returnToRef.current = null;
        navigate(to);
      }
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
    if (buildVariant === "tutor" && selectedStudentUid && !excludedReadyRef.current) {
      toast({
        title: "Still checking earlier worksheets",
        description: "Wait until questions already assigned to this student are left out.",
      });
      return;
    }
    const picked = pickCurrentQuestions().filter(
      (question) => buildVariant !== "tutor" || !excludedQuestionIdsRef.current.has(question.id),
    );
    if (picked.length === 0) return;
    const skillLabels =
      questionPickMode === "chosen" ? contentSkillLabels(picked) : selectedTagLabels;
    const skillLine =
      skillLabels.length === 0
        ? undefined
        : skillLabels.length <= 8
          ? `Skills: ${skillLabels.join(", ")}`
          : `Skills: ${skillLabels.slice(0, 8).join(", ")}, +${skillLabels.length - 8} more`;
    try {
      openWorksheetPrintTab({
        title: "SHSAT practice worksheet",
        subtitle: skillLine,
        questions: picked,
        passages,
      });
    } catch (err) {
      toast({
        title: "Could not open print view",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
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
        : presetTitle ?? "Custom worksheet";

  const storageKeyPrefix =
    runSource === "assignment" && activeAssignment
      ? `assignment-${activeAssignment.id}`
      : runSource === "self"
        ? `worksheet-self-${profile?.uid ?? "anon"}`
        : "worksheet";

  const exitRunner = () => {
    forgetActiveWorksheet();
    if (runSource === "assignment") {
      leaveWorksheets("home");
    } else {
      leaveWorksheets("build");
    }
  };

  const parentCanReview =
    role === "parent" &&
    Boolean(
      (location.state as WorksheetsLocationState | null)?.reviewSession ||
        (location.state as WorksheetsLocationState | null)?.reviewAssignment,
    );

  if (role === "parent" && !(mode === "review" && reviewSession)) {
    if (!parentCanReview && !authLoading) {
      return <Navigate to="/dashboard" replace />;
    }
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  const resumingAttempt =
    Boolean(attemptParam) &&
    role === "student" &&
    !viewAs &&
    mode !== "runner" &&
    mode !== "results" &&
    mode !== "review";

  if ((questionsLoading && mode !== "review") || resumingAttempt) {
    return (
      <div className="min-h-screen">
        <Header />
        {questionsLoading && mode !== "review" ? (
          <QuestionsStatus />
        ) : (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    );
  }

  if (mode === "review" && reviewSession) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-8">
          <WorksheetSessionReview
            session={reviewSession}
            subtitle={reviewSubtitle}
            viewerRole={viewAs ? "student" : tutorTools || role === "parent" ? "tutor" : "student"}
            skillWorksheetStudentUid={
              !viewAs && tutorTools && profile && reviewSession.userId !== profile.uid
                ? reviewSession.userId
                : undefined
            }
            skillWorksheetReturnTo={
              tutorTools && profile && reviewSession.userId !== profile.uid
                ? returnToRef.current ?? undefined
                : undefined
            }
            onBack={() => {
              setReviewSession(null);
              setReviewSubtitle(undefined);
              leaveWorksheets("home");
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
        passageCatalog={runnerPassages}
        storageKeyPrefix={storageKeyPrefix}
        onExit={exitRunner}
        revealAnswers={
          runSource === "assignment" && activeAssignment
            ? assignmentRevealsAnswers(activeAssignment)
            : true
        }
        progressKey={
          profile?.uid &&
          !viewAs &&
          activeScopeId &&
          (runSource === "assignment" || runSource === "self")
            ? {
                userId: profile.uid,
                scopeId: activeScopeId,
                runSource,
                assignmentId:
                  runSource === "assignment" ? (activeAssignment?.id ?? activeScopeId) : null,
                title: sessionTitle,
                tagCodes:
                  runSource === "assignment"
                    ? (activeAssignment?.tagCodes ?? [])
                    : questionPickMode === "chosen"
                      ? contentSkillCodes(worksheetQuestions)
                      : selectedCodes,
                tutorUid:
                  runSource === "assignment" ? (activeAssignment?.tutorUid ?? null) : null,
              }
            : undefined
        }
        initialProgress={runnerInitialProgress}
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
                    : questionPickMode === "chosen"
                      ? contentSkillCodes(worksheetQuestions)
                      : selectedCodes,
                questionIds: worksheetQuestions.map((q) => q.id),
                events,
                assignmentId: activeAssignment?.id ?? null,
                tutorUid:
                  runSource === "assignment" ? (activeAssignment?.tutorUid ?? null) : null,
              });
              if (profile?.uid) {
                await clearAccountWorksheetProgress(
                  profile.uid,
                  runSource === "assignment" && activeAssignment
                    ? activeAssignment.id
                    : WORKSHEET_SELF_SCOPE_ID,
                );
              }
            } catch (err) {
              toast({
                title: "Could not save practice results",
                description: err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
              });
            }
          }
          forgetActiveWorksheet();
          ignoreAttemptRestoreRef.current = true;
          resumeLockRef.current = null;
          setActiveScopeId(null);
          replaceAttemptUrl(null);

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
      leaveWorksheets("home");
    } else {
      leaveWorksheets("build");
    }
  };

  return (
    <div className="min-h-screen">
      <Header />

      <div className="container py-8">
        {mode === "results" && (
          <div className="max-w-5xl mx-auto space-y-6">
            <Button variant="ghost" onClick={backFromResults}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              {returnToRef.current
                ? "Back to workspace"
                : runSource === "assignment"
                  ? "Back to worksheets"
                  : "Back to builder"}
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
                  ? "Self-practice results are for your review only, not shared with your tutor."
                  : runSource === "assignment" &&
                      activeAssignment &&
                      !assignmentRevealsAnswers(activeAssignment)
                    ? "Answers and explanations stayed hidden on this worksheet. Statistics use your answers and time on each question."
                    : "Statistics use your answers and time on each question in this worksheet."
              }
              footerActions={
                tutorTools ? (
                  <>
                    <Button variant="outline" onClick={() => setMode("build")}>
                      Edit tags
                    </Button>
                    <Button onClick={startTutorOrSelfPreview}>New worksheet (same tags)</Button>
                  </>
                ) : runSource === "self" ? (
                  <>
                    <Button variant="outline" onClick={() => leaveWorksheets("home")}>
                      {returnToRef.current ? "Back to workspace" : "Back to worksheets"}
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
                    <Button onClick={backFromResults}>
                      {returnToRef.current ? "Back to workspace" : "Back to worksheets"}
                    </Button>
                  </>
                ) : (
                  <Button onClick={backFromResults}>
                    {returnToRef.current ? "Back to workspace" : "Back to worksheets"}
                  </Button>
                )
              }
            />
          </div>
        )}

        {mode === "build" && (tutorTools || role === "student") && (
          <div className="mb-12 max-w-6xl mx-auto">
            <Button
              variant="ghost"
              className="mb-6"
              onClick={() => {
                leaveWorksheets("home");
              }}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {returnToRef.current ? "Back to workspace" : "Back"}
            </Button>

            <div className="mb-8">
              <h2 className="mb-2 font-serif text-2xl font-semibold">
                {buildVariant === "student"
                  ? "Create your own practice"
                  : "Create custom worksheet"}
              </h2>
              <p className="text-muted-foreground max-w-2xl">
                {buildVariant === "student"
                  ? "Pick skills, then start a random set or choose the questions yourself."
                  : "Pick skills, then use a random set or choose the questions. Preview it, then assign it to a student. Questions already on that student's worksheets are left out."}
              </p>
            </div>

            <CustomWorksheetBuilder
              variant={buildVariant}
              selectedCodes={selectedCodes}
              questionLimit={questionLimit}
              tagCatalog={tagCatalog}
              matchingCount={matchingCount}
              questionPickMode={questionPickMode}
              onQuestionPickModeChange={setQuestionPickMode}
              poolQuestions={poolQuestions}
              chosenIds={chosenQuestionIds}
              chosenQuestions={chosenQuestions}
              passages={passages}
              onChosenIdsChange={setChosenQuestionIdsCapped}
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
              excludedAssignedCount={assignedExclusion?.size ?? 0}
              excludedAssignedLoading={excludedAssignedLoading}
              onAssign={handleAssignToStudent}
              revealAnswers={revealAnswers}
              onRevealAnswersChange={setRevealAnswers}
            />
          </div>
        )}

        {mode === "home" && (
          <>
            <PageHeader
              title="Worksheets"
              description={
                viewAs
                  ? `${viewAs.displayName}'s worksheets. Open results after they submit.`
                  : "Focused SHSAT practice sets, complete them here, or build your own."
              }
            />

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
            ) : viewAs ? (
              viewAsSnapshot ? (
                <StudentWorksheetsHome
                  assignmentsRefreshKey={assignmentsRefreshKey}
                  onStartAssignment={() => undefined}
                  onReviewAssignment={handleReviewAssignment}
                  onPrintAssignment={printAssignedWorksheet}
                  onReviewSession={(session) => openReviewSession(session)}
                  onCreateCustomPractice={() => undefined}
                  preview={{
                    studentName: viewAs.displayName,
                    assignments: viewAsSnapshot.assignments,
                    sessions: viewAsSnapshot.sessions,
                  }}
                />
              ) : (
                <div className="flex justify-center py-16">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              )
            ) : tutorTools ? (
              <TutorWorksheetsHome
                assignmentsRefreshKey={assignmentsRefreshKey}
                presets={worksheetPresets}
                onCreateCustom={openTutorBuild}
                onAssignPreset={openTutorBuildFromPreset}
                onPreviewPreset={previewPreset}
                onReviewAssignment={handleReviewAssignment}
                onPrintAssignment={printAssignedWorksheet}
                onReviewSession={(session) =>
                  openReviewSession(session, "Student assignment attempt")
                }
              />
            ) : (
              <StudentWorksheetsHome
                assignmentsRefreshKey={assignmentsRefreshKey}
                onStartAssignment={(assignment) => void startAssignedWorksheet(assignment)}
                onReviewAssignment={handleReviewAssignment}
                onPrintAssignment={printAssignedWorksheet}
                onReviewSession={(session) => openReviewSession(session)}
                onCreateCustomPractice={openStudentBuild}
                onResumeSelfPractice={() => void resumeSelfPractice()}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default Worksheets;
