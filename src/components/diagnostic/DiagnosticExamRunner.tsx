import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, BookOpen, Clock, Flag, StickyNote } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { QuestionResponseFields } from "@/components/question/QuestionResponseFields";
import { DiagnosticSectionMap, type DiagnosticMapCell } from "@/components/diagnostic/DiagnosticSectionMap";
import { useExamLock } from "@/contexts/ExamLockContext";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";
import { parseAtaAnswer, serializeAtaAnswer } from "@/lib/indyAta";
import { canSubmitQuestionAnswer, isQuestionAnswerCorrect } from "@/lib/sessionGrading";
import {
  elaPartLabel,
  flattenSectionQuestions,
  locateUnitQuestion,
  passageForQuestion,
  unitQuestions,
  buildDiagnosticCompletionEvents,
  type AssembledDiagnosticExam,
  type DiagnosticUnit,
} from "@/lib/shsatDiagnostic";
import {
  clearDiagnosticSave,
  formatDiagnosticClock,
  persistDiagnosticSave,
  type DiagnosticExamSave,
} from "@/lib/diagnosticExamStorage";
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
  const [clockHidden, setClockHidden] = useState(initialSave?.clockHidden ?? false);
  const [remainingSeconds, setRemainingSeconds] = useState(() =>
    Math.max(0, Math.ceil((deadlineAt - Date.now()) / 1000)),
  );
  const [confirmSectionSubmit, setConfirmSectionSubmit] = useState(false);
  const [confirmExit, setConfirmExit] = useState(false);

  const finishedRef = useRef(false);
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
      const elapsedSeconds = (Date.now() - questionStartMsRef.current) / 1000;
      const value = answers[question.id];
      const evt: SessionAnalyticsEvent = {
        questionId: question.id,
        subject: question.subject,
        module: question.module,
        correct: isQuestionAnswerCorrect(question, value),
        elapsedSeconds,
        tags: question.tags.map((t) => t.code),
        ...(value ? { answer: value } : {}),
      };
      const prev = eventsByQuestionId.current.get(question.id);
      eventsByQuestionId.current.set(question.id, {
        ...evt,
        elapsedSeconds: (prev?.elapsedSeconds ?? 0) + elapsedSeconds,
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
      onComplete(ordered, reason);
    },
    [answers, currentQuestion, exam, onComplete, recordTiming, userId],
  );

  finishExamRef.current = finishExam;

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

  const persistProgress = useCallback(() => {
    persistDiagnosticSave(userId, {
      specId: exam.spec.id,
      startedAt: initialSave?.startedAt ?? Date.now(),
      deadlineAt,
      firstSection,
      sectionIndex,
      unitIndex,
      questionIndexInUnit,
      answers,
      flagged: [...flagged],
      lockedUnitKeys: [...lockedUnitKeys],
      eliminated,
      notepad,
      clockHidden,
      events: [...eventsByQuestionId.current.values()],
    });
  }, [
    answers,
    clockHidden,
    deadlineAt,
    eliminated,
    exam.spec.id,
    firstSection,
    flagged,
    initialSave?.startedAt,
    lockedUnitKeys,
    notepad,
    questionIndexInUnit,
    sectionIndex,
    unitIndex,
    userId,
  ]);

  const persistProgressRef = useRef(persistProgress);
  persistProgressRef.current = persistProgress;

  useEffect(() => {
    if (finishedRef.current) return;
    persistProgress();
  }, [persistProgress]);

  useEffect(() => {
    return () => {
      if (!finishedRef.current) persistProgressRef.current();
    };
  }, []);

  useEffect(() => {
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (finishedRef.current) return;
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

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
    questionPaneRef.current?.scrollTo({ top: 0 });
  }, [currentQuestion?.id]);

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

    if (isPassageSet && isLastInUnit) {
      const allAnswered = unitQs.every((q) => canSubmitQuestionAnswer(q, answers[q.id]));
      if (!allAnswered) return;
      lockCurrentUnit();
    } else {
      lockCurrentUnit();
    }

    if (!isLastUnit) {
      setUnitIndex((i) => i + 1);
      setQuestionIndexInUnit(0);
      return;
    }

    setConfirmSectionSubmit(true);
  };

  const submitSection = () => {
    setConfirmSectionSubmit(false);
    if (isLastSection) {
      finishExam("submit");
      return;
    }
    setSectionIndex((i) => i + 1);
    setUnitIndex(0);
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
      {showElaHighlighter && currentQuestion.subtype !== "INDY-IC" ? (
        <HighlightableText
          text={currentQuestion.stem}
          storageKey={`diagnostic-stem-${currentQuestion.id}`}
          variant="stem"
        />
      ) : (
        <p className="text-base leading-relaxed whitespace-pre-wrap">{currentQuestion.stem}</p>
      )}
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
      {isPassageSet ? (
        <span className="text-xs text-muted-foreground">
          Passage set {questionIndexInUnit + 1} of {unitQs.length} — you can review until you
          submit this set
        </span>
      ) : (
        <span className="text-xs text-muted-foreground">You cannot return after you advance</span>
      )}
    </div>
  );

  const navButtons = (
    <div className="flex shrink-0 justify-between gap-2">
      {isPassageSet ? (
        <Button
          variant="outline"
          onClick={goPrevInSet}
          disabled={questionIndexInUnit === 0 || unitLocked}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Previous in set
        </Button>
      ) : (
        <span />
      )}
      <Button onClick={goNext} disabled={!canAdvanceCurrent}>
        {nextLabel}
        <ArrowRight className="h-4 w-4 ml-2" />
      </Button>
    </div>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <div className="container flex min-h-0 flex-1 flex-col gap-4 py-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" onClick={() => setConfirmExit(true)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold">{exam.spec.name}</h1>
              <p className="text-sm text-muted-foreground">
                {section.subject} · Question {globalIndex} of {sectionQuestions.length}
                {unit.elaPart !== "other" ? ` · ${elaPartLabel(unit.elaPart)}` : ""}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isPassageSet ? (
              <Button
                variant={flagged.has(currentQuestion.id) ? "default" : "outline"}
                size="sm"
                onClick={toggleFlag}
                title="Flag this question to find it again in this passage set"
              >
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">
                  {flagged.has(currentQuestion.id) ? "Flagged" : "Flag"}
                </span>
              </Button>
            ) : null}
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

        {confirmSectionSubmit ? (
          <Card className="mx-auto max-w-xl">
            <CardHeader>
              <CardTitle>Submit {section.subject}?</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                You cannot return to this section after you submit. Unanswered items will be scored as
                incorrect.
              </p>
              <p className="text-sm">
                Answered {answeredInSection} of {sectionQuestions.length} questions.
              </p>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setConfirmSectionSubmit(false)}>
                  Keep working
                </Button>
                <Button onClick={submitSection}>
                  {isLastSection ? "Submit exam" : `Submit ${section.subject}`}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            <DiagnosticSectionMap
              subject={section.subject}
              answered={answeredInSection}
              total={sectionQuestions.length}
              cells={mapCells}
              jumpHint={jumpHint}
              showFlagged={Boolean(isPassageSet)}
              onJump={jumpToMappedQuestion}
            />

            {passage ? (
              <div className="grid min-h-0 grid-cols-1 gap-4 md:flex-1 md:grid-cols-2 md:overflow-hidden">
                <Card className="flex min-h-0 flex-col overflow-hidden max-md:max-h-[min(42vh,24rem)]">
                  <CardHeader className="shrink-0 p-4 pb-2">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BookOpen className="h-4 w-4" />
                      {passage.title}
                    </CardTitle>
                    {passage.sourceMeta ? (
                      <p className="text-xs text-muted-foreground line-clamp-2">{passage.sourceMeta}</p>
                    ) : null}
                  </CardHeader>
                  <CardContent className="min-h-0 flex-1 overflow-y-auto p-4 pt-0">
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

                <div className="flex min-h-0 flex-col gap-3">
                  <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                    <CardHeader className="shrink-0 p-4 pb-2">{questionMeta}</CardHeader>
                    <CardContent
                      ref={questionPaneRef}
                      className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 pt-0"
                    >
                      {questionStem}
                    </CardContent>
                  </Card>
                  {navButtons}
                </div>
              </div>
            ) : (
              <div className="flex min-h-0 flex-col gap-3 md:flex-1 md:overflow-hidden">
                <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
                  <CardHeader className="shrink-0 p-4 pb-2">{questionMeta}</CardHeader>
                  <CardContent
                    ref={questionPaneRef}
                    className="min-h-0 flex-1 space-y-6 overflow-y-auto p-4 pt-0"
                  >
                    {questionStem}
                  </CardContent>
                </Card>
                {navButtons}
              </div>
            )}

            <details className="shrink-0 rounded-xl border glass-surface p-4">
              <summary className="flex cursor-pointer list-none items-center gap-2 font-serif text-base font-semibold tracking-tight [&::-webkit-details-marker]:hidden">
                <StickyNote className="h-4 w-4" />
                Notepad
                <span className="ml-auto text-xs font-normal text-muted-foreground">Scratch notes</span>
              </summary>
              <Textarea
                value={notepad}
                onChange={(e) => setNotepad(e.target.value)}
                placeholder="Scratch notes for this exam (saved on this device)."
                className="mt-3 min-h-[88px] text-sm"
              />
            </details>
          </>
        )}
      </div>

      <AlertDialog open={confirmExit} onOpenChange={setConfirmExit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this diagnostic?</AlertDialogTitle>
            <AlertDialogDescription>
              Your answers stay saved on this device and you can resume. The exam timer keeps
              running until time is up.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep working</AlertDialogCancel>
            <AlertDialogAction onClick={onExit}>Leave exam</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
