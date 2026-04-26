import { useState, useEffect } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  ArrowLeft, 
  Clock, 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  Bookmark, 
  BookmarkCheck,
  Play,
  StopCircle
} from "lucide-react";
import { questions, passages } from "@/data/mockData";
import { toast } from "@/hooks/use-toast";
import { isAtaAnswerCorrect, isIndyCheckboxMultiSubtype, serializeAtaAnswer } from "@/lib/indyAta";
import { isMsAnswerCorrect } from "@/lib/indyMs";
import {
  allDndZonesFilled,
  createEmptyDndPlacements,
  isDndPlacementCorrect,
  serializeDndPlacements,
} from "@/lib/indyDnd";
import {
  allIcSlotsFilled,
  createEmptyIcSelections,
  isIcSelectionCorrect,
  serializeIcSelections,
} from "@/lib/indyIc";
import { DndBlock } from "@/components/question/DndBlock";
import { EquationEditorBlock } from "@/components/question/EquationEditorBlock";
import { isEeAnswerCorrect } from "@/lib/indyEe";
import { isHsAnswerCorrect } from "@/lib/indyHs";
import { isGifAnswerCorrect } from "@/lib/indyGif";
import { CgtBlock } from "@/components/question/CgtBlock";
import { WpBlock } from "@/components/question/WpBlock";
import { InlineChoiceBlock } from "@/components/question/InlineChoiceBlock";
import { HotSpotBlock } from "@/components/question/HotSpotBlock";
import { GraphFigureBlock } from "@/components/question/GraphFigureBlock";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";

const NOTES_STORAGE_KEY = "question-notes";

export default function Question() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const isPracticeMode = searchParams.get('practice') === 'true';
  
  const [selectedAnswer, setSelectedAnswer] = useState<string>("");
  const [ataSelected, setAtaSelected] = useState<string[]>([]);
  const [dndPlacements, setDndPlacements] = useState<Record<string, string | null>>({});
  const [gridAnswer, setGridAnswer] = useState<string>("");
  const [eeAnswer, setEeAnswer] = useState<string>("");
  const [icSelections, setIcSelections] = useState<Record<string, string | null>>({});
  const [hsSelected, setHsSelected] = useState<string | null>(null);
  const [gifPlot, setGifPlot] = useState<string | null>(null);
  const [showSolution, setShowSolution] = useState(!isPracticeMode);
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [userNotes, setUserNotes] = useState("");
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(isPracticeMode);

  const question = questions.find(q => q.id === id);
  const passage = question?.passageId ? passages.find(p => p.id === question.passageId) : null;
  const currentIndex = question ? questions.findIndex(q => q.id === question.id) : -1;
  const nextQuestion = currentIndex >= 0 && currentIndex < questions.length - 1
    ? questions[currentIndex + 1]
    : null;

  useEffect(() => {
    if (question) {
      setIsBookmarked(question.userBookmarked || false);
    }
  }, [question]);

  // Load notes for this question from localStorage
  useEffect(() => {
    if (!id) return;
    try {
      const stored = localStorage.getItem(`${NOTES_STORAGE_KEY}-${id}`);
      setUserNotes(stored ?? "");
    } catch {
      setUserNotes("");
    }
  }, [id]);

  // Reset practice state when navigating between questions in practice mode
  useEffect(() => {
    if (!question) return;
    setSelectedAnswer("");
    setAtaSelected([]);
    setDndPlacements(question.dnd ? createEmptyDndPlacements(question.dnd) : {});
    setIcSelections(question.ic ? createEmptyIcSelections(question.ic) : {});
    setHsSelected(null);
    setGifPlot(null);
    setGridAnswer("");
    setEeAnswer("");
    setShowSolution(!isPracticeMode);
    setTimeElapsed(0);
    setIsTimerRunning(isPracticeMode);
  }, [question?.id, isPracticeMode]);

  // Timer effect
  useEffect(() => {
    if (!isTimerRunning) return;

    const interval = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [isTimerRunning]);

  if (!question) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Question not found</h1>
            <Button asChild>
              <Link to="/question-bank">Back to Question Bank</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const handleSubmit = () => {
    setIsTimerRunning(false);
    setShowSolution(true);
    // In a real app, this would submit to the backend
    console.log(
      'Submitted answer:',
      question.subtype === 'GRID_IN'
        ? gridAnswer
        : question.subtype === 'INDY-ATA' || question.subtype === 'INDY-MS'
          ? ataSelected
          : question.subtype === 'INDY-DND' && question.dnd
            ? serializeDndPlacements(dndPlacements)
            : question.subtype === 'INDY-EE'
              ? eeAnswer
              : question.subtype === 'INDY-IC' && question.ic
                ? serializeIcSelections(icSelections)
                : question.subtype === 'INDY-HS'
                  ? hsSelected ?? ""
                  : question.subtype === 'INDY-GIF'
                    ? gifPlot ?? ""
                    : selectedAnswer
    );
  };

  const getUserAnswer = () => {
    if (question.subtype === 'GRID_IN') return gridAnswer;
    if (question.subtype === 'INDY-ATA') {
      return ataSelected.length > 0 ? serializeAtaAnswer(ataSelected) : "";
    }
    if (question.subtype === 'INDY-MS' && question.choices) {
      const n =
        question.ms?.selectCount ?? question.choices.filter((c) => c.isCorrect).length;
      if (ataSelected.length !== n) return "";
      return serializeAtaAnswer(ataSelected);
    }
    if (question.subtype === 'INDY-DND' && question.dnd) {
      if (!allDndZonesFilled(question.dnd, dndPlacements)) return "";
      return serializeDndPlacements(dndPlacements);
    }
    if (question.subtype === 'INDY-EE') return eeAnswer.trim();
    if (question.subtype === 'INDY-IC' && question.ic) {
      if (!allIcSlotsFilled(question.ic, icSelections)) return "";
      return serializeIcSelections(icSelections);
    }
    if (question.subtype === 'INDY-HS' && question.hs) {
      return hsSelected ?? "";
    }
    if (question.subtype === 'INDY-GIF' && question.gif?.mode === "plotPoint") {
      return gifPlot ?? "";
    }
    return selectedAnswer;
  };

  const handleSaveNotes = () => {
    if (!question) return;
    try {
      localStorage.setItem(`${NOTES_STORAGE_KEY}-${question.id}`, userNotes);
      toast({
        title: "Notes saved",
        description: "Your notes have been saved for this question.",
        duration: 3000,
      });
    } catch {
      toast({ title: "Could not save notes", variant: "destructive" });
    }
  };

  const isAnswerCorrect = () => {
    if (question.subtype === 'GRID_IN') {
      return gridAnswer.toLowerCase().trim() === "9/8" || gridAnswer.toLowerCase().trim() === "1.125";
    }
    if (question.subtype === 'INDY-ATA' && question.choices) {
      return isAtaAnswerCorrect(question.choices, ataSelected);
    }
    if (question.subtype === 'INDY-MS' && question.choices) {
      const nCorrect = question.choices.filter((c) => c.isCorrect).length;
      const ms = question.ms ?? { selectCount: nCorrect };
      return isMsAnswerCorrect(question.choices, ataSelected, ms);
    }
    if (question.subtype === 'INDY-DND' && question.dnd) {
      return isDndPlacementCorrect(question.dnd, dndPlacements);
    }
    if (question.subtype === 'INDY-EE' && question.ee) {
      return isEeAnswerCorrect(question.ee, eeAnswer);
    }
    if (question.subtype === 'INDY-IC' && question.ic) {
      return isIcSelectionCorrect(question.ic, icSelections);
    }
    if (question.subtype === 'INDY-HS' && question.hs) {
      return isHsAnswerCorrect(hsSelected, question.hs.correctSpotId);
    }
    if (question.subtype === 'INDY-GIF' && question.gif) {
      return isGifAnswerCorrect(question.gif, gifPlot ?? "");
    }
    const correctChoice = question.choices?.find((c) => c.isCorrect);
    return selectedAnswer === correctChoice?.id;
  };

  const subjectVariant = question.subject === 'MATH' ? 'math' : 'ela';
  const showElaHighlighter = shouldShowElaHighlighter(question);

  const toggleAtaChoice = (choiceId: string) => {
    setAtaSelected((prev) =>
      prev.includes(choiceId) ? prev.filter((id) => id !== choiceId) : [...prev, choiceId]
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6">
        {/* Navigation */}
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" asChild>
            <Link to="/question-bank">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Bank
            </Link>
          </Button>
          
          {isPracticeMode && (
            <div className="flex items-center gap-4 ml-auto">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span className="font-mono text-lg">{formatTime(timeElapsed)}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
              >
                {isTimerRunning ? <StopCircle className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              </Button>
            </div>
          )}
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Passage (if applicable) */}
            {passage && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      {passage.title}
                    </CardTitle>
                  </div>
                  {passage.sourceMeta && (
                    <p className="text-sm text-muted-foreground">{passage.sourceMeta}</p>
                  )}
                </CardHeader>
                <CardContent>
                  {showElaHighlighter ? (
                    <HighlightableText
                      text={passage.body}
                      storageKey={`passage-${passage.id}`}
                      variant="passage"
                    />
                  ) : (
                    <div className="prose prose-sm max-w-none">
                      {passage.body.split("\n\n").map((paragraph, index) => (
                        <p key={index} className="mb-4 leading-relaxed">
                          {paragraph}
                        </p>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Question */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={subjectVariant === 'math' ? 'default' : 'secondary'}>
                      {question.subject}
                    </Badge>
                    <div
                      className="flex h-6 items-center justify-center rounded-full px-2 text-xs font-bold text-white"
                      style={{
                        backgroundColor:
                          question.difficulty === 'easy'
                            ? `hsl(var(--difficulty-easy))`
                            : question.difficulty === 'medium'
                              ? `hsl(var(--difficulty-medium))`
                              : `hsl(var(--difficulty-hard))`,
                      }}
                      title={`Difficulty: ${
                        question.difficulty === 'easy'
                          ? 'Easy'
                          : question.difficulty === 'medium'
                            ? 'Medium'
                            : 'Hard'
                      }`}
                    >
                      {question.difficulty.toUpperCase()}
                    </div>
                    <Badge variant="outline">{question.subtype}</Badge>
                  </div>
                  
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsBookmarked(!isBookmarked)}
                  >
                    {isBookmarked ? 
                      <BookmarkCheck className="h-4 w-4 text-warning" /> : 
                      <Bookmark className="h-4 w-4" />
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Question stem */}
                {showElaHighlighter && question.subtype !== "INDY-IC" ? (
                  <div className="prose prose-sm max-w-none">
                    <HighlightableText
                      text={question.stem}
                      storageKey={`stem-${question.id}`}
                      variant="stem"
                    />
                  </div>
                ) : (
                  <div className="prose prose-sm max-w-none">
                    <p className="text-base leading-relaxed">{question.stem}</p>
                  </div>
                )}

                {/* INDY-CGT — chart / graph / table + MCQ */}
                {question.subtype === 'INDY-CGT' && question.cgt && (
                  <CgtBlock spec={question.cgt} />
                )}

                {/* INDY-WP — word problem framing + MCQ */}
                {question.subtype === 'INDY-WP' && (
                  <WpBlock spec={question.wp ?? {}} />
                )}

                {/* INDY-IC — inline dropdown(s) in a sentence */}
                {question.subtype === 'INDY-IC' && question.ic && (
                  <InlineChoiceBlock
                    key={question.id}
                    spec={question.ic}
                    selections={icSelections}
                    onChange={setIcSelections}
                    disabled={showSolution}
                    showSolution={showSolution}
                  />
                )}

                {/* INDY-HS — click one region on an image */}
                {question.subtype === 'INDY-HS' && question.hs && (
                  <HotSpotBlock
                    key={question.id}
                    spec={question.hs}
                    selectedId={hsSelected}
                    onSelect={setHsSelected}
                    disabled={showSolution}
                    showSolution={showSolution}
                  />
                )}

                {/* INDY-GIF — graphing / interactive coordinate plane */}
                {question.subtype === 'INDY-GIF' &&
                  question.gif?.mode === "plotPoint" && (
                    <GraphFigureBlock
                      key={question.id}
                      spec={question.gif}
                      value={gifPlot}
                      onChange={setGifPlot}
                      disabled={showSolution}
                      showSolution={showSolution}
                    />
                  )}

                {/* INDY-ATA / INDY-MS — checkbox multi-select (all-or-nothing scoring) */}
                {isIndyCheckboxMultiSubtype(question.subtype) && question.choices && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {question.subtype === "INDY-MS" && question.ms ? (
                        <>
                          Select exactly <strong>{question.ms.selectCount}</strong>{" "}
                          {question.ms.selectCount === 1 ? "answer" : "answers"}. You earn
                          credit only if those {question.ms.selectCount} choices are{" "}
                          <em>exactly</em> the correct set (no incorrect choices, no missing
                          correct answers).
                        </>
                      ) : (
                        <>
                          Select all that apply. You earn credit only if your selection matches
                          all correct answers and includes no incorrect answers.
                        </>
                      )}
                    </p>
                    {question.subtype === "INDY-MS" && question.ms?.instruction ? (
                      <p className="text-sm text-muted-foreground">{question.ms.instruction}</p>
                    ) : null}
                    <div className="space-y-3">
                      {question.choices.map((choice) => {
                        const checked = ataSelected.includes(choice.id);
                        const showWrongPick = showSolution && checked && !choice.isCorrect;
                        const showMissed = showSolution && !checked && choice.isCorrect;
                        return (
                          <div key={choice.id} className="flex items-start space-x-3">
                            <Checkbox
                              id={choice.id}
                              checked={checked}
                              onCheckedChange={() => toggleAtaChoice(choice.id)}
                              disabled={showSolution}
                              className="mt-1"
                            />
                            <Label
                              htmlFor={choice.id}
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
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* INDY-DND — answer bank + drop box(es); spec carries instruction + layout */}
                {question.subtype === 'INDY-DND' && question.dnd && (
                  <DndBlock
                    spec={question.dnd}
                    placements={dndPlacements}
                    onChange={setDndPlacements}
                    disabled={showSolution}
                    showSolution={showSolution}
                  />
                )}

                {/* Single-select MCQ (includes INDY-CGT with table/chart) */}
                {question.choices && !isIndyCheckboxMultiSubtype(question.subtype) && question.subtype !== 'INDY-DND' && question.subtype !== 'INDY-EE' && question.subtype !== 'INDY-IC' && question.subtype !== 'INDY-HS' && question.subtype !== 'INDY-GIF' && (
                  <div className="space-y-3">
                    <RadioGroup 
                      value={selectedAnswer} 
                      onValueChange={setSelectedAnswer}
                      disabled={showSolution}
                    >
                      {question.choices.map((choice) => (
                        <div key={choice.id} className="flex items-start space-x-3">
                          <RadioGroupItem value={choice.id} id={choice.id} className="mt-1" />
                          <Label 
                            htmlFor={choice.id} 
                            className={`flex-1 cursor-pointer text-sm leading-relaxed ${
                              showSolution && choice.isCorrect ? 'text-success font-medium' : ''
                            } ${
                              showSolution && selectedAnswer === choice.id && !choice.isCorrect ? 'text-destructive' : ''
                            }`}
                          >
                            <span className="font-medium mr-2">{choice.label}.</span>
                            {choice.text}
                          </Label>
                          {showSolution && choice.isCorrect && (
                            <CheckCircle className="h-4 w-4 text-success mt-1" />
                          )}
                          {showSolution && selectedAnswer === choice.id && !choice.isCorrect && (
                            <XCircle className="h-4 w-4 text-destructive mt-1" />
                          )}
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* INDY-EE — equation editor keypad */}
                {question.subtype === 'INDY-EE' && question.ee && (
                  <EquationEditorBlock
                    key={question.id}
                    spec={question.ee}
                    value={eeAnswer}
                    onChange={setEeAnswer}
                    disabled={showSolution}
                  />
                )}

                {/* Grid-in answer */}
                {question.subtype === 'GRID_IN' && (
                  <div className="space-y-3">
                    <Label htmlFor="grid-answer">Enter your answer:</Label>
                    <Input
                      id="grid-answer"
                      value={gridAnswer}
                      onChange={(e) => setGridAnswer(e.target.value)}
                      placeholder="Enter fraction or decimal (e.g., 3/4 or 0.75)"
                      disabled={showSolution}
                      className="max-w-md"
                    />
                    {showSolution && (
                      <div className="flex items-center gap-2">
                        {isAnswerCorrect() ? (
                          <CheckCircle className="h-4 w-4 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                        <span className="text-sm">
                          {isAnswerCorrect() ? 'Correct!' : 'Incorrect. The answer is 9/8 or 1.125'}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit button */}
                {isPracticeMode && !showSolution && (
                  <Button 
                    onClick={handleSubmit}
                    disabled={!getUserAnswer()}
                    className="w-full"
                  >
                    Submit Answer
                  </Button>
                )}

                {/* Solution */}
                {showSolution && (
                  <div className="border-t pt-6">
                    <h4 className="font-semibold mb-3 flex items-center gap-2">
                      {isAnswerCorrect() ? (
                        <CheckCircle className="h-5 w-5 text-success" />
                      ) : (
                        <XCircle className="h-5 w-5 text-destructive" />
                      )}
                      {isAnswerCorrect() ? 'Correct!' : 'Solution'}
                    </h4>
                    <div className="prose prose-sm max-w-none">
                      <p>
                        {question.subtype === 'GRID_IN' 
                          ? "To solve this ratio problem, set up a proportion: 2/3 cup flour : 1/4 cup sugar = 1.5 cups flour : x cups sugar. Cross multiply: (2/3) × x = (1/4) × 1.5. Solving: x = (1/4 × 1.5) ÷ (2/3) = (3/8) ÷ (2/3) = (3/8) × (3/2) = 9/16 cups sugar."
                          : question.subtype === 'INDY-MS'
                            ? "A number is a multiple of 3 if it is divisible by 3 with no remainder: 12, 15, and 18 are multiples of 3; 20 is not. Select A, B, and C only."
                            : question.subtype === 'INDY-ATA'
                              ? "Set each factor equal to zero: x − 2 = 0 gives x = 2, and x + 3 = 0 gives x = −3. The correct selections are A and B only."
                            : question.subtype === 'INDY-DND'
                              ? "The sum of the four given numbers is 9 + 14 + 7 + 12 = 42. For the mean of five numbers to be 11, the total must be 5 × 11 = 55, so the fifth number is 55 − 42 = 13."
                              : question.subtype === 'INDY-EE' && question.ee?.solutionExplanation
                              ? question.ee.solutionExplanation
                              : question.subtype === 'INDY-CGT' && question.cgt?.solutionExplanation
                                ? question.cgt.solutionExplanation
                                : question.subtype === 'INDY-WP' && question.wp?.solutionExplanation
                                  ? question.wp.solutionExplanation
                                  : question.subtype === 'INDY-IC' && question.ic?.solutionExplanation
                                    ? question.ic.solutionExplanation
                                    : question.subtype === 'INDY-HS' && question.hs?.solutionExplanation
                                      ? question.hs.solutionExplanation
                                      : question.subtype === 'INDY-GIF' &&
                                          question.gif?.solutionExplanation
                                        ? question.gif.solutionExplanation
                                        : "This question tests your ability to identify the main cause of urban planning changes during the Industrial Revolution. The passage clearly states that 'rapid urbanization created new challenges' and 'Cities grew exponentially, often without adequate infrastructure to support their populations.'"
                        }
                      </p>
                    </div>
                  </div>
                )}

                {/* Practice navigation */}
                {isPracticeMode && nextQuestion && (
                  <div className="pt-6 border-t flex justify-end">
                    <Button
                      asChild
                    >
                      <Link to={`/question/${nextQuestion.id}?practice=true`}>
                        Next Question
                      </Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* User Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">My Notes</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add your notes about this question..."
                  value={userNotes}
                  onChange={(e) => setUserNotes(e.target.value)}
                  rows={4}
                />
                <Button className="mt-3" size="sm" onClick={handleSaveNotes}>Save Notes</Button>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Question Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Question Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Expected Time</span>
                  <span className="text-sm font-medium">{formatTime(question.timeToSolve || 0)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Question Type</span>
                  <Badge variant="outline" className="text-xs">{question.subtype}</Badge>
                </div>
                <Separator />
                <div>
                  <span className="text-sm text-muted-foreground mb-2 block">Tags</span>
                  <div className="flex flex-wrap gap-1">
                    {question.tags.map((tag) => (
                      <Badge key={tag.id} variant="outline" className="text-xs">
                        {tag.label}
                      </Badge>
                    ))}
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