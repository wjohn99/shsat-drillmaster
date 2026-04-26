import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock, BookOpen } from "lucide-react";
import { navigationData, getQuestionsForTopic } from "@/data/navigationData";
import { isIndyCheckboxMultiSubtype, parseAtaAnswer, serializeAtaAnswer } from "@/lib/indyAta";
import { parseDndPlacementsForQuestion, serializeDndPlacements } from "@/lib/indyDnd";
import { DndBlock } from "@/components/question/DndBlock";
import { EquationEditorBlock } from "@/components/question/EquationEditorBlock";
import { CgtBlock } from "@/components/question/CgtBlock";
import { WpBlock } from "@/components/question/WpBlock";
import { InlineChoiceBlock } from "@/components/question/InlineChoiceBlock";
import { HotSpotBlock } from "@/components/question/HotSpotBlock";
import { GraphFigureBlock } from "@/components/question/GraphFigureBlock";
import { parseIcSelectionsForQuestion, serializeIcSelections } from "@/lib/indyIc";
import { shouldShowElaHighlighter } from "@/lib/elaHighlighter";
import { HighlightableText } from "@/components/exam/HighlightableText";
import { passages } from "@/data/mockData";
import { useState } from "react";

export default function TopicQuestions() {
  const { topicId } = useParams<{ topicId: string }>();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Record<string, string>>({});

  if (!topicId) {
    navigate('/');
    return null;
  }

  const topic = navigationData
    .flatMap(nav => nav.groups)
    .find(group => group.id === topicId);

  const questions = getQuestionsForTopic(topicId);

  if (!topic) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">Topic Not Found</h1>
          <Button onClick={() => navigate('/')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Topics
          </Button>
        </div>
      </div>
    );
  }

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const toggleAtaAnswer = (questionId: string, choiceId: string) => {
    const prev = parseAtaAnswer(answers[questionId]);
    const next = prev.includes(choiceId)
      ? prev.filter((id) => id !== choiceId)
      : [...prev, choiceId];
    handleAnswerChange(questionId, serializeAtaAnswer(next));
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Topics
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <Badge className={`text-white ${topic.color}`}>
                  {topic.questionCount}
                </Badge>
                <h1 className="text-2xl font-bold">{topic.label}</h1>
              </div>
              <p className="text-muted-foreground">
                Practice all {questions.length} questions in this topic
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{Object.keys(answers).length}/{questions.length} answered</span>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>No time limit</span>
            </div>
          </div>
        </div>

        {/* Questions */}
        <div className="space-y-8">
          {questions.map((question, index) => {
            const passage = question.passageId
              ? passages.find((p) => p.id === question.passageId)
              : null;
            const showHl = shouldShowElaHighlighter(question);
            return (
            <Card key={question.id} className="w-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={question.subject === 'MATH' ? 'default' : 'secondary'}>
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
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Question #{index + 1}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {passage && showHl && (
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
                        storageKey={`passage-${passage.id}`}
                        variant="passage"
                      />
                    </CardContent>
                  </Card>
                )}
                {passage && !showHl && (
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
                {/* Question stem */}
                {showHl && question.subtype !== "INDY-IC" ? (
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

                {question.subtype === 'INDY-CGT' && question.cgt && (
                  <CgtBlock spec={question.cgt} />
                )}

                {question.subtype === 'INDY-WP' && (
                  <WpBlock spec={question.wp ?? {}} />
                )}

                {question.subtype === 'INDY-HS' && question.hs && (
                  <HotSpotBlock
                    spec={question.hs}
                    selectedId={answers[question.id] || null}
                    onSelect={(id) => handleAnswerChange(question.id, id)}
                  />
                )}

                {question.subtype === 'INDY-GIF' && question.gif?.mode === "plotPoint" && (
                  <GraphFigureBlock
                    spec={question.gif}
                    value={answers[question.id] || null}
                    onChange={(s) => handleAnswerChange(question.id, s)}
                  />
                )}

                {/* INDY-ATA / INDY-MS */}
                {isIndyCheckboxMultiSubtype(question.subtype) && question.choices && (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {question.subtype === "INDY-MS" && question.ms
                        ? `Select exactly ${question.ms.selectCount} answer${question.ms.selectCount === 1 ? "" : "s"}.`
                        : "Select all that apply."}
                    </p>
                    {question.subtype === "INDY-MS" && question.ms?.instruction ? (
                      <p className="text-sm text-muted-foreground">{question.ms.instruction}</p>
                    ) : null}
                    {question.choices.map((choice) => {
                      const selected = parseAtaAnswer(answers[question.id]);
                      return (
                        <div key={choice.id} className="flex items-start space-x-3">
                          <Checkbox
                            id={`${question.id}-${choice.id}`}
                            checked={selected.includes(choice.id)}
                            onCheckedChange={() => toggleAtaAnswer(question.id, choice.id)}
                            className="mt-1"
                          />
                          <Label
                            htmlFor={`${question.id}-${choice.id}`}
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

                {/* INDY-DND */}
                {question.subtype === 'INDY-DND' && question.dnd && (
                  <DndBlock
                    spec={question.dnd}
                    placements={parseDndPlacementsForQuestion(question.dnd, answers[question.id])}
                    onChange={(next) =>
                      handleAnswerChange(question.id, serializeDndPlacements(next))
                    }
                  />
                )}

                {/* Single-select MCQ */}
                {question.choices && !isIndyCheckboxMultiSubtype(question.subtype) && question.subtype !== 'INDY-DND' && question.subtype !== 'INDY-EE' && question.subtype !== 'INDY-IC' && question.subtype !== 'INDY-HS' && question.subtype !== 'INDY-GIF' && (
                  <div className="space-y-3">
                    <RadioGroup 
                      value={answers[question.id] || ""} 
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    >
                      {question.choices.map((choice) => (
                        <div key={choice.id} className="flex items-start space-x-3">
                          <RadioGroupItem value={choice.id} id={choice.id} className="mt-1" />
                          <Label 
                            htmlFor={choice.id} 
                            className="flex-1 cursor-pointer text-sm leading-relaxed"
                          >
                            <span className="font-medium mr-2">{choice.label}.</span>
                            {choice.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                )}

                {/* Grid-in answer */}
                {question.subtype === 'GRID_IN' && (
                  <div className="space-y-3">
                    <Label htmlFor={`grid-answer-${question.id}`}>Enter your answer:</Label>
                    <Input
                      id={`grid-answer-${question.id}`}
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      placeholder="Enter fraction or decimal"
                      className="max-w-md"
                    />
                  </div>
                )}

                {question.subtype === 'INDY-EE' && question.ee && (
                  <EquationEditorBlock
                    key={question.id}
                    spec={question.ee}
                    value={answers[question.id] || ""}
                    onChange={(v) => handleAnswerChange(question.id, v)}
                  />
                )}

                {/* Tags */}
                <div className="flex flex-wrap gap-2 pt-2">
                  {question.tags.map((tag) => (
                    <Badge key={tag.id} variant="outline" className="text-xs">
                      {tag.label}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
            );
          })}
        </div>

        {/* Submit Button */}
        {questions.length > 0 && (
          <div className="mt-8 text-center">
            <Button size="lg" className="px-8">
              Submit All Answers ({Object.keys(answers).length}/{questions.length})
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}