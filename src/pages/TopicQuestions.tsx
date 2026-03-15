import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Clock, BookOpen } from "lucide-react";
import { navigationData, getQuestionsForTopic } from "@/data/navigationData";
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
          {questions.map((question, index) => (
            <Card key={question.id} className="w-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <Badge variant={question.subject === 'MATH' ? 'default' : 'secondary'}>
                      {question.subject}
                    </Badge>
                    <Badge variant="outline">{question.difficulty}</Badge>
                    <div 
                      className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white"
                      style={{ backgroundColor: `hsl(var(--score-band-${question.scoreBand}))` }}
                    >
                      {question.scoreBand}
                    </div>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Question #{index + 1}
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-6">
                {/* Question stem */}
                <div className="prose prose-sm max-w-none">
                  <p className="text-base leading-relaxed">{question.stem}</p>
                </div>

                {/* Answer choices */}
                {question.choices && (
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
          ))}
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