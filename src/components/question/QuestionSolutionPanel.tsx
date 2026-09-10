import { CheckCircle, XCircle } from "lucide-react";

import { CommonTrapCallout } from "@/components/question/CommonTrapCallout";
import {
  getQuestionSolutionExplanation,
  questionHasExplanationContent,
} from "@/lib/questionExplanation";
import type { Question } from "@/types";

type QuestionSolutionPanelProps = {
  question: Question;
  /** When set, shows a Correct / Incorrect header. Omit for review-only panels. */
  isCorrect?: boolean;
  showHeader?: boolean;
  className?: string;
};

export function QuestionSolutionPanel({
  question,
  isCorrect,
  showHeader = true,
  className = "",
}: QuestionSolutionPanelProps) {
  const solutionText = getQuestionSolutionExplanation(question);
  const commonTrap = question.commonTrap?.trim();

  if (!questionHasExplanationContent(question)) {
    return null;
  }

  const headerLabel =
    isCorrect === undefined ? "Explanation" : isCorrect ? "Correct!" : "Solution";

  return (
    <div className={`space-y-4 border-t pt-6 ${className}`}>
      {showHeader && (
        <h4 className="flex items-center gap-2 font-semibold">
          {isCorrect === undefined ? null : isCorrect ? (
            <CheckCircle className="h-5 w-5 text-success" aria-hidden />
          ) : (
            <XCircle className="h-5 w-5 text-destructive" aria-hidden />
          )}
          {headerLabel}
        </h4>
      )}

      {solutionText && (
        <div className="prose prose-sm max-w-none">
          <p className="whitespace-pre-wrap leading-relaxed">{solutionText}</p>
        </div>
      )}

      {commonTrap && <CommonTrapCallout commonTrap={commonTrap} />}
    </div>
  );
}
