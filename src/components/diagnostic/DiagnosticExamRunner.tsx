import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Flag, Loader2, StickyNote } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { NotesWorkbench } from "@/components/notes/NotesWorkbench";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { QuestionResponseFields } from "@/components/question/QuestionResponseFields";
import { SubjectStripe } from "@/components/question/SubjectStripe";
import { ReportQuestionButton } from "@/components/question/ReportQuestionButton";
import { DiagnosticSectionMap, type DiagnosticMapCell } from "@/components/diagnostic/DiagnosticSectionMap";
import { useExamLock } from "@/contexts/ExamLockContext";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";
import { MathText } from "@/lib/mathText";
import { parseAtaAnswer, serializeAtaAnswer } from "@/lib/indyAta";
import { diagnosticSubmitCheckLine } from "@/lib/diagnosticSubmitCheck";
import { canSubmitQuestionAnswer, isQuestionAnswerCorrect } from "@/lib/sessionGrading";
import {
  elaPartLabel,
  flattenSectionQuestions,
  locateUnitQuestion,
  passageForQuestion,
  passageSetProgress,
  unitQuestions,
  buildDiagnosticCompletionEvents,
  type AssembledDiagnosticExam,
  type DiagnosticUnit,
} from "@/lib/shsatDiagnostic";
import {
  clearDiagnosticSave,
  formatDiagnosticClock,
  loadDiagnosticSave,
  persistDiagnosticSave,
  withPausedClock,
  type DiagnosticExamSave,
} from "@/lib/diagnosticExamStorage";
import { saveDiagnosticProgress } from "@/lib/diagnosticProgressService";
import { toast } from "@/hooks/use-toast";
import type { DiagnosticSubject } from "@/data/shsatDiagnosticForm";
import type { DiagnosticEndReason } from "@/types/practiceSession";
import type { Question } from "@/types";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

interface DiagnosticExamRunnerProps {
  exam: AssembledDiagnosticExam;
  userId: string;
  firstSection: DiagnosticSubject;
  deadlineAt: number;
  initialSave?: DiagnosticExamSave | null;
  onExit: () => void;
  onComplete: (events: SessionAnalyticsEvent[], reason: DiagnosticEndReason) => void;
}

function unitKey(sectionIndex: number, unitIndex: number): string {
  return `${sectionIndex}:${unitIndex}`;
}

export function DiagnosticExamRunner({
  exam,
  userId,
  firstSection,
  deadlineAt,
  initialSave,
  onExit,
  onComplete,
}: DiagnosticExamRunnerProps) {
  const { setExamLeaveHandler } = useExamLock();
  const sections = useMemo(() => {
    const ela = exam.ela;
    const math = exam.math;
    return firstSection === "ELA" ? [ela, math] : [math, ela];
  }, [exam, firstSection]);

  const [sectionIndex, setSectionIndex] = useState(initialSave?.sectionIndex ?? 0);
  const [unitIndex, setUnitIndex] = useState(initialSave?.unitIndex ?? 0);
  const [questionIndexInUnit, setQuestionIndexInUnit] = useState(
    initialSave?.questionIndexInUnit ?? 0,
  );
  const [answers, setAnswers] = useState<Record<string, string>>(initialSave?.answers ?? {});
  const [flagged, setFlagged] = useState<Set<string>>(
    () => new Set(initialSave?.flagged ?? []),
  );
  const [lockedUnitKeys, setLockedUnitKeys] = useState<Set<string>>(
    () => new Set(initialSave?.lockedUnitKeys ?? []),
  );
  const [eliminated, setEliminated] = useState<Record<string, string[]>>(
    initialSave?.eliminated ?? {},
  );
  const [notepad, setNotepad] = useState(initialSave?.notepad ?? "");
  const [scratchPad, setScratchPad] = useState(initialSave?.scratchPad ?? "");
  const [clockHidden, setClockHidden] = useState(initialSave?.clockHidden ?? false);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)),
  );
  const [submitCheck, setSubmitCheck] = useState<null | "section" | "passageSet">(null);
  const [reviewingSubmit, setReviewingSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);
  const [pausing, setPausing] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);

  const finishedRef = useRef(false);
  const leavingRef = useRef(false);
  const remoteSaveTimerRef = useRef<number | null>(null);
  const remoteSaveChainRef = useRef<Promise<void>>(Promise.resolve());
  const finishExamRef = useRef<(reason: "submit" | "time") => void>(() => {});
  const questionStartMsRef = useRef(Date.now());
  const eventsByQuestionId = useRef<Map<string, SessionAnalyticsEvent>>(
    new Map(
      (initialSave?.events ?? []).map((e) => [
        e.questionId,
        e as SessionAnalyticsEvent,
      ]),
    ),
  );

  const section = sections[sectionIndex];
  const units = section?.units ?? [];
  const unit: DiagnosticUnit | undefined = units[unitIndex];
  const unitQs = unit ? unitQuestions(unit) : [];
  const currentQuestion: Question | undefined = unitQs[questionIndexInUnit];
  const passage = currentQuestion ? passageForQuestion(currentQuestion) : undefined;
  const showElaHighlighter = currentQuestion ? shouldShowElaHighlighter(currentQuestion) : false;
  const raw = currentQuestion ? answers[currentQuestion.id] : undefined;
  const sectionQuestions = section ? flattenSectionQuestions(section) : [];
  const isPassageSet = unit?.kind === "passageSet";
  const passageSet = useMemo(
    () => passageSetProgress(units, unitIndex),
    [units, unitIndex],
  );
  const unitLocked = lockedUnitKeys.has(unitKey(sectionIndex, unitIndex));
  const answeredInSection = sectionQuestions.filter((q) =>
    canSubmitQuestionAnswer(q, answers[q.id]),
  ).length;
  const globalIndex = useMemo(() => {
    if (!section || !currentQuestion) return 0;
    return sectionQuestions.findIndex((q) => q.id === currentQuestion.id) + 1;
  }, [section, currentQuestion, sectionQuestions]);
  const questionPaneRef = useRef<HTMLDivElement>(null);
  const mapCells: DiagnosticMapCell[] = useMemo(
    () =>
      sectionQuestions.map((question, index) => {
        const loc = locateUnitQuestion(units, question.id);
        const inCurrentUnit = loc?.unitIndex === unitIndex;
        const canJump = Boolean(
          isPassageSet &&
            !unitLocked &&
            inCurrentUnit &&
            loc != null &&
            loc.questionIndexInUnit !== questionIndexInUnit,
        );
        const isCurrent = currentQuestion?.id === question.id;
        return {
          id: question.id,
          number: index + 1,
          current: isCurrent,
          answered: canSubmitQuestionAnswer(question, answers[question.id]),
          locked: !canJump && !isCurrent,
          flagged: flagged.has(question.id),
          canJump,
        };
      }),
    [
      answers,
      currentQuestion?.id,
      flagged,
      isPassageSet,
      questionIndexInUnit,
      sectionQuestions,
      unitIndex,
      unitLocked,
      units,
    ],
  );

  const recordTiming = useCallback(
    (question: Question) => {
      const elapsedSeconds = Math.max(0, (Date.now() - questionStartMsRef.current) / 1000);
      const value = answers[question.id];
      const evt: SessionAnalyticsEvent = {
        questionId: question.id,
        subject: question.subject,
        module: question.module,
        correct: isQuestionAnswerCorrect(question, value),
        elapsedSeconds,
        tags: question.tags.map((t) => t.code),
        contentVersion: question.contentVersion ?? 1,
        ...(value ? { answer: value } : {}),
      };
      const prev = eventsByQuestionId.current.get(question.id);
      eventsByQuestionId.current.set(question.id, {
        ...evt,
        elapsedSeconds: Number(((prev?.elapsedSeconds ?? 0) + elapsedSeconds).toFixed(1)),
      });
      questionStartMsRef.current = Date.now();
    },
    [answers],
  );

  const finishExam = useCallback(
    (reason: DiagnosticEndReason) => {
      if (finishedRef.current) return;
      finishedRef.current = true;
      if (currentQuestion) recordTiming(currentQuestion);
      const ordered = buildDiagnosticCompletionEvents(
        exam,
        answers,
        [...eventsByQuestionId.current.values()],
      );
      clearDiagnosticSave(userId);
      if (remoteSaveTimerRef.current) {
        window.clearTimeout(remoteSaveTimerRef.current);
        remoteSaveTimerRef.current = null;
      }
      // Let an in-flight progress write finish before the report is saved, so a
      // sitting already underway can still be stored if assignment is turned off.
      void remoteSaveChainRef.current.finally(() => {
        onComplete(ordered, reason);
      });
    },
    [answers, currentQuestion, exam, onComplete, recordTiming, userId],
  );

  finishExamRef.current = finishExam;

  useEffect(() => {
    if (!notesOpen) return;
    notesRef.current?.focus();
  }, [notesOpen]);

  useEffect(() => {
    const id = window.setInterval(() => {
      const left = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      setRemainingSeconds(left);
      if (left <= 0) {
        window.clearInterval(id);
        finishExamRef.current("time");
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [deadlineAt]);

  const persistProgress = useCallback(
    (options?: { paused?: boolean }) => {
      if (finishedRef.current) return null;
      if (currentQuestion) recordTiming(currentQuestion);
      const remaining = Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000));
      const now = Date.now();
      const base: DiagnosticExamSave = {
        specId: exam.spec.id,
        startedAt: initialSave?.startedAt ?? now,
        deadlineAt,
        paused: false,
        remainingSeconds: remaining,
        updatedAt: now,
        firstSection,
        sectionIndex,
        unitIndex,
        questionIndexInUnit,
        answers,
        flagged: [...flagged],
        lockedUnitKeys: [...lockedUnitKeys],
        eliminated,
        notepad,
        scratchPad,
        clockHidden,
        events: [...eventsByQuestionId.current.values()],
      };
      const save = options?.paused ? withPausedClock(base, now) : base;
      persistDiagnosticSave(userId, save);
      return save;
    },
    [
      answers,
      clockHidden,
      currentQuestion,
      deadlineAt,
      eliminated,
      exam.spec.id,
      firstSection,
      flagged,
      initialSave?.startedAt,
      lockedUnitKeys,
      notepad,
      scratchPad,
      questionIndexInUnit,
      recordTiming,
      sectionIndex,
      unitIndex,
      userId,
    ],
  );

  const persistProgressRef = useRef(persistProgress);
  persistProgressRef.current = persistProgress;

  const queueRemoteSave = useCallback((save: DiagnosticExamSave) => {
    if (remoteSaveTimerRef.current) {
      window.clearTimeout(remoteSaveTimerRef.current);
      remoteSaveTimerRef.current = null;
    }
    const enqueue = () => {
      if (finishedRef.current || leavingRef.current) return;
      const task = remoteSaveChainRef.current
        .catch(() => undefined)
        .then(async () => {
          if (finishedRef.current || leavingRef.current) return;
          const latest = loadDiagnosticSave(userId);
          const payload =
            latest && latest.updatedAt >= save.updatedAt ? latest : save;
          await saveDiagnosticProgress(userId, payload);
        })
        .catch(() => undefined);
      remoteSaveChainRef.current = task;
    };
    remoteSaveTimerRef.current = window.setTimeout(enqueue, 800);
  }, [userId]);

  useEffect(() => {
    if (finishedRef.current || leavingRef.current) return;
    const save = persistProgress();
    if (save) queueRemoteSave(save);
  }, [persistProgress, queueRemoteSave]);

  useEffect(() => {
    return () => {
      if (remoteSaveTimerRef.current) {
        window.clearTimeout(remoteSaveTimerRef.current);
      }
      if (finishedRef.current || leavingRef.current) return;
      // Refresh unmounts this screen. Keep the clock running and the question,
      // so the next load can reopen the exam instead of pausing onto the start page.
      const save = persistProgressRef.current();
      if (save) void saveDiagnosticProgress(userId, save).catch(() => undefined);
    };
  }, [userId]);

  const pauseAndLeave = useCallback(async () => {
    if (finishedRef.current || leavingRef.current || pausing) return;
    leavingRef.current = true;
    setPausing(true);
    if (remoteSaveTimerRef.current) {
      window.clearTimeout(remoteSaveTimerRef.current);
      remoteSaveTimerRef.current = null;
    }
    const save = persistProgress({ paused: true });
    try {
      await remoteSaveChainRef.current.catch(() => undefined);
      if (save) await saveDiagnosticProgress(userId, save);
      setConfirmExit(false);
      onExit();
    } catch (err) {
      leavingRef.current = false;
      persistProgress();
      toast({
        title: "Could not save to your account",
        description:
          err instanceof Error
            ? err.message
            : "Stay on this exam and try Pause again. Progress is only on this device until that succeeds.",
        variant: "destructive",
      });
    } finally {
      setPausing(false);
    }
  }, [onExit, persistProgress, pausing, userId]);

  useEffect(() => {
    const flush = () => {
      if (finishedRef.current || leavingRef.current) return;
      const save = persistProgressRef.current();
      if (save) void saveDiagnosticProgress(userId, save).catch(() => undefined);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (finishedRef.current) return;
      flush();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [userId]);

  useLayoutEffect(() => {
    const requestLeave = () => {
      if (finishedRef.current) return;
      setConfirmExit(true);
    };
    setExamLeaveHandler(requestLeave);
    return () => setExamLeaveHandler(null);
  }, [setExamLeaveHandler]);

  useEffect(() => {
    window.history.pushState({ diagnosticExam: true }, "");
    const onPopState = () => {
      if (finishedRef.current) return;
      window.history.pushState({ diagnosticExam: true }, "");
      setConfirmExit(true);
    };
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  useEffect(() => {
    const onDocumentClick = (event: MouseEvent) => {
      if (finishedRef.current || event.defaultPrevented) return;
      const target = event.target;
      if (!(target instanceof Element)) return;
      const anchor = target.closest("a[href]");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (anchor.target === "_blank") return;
      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const current = `${window.location.pathname}${window.location.search}${window.location.hash}`;
      const next = `${url.pathname}${url.search}${url.hash}`;
      if (current === next) return;
      event.preventDefault();
      event.stopPropagation();
      setConfirmExit(true);
    };
    document.addEventListener("click", onDocumentClick, true);
    return () => document.removeEventListener("click", onDocumentClick, true);
  }, []);

  useEffect(() => {
    questionStartMsRef.current = Date.now();
  }, [currentQuestion?.id]);

  useEffect(() => {
    questionPaneRef.current?.scrollTo?.({ top: 0 });
  }, [currentQuestion?.id]);

  useEffect(() => {
    const html = document.documentElement;
    const htmlOverflow = html.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, []);

  if (!section || !unit || !currentQuestion) {
    return null;
  }

  const handleAnswerChange = (value: string) => {
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: value }));
  };

  const toggleAta = (choiceId: string) => {
    const prev = parseAtaAnswer(answers[currentQuestion.id]);
    const next = prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId];
    handleAnswerChange(serializeAtaAnswer(next));
  };

  const toggleEliminate = (choiceId: string) => {
    setEliminated((prev) => {
      const cur = prev[currentQuestion.id] ?? [];
      const next = cur.includes(choiceId) ? cur.filter((id) => id !== choiceId) : [...cur, choiceId];
      return { ...prev, [currentQuestion.id]: next };
    });
  };

  const toggleFlag = () => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(currentQuestion.id)) next.delete(currentQuestion.id);
      else next.add(currentQuestion.id);
      return next;
    });
  };

  const canAdvanceCurrent = canSubmitQuestionAnswer(currentQuestion, raw);
  const isLastInUnit = questionIndexInUnit >= unitQs.length - 1;
  const isLastUnit = unitIndex >= units.length - 1;
  const isLastSection = sectionIndex >= sections.length - 1;

  const goToInUnit = (index: number) => {
    if (!isPassageSet || unitLocked) return;
    if (currentQuestion) recordTiming(currentQuestion);
    setQuestionIndexInUnit(index);
  };

  const jumpToMappedQuestion = (questionId: string) => {
    const loc = locateUnitQuestion(units, questionId);
    if (!loc) return;
    goToInUnit(loc.questionIndexInUnit);
  };

  const lockCurrentUnit = () => {
    setLockedUnitKeys((prev) => new Set(prev).add(unitKey(sectionIndex, unitIndex)));
  };

  const goNext = () => {
    if (!canAdvanceCurrent) return;
    recordTiming(currentQuestion);

    if (isPassageSet && !isLastInUnit) {
      setQuestionIndexInUnit((i) => i + 1);
      return;
    }

    if (isPassageSet && isLastInUnit && !isLastUnit) {
      const needsCheck = unitQs.some(
        (question) => !canSubmitQuestionAnswer(question, answers[question.id]) || flagged.has(question.id),
      );
      if (needsCheck) {
        setSubmitCheck("passageSet");
        setReviewingSubmit(false);
        return;
      }
      lockCurrentUnit();
      setUnitIndex((i) => i + 1);
      setQuestionIndexInUnit(0);
      return;
    }

    if (!isLastUnit) {
      lockCurrentUnit();
      setUnitIndex((i) => i + 1);
      setQuestionIndexInUnit(0);
      return;
    }

    setSubmitCheck("section");
    setReviewingSubmit(false);
  };

  const submitSection = () => {
    lockCurrentUnit();
    setSubmitCheck(null);
    setReviewingSubmit(false);
    if (isLastSection) {
      finishExam("submit");
      return;
    }
    setSectionIndex((i) => i + 1);
    setUnitIndex(0);
    setQuestionIndexInUnit(0);
  };

  const checkQuestions = submitCheck === "passageSet" ? unitQs : sectionQuestions;
  const unansweredQuestions = checkQuestions.filter(
    (question) => !canSubmitQuestionAnswer(question, answers[question.id]),
  );
  const flaggedQuestions = checkQuestions.filter((question) => flagged.has(question.id));
  const sectionNumber = (questionId: string) =>
    sectionQuestions.findIndex((question) => question.id === questionId) + 1;
  const passageSetReady = unitQs.every((question) => canSubmitQuestionAnswer(question, answers[question.id]));

  const jumpFromSubmitCheck = (questionId: string) => {
    const loc = locateUnitQuestion(units, questionId);
    if (!loc) return;
    if (currentQuestion && currentQuestion.id !== questionId) recordTiming(currentQuestion);
    setUnitIndex(loc.unitIndex);
    setQuestionIndexInUnit(loc.questionIndexInUnit);
    setReviewingSubmit(true);
  };

  const backToSubmitCheck = () => {
    if (currentQuestion) recordTiming(currentQuestion);
    setReviewingSubmit(false);
  };

  const submitPassageSet = () => {
    if (!passageSetReady) return;
    if (currentQuestion) recordTiming(currentQuestion);
    lockCurrentUnit();
    setSubmitCheck(null);
    setReviewingSubmit(false);
    setUnitIndex((i) => i + 1);
    setQuestionIndexInUnit(0);
  };

  const goPrevInSet = () => {
    if (!isPassageSet || questionIndexInUnit === 0 || unitLocked) return;
    recordTiming(currentQuestion);
    setQuestionIndexInUnit((i) => i - 1);
  };

  const nextLabel = (() => {
    if (isPassageSet && !isLastInUnit) return "Next";
    if (isPassageSet && isLastInUnit && !isLastUnit) return "Submit passage set";
    if (!isLastUnit) return "Next";
    return isLastSection ? "Submit exam" : `Submit ${section.subject} section`;
  })();

  const lowTime = remainingSeconds <= 5 * 60;
  const jumpHint = isPassageSet
    ? "Jump only inside this unlocked passage set."
    : "Items lock when you advance. The map shows progress only.";

  const questionStem = (
    <>
      <div className="flex gap-3">
        <span className="mt-0.5 shrink-0 text-base font-semibold tabular-nums leading-relaxed">
          {globalIndex}.
        </span>
        <div className="min-w-0 flex-1">
          {showElaHighlighter && currentQuestion.subtype !== "INDY-IC" ? (
            <HighlightableText
              text={currentQuestion.stem}
              storageKey={`diagnostic-stem-${currentQuestion.id}`}
              variant="stem"
            />
          ) : (
            <p className="text-base leading-relaxed whitespace-pre-wrap">
              <MathText text={currentQuestion.stem} />
            </p>
          )}
        </div>
      </div>
      <QuestionResponseFields
        question={currentQuestion}
        raw={raw}
        disabled={false}
        showSolution={false}
        onChange={handleAnswerChange}
        onToggleAta={toggleAta}
        eliminatedChoiceIds={eliminated[currentQuestion.id]}
        onToggleEliminate={toggleEliminate}
      />
    </>
  );

  const questionMeta = (
    <div className="flex items-center justify-between gap-2">
      <Badge variant={currentQuestion.subject === "MATH" ? "default" : "secondary"}>
        {currentQuestion.subject}
      </Badge>
      {isPassageSet && passageSet ? (
        <span className="text-xs text-muted-foreground">
          Passage set {passageSet.current} of {passageSet.total}, you can review until you
          submit this set
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">You cannot return after you advance</span>
      )}
    </div>
  );

  if (confirmExit) {
    return (
      <div
        data-testid="diagnostic-pause-screen"
        className="fixed inset-0 z-[80] flex items-center justify-center px-6"
        style={{ backgroundColor: "hsl(var(--background))" }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diagnostic-pause-title"
      >
        <div className="w-full max-w-lg space-y-4">
          <h2 id="diagnostic-pause-title" className="text-lg font-semibold">
            Pause and save this diagnostic?
          </h2>
          <p className="text-sm text-muted-foreground">
            The timer stops after this sitting is stored in your account. You can resume on this
            device or another computer.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" disabled={pausing} onClick={() => setConfirmExit(false)}>
              Keep working
            </Button>
            <Button disabled={pausing} onClick={() => void pauseAndLeave()}>
              {pausing ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving to your account…
                </>
              ) : (
                "Pause and save"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
      <Header />
      <div className="container flex min-h-0 flex-1 flex-col overflow-hidden px-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" disabled={pausing} onClick={() => setConfirmExit(true)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Pause
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">{exam.spec.name}</h1>
              <p className="text-sm text-muted-foreground">
                {section.subject}
                {unit.elaPart !== "other" ? ` · ${elaPartLabel(unit.elaPart)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ReportQuestionButton question={currentQuestion} source="diagnostic" compact />
            <Button variant="outline" size="sm" onClick={() => setClockHidden((v) => !v)}>
              <Clock className="h-4 w-4 mr-1" />
              {clockHidden ? "Show time" : "Hide time"}
            </Button>
            {!clockHidden ? (
              <Badge variant={lowTime ? "destructive" : "secondary"} className="tabular-nums text-sm px-3 py-1">
                {formatDiagnosticClock(remainingSeconds)}
              </Badge>
            ) : null}
          </div>
        </div>

        {submitCheck && !reviewingSubmit ? (
          <div className="min-h-0 flex-1 overflow-y-auto py-2">
            <Card className="mx-auto max-w-xl">
              <CardHeader>
                <CardTitle>
                  {submitCheck === "passageSet" ? "Submit this passage set?" : `Submit ${section.subject}?`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  {submitCheck === "passageSet"
                    ? "Jump to an unanswered or flagged question before you leave this passage set."
                    : "You cannot return to this section after you submit. Unanswered questions are scored as incorrect."}
                </p>
                <p className="text-sm font-medium">
                  {diagnosticSubmitCheckLine(unansweredQuestions.length, flaggedQuestions.length)}
                </p>
                <SubmitCheckJumps
                  label="Unanswered"
                  questions={unansweredQuestions}
                  numberFor={sectionNumber}
                  onJump={jumpFromSubmitCheck}
                />
                <SubmitCheckJumps
                  label="Flagged"
                  questions={flaggedQuestions}
                  numberFor={sectionNumber}
                  onJump={jumpFromSubmitCheck}
                />
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSubmitCheck(null);
                      setReviewingSubmit(false);
                    }}
                  >
                    Keep working
                  </Button>
                  {submitCheck === "passageSet" ? (
                    <Button onClick={submitPassageSet} disabled={!passageSetReady}>
                      Submit passage set
                    </Button>
                  ) : (
                    <Button onClick={submitSection}>
                      {isLastSection ? "Submit exam" : `Submit ${section.subject}`}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        ) : (
          <>
            {reviewingSubmit ? (
              <p className="shrink-0 pb-2 text-sm text-muted-foreground">
                Opened from the submit check. Go back when you are done with this question.
              </p>
            ) : null}
            <div className="shrink-0 pb-2">
              <DiagnosticSectionMap
                subject={section.subject}
                answered={answeredInSection}
                total={sectionQuestions.length}
                cells={mapCells}
                jumpHint={jumpHint}
                showFlagged={Boolean(isPassageSet)}
                onJump={jumpToMappedQuestion}
              />
            </div>

            {passage ? (
              <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,36vh)_minmax(0,1fr)] gap-3 overflow-hidden md:grid-cols-2 md:grid-rows-[minmax(0,1fr)]">
                <Card className="flex min-h-0 flex-col overflow-hidden">
                  <CardHeader className="shrink-0 p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4" />
                      {passage.title}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pt-0">
                    {showElaHighlighter ? (
                      <HighlightableText
                        text={passage.body}
                        storageKey={`diagnostic-passage-${passage.id}`}
                        variant="passage"
                      />
                    ) : (
                      <div className="prose prose-sm max-w-none">
                        {passage.body.split("\n\n").map((para, i) => (
                          <p key={i} className="mb-4 whitespace-pre-wrap leading-relaxed last:mb-0">
                            {para}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                <Card className="flex min-h-0 min-w-0 flex-col overflow-hidden">
                  <CardHeader className="relative shrink-0 space-y-0 p-4 pb-2">
                    <SubjectStripe subject={currentQuestion.subject} />
                    {questionMeta}
                  </CardHeader>
                  <CardContent
                    ref={questionPaneRef}
                    className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 pt-0"
                  >
                    {questionStem}
                  </CardContent>
                </Card>
              </div>
            ) : (
              <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <CardHeader className="relative shrink-0 space-y-0 p-4 pb-2">
                  <SubjectStripe subject={currentQuestion.subject} />
                  {questionMeta}
                </CardHeader>
                <CardContent
                  ref={questionPaneRef}
                  className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 pt-0"
                >
                  {questionStem}
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>

      {!(submitCheck && !reviewingSubmit) ? (
        <div className="z-20 shrink-0 border-t bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
          {notesOpen ? (
            <div id="diagnostic-notepad" className="container space-y-2 px-4 pt-2">
              <NotesWorkbench
                compact
                text={notepad}
                onTextChange={setNotepad}
                scratchPad={scratchPad}
                onScratchPadChange={setScratchPad}
                textRef={notesRef}
                textPlaceholder="Scratch notes for this diagnostic (saved to your account)."
                textAriaLabel="Diagnostic notes"
              />
            </div>
          ) : null}
          <div className="container flex flex-wrap items-center justify-between gap-2 px-4 pt-2">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <p className="text-sm font-medium tabular-nums">
                Question {globalIndex} of {sectionQuestions.length}
              </p>
              {isPassageSet ? (
                <Button
                  variant={flagged.has(currentQuestion.id) ? "default" : "outline"}
                  onClick={toggleFlag}
                  title="Flag this question to find it again in this passage set"
                >
                  <Flag className="h-4 w-4 mr-2" />
                  {flagged.has(currentQuestion.id) ? "Flagged" : "Flag"}
                </Button>
              ) : null}
              <Button
                variant={notesOpen ? "default" : "outline"}
                aria-expanded={notesOpen}
                aria-controls={notesOpen ? "diagnostic-notepad" : undefined}
                onClick={() => setNotesOpen((open) => !open)}
              >
                <StickyNote className="h-4 w-4 mr-2" />
                {notesOpen ? "Hide notes" : "Notes"}
              </Button>
            </div>
            <div className="flex min-w-0 items-center justify-end gap-2">
              {isPassageSet ? (
                <Button
                  variant="outline"
                  onClick={goPrevInSet}
                  disabled={questionIndexInUnit === 0 || unitLocked}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Previous in set</span>
                  <span className="sm:hidden">Prev</span>
                </Button>
              ) : null}
              {reviewingSubmit ? (
                <Button onClick={backToSubmitCheck}>Back to submit check</Button>
              ) : (
                <Button onClick={goNext} disabled={!canAdvanceCurrent}>
                  {nextLabel}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SubmitCheckJumps({
  label,
  questions,
  numberFor,
  onJump,
}: {
  label: string;
  questions: Question[];
  numberFor: (questionId: string) => number;
  onJump: (questionId: string) => void;
}) {
  if (questions.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">{label}</p>
      <div className="flex flex-wrap gap-2">
        {questions.map((question) => {
          const number = numberFor(question.id);
          return (
            <Button
              key={`${label}-${question.id}`}
              type="button"
              variant="outline"
              size="sm"
              aria-label={`${label} question ${number}`}
              onClick={() => onJump(question.id)}
            >
              Question {number}
            </Button>
          );
        })}
      </div>
    </div>
  );
}
