import { useMemo, useState } from "react";
import { BookOpen, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { ModuleBadge } from "@/components/question/ModuleBadge";
import { ReportQuestionButton } from "@/components/question/ReportQuestionButton";
import { QuestionResponseFields } from "@/components/question/QuestionResponseFields";
import { QuestionSolutionPanel } from "@/components/question/QuestionSolutionPanel";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";
import { answersFromDiagnosticEvents, formatDiagnosticItemTime } from "@/lib/diagnosticReport";
import { MathText } from "@/lib/mathText";
import { getSelectedChoiceIds } from "@/lib/questionExplanation";
import { canSubmitQuestionAnswer } from "@/lib/sessionGrading";
import { cn } from "@/lib/utils";
import type { Passage, Question } from "@/types";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

type SessionItemReviewProps = {
  questions: Question[];
  questionIds?: string[];
  passages?: Passage[];
  events: SessionAnalyticsEvent[];
  viewerRole?: "student" | "tutor";
};

function resultLabel(event: SessionAnalyticsEvent | undefined, sittingHasAnswers: boolean): string {
  const hasAnswer = Boolean(event?.answer);
  const answered = hasAnswer || (!sittingHasAnswers && event != null);
  if (event?.correct) return "Correct";
  if (answered) return "Incorrect";
  return "Blank";
}

export function SessionItemReview({
  questions,
  questionIds,
  passages = [],
  events,
  viewerRole = "student",
}: SessionItemReviewProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const eventById = useMemo(
    () => new Map(events.map((event) => [event.questionId, event])),
    [events],
  );
  const sittingHasAnswers = useMemo(
    () => events.some((event) => Boolean(event.answer)),
    [events],
  );
  const answers = useMemo(() => answersFromDiagnosticEvents(events), [events]);
  const questionById = useMemo(
    () => new Map(questions.map((question) => [question.id, question])),
    [questions],
  );
  const orderedIds = useMemo(() => {
    if (questionIds && questionIds.length > 0) return questionIds;
    if (questions.length > 0) return questions.map((question) => question.id);
    return events.map((event) => event.questionId);
  }, [questionIds, questions, events]);

  const selected = selectedId ? questionById.get(selectedId) : undefined;
  const selectedIndex = selectedId ? orderedIds.indexOf(selectedId) : -1;
  const selectedEvent = selectedId ? eventById.get(selectedId) : undefined;
  const raw = selectedId ? answers[selectedId] : undefined;
  const passage = selected?.passageId
    ? passages.find((item) => item.id === selected.passageId)
    : undefined;
  const showElaHighlighter = selected ? shouldShowElaHighlighter(selected) : false;
  const answered = selected ? canSubmitQuestionAnswer(selected, raw) : Boolean(selectedEvent);
  const isTutor = viewerRole === "tutor";

  if (orderedIds.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No questions were stored for this attempt.
      </p>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Question review</CardTitle>
        <CardDescription>
          Open a number to see the question, the {isTutor ? "student" : "submitted"} answer, and the
          key. Green is correct, red is incorrect, gray was left blank.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-success" aria-hidden />
            Correct
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-destructive" aria-hidden />
            Incorrect
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-muted" aria-hidden />
            Blank
          </span>
        </div>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-10">
          {orderedIds.map((questionId, index) => {
            const event = eventById.get(questionId);
            const hasAnswer = Boolean(event?.answer);
            const itemAnswered = hasAnswer || (!sittingHasAnswers && event != null);
            const correct = event?.correct === true;
            return (
              <button
                key={questionId}
                type="button"
                onClick={() => setSelectedId(questionId)}
                aria-label={`Question ${index + 1}, ${resultLabel(event, sittingHasAnswers)}`}
                className={cn(
                  "flex h-8 w-full items-center justify-center rounded-md text-xs font-medium tabular-nums",
                  selectedId === questionId && "ring-2 ring-primary ring-offset-1",
                  correct && "bg-success text-white",
                  !correct && itemAnswered && "bg-destructive text-white",
                  !itemAnswered && "bg-muted text-muted-foreground",
                )}
              >
                {index + 1}
              </button>
            );
          })}
        </div>
      </CardContent>

      <Dialog open={Boolean(selectedId)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          {selectedId ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  Question {selectedIndex + 1}
                  {selectedEvent?.correct
                    ? " · Correct"
                    : answered
                      ? " · Incorrect"
                      : " · Blank"}
                </DialogTitle>
                <DialogDescription>
                  {answered
                    ? isTutor
                      ? "Student answer and key for this item."
                      : "Your answer and key for this item."
                    : "This item was left blank and scored as incorrect."}
                  {sittingHasAnswers && answered && !selectedEvent?.answer
                    ? " This sitting did not store the selected choice."
                    : null}
                </DialogDescription>
              </DialogHeader>
              {selected ? (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant={selected.subject === "MATH" ? "default" : "secondary"}>
                      {selected.subject}
                    </Badge>
                    <ModuleBadge module={selected.module} className="h-5 px-2 text-[10px]" />
                    <span className="inline-flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
                      <Clock className="h-3.5 w-3.5" />
                      {formatDiagnosticItemTime(selectedEvent?.elapsedSeconds ?? 0)}
                    </span>
                    <ReportQuestionButton question={selected} source="review" compact />
                  </div>
                  <div className={cn("grid gap-4", passage && "md:grid-cols-2")}>
                    {passage ? (
                      <div className="rounded-xl border p-4">
                        <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                          <BookOpen className="h-4 w-4" />
                          {passage.title}
                        </p>
                        {showElaHighlighter ? (
                          <HighlightableText
                            text={passage.body}
                            storageKey={`worksheet-review-passage-${passage.id}`}
                            variant="passage"
                          />
                        ) : (
                          <div className="prose prose-sm max-w-none">
                            {passage.body.split("\n\n").map((para, i) => (
                              <p
                                key={i}
                                className="mb-4 whitespace-pre-wrap leading-relaxed last:mb-0"
                              >
                                {para}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : null}
                    <div className="space-y-4">
                      {showElaHighlighter && selected.subtype !== "INDY-IC" ? (
                        <HighlightableText
                          text={selected.stem}
                          storageKey={`worksheet-review-stem-${selected.id}`}
                          variant="stem"
                        />
                      ) : (
                        <p className="text-base leading-relaxed whitespace-pre-wrap">
                          <MathText text={selected.stem} />
                        </p>
                      )}
                      <QuestionResponseFields
                        question={selected}
                        raw={raw}
                        disabled
                        showSolution
                        onChange={() => undefined}
                        onToggleAta={() => undefined}
                      />
                      <QuestionSolutionPanel
                        question={selected}
                        isCorrect={selectedEvent?.correct}
                        selectedChoiceIds={getSelectedChoiceIds(selected, raw)}
                        showSkillToImprove={isTutor}
                        chosenAnswerLead={isTutor ? "Student chose" : "You chose"}
                        selectedChoiceLabel={isTutor ? "Student answer" : "Your answer"}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  This question is no longer in the bank, so the stem cannot be shown. Result:{" "}
                  {resultLabel(selectedEvent, sittingHasAnswers)}.
                </p>
              )}
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
