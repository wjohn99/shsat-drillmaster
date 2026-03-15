import { useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  ArrowLeft, 
  ArrowRight, 
  Clock, 
  Flag, 
  CheckCircle, 
  XCircle,
  RotateCcw
} from "lucide-react";
import { getFilteredQuestions } from "@/data/mockData";
import { Question } from "@/types";

export default function QuestionSet() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  // Get questions based on URL parameters
  const filters = {
    subjects: searchParams.get('subjects')?.split(',') || [],
    scoreBands: searchParams.get('scoreBands')?.split(',').map(Number) || [],
    tagCodes: searchParams.get('tagCodes')?.split(',') || []
  };
  
  const questions = getFilteredQuestions(filters).slice(0, 20); // Limit to 20 questions per set
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [showResults, setShowResults] = useState(false);

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-8 text-center">
          <h1 className="text-2xl font-bold mb-4">No Questions Found</h1>
          <p className="text-muted-foreground mb-6">
            Try adjusting your filters to find questions.
          </p>
          <Button onClick={() => navigate('/question-bank')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Question Bank
          </Button>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const toggleFlag = (questionId: string) => {
    setFlaggedQuestions(prev => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const goToQuestion = (index: number) => {
    setCurrentQuestionIndex(index);
  };

  const nextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const prevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const getQuestionStatus = (question: Question) => {
    const isAnswered = answers[question.id];
    const isFlagged = flaggedQuestions.has(question.id);
    
    if (isFlagged) return 'flagged';
    if (isAnswered) return 'answered';
    return 'unanswered';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'answered': return 'bg-success text-white';
      case 'flagged': return 'bg-warning text-white';
      case 'current': return 'bg-primary text-white';
      default: return 'bg-background border border-border text-foreground hover:bg-accent';
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button variant="ghost" onClick={() => navigate('/question-bank')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Exit Practice
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Practice Set</h1>
              <p className="text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="font-mono">15:32</span>
            </div>
            <Button
              variant="outline"
              onClick={() => toggleFlag(currentQuestion.id)}
              className={flaggedQuestions.has(currentQuestion.id) ? 'bg-warning text-white' : ''}
            >
              <Flag className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <div className="grid lg:grid-cols-4 gap-6">
          {/* Question Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={currentQuestion.subject === 'MATH' ? 'default' : 'secondary'}>
                      {currentQuestion.subject}
                    </Badge>
                    <div 
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: `hsl(var(--score-band-${currentQuestion.scoreBand}))` }}
                    >
                      {currentQuestion.scoreBand}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Question #{currentQuestionIndex + 1}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Question stem */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-base leading-relaxed">{currentQuestion.stem}</p>
                </div>

                {/* Answer choices */}
                {currentQuestion.choices && (
                  <div className="space-y-3">
                    <RadioGroup 
                      value={answers[currentQuestion.id] || ""} 
                      onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                    >
                      {currentQuestion.choices.map((choice) => (
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
                {currentQuestion.subtype === 'GRID_IN' && (
                  <div className="space-y-3">
                    <Label htmlFor="grid-answer">Enter your answer:</Label>
                    <Input
                      id="grid-answer"
                      value={answers[currentQuestion.id] || ""}
                      onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                      placeholder="Enter fraction or decimal"
                      className="max-w-md"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Navigation */}
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline" 
                onClick={prevQuestion}
                disabled={currentQuestionIndex === 0}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Previous
              </Button>
              
              <Button 
                onClick={nextQuestion}
                disabled={currentQuestionIndex === questions.length - 1}
              >
                Next
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Question Navigator */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Question Navigator</CardTitle>
                <div className="flex items-center gap-4 text-xs">
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-success"></div>
                    <span>Answered</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-3 h-3 rounded bg-warning"></div>
                    <span>Flagged</span>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="grid grid-cols-5 gap-2">
                  {questions.map((question, index) => {
                    const status = index === currentQuestionIndex ? 'current' : getQuestionStatus(question);
                    return (
                      <button
                        key={question.id}
                        onClick={() => goToQuestion(index)}
                        className={`
                          h-8 w-8 rounded text-xs font-medium transition-all
                          ${getStatusColor(status)}
                        `}
                      >
                        {index + 1}
                      </button>
                    );
                  })}
                </div>
                
                <div className="mt-6 space-y-3">
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span>Answered:</span>
                      <span>{Object.keys(answers).length}/{questions.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Flagged:</span>
                      <span>{flaggedQuestions.size}</span>
                    </div>
                  </div>
                  
                  <Button className="w-full" size="sm">
                    Submit Practice Set
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}