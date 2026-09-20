import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Clock, Loader2, TimerOff } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DiagnosticExamRunner } from "@/components/diagnostic/DiagnosticExamRunner";
import { DiagnosticItemReview } from "@/components/diagnostic/DiagnosticItemReview";
import { DiagnosticModuleBreakdown } from "@/components/diagnostic/DiagnosticModuleBreakdown";
import { DiagnosticStrandBreakdown } from "@/components/diagnostic/DiagnosticStrandBreakdown";
import { SessionResultsDashboard } from "@/components/session/SessionResultsDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { SHSAT_DIAGNOSTIC_SPEC, type DiagnosticSubject } from "@/data/shsatDiagnosticForm";
import {
  appendDiagnosticResults,
  clearDiagnosticSave,
  formatDiagnosticClock,
  isDiagnosticSaveExpired,
  loadDiagnosticAttempts,
  loadDiagnosticSave,
  markDiagnosticResultsSynced,
  persistDiagnosticSave,
  pickNewerDiagnosticSave,
  remainingFromDiagnosticSave,
  withPausedClock,
  withRunningDeadline,
  type DiagnosticExamSave,
} from "@/lib/diagnosticExamStorage";
import {
  clearDiagnosticProgress,
  fetchDiagnosticProgress,
  saveDiagnosticProgress,
} from "@/lib/diagnosticProgressService";
import {
  computeDiagnosticModuleBreakdown,
  computeDiagnosticStrands,
  diagnosticAttemptLabel,
  orderDiagnosticSessionsOldestFirst,
} from "@/lib/diagnosticReport";
import {
  fetchPracticeSessionsForStudent,
  resolveLinkedTutorUid,
  savePracticeSession,
} from "@/lib/practiceSessionService";
import { fetchWorkspaceBoard } from "@/lib/workspaceService";
import {
  assembleDiagnosticExam,
  buildDiagnosticCompletionEvents,
  countAnsweredDiagnosticItems,
  currentDiagnosticSection,
  mergeDiagnosticEventsWithExam,
} from "@/lib/shsatDiagnostic";
import { toast } from "@/hooks/use-toast";
import type { DiagnosticEndReason, PracticeSessionRecord } from "@/types/practiceSession";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

type Phase = "intro" | "exam" | "timesup" | "results";

export default function DiagnosticExam() {
  const navigate = useNavigate();
  const location = useLocation();
  const { profile } = useAuth();
  const exam = useMemo(() => assembleDiagnosticExam(), []);
  const reviewFromNav = (location.state as { reviewSession?: PracticeSessionRecord } | null)
    ?.reviewSession;

  const [phase, setPhase] = useState<Phase>(reviewFromNav ? "results" : "intro");
  const [progress, setProgress] = useState<DiagnosticExamSave | null>(() =>
    profile ? loadDiagnosticSave(profile.uid) : null,
  );
  const [progressLoading, setProgressLoading] = useState(Boolean(profile) && !reviewFromNav);
  const [firstSection, setFirstSection] = useState<DiagnosticSubject>(
    progress?.firstSection ?? "ELA",
  );
  const [assignedExtendedTime, setAssignedExtendedTime] = useState(false);
  const [deadlineAt, setDeadlineAt] = useState(progress?.deadlineAt ?? 0);
  const [events, setEvents] = useState<SessionAnalyticsEvent[]>(reviewFromNav?.events ?? []);
  const [endedReason, setEndedReason] = useState<DiagnosticEndReason | undefined>(
    reviewFromNav?.endedReason,
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [accountSessions, setAccountSessions] = useState<PracticeSessionRecord[]>(
    reviewFromNav ? [reviewFromNav] : [],
  );
  const [confirmStartOver, setConfirmStartOver] = useState(false);
  const [confirmRetake, setConfirmRetake] = useState(false);
  const [attemptLabel, setAttemptLabel] = useState(
    reviewFromNav?.isBaseline || reviewFromNav?.attemptNumber === 1
      ? "First diagnostic"
      : reviewFromNav?.attemptNumber
        ? `Attempt ${reviewFromNav.attemptNumber}`
        : "Diagnostic results",
  );
  const [currentAttemptMeta, setCurrentAttemptMeta] = useState<{
    number: number;
    localId?: string;
    isBaseline: boolean;
  } | null>(
    reviewFromNav
      ? {
          number: reviewFromNav.attemptNumber ?? 1,
          isBaseline: Boolean(reviewFromNav.isBaseline || reviewFromNav.attemptNumber === 1),
        }
      : null,
  );
  const [now, setNow] = useState(Date.now());
  const localAttempts = profile ? loadDiagnosticAttempts(profile.uid) : [];
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    if (!profile || reviewFromNav) {
      setProgressLoading(false);
      return;
    }
    let cancelled = false;
    setProgressLoading(true);
    void fetchDiagnosticProgress(profile.uid)
      .then((remote) => {
        if (cancelled) return;
        const local = loadDiagnosticSave(profile.uid);
        const next = pickNewerDiagnosticSave(local, remote);
        if (phaseRef.current !== "intro") return;
        if (next) {
          persistDiagnosticSave(profile.uid, next);
          setProgress(next);
          setFirstSection(next.firstSection);
        } else {
          setProgress(null);
        }
      })
      .catch(() => {
        if (!cancelled && phaseRef.current === "intro") {
          setProgress(loadDiagnosticSave(profile.uid));
        }
      })
      .finally(() => {
        if (!cancelled) setProgressLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile, reviewFromNav]);

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;
    void fetchWorkspaceBoard(profile.uid)
      .then((board) => {
        if (!cancelled) setAssignedExtendedTime(Boolean(board?.diagnosticExtendedTime));
      })
      .catch(() => {
        if (!cancelled) setAssignedExtendedTime(false);
      });
    return () => {
      cancelled = true;
    };
  }, [profile]);

  useEffect(() => {
    if (!profile || reviewFromNav) return;
    let cancelled = false;
    void fetchPracticeSessionsForStudent(["diagnostic"])
      .then((rows) => {
        if (!cancelled) setAccountSessions(rows);
      })
      .catch(() => {
        if (!cancelled) setAccountSessions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [profile, reviewFromNav]);

  useEffect(() => {
    if (phase !== "intro" || !progress || progress.paused) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [phase, progress]);

  const canStartOfficial = exam.isComplete;
  const canPreview = exam.elaReady > 0 && exam.mathReady > 0;
  const orderedAccountSessions = useMemo(
    () => orderDiagnosticSessionsOldestFirst(accountSessions),
    [accountSessions],
  );
  const completedAttempts = useMemo(() => {
    const fromAccount = orderedAccountSessions.map((session, index) => ({
      id: session.id,
      events: session.events,
      endedReason: session.endedReason,
      accuracyPct: session.accuracyPct,
      dateMs: session.completedAt?.toMillis?.() ?? 0,
      isBaseline: session.isBaseline || index === 0,
    }));
    const accountIds = new Set(orderedAccountSessions.map((session) => session.id));
    const fromLocal = localAttempts
      .filter((save) => !save.firestoreId || !accountIds.has(save.firestoreId))
      .map((save) => ({
        id: save.localId,
        events: save.events,
        endedReason: save.endedReason,
        accuracyPct: save.events.length
          ? Math.round(
              (save.events.filter((event) => event.correct).length / save.events.length) * 100,
            )
          : 0,
        dateMs: save.completedAt,
        isBaseline: save.isBaseline,
      }));
    const merged = [...fromAccount, ...fromLocal].sort((a, b) => a.dateMs - b.dateMs);
    return merged.map((attempt, index, all) => ({
      ...attempt,
      isBaseline: index === 0,
      label: diagnosticAttemptLabel(index + 1, all.length),
      dateLabel: attempt.dateMs
        ? new Date(attempt.dateMs).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
          })
        : "",
    }));
  }, [localAttempts, orderedAccountSessions]);
  const hasCompletedDiagnostic = completedAttempts.length > 0;
  const displayedEndedReason = endedReason;
  const saveExpired = progress ? isDiagnosticSaveExpired(progress, now) : false;
  const saveRemaining = progress ? remainingFromDiagnosticSave(progress, now) : 0;
  const saveProgress = progress
    ? countAnsweredDiagnosticItems(exam, progress.answers)
    : null;
  const saveSection = progress ? currentDiagnosticSection(exam, progress) : null;
  const resultsEvents = useMemo(
    () => (events.length === 0 ? events : mergeDiagnosticEventsWithExam(exam, events)),
    [exam, events],
  );
  const strandStats = useMemo(() => computeDiagnosticStrands(resultsEvents), [resultsEvents]);
  const moduleBreakdown = useMemo(
    () => computeDiagnosticModuleBreakdown(resultsEvents),
    [resultsEvents],
  );

  const persistAndUploadResults = async (
    completedEvents: SessionAnalyticsEvent[],
    reason: DiagnosticEndReason,
    options?: { appendLocal?: boolean },
  ) => {
    if (!profile) return;
    const appendLocal = options?.appendLocal ?? true;
    const questionIds = completedEvents.map((e) => e.questionId);
    const answers: Record<string, string> = {};
    for (const event of completedEvents) {
      if (event.answer) answers[event.questionId] = event.answer;
    }
    const priorCount = Math.max(orderedAccountSessions.length, localAttempts.length);
    const attemptNumber = appendLocal
      ? priorCount + 1
      : currentAttemptMeta?.number ?? priorCount;
    const isBaseline = appendLocal ? attemptNumber === 1 : Boolean(currentAttemptMeta?.isBaseline);
    let localId = currentAttemptMeta?.localId;
    if (appendLocal) {
      const saved = appendDiagnosticResults(profile.uid, {
        specId: SHSAT_DIAGNOSTIC_SPEC.id,
        completedAt: Date.now(),
        title: SHSAT_DIAGNOSTIC_SPEC.name,
        events: completedEvents,
        questionIds,
        tagCodes: [...new Set(completedEvents.flatMap((e) => e.tags))],
        firestoreId: null,
        endedReason: reason,
        answers,
        attemptNumber,
        isBaseline,
      });
      localId = saved.localId;
      setCurrentAttemptMeta({ number: attemptNumber, localId, isBaseline });
      setAttemptLabel(diagnosticAttemptLabel(attemptNumber, attemptNumber));
    }
    setSaving(true);
    setSaveError(null);
    try {
      const tutorUid = await resolveLinkedTutorUid();
      const id = await savePracticeSession({
        sessionType: "diagnostic",
        title: SHSAT_DIAGNOSTIC_SPEC.name,
        tagCodes: [...new Set(completedEvents.flatMap((e) => e.tags))],
        questionIds,
        events: completedEvents,
        tutorUid,
        endedReason: reason,
        attemptNumber,
        isBaseline,
      });
      markDiagnosticResultsSynced(profile.uid, id, localId);
      void fetchPracticeSessionsForStudent(["diagnostic"])
        .then(setAccountSessions)
        .catch(() => undefined);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save to your account.";
      setSaveError(message);
      toast({
        title: "Saved on this device — retry to sync your account",
        description: message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const writeProgress = async (save: DiagnosticExamSave) => {
    if (!profile) return;
    persistDiagnosticSave(profile.uid, save);
    setProgress(save);
    try {
      await saveDiagnosticProgress(profile.uid, save);
    } catch (err) {
      toast({
        title: "Saved on this device",
        description:
          err instanceof Error ? err.message : "Could not sync this attempt to your account yet.",
        variant: "destructive",
      });
    }
  };

  const eraseInProgress = async () => {
    if (!profile) return;
    clearDiagnosticSave(profile.uid);
    setProgress(null);
    try {
      await clearDiagnosticProgress(profile.uid);
    } catch {
      // Local clear is enough to start over on this device.
    }
  };

  const beginFreshExam = () => {
    if (!profile || !canPreview) return;
    void (async () => {
      if (progress) await eraseInProgress();
      setConfirmRetake(false);
      setConfirmStartOver(false);
      const minutes = assignedExtendedTime
        ? SHSAT_DIAGNOSTIC_SPEC.extendedMinutes
        : SHSAT_DIAGNOSTIC_SPEC.standardMinutes;
      const nowMs = Date.now();
      const remainingSeconds = minutes * 60;
      const save: DiagnosticExamSave = {
        specId: SHSAT_DIAGNOSTIC_SPEC.id,
        startedAt: nowMs,
        deadlineAt: nowMs + remainingSeconds * 1000,
        paused: false,
        remainingSeconds,
        updatedAt: nowMs,
        firstSection,
        sectionIndex: 0,
        unitIndex: 0,
        questionIndexInUnit: 0,
        answers: {},
        flagged: [],
        lockedUnitKeys: [],
        eliminated: {},
        notepad: "",
        clockHidden: false,
        events: [],
      };
      await writeProgress(save);
      setDeadlineAt(save.deadlineAt);
      setPhase("exam");
    })();
  };

  const startNew = () => {
    if (progress) {
      setConfirmStartOver(true);
      return;
    }
    if (hasCompletedDiagnostic) {
      setConfirmRetake(true);
      return;
    }
    beginFreshExam();
  };

  const requestAnotherSitting = () => {
    if (!canPreview) return;
    if (progress) {
      setConfirmStartOver(true);
      return;
    }
    setConfirmRetake(true);
  };

  const confirmDialogs = (
    <>
      <AlertDialog open={confirmStartOver} onOpenChange={setConfirmStartOver}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Erase this diagnostic and start over?</AlertDialogTitle>
            <AlertDialogDescription>
              Answers, flags, and notes for this in-progress sitting will be deleted. This cannot be
              undone. The timer will restart from the beginning. Finished sittings stay saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep in-progress exam</AlertDialogCancel>
            <AlertDialogAction onClick={beginFreshExam}>Start over and erase answers</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmRetake} onOpenChange={setConfirmRetake}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sit the diagnostic again?</AlertDialogTitle>
            <AlertDialogDescription>
              Previous sittings stay saved. This sitting will be stored as attempt{" "}
              {completedAttempts.length + 1}. Tutors will see every report.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep existing reports</AlertDialogCancel>
            <AlertDialogAction onClick={beginFreshExam}>Start new sitting</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );

  const resume = () => {
    if (!progress || !profile) return;
    if (isDiagnosticSaveExpired(progress)) {
      void finalizeFromSave("time");
      return;
    }
    const running = withRunningDeadline(progress);
    void writeProgress(running);
    setFirstSection(running.firstSection);
    setDeadlineAt(running.deadlineAt);
    setPhase("exam");
  };

  const finalizeFromSave = async (reason: DiagnosticEndReason) => {
    if (!progress || !profile) return;
    const completed = buildDiagnosticCompletionEvents(
      exam,
      progress.answers,
      progress.events,
    );
    await eraseInProgress();
    setEvents(completed);
    setEndedReason(reason);
    setPhase(reason === "time" ? "timesup" : "results");
    await persistAndUploadResults(completed, reason);
  };

  const openAttempt = (
    resultEvents: SessionAnalyticsEvent[],
    reason?: DiagnosticEndReason,
    label?: string,
  ) => {
    setEvents(resultEvents);
    setEndedReason(reason);
    if (label) setAttemptLabel(label);
    setPhase("results");
  };

  const handleComplete = async (
    completedEvents: SessionAnalyticsEvent[],
    reason: DiagnosticEndReason,
  ) => {
    setEvents(completedEvents);
    setEndedReason(reason);
    setProgress(null);
    setPhase(reason === "time" ? "timesup" : "results");
    await persistAndUploadResults(completedEvents, reason);
  };

  if (phase === "exam" && profile) {
    return (
      <DiagnosticExamRunner
        key={deadlineAt}
        exam={exam}
        userId={profile.uid}
        firstSection={firstSection}
        deadlineAt={deadlineAt || Date.now() + SHSAT_DIAGNOSTIC_SPEC.standardMinutes * 60 * 1000}
        initialSave={progress}
        onExit={() => {
          setProgress(profile ? loadDiagnosticSave(profile.uid) : null);
          setPhase("intro");
        }}
        onComplete={(completed, reason) => void handleComplete(completed, reason)}
      />
    );
  }

  if (phase === "timesup") {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-16 max-w-lg">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 text-destructive mb-1">
                <TimerOff className="h-5 w-5" />
                <span className="text-sm font-medium">Time is up</span>
              </div>
              <CardTitle className="font-serif text-2xl">The exam timer has ended</CardTitle>
              <CardDescription>
                Unanswered items are scored as incorrect. This is not the same as submitting on your
                own.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {saving ? (
                <p className="text-sm text-muted-foreground">Saving your report…</p>
              ) : saveError ? (
                <p className="text-sm text-destructive">
                  Saved on this device. Account sync failed: {saveError}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Your answers are saved to your account when sync succeeds.
                </p>
              )}
              <Button className="w-full" size="lg" onClick={() => setPhase("results")}>
                See results
              </Button>
              {!reviewFromNav ? (
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={requestAnotherSitting}
                  disabled={!canPreview}
                >
                  Start a new sitting
                </Button>
              ) : null}
              {!reviewFromNav ? (
                <p className="text-xs text-muted-foreground">
                  Starting again does not delete this sitting. It is saved with your other reports.
                </p>
              ) : null}
            </CardContent>
          </Card>
        </div>
        {confirmDialogs}
      </div>
    );
  }

  if (phase === "results") {
    const elaEvents = resultsEvents.filter((e) => e.subject === "ELA");
    const mathEvents = resultsEvents.filter((e) => e.subject === "MATH");
    const elaPct = elaEvents.length
      ? Math.round((elaEvents.filter((e) => e.correct).length / elaEvents.length) * 100)
      : 0;
    const mathPct = mathEvents.length
      ? Math.round((mathEvents.filter((e) => e.correct).length / mathEvents.length) * 100)
      : 0;
    const module1 = moduleBreakdown.overall[0];
    const module2 = moduleBreakdown.overall[1];

    return (
      <div className="min-h-screen">
        <Header />
        <div className="container py-8">
          <SessionResultsDashboard
            title={attemptLabel === "Diagnostic results" ? "Diagnostic results" : `Diagnostic results · ${attemptLabel}`}
            events={resultsEvents}
            summaryMetrics={[
              { label: "ELA", value: `${elaPct}%` },
              { label: "Math", value: `${mathPct}%` },
              {
                label: "Module 1",
                value:
                  module1?.accuracyPct == null
                    ? "—"
                    : `${module1.accuracyPct}%`,
              },
              {
                label: "Module 2",
                value:
                  module2?.accuracyPct == null
                    ? "—"
                    : `${module2.accuracyPct}%`,
              },
              {
                label: "Items",
                value: `${resultsEvents.filter((e) => e.correct).length}/${resultsEvents.length}`,
              },
            ]}
            extraSections={
              <div className="space-y-4">
                <DiagnosticModuleBreakdown
                  overall={moduleBreakdown.overall}
                  bySubject={moduleBreakdown.bySubject}
                />
                <DiagnosticStrandBreakdown ela={strandStats.ela} math={strandStats.math} />
                <DiagnosticItemReview exam={exam} events={resultsEvents} />
              </div>
            }
            tagTableTitle="Fine-grained tags"
            footnote={
              <div className="space-y-2">
                {displayedEndedReason === "time" ? (
                  <p className="text-sm text-foreground">
                    Time ran out. Unanswered items were scored as incorrect.
                  </p>
                ) : null}
                {saving ? (
                  <p className="text-sm text-muted-foreground">Saving to your account…</p>
                ) : saveError ? (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                    <p className="text-sm text-destructive">
                      Saved on this device. Account sync failed: {saveError}
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        void persistAndUploadResults(events, displayedEndedReason ?? "submit", {
                          appendLocal: false,
                        })
                      }
                    >
                      Retry save
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {attemptLabel === "First diagnostic"
                      ? "This sitting is saved as the first diagnostic (baseline). Later sittings will not replace it."
                      : `${attemptLabel} is saved separately from the first diagnostic.`}{" "}
                    Official SHSAT scores are scaled by item difficulty. These numbers are raw
                    Module 1 / Module 2 accuracy and time on this fixed form.
                  </p>
                )}
              </div>
            }
            footerActions={
              <div className="flex flex-wrap gap-2">
                {!reviewFromNav ? (
                  <Button onClick={requestAnotherSitting} disabled={!canPreview}>
                    Start a new sitting
                  </Button>
                ) : null}
                {!reviewFromNav ? (
                  <Button variant="outline" onClick={() => setPhase("intro")}>
                    All sittings
                  </Button>
                ) : null}
                <Button variant="outline" asChild>
                  <Link to="/practice">Back to Practice</Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link to="/dashboard">Dashboard</Link>
                </Button>
              </div>
            }
          />
        </div>
        {confirmDialogs}
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="container py-8 max-w-3xl">
          {progressLoading ? (
            <div className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading your saved attempt…
            </div>
          ) : null}
          <Button variant="ghost" className="mb-6 -ml-2" onClick={() => navigate("/practice")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Practice
          </Button>

          <div className="mb-8">
            <Badge className="mb-3">{SHSAT_DIAGNOSTIC_SPEC.testSeason}</Badge>
            <h1 className="mb-2 font-serif text-2xl font-semibold tracking-tight">
              {SHSAT_DIAGNOSTIC_SPEC.name}
            </h1>
            <p className="text-muted-foreground">
              Full-length exam matching the Fall 2026 SHSAT (2027 admissions): 50 ELA, 50 Math, and{" "}
              {SHSAT_DIAGNOSTIC_SPEC.standardMinutes} minutes. The official test is computer-adaptive;
              this diagnostic uses a fixed imported form with the same timing and navigation rules.
            </p>
          </div>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Form status</CardTitle>
              <CardDescription>
                Fall 2026 launch form: 50 ELA items (reading passages, revising/editing, and
                standalone sentences) and 50 Math items, in official section order.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4">
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">ELA</p>
                <p className="text-2xl font-bold">
                  {exam.elaReady}/{SHSAT_DIAGNOSTIC_SPEC.elaCount}
                </p>
                {exam.ela.missingIds.length > 0 ? (
                  <p className="text-xs text-destructive mt-1">
                    Missing {exam.ela.missingIds.length} listed ID
                    {exam.ela.missingIds.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-sm text-muted-foreground">Math</p>
                <p className="text-2xl font-bold">
                  {exam.mathReady}/{SHSAT_DIAGNOSTIC_SPEC.mathCount}
                </p>
                {exam.math.missingIds.length > 0 ? (
                  <p className="text-xs text-destructive mt-1">
                    Missing {exam.math.missingIds.length} listed ID
                    {exam.math.missingIds.length === 1 ? "" : "s"}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Exam rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              <p>Choose ELA or Math first. You must finish that section before starting the other.</p>
              <p>Answer every question before you can move on. There is no skip.</p>
              <p>
                In a reading or revising/editing passage set, you may go back until you submit that
                set. After that, those items lock.
              </p>
              <p>Standalone ELA items and all Math items lock as soon as you advance.</p>
              <p>No answer key until you submit the full exam. Time is shared across both sections.</p>
              <p>
                Pause and save stops the timer and stores this attempt in your account. You can
                resume on another computer.
              </p>
            </CardContent>
          </Card>

          {progress ? (
            <Card className="mb-6 border-primary/30">
              <CardHeader>
                <CardTitle>
                  {saveExpired ? "Time ran out" : progress.paused ? "Paused" : "In progress"}
                </CardTitle>
                <CardDescription>
                  {saveExpired
                    ? "The clock finished while you were away. Unanswered items will count as incorrect."
                    : progress.paused
                      ? "The timer is stopped. Your answers are saved to your account."
                      : "This attempt is saved to your account. Pause to stop the timer."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-3 gap-3 text-sm">
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Time left</p>
                    <p className="font-medium tabular-nums">
                      {saveExpired ? "0:00" : formatDiagnosticClock(saveRemaining)}
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Current section</p>
                    <p className="font-medium">
                      {saveSection?.subject ?? progress.firstSection}
                      <span className="text-muted-foreground font-normal">
                        {" "}
                        ({progress.sectionIndex + 1} of 2)
                      </span>
                    </p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-muted-foreground">Answered</p>
                    <p className="font-medium">
                      {saveProgress?.answered ?? 0}/{saveProgress?.total ?? 100}
                    </p>
                  </div>
                </div>
                {saveExpired ? (
                  <Button onClick={() => void finalizeFromSave("time")}>View results</Button>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    <Button onClick={resume}>Resume diagnostic</Button>
                    {!progress.paused ? (
                      <Button
                        variant="outline"
                        onClick={() => void writeProgress(withPausedClock(progress))}
                      >
                        Pause timer
                      </Button>
                    ) : null}
                  </div>
                )}
              </CardContent>
            </Card>
          ) : null}

          {completedAttempts.length > 0 ? (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>
                  {completedAttempts.length === 1 ? "First diagnostic" : "Diagnostic sittings"}
                </CardTitle>
                <CardDescription>
                  The first diagnostic stays the baseline. Later sittings are saved as new attempts
                  — they do not replace it.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {completedAttempts.map((attempt) => (
                  <div
                    key={attempt.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2"
                  >
                    <div>
                      <p className="text-sm font-medium">{attempt.label}</p>
                      <p className="text-xs text-muted-foreground">
                        {attempt.accuracyPct}% raw
                        {attempt.dateLabel ? ` · ${attempt.dateLabel}` : ""}
                      </p>
                    </div>
                    <Button
                      variant={attempt.isBaseline ? "default" : "outline"}
                      size="sm"
                      onClick={() =>
                        openAttempt(attempt.events, attempt.endedReason, attempt.label)
                      }
                    >
                      View {attempt.isBaseline ? "first diagnostic" : "this attempt"}
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{progress ? "Start over" : "Start"}</CardTitle>
              {progress ? (
                <CardDescription>
                  Starting over erases the in-progress exam from this device and your account.
                  Resume above unless you mean to throw those answers away.
                </CardDescription>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-2">First section</p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={firstSection === "ELA" ? "default" : "outline"}
                    onClick={() => setFirstSection("ELA")}
                    disabled={Boolean(progress)}
                  >
                    ELA first
                  </Button>
                  <Button
                    type="button"
                    variant={firstSection === "MATH" ? "default" : "outline"}
                    onClick={() => setFirstSection("MATH")}
                    disabled={Boolean(progress)}
                  >
                    Math first
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                {assignedExtendedTime
                  ? profile?.role === "tutor"
                    ? `${SHSAT_DIAGNOSTIC_SPEC.extendedMinutes} minutes (extended time)`
                    : `${SHSAT_DIAGNOSTIC_SPEC.extendedMinutes} minutes (extended time assigned by your tutor)`
                  : `${SHSAT_DIAGNOSTIC_SPEC.standardMinutes} minutes`}
              </div>
              {profile?.role === "tutor" ? (
                <p className="text-xs text-muted-foreground">
                  To give a student 360 minutes, turn on extended time on their workspace board.
                </p>
              ) : null}

              {!canStartOfficial ? (
                <p className="text-sm text-muted-foreground">
                  This form is not complete yet. Timing and navigation still match the Fall 2026
                  rules.
                </p>
              ) : (
                <p className="text-sm flex items-center gap-2 text-success">
                  <CheckCircle2 className="h-4 w-4" />
                  Form is complete and ready to launch.
                </p>
              )}

              {progress && !saveExpired ? (
                <Button
                  className="w-full"
                  size="lg"
                  variant="outline"
                  onClick={startNew}
                  disabled={!canPreview}
                >
                  Start over and erase answers
                </Button>
              ) : progress && saveExpired ? (
                <p className="text-sm text-muted-foreground">
                  View results above to close this exam before starting another.
                </p>
              ) : (
                <Button className="w-full" size="lg" onClick={startNew} disabled={!canPreview || progressLoading}>
                  {hasCompletedDiagnostic
                    ? "Sit again"
                    : canStartOfficial
                      ? "Begin diagnostic"
                      : "Preview diagnostic"}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
        {confirmDialogs}
    </div>
  );
}
