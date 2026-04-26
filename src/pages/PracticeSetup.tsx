import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { 
  Play, 
  Settings, 
  ArrowRight,
  BookOpen,
  Brain,
  Target
} from "lucide-react";
import { Difficulty, Subject } from "@/types";
import { allTags, getFilteredQuestions } from "@/data/mockData";

export default function PracticeSetup() {
  const navigate = useNavigate();
  
  const [selectedSubjects, setSelectedSubjects] = useState<Subject[]>([]);
  const [selectedDifficulties, setSelectedDifficulties] = useState<Difficulty[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [questionsCount, setQuestionsCount] = useState(20);
  const [timedMode, setTimedMode] = useState(true);

  const subjects: Subject[] = ['MATH', 'ELA'];
  const difficulties: Difficulty[] = ['easy', 'medium', 'hard'];

  const toggleArraySelection = <T,>(array: T[], setArray: (arr: T[]) => void, item: T) => {
    if (array.includes(item)) {
      setArray(array.filter(i => i !== item));
    } else {
      setArray([...array, item]);
    }
  };

  const getAvailableQuestions = () => {
    return getFilteredQuestions({
      subjects: selectedSubjects,
      difficulties: selectedDifficulties,
      tagCodes: selectedTags
    });
  };

  const availableQuestions = getAvailableQuestions();

  const startPractice = () => {
    const params = new URLSearchParams();
    if (selectedSubjects.length > 0) params.set('subjects', selectedSubjects.join(','));
    if (selectedDifficulties.length > 0) params.set('difficulties', selectedDifficulties.join(','));
    if (selectedTags.length > 0) params.set('tagCodes', selectedTags.join(','));
    params.set('count', questionsCount.toString());
    params.set('timed', timedMode.toString());
    
    navigate(`/practice-set?${params.toString()}`);
  };

  const elaTags = allTags.filter(tag => tag.domain === 'ELA');
  const mathTags = allTags.filter(tag => tag.domain === 'MATH');

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <div className="container py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold mb-2">Create Practice Set</h1>
            <p className="text-muted-foreground">
              Customize your practice session with targeted questions
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {/* Settings Panel */}
            <div className="lg:col-span-2 space-y-6">
              {/* Subject Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Subject
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {subjects.map((subject) => (
                      <Chip
                        key={subject}
                        variant={
                          selectedSubjects.includes(subject)
                            ? "selected"
                            : subject === "MATH"
                              ? "math"
                              : "ela"
                        }
                        onClick={() => toggleArraySelection(selectedSubjects, setSelectedSubjects, subject)}
                        className="flex-1 justify-center"
                      >
                        {subject}
                      </Chip>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Difficulty Selection */}
              <Card>
                <CardHeader>
                  <CardTitle>Difficulty</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Select easy, medium, and/or hard questions
                  </p>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-3">
                    {difficulties.map((d) => {
                      const label = d === 'easy' ? 'Easy' : d === 'medium' ? 'Medium' : 'Hard';
                      const bg =
                        d === 'easy'
                          ? `hsl(var(--difficulty-easy))`
                          : d === 'medium'
                            ? `hsl(var(--difficulty-medium))`
                            : `hsl(var(--difficulty-hard))`;
                      return (
                        <button
                          key={d}
                          onClick={() => toggleArraySelection(selectedDifficulties, setSelectedDifficulties, d)}
                          className={`
                            flex-1 h-12 rounded-full text-sm font-bold text-white transition-all
                            ${selectedDifficulties.includes(d) ? 'ring-2 ring-ring ring-offset-2 scale-[1.02]' : 'hover:opacity-90'}
                          `}
                          style={{ backgroundColor: bg }}
                        >
                          {label}
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Topic Tags */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    Topics (Optional)
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Focus on specific skills and concepts
                  </p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* ELA Tags */}
                  {selectedSubjects.includes('ELA') && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">ELA Skills</Label>
                      <div className="flex flex-wrap gap-2">
                        {elaTags.map((tag) => (
                          <Chip
                            key={tag.id}
                            variant={selectedTags.includes(tag.code) ? "selected" : "ela"}
                            size="sm"
                            onClick={() => toggleArraySelection(selectedTags, setSelectedTags, tag.code)}
                          >
                            {tag.label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Math Tags */}
                  {selectedSubjects.includes('MATH') && (
                    <div>
                      <Label className="text-sm font-medium mb-2 block">Math Skills</Label>
                      <div className="flex flex-wrap gap-2">
                        {mathTags.map((tag) => (
                          <Chip
                            key={tag.id}
                            variant={selectedTags.includes(tag.code) ? "selected" : "math"}
                            size="sm"
                            onClick={() => toggleArraySelection(selectedTags, setSelectedTags, tag.code)}
                          >
                            {tag.label}
                          </Chip>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Practice Settings */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Practice Settings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Timed Practice</Label>
                      <p className="text-xs text-muted-foreground">Track time and get pacing feedback</p>
                    </div>
                    <Switch
                      checked={timedMode}
                      onCheckedChange={setTimedMode}
                    />
                  </div>
                  
                  <Separator />
                  
                  <div>
                    <Label className="text-sm font-medium mb-2 block">
                      Questions in Set: {questionsCount}
                    </Label>
                    <div className="flex gap-2">
                      {[10, 20, 30, 50].map((count) => (
                        <Chip
                          key={count}
                          variant={questionsCount === count ? "selected" : "default"}
                          size="sm"
                          onClick={() => setQuestionsCount(count)}
                        >
                          {count}
                        </Chip>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              <Card className="sticky top-6">
                <CardHeader>
                  <CardTitle>Practice Preview</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary mb-2">
                      {Math.min(availableQuestions.length, questionsCount)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      questions available
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span>Subjects:</span>
                      <span>
                        {selectedSubjects.length === 0 ? 'All' : selectedSubjects.join(', ')}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Est. Time:</span>
                      <span>{Math.round(questionsCount * 1.5)} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Mode:</span>
                      <span>{timedMode ? 'Timed' : 'Untimed'}</span>
                    </div>
                  </div>

                  <Separator />

                  {availableQuestions.length < questionsCount && (
                    <div className="text-xs text-warning bg-warning/10 p-2 rounded">
                      Only {availableQuestions.length} questions match your criteria
                    </div>
                  )}

                  <Button 
                    className="w-full" 
                    onClick={startPractice}
                    disabled={availableQuestions.length === 0}
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Start Practice
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>

                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => navigate('/question-bank')}
                  >
                    Browse Individual Questions
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}