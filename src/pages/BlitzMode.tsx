import { Header } from "@/components/layout/Header";
import { useEffect, useMemo, useRef, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Zap, Timer, XCircle } from "lucide-react";
import type { Difficulty, Question } from "@/types";
import { questions as allQuestions, passages } from "@/data/mockData";
import { Chip } from "@/components/ui/chip";
import { isIndyCheckboxMultiSubtype, parseAtaAnswer, serializeAtaAnswer } from "@/lib/indyAta";
import { DndBlock } from "@/components/question/DndBlock";
import { EquationEditorBlock } from "@/components/question/EquationEditorBlock";
import { CgtBlock } from "@/components/question/CgtBlock";
import { WpBlock } from "@/components/question/WpBlock";
import { HotSpotBlock } from "@/components/question/HotSpotBlock";
import { GraphFigureBlock } from "@/components/question/GraphFigureBlock";
import { InlineChoiceBlock } from "@/components/question/InlineChoiceBlock";
import { parseIcSelectionsForQuestion, serializeIcSelections } from "@/lib/indyIc";
import { parseDndPlacementsForQuestion, serializeDndPlacements } from "@/lib/indyDnd";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { canSubmitQuestionAnswer, isQuestionAnswerCorrect } from "@/lib/sessionGrading";
import { SessionResultsDashboard } from "@/components/session/SessionResultsDashboard";

export default function BlitzMode() {
  const WARM_START_SECONDS = 3;
  const DURATION_CHOICES = [30, 60, 90] as const;
  const STRIKE_CHOICES = [1, 2, 3] as const;

  type BlitzEvent = {
    questionId: string;
    subject: Question["subject"];
    difficulty: Difficulty;
    correct: boolean;
    elapsedSeconds: number;
    bonusSeconds: number;
    streakAfter: number;
    tRemainingAfter: number;
    strikesAfter: number;
    tags: string[];
  };

  const [phase, setPhase] = useState<"idle" | "countdown" | "running" | "ended">("idle");
  const [durationSeconds, setDurationSeconds] = useState<(typeof DURATION_CHOICES)[number]>(60);
  const [maxStrikes, setMaxStrikes] = useState<(typeof STRIKE_CHOICES)[number]>(3);
  const [selectedSubjects, setSelectedSubjects] = useState<Array<Question["subject"]>>([
    "MATH",
    "ELA",
  ]);

  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  const [strikes, setStrikes] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [events, setEvents] = useState<BlitzEvent[]>([]);
  const [countdownLeft, setCountdownLeft] = useState(WARM_START_SECONDS);

  const [usedIds, setUsedIds] = useState<Set<string>>(new Set());
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<null | { correct: boolean; bonusSeconds: number }>(null);

  const questionStartMsRef = useRef<number>(0);
  const timerRef = useRef<number | null>(null);

  // Keep the HUD timer in sync with settings while not actively running.
  useEffect(() => {
    if (phase === "idle") setTimeLeft(durationSeconds);
    if (phase === "countdown") setTimeLeft(durationSeconds);
  }, [durationSeconds, phase]);

  const gradableQuestions = useMemo(() => {
    const isGradable = (q: Question) => {
      if (q.subtype === "GRID_IN") return false; // no answer key in current data
      if (q.subtype === "INDY-EE") return Boolean(q.ee?.acceptableAnswers?.length);
      if (q.subtype === "INDY-DND") return Boolean(q.dnd?.zones?.length && q.dnd?.pool?.length);
      if (q.subtype === "INDY-IC") return Boolean(q.ic?.slots?.length);
      if (q.subtype === "INDY-HS") return Boolean(q.hs?.spots?.length);
      if (q.subtype === "INDY-GIF") return Boolean(q.gif);
      return Boolean(q.choices?.length && q.choices.some((c) => c.isCorrect));
    };
    return allQuestions.filter(isGradable);
  }, []);

  const sessionQuestions = useMemo(() => {
    const set = new Set(selectedSubjects);
    return gradableQuestions.filter((q) => set.has(q.subject));
  }, [gradableQuestions, selectedSubjects]);

  const ladderDifficulty: Difficulty = useMemo(() => {
    if (currentStreak >= 8) return "hard";
    if (currentStreak >= 4) return "medium";
    return "easy";
  }, [currentStreak]);

  const pickNextQuestion = (opts: { used: Set<string>; preferred: Difficulty }): Question | null => {
    const notUsed = sessionQuestions.filter((q) => !opts.used.has(q.id));
    if (notUsed.length === 0) return null;

    const preferredPool = notUsed.filter((q) => q.difficulty === opts.preferred);
    const pool = preferredPool.length > 0 ? preferredPool : notUsed;
    return pool[Math.floor(Math.random() * pool.length)];
  };

  const stopTimer = () => {
    if (timerRef.current != null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const endSession = () => {
    stopTimer();
    setPhase("ended");
    setFeedback(null);
  };

  const startSession = () => {
    stopTimer();
    const used = new Set<string>();
    const first = pickNextQuestion({ used, preferred: "easy" });
    if (!first) return;

    used.add(first.id);
    setUsedIds(used);
    setCurrentQuestion(first);
    setFeedback(null);
    setPhase("countdown");
    setTimeLeft(durationSeconds);
    setStrikes(0);
    setAnsweredCount(0);
    setCorrectCount(0);
    setCurrentStreak(0);
    setEvents([]);
    setAnswers({});
    setCountdownLeft(WARM_START_SECONDS);
  };

  useEffect(() => {
    if (phase !== "running") return;
    stopTimer();
    timerRef.current = window.setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) return 0;
        return t - 1;
      });
    }, 1000);
    return () => stopTimer();
  }, [phase]);

  useEffect(() => {
    if (phase !== "countdown") return;
    stopTimer();
    const id = window.setInterval(() => {
      setCountdownLeft((c) => (c <= 1 ? 0 : c - 1));
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase]);

  useEffect(() => {
    if (phase !== "countdown") return;
    if (countdownLeft > 0) return;
    // "Go" — start the timer and mark the start time for the first question.
    questionStartMsRef.current = Date.now();
    setPhase("running");
  }, [phase, countdownLeft]);

  useEffect(() => {
    if (phase !== "running") return;
    if (timeLeft <= 0) endSession();
  }, [timeLeft, phase]);

  useEffect(() => {
    if (phase !== "running") return;
    if (strikes >= maxStrikes) endSession();
  }, [strikes, phase]);

  const timeBonusSeconds = (elapsedSeconds: number): number => {
    if (elapsedSeconds <= 8) return 4;
    if (elapsedSeconds <= 15) return 2;
    if (elapsedSeconds <= 25) return 1;
    return 0;
  };

  const advance = (afterStreak: number) => {
    setUsedIds((prev) => {
      const nextUsed = new Set(prev);
      const preferred: Difficulty =
        afterStreak >= 8 ? "hard" : afterStreak >= 4 ? "medium" : "easy";
      const nextQ = pickNextQuestion({ used: nextUsed, preferred });
      if (!nextQ) {
        setCurrentQuestion(null);
        endSession();
        return nextUsed;
      }
      nextUsed.add(nextQ.id);
      setCurrentQuestion(nextQ);
      questionStartMsRef.current = Date.now();
      setFeedback(null);
      return nextUsed;
    });
  };

  const submitAnswer = () => {
    if (phase !== "running" || !currentQuestion) return;
    if (!canSubmitQuestionAnswer(currentQuestion, answers[currentQuestion.id])) return;

    const elapsedSeconds = (Date.now() - questionStartMsRef.current) / 1000;
    const correct = isQuestionAnswerCorrect(currentQuestion, answers[currentQuestion.id]);

    setAnsweredCount((n) => n + 1);

    if (correct) {
      setCorrectCount((n) => n + 1);
      const bonus = timeBonusSeconds(elapsedSeconds);
      if (bonus > 0) setTimeLeft((t) => Math.min(180, t + bonus));

      setCurrentStreak((s) => {
        const next = s + 1;
        setFeedback({ correct: true, bonusSeconds: bonus });
        setEvents((ev) => [
          ...ev,
          {
            questionId: currentQuestion.id,
            subject: currentQuestion.subject,
            difficulty: currentQuestion.difficulty,
            correct: true,
            elapsedSeconds,
            bonusSeconds: bonus,
            streakAfter: next,
            tRemainingAfter: Math.min(180, timeLeft + bonus),
            strikesAfter: strikes,
            tags: currentQuestion.tags.map((t) => t.code),
          },
        ]);
        window.setTimeout(() => advance(next), 450);
        return next;
      });
      return;
    }

    // incorrect
    setFeedback({ correct: false, bonusSeconds: 0 });
    setStrikes((k) => k + 1);
    setCurrentStreak(0);
    setEvents((ev) => [
      ...ev,
      {
        questionId: currentQuestion.id,
        subject: currentQuestion.subject,
        difficulty: currentQuestion.difficulty,
        correct: false,
        elapsedSeconds,
        bonusSeconds: 0,
        streakAfter: 0,
        tRemainingAfter: timeLeft,
        strikesAfter: Math.min(maxStrikes, strikes + 1),
        tags: currentQuestion.tags.map((t) => t.code),
      },
    ]);
    window.setTimeout(() => advance(0), 650);
  };

  const renderQuestionBody = (q: Question) => {
    const passage = q.passageId ? passages.find((p) => p.id === q.passageId) : null;
    const showHl = shouldShowElaHighlighter(q);
    const raw = answers[q.id];

    return (
      <div className="space-y-6">
        {passage && (
          <Card className="border-dashed bg-muted/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{passage.title}</CardTitle>
              {passage.sourceMeta && (
                <p className="text-sm text-muted-foreground">{passage.sourceMeta}</p>
              )}
            </CardHeader>
            <CardContent className="pt-0">
              {showHl ? (
                <HighlightableText
                  text={passage.body}
                  storageKey={`blitz-passage-${passage.id}`}
                  variant="passage"
                />
              ) : (
                <div className="prose prose-sm max-w-none">
                  {passage.body.split("\n\n").map((para, i) => (
                    <p key={i} className="mb-4 last:mb-0 leading-relaxed">
                      {para}
                    </p>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {showHl && q.subtype !== "INDY-IC" ? (
          <div className="prose prose-sm max-w-none">
            <HighlightableText
              text={q.stem}
              storageKey={`blitz-stem-${q.id}`}
              variant="stem"
            />
          </div>
        ) : (
          <div className="prose prose-sm max-w-none">
            <p className="text-base leading-relaxed">{q.stem}</p>
          </div>
        )}

        {q.subtype === "INDY-CGT" && q.cgt && <CgtBlock spec={q.cgt} />}
        {q.subtype === "INDY-WP" && <WpBlock spec={q.wp ?? {}} />}
        {q.subtype === "INDY-HS" && q.hs && (
          <HotSpotBlock
            spec={q.hs}
            selectedId={raw || null}
            onSelect={(id) => setAnswers((a) => ({ ...a, [q.id]: id }))}
          />
        )}
        {q.subtype === "INDY-GIF" && q.gif?.mode === "plotPoint" && (
          <GraphFigureBlock
            spec={q.gif}
            value={raw || null}
            onChange={(s) => setAnswers((a) => ({ ...a, [q.id]: s }))}
          />
        )}
        {q.subtype === "INDY-IC" && q.ic && (
          <InlineChoiceBlock
            spec={q.ic}
            selections={parseIcSelectionsForQuestion(q.ic, raw)}
            onChange={(next) => setAnswers((a) => ({ ...a, [q.id]: serializeIcSelections(next) }))}
          />
        )}
        {q.subtype === "INDY-DND" && q.dnd && (
          <DndBlock
            spec={q.dnd}
            placements={parseDndPlacementsForQuestion(q.dnd, raw)}
            onChange={(next) => setAnswers((a) => ({ ...a, [q.id]: serializeDndPlacements(next) }))}
          />
        )}
        {q.subtype === "INDY-EE" && q.ee && (
          <EquationEditorBlock
            key={q.id}
            spec={q.ee}
            value={raw || ""}
            onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
          />
        )}

        {isIndyCheckboxMultiSubtype(q.subtype) && q.choices && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Select all that apply.
            </p>
            {q.choices.map((choice) => {
              const selected = parseAtaAnswer(raw);
              const checked = selected.includes(choice.id);
              return (
                <div key={choice.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={`${q.id}-${choice.id}`}
                    checked={checked}
                    onCheckedChange={() => {
                      const next = checked
                        ? selected.filter((id) => id !== choice.id)
                        : [...selected, choice.id];
                      setAnswers((a) => ({ ...a, [q.id]: serializeAtaAnswer(next) }));
                    }}
                    className="mt-1"
                  />
                  <Label
                    htmlFor={`${q.id}-${choice.id}`}
                    className="flex-1 cursor-pointer text-sm leading-relaxed"
                  >
                    <span className="font-medium mr-2">{choice.label}.</span>
                    {choice.text}
                  </Label>
                </div>
              );
            })}
          </div>
        )}

        {/* Single-select MCQ */}
        {q.choices &&
          !isIndyCheckboxMultiSubtype(q.subtype) &&
          q.subtype !== "INDY-DND" &&
          q.subtype !== "INDY-EE" &&
          q.subtype !== "INDY-IC" &&
          q.subtype !== "INDY-HS" &&
          q.subtype !== "INDY-GIF" && (
            <div className="space-y-3">
              <RadioGroup
                value={raw || ""}
                onValueChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))}
              >
                {q.choices.map((choice) => (
                  <div key={choice.id} className="flex items-start space-x-3">
                    <RadioGroupItem value={choice.id} id={choice.id} className="mt-1" />
                    <Label htmlFor={choice.id} className="flex-1 cursor-pointer text-sm leading-relaxed">
                      <span className="font-medium mr-2">{choice.label}.</span>
                      {choice.text}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          )}

        {q.subtype === "GRID_IN" && (
          <div className="space-y-3">
            <Label htmlFor={`grid-${q.id}`}>Enter your answer:</Label>
            <Input
              id={`grid-${q.id}`}
              value={raw || ""}
              onChange={(e) => setAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
              placeholder="Enter fraction or decimal"
              className="max-w-md"
            />
            <p className="text-xs text-muted-foreground">
              Note: Grid-in questions aren’t currently graded in Blitz Mode.
            </p>
          </div>
        )}
      </div>
    );
  };

  const strikesLeft = Math.max(0, maxStrikes - strikes);
  const progress = Math.round((timeLeft / durationSeconds) * 100);

  const analyticsEvents = events.map((e) => ({
    questionId: e.questionId,
    subject: e.subject,
    difficulty: e.difficulty,
    correct: e.correct,
    elapsedSeconds: e.elapsedSeconds,
    tags: e.tags,
  }));

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
                <Zap className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold leading-tight">Blitz Mode</h1>
                <p className="text-muted-foreground">
                  Pick settings, then sprint.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-mono">
                <Timer className="h-3.5 w-3.5 mr-1" />
                {timeLeft}s
              </Badge>
              <Badge variant={strikesLeft === 0 ? "destructive" : "secondary"}>
                <XCircle className="h-3.5 w-3.5 mr-1" />
                Strikes left: {strikesLeft}
              </Badge>
              <Badge variant="outline">Streak: {currentStreak}</Badge>
            </div>
          </div>

          <div className="mb-6 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Time remaining</span>
              {phase === "running" ? (
                <span>Difficulty ladder: {ladderDifficulty.toUpperCase()}</span>
              ) : (
                <span>Available questions: {sessionQuestions.length}</span>
              )}
            </div>
            <Progress value={Math.max(0, Math.min(100, progress))} className="h-2" />
          </div>

          {phase === "idle" && (
            <Card>
              <CardHeader>
                <CardTitle>Start a Blitz</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium mb-2">Duration</div>
                    <div className="flex flex-wrap gap-2">
                      {DURATION_CHOICES.map((s) => (
                        <Chip
                          key={s}
                          variant={durationSeconds === s ? "selected" : "default"}
                          onClick={() => setDurationSeconds(s)}
                        >
                          {s}s
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Strikes</div>
                    <div className="flex flex-wrap gap-2">
                      {STRIKE_CHOICES.map((n) => (
                        <Chip
                          key={n}
                          variant={maxStrikes === n ? "selected" : "default"}
                          onClick={() => setMaxStrikes(n)}
                        >
                          {n}
                        </Chip>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-sm font-medium mb-2">Subjects</div>
                    <div className="flex flex-wrap gap-2">
                      {(["MATH", "ELA"] as const).map((subj) => {
                        const active = selectedSubjects.includes(subj);
                        return (
                          <Chip
                            key={subj}
                            variant={active ? "selected" : subj === "MATH" ? "math" : "ela"}
                            onClick={() => {
                              setSelectedSubjects((prev) => {
                                const next = prev.includes(subj)
                                  ? prev.filter((s) => s !== subj)
                                  : [...prev, subj];
                                return next.length === 0 ? [...prev] : next;
                              });
                            }}
                          >
                            {subj}
                          </Chip>
                        );
                      })}
                    </div>
                    {selectedSubjects.length === 0 ? (
                      <p className="text-xs text-muted-foreground mt-2">
                        Select at least one subject.
                      </p>
                    ) : null}
                    <p className="text-xs text-muted-foreground mt-2">
                      Available questions: {sessionQuestions.length}
                    </p>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-1">
                  <p>
                    - Duration: <span className="font-medium text-foreground">{durationSeconds} seconds</span>
                  </p>
                  <p>
                    - Strikes: <span className="font-medium text-foreground">{maxStrikes}</span> (session ends on the last miss)
                  </p>
                  <p>
                    - Time bonus: fast correct answers add a small bonus to the clock
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button onClick={startSession} disabled={sessionQuestions.length === 0}>
                    Start Blitz
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {phase === "running" && currentQuestion && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={currentQuestion.subject === "MATH" ? "default" : "secondary"}>
                      {currentQuestion.subject}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor:
                          currentQuestion.difficulty === "easy"
                            ? `hsl(var(--difficulty-easy))`
                            : currentQuestion.difficulty === "medium"
                              ? `hsl(var(--difficulty-medium))`
                              : `hsl(var(--difficulty-hard))`,
                      }}
                    >
                      {currentQuestion.difficulty.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {currentQuestion.subtype}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Answered: {answeredCount} • Correct: {correctCount}
                  </div>
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
                    {feedback.correct ? (
                      <span>
                        Correct{feedback.bonusSeconds > 0 ? ` (+${feedback.bonusSeconds}s)` : ""}.
                      </span>
                    ) : (
                      <span>Incorrect. Strike added.</span>
                    )}
                  </div>
                )}

                {renderQuestionBody(currentQuestion)}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-muted-foreground">
                    Tip: faster correct answers earn more bonus time.
                  </div>
                  <Button
                    onClick={submitAnswer}
                    disabled={
                      !canSubmitQuestionAnswer(currentQuestion, answers[currentQuestion.id]) ||
                      Boolean(feedback)
                    }
                  >
                    Submit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {phase === "countdown" && currentQuestion && (
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Badge variant={currentQuestion.subject === "MATH" ? "default" : "secondary"}>
                      {currentQuestion.subject}
                    </Badge>
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor:
                          currentQuestion.difficulty === "easy"
                            ? `hsl(var(--difficulty-easy))`
                            : currentQuestion.difficulty === "medium"
                              ? `hsl(var(--difficulty-medium))`
                              : `hsl(var(--difficulty-hard))`,
                      }}
                    >
                      {currentQuestion.difficulty.toUpperCase()}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {currentQuestion.subtype}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    Starting in {countdownLeft || "Go"}…
                  </div>
                </div>
              </CardHeader>
              <CardContent className="relative space-y-6">
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-md bg-background/80 backdrop-blur-sm">
                  <div className="text-center">
                    <div className="text-5xl font-extrabold tracking-tight">
                      {countdownLeft > 0 ? countdownLeft : "GO"}
                    </div>
                    <div className="mt-2 text-sm text-muted-foreground">
                      Get Ready!
                    </div>
                  </div>
                </div>

                {renderQuestionBody(currentQuestion)}

                <div className="flex items-center justify-between gap-3 pt-2">
                  <div className="text-xs text-muted-foreground">Warm start enabled.</div>
                  <Button disabled>Submit</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {phase === "ended" && (
            <SessionResultsDashboard
              title="Blitz Complete"
              events={analyticsEvents}
              summaryMetrics={[
                { label: "Questions answered", value: answeredCount },
                { label: "Correct", value: correctCount },
                {
                  label: "Accuracy",
                  value: `${analyticsEvents.length ? Math.round((correctCount / analyticsEvents.length) * 100) : 0}%`,
                },
                { label: "Strikes used", value: strikes },
              ]}
              footnote="Charts reflect each graded attempt in this Blitz run."
              footerActions={<Button onClick={startSession}>Play again</Button>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

