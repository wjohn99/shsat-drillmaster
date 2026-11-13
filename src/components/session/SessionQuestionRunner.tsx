import { useCallback, useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { NotesWorkbench } from "@/components/notes/NotesWorkbench";
import { ArrowLeft, ArrowRight, BookOpen, Flag, Loader2, Printer, StickyNote } from "lucide-react";
import { useQuestions } from "@/contexts/QuestionsContext";
import { ModuleBadge } from "@/components/question/ModuleBadge";
import { ProvisionalBadge } from "@/components/question/ProvisionalBadge";
import { QuestionReviewPanel } from "@/components/question/QuestionReviewPanel";
import { ReportQuestionButton } from "@/components/question/ReportQuestionButton";
import { QuestionResponseFields } from "@/components/question/QuestionResponseFields";
import { SubjectStripe } from "@/components/question/SubjectStripe";
import { QuestionSolutionPanel } from "@/components/question/QuestionSolutionPanel";
import { getSelectedChoiceIds, showsSkillToImprove } from "@/lib/questionExplanation";
import type { Passage, Question } from "@/types";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import { parseAtaAnswer, serializeAtaAnswer } from "@/lib/indyAta";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { MathText } from "@/lib/mathText";
import { canSubmitQuestionAnswer, isQuestionAnswerCorrect } from "@/lib/sessionGrading";
import { openWorksheetPrintTab } from "@/lib/worksheetPrint";
import { saveWorksheetProgress } from "@/lib/worksheetProgressService";
import {
  loadWorksheetProgressLocal,
  persistWorksheetProgressLocal,
  type WorksheetProgressSave,
} from "@/lib/worksheetProgressStorage";
import { toast } from "@/hooks/use-toast";

export type WorksheetRunnerProgressKey = {
  userId: string;
  scopeId: string;
  runSource: "assignment" | "self";
  assignmentId: string | null;
  title: string;
  tagCodes: string[];
  tutorUid: string | null;
};

export interface SessionQuestionRunnerProps {
  questions: Question[];
  sessionTitle: string;
  onExit: () => void;
  onComplete: (events: SessionAnalyticsEvent[]) => void;
  /** Prefix for highlight localStorage keys (e.g. "worksheet", "practice-set"). */
  storageKeyPrefix: string;
  /**
   * When false, record the answer and move on without the correct answer
   * or explanation. Used for a cold diagnostic assignment.
   */
  revealAnswers?: boolean;
  /** Optional passage list for assigned items that are not in the viewer catalog. */
  passageCatalog?: Passage[];
  finishLabel?: string;
  /** Notes copy. Skill practice must not call the set a worksheet. */
  notesKind?: "worksheet" | "practice";
  /** When set, progress is saved to this device and the signed-in account. */
  progressKey?: WorksheetRunnerProgressKey;
  initialProgress?: WorksheetProgressSave | null;
}

export function SessionQuestionRunner({
  questions,
  sessionTitle,
  onExit,
  onComplete,
  storageKeyPrefix,
  revealAnswers = true,
  passageCatalog,
  finishLabel = "Finish worksheet",
  notesKind = "worksheet",
  progressKey,
  initialProgress,
}: SessionQuestionRunnerProps) {
  const { passages: catalogPassages } = useQuestions();
  const passages = passageCatalog ?? catalogPassages;
  const { profile } = useAuth();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(() => {
    const index = initialProgress?.currentQuestionIndex ?? 0;
    if (questions.length === 0) return 0;
    return Math.min(Math.max(0, index), questions.length - 1);
  });
  const [answers, setAnswers] = useState<Record<string, string>>(
    () => initialProgress?.answers ?? {},
  );
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(
    () => new Set(initialProgress?.flagged ?? []),
  );
  const [eliminated, setEliminated] = useState<Record<string, string[]>>(
    () => initialProgress?.eliminated ?? {},
  );
  const [lockedQuestionIds, setLockedQuestionIds] = useState<Set<string>>(
    () => new Set(initialProgress?.lockedQuestionIds ?? []),
  );
  const [savingExit, setSavingExit] = useState(false);
  const [notepad, setNotepad] = useState(initialProgress?.notepad ?? "");
  const [scratchPad, setScratchPad] = useState(initialProgress?.scratchPad ?? "");
  const [notesOpen, setNotesOpen] = useState(false);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const questionPaneRef = useRef<HTMLDivElement>(null);

  const questionStartMsRef = useRef(Date.now());
  const eventsByQuestionId = useRef<Map<string, SessionAnalyticsEvent>>(
    new Map((initialProgress?.events ?? []).map((event) => [event.questionId, event])),
  );
  const startedAtRef = useRef(initialProgress?.startedAt ?? Date.now());
  const finishedRef = useRef(false);
  const leavingRef = useRef(false);
  const remoteSaveTimerRef = useRef<number | null>(null);
  const remoteSaveChainRef = useRef<Promise<unknown>>(Promise.resolve());

  const notesNoun = notesKind === "practice" ? "practice set" : "worksheet";
  const notesPlaceholder = progressKey
    ? `Scratch notes for this ${notesNoun} (saved to your account).`
    : `Scratch notes for this ${notesNoun}.`;
  const notesAriaLabel = notesKind === "practice" ? "Practice notes" : "Worksheet notes";
  const notesPanelId = notesKind === "practice" ? "practice-notepad" : "worksheet-notepad";

  const currentQuestion = questions[currentQuestionIndex];
  const passage = currentQuestion?.passageId
    ? passages.find((p) => p.id === currentQuestion.passageId)
    : null;
  const showElaHighlighter = currentQuestion ? shouldShowElaHighlighter(currentQuestion) : false;
  // Fraction of questions already completed (current screen is the next one to answer).
  const progress = questions.length ? (currentQuestionIndex / questions.length) * 100 : 0;

  useEffect(() => {
    if (currentQuestion && lockedQuestionIds.has(currentQuestion.id)) return;
    questionStartMsRef.current = Date.now();
  }, [currentQuestionIndex, currentQuestion, lockedQuestionIds]);

  useEffect(() => {
    if (!notesOpen) return;
    notesRef.current?.focus();
  }, [notesOpen]);

  useEffect(() => {
    questionPaneRef.current?.scrollTo?.({ top: 0 });
  }, [currentQuestion?.id]);

  useEffect(() => {
    if (questions.length === 0) return;
    const html = document.documentElement;
    const htmlOverflow = html.style.overflow;
    const bodyOverflow = document.body.style.overflow;
    html.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    return () => {
      html.style.overflow = htmlOverflow;
      document.body.style.overflow = bodyOverflow;
    };
  }, [questions.length]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    if (lockedQuestionIds.has(questionId)) return;
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const toggleAtaAnswer = (questionId: string, choiceId: string) => {
    if (lockedQuestionIds.has(questionId)) return;
    const prev = parseAtaAnswer(answers[questionId]);
    const next = prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId];
    handleAnswerChange(questionId, serializeAtaAnswer(next));
  };

  const toggleEliminate = (questionId: string, choiceId: string) => {
    setEliminated((prev) => {
      const cur = prev[questionId] ?? [];
      const next = cur.includes(choiceId) ? cur.filter((id) => id !== choiceId) : [...cur, choiceId];
      return { ...prev, [questionId]: next };
    });
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const buildProgressSave = useCallback((): WorksheetProgressSave | null => {
    if (!progressKey || finishedRef.current) return null;
    const now = Date.now();
    return {
      userId: progressKey.userId,
      scopeId: progressKey.scopeId,
      runSource: progressKey.runSource,
      assignmentId: progressKey.assignmentId,
      title: progressKey.title,
      tagCodes: progressKey.tagCodes,
      questionIds: questions.map((question) => question.id),
      currentQuestionIndex,
      answers,
      flagged: [...flaggedQuestions],
      lockedQuestionIds: [...lockedQuestionIds],
      eliminated,
      events: [...eventsByQuestionId.current.values()],
      notepad,
      scratchPad,
      revealAnswers,
      tutorUid: progressKey.tutorUid,
      startedAt: startedAtRef.current,
      updatedAt: now,
    };
  }, [
    answers,
    currentQuestionIndex,
    eliminated,
    flaggedQuestions,
    lockedQuestionIds,
    notepad,
    scratchPad,
    progressKey,
    questions,
    revealAnswers,
  ]);

  const persistProgress = useCallback((): WorksheetProgressSave | null => {
    const save = buildProgressSave();
    if (!save) return null;
    persistWorksheetProgressLocal(save);
    return save;
  }, [buildProgressSave]);

  const persistProgressRef = useRef(persistProgress);
  persistProgressRef.current = persistProgress;

  const queueRemoteSave = useCallback((save: WorksheetProgressSave) => {
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
          const latest = loadWorksheetProgressLocal(save.userId, save.scopeId);
          const payload =
            latest && latest.updatedAt >= save.updatedAt ? latest : save;
          await saveWorksheetProgress(payload);
        })
        .catch(() => undefined);
      remoteSaveChainRef.current = task;
    };
    remoteSaveTimerRef.current = window.setTimeout(enqueue, 800);
  }, []);

  useEffect(() => {
    if (!progressKey || finishedRef.current || leavingRef.current) return;
    const save = persistProgress();
    if (save) queueRemoteSave(save);
  }, [persistProgress, progressKey, queueRemoteSave]);

  useEffect(() => {
    if (!progressKey) return;
    const flush = () => {
      if (finishedRef.current || leavingRef.current) return;
      const save = persistProgressRef.current();
      if (save) void saveWorksheetProgress(save).catch(() => undefined);
    };
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("pagehide", flush);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("pagehide", flush);
      document.removeEventListener("visibilitychange", onVisibility);
      if (remoteSaveTimerRef.current) {
        window.clearTimeout(remoteSaveTimerRef.current);
      }
      if (finishedRef.current || leavingRef.current) return;
      const save = persistProgressRef.current();
      if (save) void saveWorksheetProgress(save).catch(() => undefined);
    };
  }, [progressKey]);

  const handleExit = async () => {
    if (leavingRef.current || savingExit) return;
    if (!progressKey) {
      onExit();
      return;
    }
    leavingRef.current = true;
    setSavingExit(true);
    if (remoteSaveTimerRef.current) {
      window.clearTimeout(remoteSaveTimerRef.current);
      remoteSaveTimerRef.current = null;
    }
    const save = persistProgress();
    try {
      await remoteSaveChainRef.current.catch(() => undefined);
      if (save) await saveWorksheetProgress(save);
      onExit();
    } catch (err) {
      leavingRef.current = false;
      persistProgress();
      toast({
        title: "Could not save to your account",
        description:
          err instanceof Error
            ? err.message
            : `Stay on this ${notesNoun} and try Exit again. Progress is only on this device until that succeeds.`,
        variant: "destructive",
      });
    } finally {
      setSavingExit(false);
    }
  };

  const advanceAfterReview = () => {
    const isLast = currentQuestionIndex >= questions.length - 1;
    if (isLast) {
      finishedRef.current = true;
      const ordered = questions
        .map((q) => eventsByQuestionId.current.get(q.id))
        .filter((e): e is SessionAnalyticsEvent => Boolean(e));
      onComplete(ordered);
      return;
    }
    setCurrentQuestionIndex((i) => i + 1);
  };

  const recordCurrentAndAdvance = () => {
    if (!currentQuestion) return;

    if (lockedQuestionIds.has(currentQuestion.id)) {
      advanceAfterReview();
      return;
    }

    const raw = answers[currentQuestion.id];
    if (!canSubmitQuestionAnswer(currentQuestion, raw)) return;

    const elapsedSeconds = (Date.now() - questionStartMsRef.current) / 1000;
    const correct = isQuestionAnswerCorrect(currentQuestion, raw);

    const evt: SessionAnalyticsEvent = {
      questionId: currentQuestion.id,
      subject: currentQuestion.subject,
      module: currentQuestion.module,
      correct,
      elapsedSeconds,
      tags: currentQuestion.tags.map((t) => t.code),
      contentVersion: currentQuestion.contentVersion ?? 1,
      ...(raw ? { answer: raw } : {}),
    };
    eventsByQuestionId.current.set(currentQuestion.id, evt);
    setLockedQuestionIds((prev) => {
      const next = new Set(prev);
      next.add(currentQuestion.id);
      return next;
    });

    if (!revealAnswers) {
      advanceAfterReview();
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) setCurrentQuestionIndex(currentQuestionIndex - 1);
  };

  const getQuestionStatus = (question: Question) => {
    const isAnswered = answers[question.id];
    const isFlagged = flaggedQuestions.has(question.id);
    if (isFlagged) return "flagged";
    if (isAnswered) return "answered";
    return "unanswered";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "answered":
        return "bg-success text-white";
      case "flagged":
        return "bg-warning text-white";
      case "current":
        return "bg-primary text-white";
      default:
        return "bg-background border border-border text-foreground hover:bg-accent";
    }
  };

  if (!currentQuestion) {
    return null;
  }

  const raw = answers[currentQuestion.id];
  const answerLocked = lockedQuestionIds.has(currentQuestion.id);
  const storedEvent = eventsByQuestionId.current.get(currentQuestion.id);
  const showSolution = revealAnswers && answerLocked;
  const feedback =
    showSolution && storedEvent ? { correct: storedEvent.correct } : null;

  const questionHeader = (
    <div className="flex flex-wrap items-center gap-2">
      <Badge variant={currentQuestion.subject === "MATH" ? "default" : "secondary"}>
        {currentQuestion.subject}
      </Badge>
      <ModuleBadge module={currentQuestion.module} />
      <ProvisionalBadge question={currentQuestion} />
    </div>
  );

  const questionBody = (
    <>
      {revealAnswers && feedback && (
        <div
          className={`rounded-lg border p-3 text-sm ${
            feedback.correct
              ? "border-success/30 bg-success/10 text-success"
              : "border-destructive/30 bg-destructive/10 text-destructive"
          }`}
        >
          {feedback.correct ? "Correct." : "Incorrect."}
        </div>
      )}
      {showElaHighlighter && currentQuestion.subtype !== "INDY-IC" ? (
        <div className="prose prose-sm max-w-none">
          <HighlightableText
            text={currentQuestion.stem}
            storageKey={`${storageKeyPrefix}-stem-${currentQuestion.id}`}
            variant="stem"
          />
        </div>
      ) : (
        <div className="prose prose-sm max-w-none">
          <p className="text-base leading-relaxed whitespace-pre-wrap">
            <MathText text={currentQuestion.stem} />
          </p>
        </div>
      )}
      <QuestionResponseFields
        question={currentQuestion}
        raw={raw}
        disabled={showSolution || answerLocked}
        showSolution={showSolution}
        onChange={(value) => handleAnswerChange(currentQuestion.id, value)}
        onToggleAta={(choiceId) => toggleAtaAnswer(currentQuestion.id, choiceId)}
        eliminatedChoiceIds={eliminated[currentQuestion.id]}
        onToggleEliminate={
          answerLocked ? undefined : (choiceId) => toggleEliminate(currentQuestion.id, choiceId)
        }
      />
      {showSolution && feedback && (
        <QuestionSolutionPanel
          question={currentQuestion}
          isCorrect={feedback.correct}
          selectedChoiceIds={getSelectedChoiceIds(currentQuestion, raw)}
          showSkillToImprove={showsSkillToImprove(profile?.role)}
        />
      )}
      <QuestionReviewPanel question={currentQuestion} />
    </>
  );

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden">
      <Header />

      <div className="container flex min-h-0 flex-1 flex-col overflow-hidden px-4">
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 py-2">
          <div className="flex min-w-0 items-center gap-3">
            <Button variant="ghost" onClick={() => void handleExit()} disabled={savingExit}>
              {savingExit ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <ArrowLeft className="h-4 w-4 mr-2" />
              )}
              {savingExit ? "Saving..." : "Exit"}
            </Button>
            <h1 className="truncate text-xl font-bold">{sessionTitle}</h1>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                try {
                  openWorksheetPrintTab({
                    title: sessionTitle,
                    questions,
                    passages,
                  });
                } catch (err) {
                  toast({
                    title: "Could not open print view",
                    description: err instanceof Error ? err.message : "Please try again.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Printer className="mr-2 h-4 w-4" />
              Print / Save PDF
            </Button>
            <ReportQuestionButton
              question={currentQuestion}
              source={storageKeyPrefix.startsWith("assignment") ? "worksheet" : "practice_set"}
              compact
            />
          </div>
        </div>

        <div className="shrink-0 pb-2">
          <Progress value={progress} className="h-1.5" />
          <div className="mt-2 flex flex-wrap gap-1.5">
            {questions.map((question, index) => {
              const status = index === currentQuestionIndex ? "current" : getQuestionStatus(question);
              return (
                <button
                  key={question.id}
                  type="button"
                  onClick={() => goToQuestion(index)}
                  className={`h-8 w-8 rounded text-sm font-medium transition-all ${getStatusColor(status)}`}
                >
                  {index + 1}
                </button>
              );
            })}
          </div>
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
                    storageKey={`${storageKeyPrefix}-passage-${passage.id}`}
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
                {questionHeader}
              </CardHeader>
              <CardContent
                ref={questionPaneRef}
                className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pt-2"
              >
                {questionBody}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <CardHeader className="relative shrink-0 space-y-0 p-4 pb-2">
              <SubjectStripe subject={currentQuestion.subject} />
              {questionHeader}
            </CardHeader>
            <CardContent
              ref={questionPaneRef}
              className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-4 pt-2"
            >
              {questionBody}
            </CardContent>
          </Card>
        )}
      </div>

      <div className="z-20 shrink-0 border-t bg-background/95 pb-[max(0.5rem,env(safe-area-inset-bottom))]">
        {notesOpen ? (
          <div id={notesPanelId} className="container space-y-2 px-4 pt-2">
            <NotesWorkbench
              compact
              text={notepad}
              onTextChange={setNotepad}
              scratchPad={scratchPad}
              onScratchPadChange={setScratchPad}
              textRef={notesRef}
              textPlaceholder={notesPlaceholder}
              textAriaLabel={notesAriaLabel}
            />
          </div>
        ) : null}
        <div className="container flex flex-wrap items-center justify-between gap-2 px-4 pt-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <p className="text-sm font-medium tabular-nums">
              Question {currentQuestionIndex + 1} of {questions.length}
            </p>
            <Button
              variant={flaggedQuestions.has(currentQuestion.id) ? "default" : "outline"}
              onClick={() => toggleFlag(currentQuestion.id)}
            >
              <Flag className="h-4 w-4 mr-2" />
              {flaggedQuestions.has(currentQuestion.id) ? "Flagged" : "Flag"}
            </Button>
            <Button
              variant={notesOpen ? "default" : "outline"}
              aria-expanded={notesOpen}
              aria-controls={notesOpen ? notesPanelId : undefined}
              onClick={() => setNotesOpen((open) => !open)}
            >
              <StickyNote className="h-4 w-4 mr-2" />
              {notesOpen ? "Hide notes" : "Notes"}
            </Button>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2">
            <Button variant="outline" onClick={prevQuestion} disabled={currentQuestionIndex === 0}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              onClick={recordCurrentAndAdvance}
              disabled={!answerLocked && !canSubmitQuestionAnswer(currentQuestion, raw)}
            >
              {answerLocked
                ? currentQuestionIndex === questions.length - 1
                  ? finishLabel
                  : "Continue"
                : revealAnswers
                  ? "Check answer"
                  : currentQuestionIndex === questions.length - 1
                    ? finishLabel
                    : "Next"}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
