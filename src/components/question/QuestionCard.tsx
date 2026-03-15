import { Question } from "@/types";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Chip } from "@/components/ui/chip";
import { Button } from "@/components/ui/button";
import { Clock, BookOpen, CheckCircle, XCircle, Bookmark } from "lucide-react";
import { Link } from "react-router-dom";

interface QuestionCardProps {
  question: Question;
}

export const QuestionCard = ({ question }: QuestionCardProps) => {
  const subjectVariant = question.subject === 'MATH' ? 'math' : 'ela';

  const formatTime = (seconds?: number) => {
    if (!seconds) return "N/A";
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="group relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      {/* Status indicators */}
      <div className="absolute top-3 right-3 flex gap-1">
        {question.userBookmarked && (
          <div className="rounded-full bg-warning p-1">
            <Bookmark className="h-3 w-3 text-white fill-white" />
          </div>
        )}
        {question.userAttempted && (
          <div className={`rounded-full p-1 ${question.userCorrect ? 'bg-success' : 'bg-destructive'}`}>
            {question.userCorrect ? 
              <CheckCircle className="h-3 w-3 text-white" /> : 
              <XCircle className="h-3 w-3 text-white" />
            }
          </div>
        )}
      </div>

      <CardContent className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <Chip variant={subjectVariant} size="sm">
              {question.subject}
            </Chip>
            <div 
              className={`flex h-5 w-5 items-center justify-center rounded-full text-xs font-bold text-white`}
              style={{ backgroundColor: `hsl(var(--score-band-${question.scoreBand}))` }}
              title={`Score Band ${question.scoreBand}`}
            >
              {question.scoreBand}
            </div>
          </div>
        </div>

        {/* Question stem preview */}
        <p className="text-sm text-foreground leading-relaxed mb-3 line-clamp-3">
          {question.stem}
        </p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-3">
          {question.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} variant="outline" className="text-xs">
              {tag.label}
            </Badge>
          ))}
          {question.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{question.tags.length - 3} more
            </Badge>
          )}
        </div>

        {/* Metadata */}
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span>{formatTime(question.timeToSolve)}</span>
          </div>
          {question.passageId && (
            <div className="flex items-center gap-1">
              <BookOpen className="h-3 w-3" />
              <span>Passage</span>
            </div>
          )}
          <Badge variant="outline" className="text-xs">
            {question.subtype}
          </Badge>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild size="sm" className="w-full" variant={subjectVariant === 'math' ? 'default' : 'default'}>
          <Link to={`/question/${question.id}?practice=true`}>Practice</Link>
        </Button>
      </CardFooter>
    </Card>
  );
};