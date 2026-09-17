import { useMemo, useState } from "react";
import { BookOpen } from "lucide-react";
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
import { QuestionResponseFields } from "@/components/question/QuestionResponseFields";
import { QuestionSolutionPanel } from "@/components/question/QuestionSolutionPanel";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";
import { answersFromDiagnosticEvents } from "@/lib/diagnosticReport";
import { getSelectedChoiceIds } from "@/lib/questionExplanation";
import { canSubmitQuestionAnswer } from "@/lib/sessionGrading";
import {
  flattenSectionQuestions,
  passageForQuestion,
  type AssembledDiagnosticExam,
} from "@/lib/shsatDiagnostic";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import type { Question } from "@/types";
import { cn } from "@/lib/utils";

interface DiagnosticItemReviewProps {
  exam: AssembledDiagnosticExam;
  events: SessionAnalyticsEvent[];
}

function ReviewGrid({
  title,
  questions,
  eventById,
  selectedId,
  sittingHasAnswers,
  onSelect,
}: {
  title: string;
  questions: Question[];
  eventById: Map<string, SessionAnalyticsEvent>;
  selectedId: string | null;
  sittingHasAnswers: boolean;
  onSelect: (questionId: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {questions.map((question, index) => {
          const event = eventById.get(question.id);
          const hasAnswer = Boolean(event?.answer);
          const answered = hasAnswer || (!sittingHasAnswers && event != null);
          const correct = event?.correct === true;
          return (
            <button
              key={question.id}
              type="button"
              onClick={() => onSelect(question.id)}
              aria-label={`${title} question ${index + 1}${correct ? ", correct" : answered ? ", incorrect" : ", unanswered"}`}
              className={cn(
                "flex h-7 w-full items-center justify-center rounded-md text-[10px] font-medium tabular-nums sm:h-8 sm:text-xs",
                selectedId === question.id && "ring-2 ring-primary ring-offset-1",
                correct && "bg-success text-white",
                !correct && answered && "bg-destructive text-white",
                !answered && "bg-muted text-muted-foreground",
              )}
            >
              {index + 1}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DiagnosticItemReview({ exam, events }: DiagnosticItemReviewProps) {
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
  const elaQuestions = flattenSectionQuestions(exam.ela);
  const mathQuestions = flattenSectionQuestions(exam.math);
  const allQuestions = useMemo(
    () => [...elaQuestions, ...mathQuestions],
    [elaQuestions, mathQuestions],
  );
  const selected = allQuestions.find((question) => question.id === selectedId);
  const selectedEvent = selected ? eventById.get(selected.id) : undefined;
  const raw = selected ? answers[selected.id] : undefined;
  const passage = selected ? passageForQuestion(selected) : undefined;
  const showElaHighlighter = selected ? shouldShowElaHighlighter(selected) : false;
  const answered = selected ? canSubmitQuestionAnswer(selected, raw) : false;
  const elaIndex = selected ? elaQuestions.findIndex((q) => q.id === selected.id) : -1;
  const mathIndex = selected ? mathQuestions.findIndex((q) => q.id === selected.id) : -1;
  const reviewLabel =
    elaIndex >= 0 ? `ELA ${elaIndex + 1}` : mathIndex >= 0 ? `Math ${mathIndex + 1}` : "Item";

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Item review</CardTitle>
        <CardDescription>
          Open any item to see the passage, the student’s answer, and the key. Green is correct, red
          is incorrect, gray was left blank.
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
        <ReviewGrid
          title="ELA"
          questions={elaQuestions}
          eventById={eventById}
          selectedId={selectedId}
          sittingHasAnswers={sittingHasAnswers}
          onSelect={setSelectedId}
        />
        <ReviewGrid
          title="Math"
          questions={mathQuestions}
          eventById={eventById}
          selectedId={selectedId}
          sittingHasAnswers={sittingHasAnswers}
          onSelect={setSelectedId}
        />
      </CardContent>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {reviewLabel}
                  {selectedEvent?.correct
                    ? " · Correct"
                    : answered
                      ? " · Incorrect"
                      : " · Blank"}
                </DialogTitle>
                <DialogDescription>
                  {answered
                    ? "Student answer and key for this item."
                    : "This item was left blank and scored as incorrect."}
                  {!selectedEvent?.answer && answered
                    ? " This sitting did not store the selected choice."
                    : null}
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 md:grid-cols-2">
                {passage ? (
                  <div className="rounded-xl border p-4">
                    <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <BookOpen className="h-4 w-4" />
                      {passage.title}
                    </p>
                    {showElaHighlighter ? (
                      <HighlightableText
                        text={passage.body}
                        storageKey={`diagnostic-review-passage-${passage.id}`}
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
                  </div>
                ) : null}
                <div className={cn("space-y-4", !passage && "md:col-span-2")}>
                  <Badge variant={selected.subject === "MATH" ? "default" : "secondary"}>
                    {selected.subject}
                  </Badge>
                  {showElaHighlighter && selected.subtype !== "INDY-IC" ? (
                    <HighlightableText
                      text={selected.stem}
                      storageKey={`diagnostic-review-stem-${selected.id}`}
                      variant="stem"
                    />
                  ) : (
                    <p className="text-base leading-relaxed whitespace-pre-wrap">{selected.stem}</p>
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
                  />
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
