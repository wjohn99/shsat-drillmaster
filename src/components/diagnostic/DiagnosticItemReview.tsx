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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { QuestionResponseFields } from "@/components/question/QuestionResponseFields";
import { QuestionSolutionPanel } from "@/components/question/QuestionSolutionPanel";
import { ModuleBadge } from "@/components/question/ModuleBadge";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";
import { answersFromDiagnosticEvents, formatDiagnosticItemTime } from "@/lib/diagnosticReport";
import { moduleLabel } from "@/lib/questionModule";
import { getSelectedChoiceIds } from "@/lib/questionExplanation";
import { canSubmitQuestionAnswer } from "@/lib/sessionGrading";
import {
  flattenSectionQuestions,
  passageForQuestion,
  type AssembledDiagnosticExam,
} from "@/lib/shsatDiagnostic";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import type { Question, QuestionModule } from "@/types";
import { cn } from "@/lib/utils";

interface DiagnosticItemReviewProps {
  exam: AssembledDiagnosticExam;
  events: SessionAnalyticsEvent[];
}

type ReviewItem = {
  question: Question;
  number: number;
  sectionLabel: "ELA" | "Math";
};

function resultLabel(event: SessionAnalyticsEvent | undefined, sittingHasAnswers: boolean): string {
  const hasAnswer = Boolean(event?.answer);
  const answered = hasAnswer || (!sittingHasAnswers && event != null);
  if (event?.correct) return "Correct";
  if (answered) return "Incorrect";
  return "Blank";
}

function ReviewGrid({
  title,
  items,
  eventById,
  selectedId,
  sittingHasAnswers,
  onSelect,
}: {
  title: string;
  items: ReviewItem[];
  eventById: Map<string, SessionAnalyticsEvent>;
  selectedId: string | null;
  sittingHasAnswers: boolean;
  onSelect: (questionId: string) => void;
}) {
  if (items.length === 0) return null;
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {items.map((item) => {
          const event = eventById.get(item.question.id);
          const hasAnswer = Boolean(event?.answer);
          const answered = hasAnswer || (!sittingHasAnswers && event != null);
          const correct = event?.correct === true;
          const timeLabel = formatDiagnosticItemTime(event?.elapsedSeconds ?? 0);
          return (
            <button
              key={item.question.id}
              type="button"
              onClick={() => onSelect(item.question.id)}
              title={`${title} question ${item.number}: ${resultLabel(event, sittingHasAnswers)}, ${timeLabel}`}
              aria-label={`${title} question ${item.number}${correct ? ", correct" : answered ? ", incorrect" : ", unanswered"}, ${timeLabel}`}
              className={cn(
                "flex h-7 w-full items-center justify-center rounded-md text-[10px] font-medium tabular-nums sm:h-8 sm:text-xs",
                selectedId === item.question.id && "ring-2 ring-primary ring-offset-1",
                correct && "bg-success text-white",
                !correct && answered && "bg-destructive text-white",
                !answered && "bg-muted text-muted-foreground",
              )}
            >
              {item.number}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function itemsForModule(items: ReviewItem[], module: QuestionModule): ReviewItem[] {
  return items.filter((item) => item.question.module === module);
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
  const elaItems = useMemo<ReviewItem[]>(
    () =>
      flattenSectionQuestions(exam.ela).map((question, index) => ({
        question,
        number: index + 1,
        sectionLabel: "ELA",
      })),
    [exam],
  );
  const mathItems = useMemo<ReviewItem[]>(
    () =>
      flattenSectionQuestions(exam.math).map((question, index) => ({
        question,
        number: index + 1,
        sectionLabel: "Math",
      })),
    [exam],
  );
  const allItems = useMemo(() => [...elaItems, ...mathItems], [elaItems, mathItems]);
  const selected = allItems.find((item) => item.question.id === selectedId)?.question;
  const selectedMeta = allItems.find((item) => item.question.id === selectedId);
  const selectedEvent = selected ? eventById.get(selected.id) : undefined;
  const raw = selected ? answers[selected.id] : undefined;
  const passage = selected ? passageForQuestion(selected) : undefined;
  const showElaHighlighter = selected ? shouldShowElaHighlighter(selected) : false;
  const answered = selected ? canSubmitQuestionAnswer(selected, raw) : false;
  const reviewLabel = selectedMeta
    ? `${selectedMeta.sectionLabel} ${selectedMeta.number}`
    : "Item";
  const timeLabel = formatDiagnosticItemTime(selectedEvent?.elapsedSeconds ?? 0);

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Item review</CardTitle>
        <CardDescription>
          Split by Module 1 and Module 2. Open any item for the key and time spent. Green is
          correct, red is incorrect, gray was left blank.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
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
        <div className="space-y-4">
          <ReviewGrid
            title="ELA · Module 1"
            items={itemsForModule(elaItems, "1")}
            eventById={eventById}
            selectedId={selectedId}
            sittingHasAnswers={sittingHasAnswers}
            onSelect={setSelectedId}
          />
          <ReviewGrid
            title="ELA · Module 2"
            items={itemsForModule(elaItems, "2")}
            eventById={eventById}
            selectedId={selectedId}
            sittingHasAnswers={sittingHasAnswers}
            onSelect={setSelectedId}
          />
        </div>
        <div className="space-y-4">
          <ReviewGrid
            title="Math · Module 1"
            items={itemsForModule(mathItems, "1")}
            eventById={eventById}
            selectedId={selectedId}
            sittingHasAnswers={sittingHasAnswers}
            onSelect={setSelectedId}
          />
          <ReviewGrid
            title="Math · Module 2"
            items={itemsForModule(mathItems, "2")}
            eventById={eventById}
            selectedId={selectedId}
            sittingHasAnswers={sittingHasAnswers}
            onSelect={setSelectedId}
          />
        </div>

        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Time on each question
          </p>
          <div className="max-h-[28rem] overflow-auto rounded-lg border">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-background">
                <TableRow>
                  <TableHead className="w-16">#</TableHead>
                  <TableHead>Section</TableHead>
                  <TableHead>Module</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead className="text-right">Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {allItems.map((item) => {
                  const event = eventById.get(item.question.id);
                  const result = resultLabel(event, sittingHasAnswers);
                  return (
                    <TableRow
                      key={item.question.id}
                      className="cursor-pointer"
                      onClick={() => setSelectedId(item.question.id)}
                    >
                      <TableCell className="tabular-nums">{item.number}</TableCell>
                      <TableCell>{item.sectionLabel}</TableCell>
                      <TableCell>{moduleLabel(item.question.module)}</TableCell>
                      <TableCell>{result}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatDiagnosticItemTime(event?.elapsedSeconds ?? 0)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      </CardContent>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelectedId(null)}>
        <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto">
          {selected && selectedMeta ? (
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
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selected.subject === "MATH" ? "default" : "secondary"}>
                  {selected.subject}
                </Badge>
                <ModuleBadge module={selected.module} className="h-5 px-2 text-[10px]" />
                <span className="inline-flex items-center gap-1 text-sm text-muted-foreground tabular-nums">
                  <Clock className="h-3.5 w-3.5" />
                  {timeLabel}
                </span>
              </div>
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
