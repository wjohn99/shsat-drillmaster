import { useEffect, useRef, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ArrowRight, BookOpen, CheckCircle, Flag, XCircle } from "lucide-react";
import { useQuestions } from "@/contexts/QuestionsContext";
import { ModuleBadge } from "@/components/question/ModuleBadge";
import { QuestionSolutionPanel } from "@/components/question/QuestionSolutionPanel";
import { getSelectedChoiceIds } from "@/lib/questionExplanation";
import type { Question } from "@/types";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import { isIndyCheckboxMultiSubtype, parseAtaAnswer, serializeAtaAnswer } from "@/lib/indyAta";
import { parseDndPlacementsForQuestion, serializeDndPlacements } from "@/lib/indyDnd";
import { parseIcSelectionsForQuestion, serializeIcSelections } from "@/lib/indyIc";
import { DndBlock } from "@/components/question/DndBlock";
import { EquationEditorBlock } from "@/components/question/EquationEditorBlock";
import { CgtBlock } from "@/components/question/CgtBlock";
import { WpBlock } from "@/components/question/WpBlock";
import { InlineChoiceBlock } from "@/components/question/InlineChoiceBlock";
import { HotSpotBlock } from "@/components/question/HotSpotBlock";
import { GraphFigureBlock } from "@/components/question/GraphFigureBlock";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { canSubmitQuestionAnswer, isQuestionAnswerCorrect } from "@/lib/sessionGrading";

export interface SessionQuestionRunnerProps {
  questions: Question[];
  sessionTitle: string;
  onExit: () => void;
  onComplete: (events: SessionAnalyticsEvent[]) => void;
  /** Prefix for highlight localStorage keys (e.g. "worksheet", "practice-set"). */
  storageKeyPrefix: string;
}

export function SessionQuestionRunner({
  questions,
  sessionTitle,
  onExit,
  onComplete,
  storageKeyPrefix,
}: SessionQuestionRunnerProps) {
  const { passages } = useQuestions();
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [feedback, setFeedback] = useState<null | { correct: boolean }>(null);
  const [reviewingAnswer, setReviewingAnswer] = useState(false);

  const questionStartMsRef = useRef(Date.now());
  const eventsByQuestionId = useRef<Map<string, SessionAnalyticsEvent>>(new Map());

  const currentQuestion = questions[currentQuestionIndex];
  const passage = currentQuestion?.passageId
    ? passages.find((p) => p.id === currentQuestion.passageId)
    : null;
  const showElaHighlighter = currentQuestion ? shouldShowElaHighlighter(currentQuestion) : false;
  // Fraction of questions already completed (current screen is the next one to answer).
  const progress = questions.length ? (currentQuestionIndex / questions.length) * 100 : 0;

  useEffect(() => {
    questionStartMsRef.current = Date.now();
    setFeedback(null);
    setReviewingAnswer(false);
  }, [currentQuestionIndex]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const toggleAtaAnswer = (questionId: string, choiceId: string) => {
    const prev = parseAtaAnswer(answers[questionId]);
    const next = prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId];
    handleAnswerChange(questionId, serializeAtaAnswer(next));
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

  const advanceAfterReview = () => {
    const isLast = currentQuestionIndex >= questions.length - 1;
    if (isLast) {
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

    if (reviewingAnswer) {
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
    };
    eventsByQuestionId.current.set(currentQuestion.id, evt);
    setFeedback({ correct });
    setReviewingAnswer(true);
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
  const showSolution = reviewingAnswer;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={onExit}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit
            </Button>
            <div>
              <h1 className="text-2xl font-bold">{sessionTitle}</h1>
              <p className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => toggleFlag(currentQuestion.id)}
              className={flaggedQuestions.has(currentQuestion.id) ? "bg-warning text-white" : ""}
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={currentQuestion.subject === "MATH" ? "default" : "secondary"}>
                      {currentQuestion.subject}
                    </Badge>
                    <ModuleBadge module={currentQuestion.module} />
                  </div>
                  <div className="text-sm text-muted-foreground">Question #{currentQuestionIndex + 1}</div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {feedback && (
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

                {passage && showElaHighlighter && (
                  <Card className="border-dashed bg-muted/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="h-4 w-4" />
                        {passage.title}
                      </CardTitle>
                      {passage.sourceMeta && (
                        <p className="text-sm text-muted-foreground">{passage.sourceMeta}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0">
                      <HighlightableText
                        text={passage.body}
                        storageKey={`${storageKeyPrefix}-passage-${passage.id}`}
                        variant="passage"
                      />
                    </CardContent>
                  </Card>
                )}
                {passage && !showElaHighlighter && (
                  <Card className="border-dashed bg-muted/20">
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <BookOpen className="h-4 w-4" />
                        {passage.title}
                      </CardTitle>
                      {passage.sourceMeta && (
                        <p className="text-sm text-muted-foreground">{passage.sourceMeta}</p>
                      )}
                    </CardHeader>
                    <CardContent className="pt-0 prose prose-sm max-w-none">
                      {passage.body.split("\n\n").map((para, i) => (
                        <p key={i} className="mb-4 last:mb-0 leading-relaxed">
                          {para}
                        </p>
                      ))}
                    </CardContent>
                  </Card>
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
                    <p className="text-base leading-relaxed">{currentQuestion.stem}</p>
                  </div>
                )}

                {currentQuestion.subtype === "INDY-CGT" && currentQuestion.cgt && (
                  <CgtBlock spec={currentQuestion.cgt} />
                )}
                {currentQuestion.subtype === "INDY-WP" && (
                  <WpBlock spec={currentQuestion.wp ?? {}} />
                )}
                {currentQuestion.subtype === "INDY-HS" && currentQuestion.hs && (
                  <HotSpotBlock
                    spec={currentQuestion.hs}
                    selectedId={raw || null}
                    onSelect={(id) => handleAnswerChange(currentQuestion.id, id)}
                    disabled={showSolution}
                    showSolution={showSolution}
                  />
                )}
                {currentQuestion.subtype === "INDY-GIF" && currentQuestion.gif?.mode === "plotPoint" && (
                  <GraphFigureBlock
                    spec={currentQuestion.gif}
                    value={raw || null}
                    onChange={(s) => handleAnswerChange(currentQuestion.id, s)}
                    disabled={showSolution}
                    showSolution={showSolution}
                  />
                )}
                {currentQuestion.subtype === "INDY-IC" && currentQuestion.ic && (
                  <InlineChoiceBlock
                    spec={currentQuestion.ic}
                    selections={parseIcSelectionsForQuestion(currentQuestion.ic, raw)}
                    onChange={(next) =>
                      handleAnswerChange(currentQuestion.id, serializeIcSelections(next))
                    }
                    disabled={showSolution}
                    showSolution={showSolution}
                  />
                )}
                {currentQuestion.subtype === "INDY-DND" && currentQuestion.dnd && (
                  <DndBlock
                    spec={currentQuestion.dnd}
                    placements={parseDndPlacementsForQuestion(currentQuestion.dnd, raw)}
                    onChange={(next) =>
                      handleAnswerChange(currentQuestion.id, serializeDndPlacements(next))
                    }
                    disabled={showSolution}
                    showSolution={showSolution}
                  />
                )}
                {currentQuestion.subtype === "INDY-EE" && currentQuestion.ee && (
                  <EquationEditorBlock
                    key={currentQuestion.id}
                    spec={currentQuestion.ee}
                    value={raw || ""}
                    onChange={(v) => handleAnswerChange(currentQuestion.id, v)}
                    disabled={showSolution}
                  />
                )}

                {isIndyCheckboxMultiSubtype(currentQuestion.subtype) && currentQuestion.choices && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {currentQuestion.subtype === "INDY-MS"
                        ? "Select all answers that apply."
                        : "Select all that apply."}
                    </p>
                    {currentQuestion.choices.map((choice) => {
                      const selected = parseAtaAnswer(raw);
                      const checked = selected.includes(choice.id);
                      const showWrongPick = showSolution && checked && !choice.isCorrect;
                      const showMissed = showSolution && !checked && choice.isCorrect;
                      return (
                        <div key={choice.id} className="space-y-1.5">
                          <div className="flex items-start space-x-3">
                            <Checkbox
                              id={`${currentQuestion.id}-${choice.id}`}
                              checked={checked}
                              onCheckedChange={() => toggleAtaAnswer(currentQuestion.id, choice.id)}
                              disabled={showSolution}
                              className="mt-1"
                            />
                            <Label
                              htmlFor={`${currentQuestion.id}-${choice.id}`}
                              className={`flex-1 cursor-pointer text-sm leading-relaxed ${
                                showSolution && choice.isCorrect ? "text-success font-medium" : ""
                              } ${showWrongPick ? "text-destructive" : ""} ${showMissed ? "text-warning" : ""}`}
                            >
                              <span className="font-medium mr-2">{choice.label}.</span>
                              {choice.text}
                            </Label>
                            {showSolution && choice.isCorrect && (
                              <CheckCircle className="h-4 w-4 shrink-0 text-success mt-1" />
                            )}
                            {showWrongPick && (
                              <XCircle className="h-4 w-4 shrink-0 text-destructive mt-1" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {currentQuestion.choices &&
                  !isIndyCheckboxMultiSubtype(currentQuestion.subtype) &&
                  currentQuestion.subtype !== "INDY-DND" &&
                  currentQuestion.subtype !== "INDY-EE" &&
                  currentQuestion.subtype !== "INDY-IC" &&
                  currentQuestion.subtype !== "INDY-HS" &&
                  currentQuestion.subtype !== "INDY-GIF" && (
                    <div className="space-y-3">
                      <RadioGroup
                        value={raw || ""}
                        onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                        disabled={showSolution}
                      >
                        {currentQuestion.choices.map((choice) => (
                          <div key={choice.id} className="space-y-1.5">
                            <div className="flex items-start space-x-3">
                              <RadioGroupItem value={choice.id} id={choice.id} className="mt-1" />
                              <Label
                                htmlFor={choice.id}
                                className={`flex-1 cursor-pointer text-sm leading-relaxed ${
                                  showSolution && choice.isCorrect ? "text-success font-medium" : ""
                                } ${
                                  showSolution && raw === choice.id && !choice.isCorrect
                                    ? "text-destructive"
                                    : ""
                                }`}
                              >
                                <span className="font-medium mr-2">{choice.label}.</span>
                                {choice.text}
                              </Label>
                              {showSolution && choice.isCorrect && (
                                <CheckCircle className="h-4 w-4 text-success mt-1" />
                              )}
                              {showSolution && raw === choice.id && !choice.isCorrect && (
                                <XCircle className="h-4 w-4 text-destructive mt-1" />
                              )}
                            </div>
                          </div>
                        ))}
                      </RadioGroup>
                    </div>
                  )}

                {currentQuestion.subtype === "GRID_IN" && (
                  <div className="space-y-3">
                    <Label htmlFor={`grid-${currentQuestion.id}`}>Enter your answer:</Label>
                    <Input
                      id={`grid-${currentQuestion.id}`}
                      value={raw || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Enter fraction or decimal"
                      className="max-w-md"
                      disabled={showSolution}
                    />
                    <p className="text-xs text-muted-foreground">
                      Grid-in answers are not auto-graded yet; they count as incorrect for statistics.
                    </p>
                  </div>
                )}

                {showSolution && feedback && (
                  <QuestionSolutionPanel
                    question={currentQuestion}
                    isCorrect={feedback.correct}
                    selectedChoiceIds={getSelectedChoiceIds(currentQuestion, raw)}
                  />
                )}
              </CardContent>
            </Card>

            <div className="flex justify-between mt-6">
              <Button variant="outline" onClick={prevQuestion} disabled={currentQuestionIndex === 0}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>

              <Button
                onClick={recordCurrentAndAdvance}
                disabled={!reviewingAnswer && !canSubmitQuestionAnswer(currentQuestion, raw)}
              >
                {reviewingAnswer
                  ? currentQuestionIndex === questions.length - 1
                    ? "Finish worksheet"
                    : "Continue"
                  : "Check answer"}
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Question Navigator</CardTitle>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-success" />
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-warning" />
                    <span>Flagged</span>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((question, index) => {
                    const status = index === currentQuestionIndex ? "current" : getQuestionStatus(question);
                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => goToQuestion(index)}
                        className={`h-8 w-8 rounded text-xs font-medium transition-all ${getStatusColor(status)}`}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>

                <div className="mt-6 text-sm">
                  <div className="flex justify-between">
                    <span>Answered:</span>
                    <span>
                      {Object.keys(answers).length}/{questions.length}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
