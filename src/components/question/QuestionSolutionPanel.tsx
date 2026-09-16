import { CheckCircle, Lightbulb, Target, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { CommonTrapCallout } from "@/components/question/CommonTrapCallout";
import {
  formatChoiceLabels,
  getQuestionSolutionExplanation,
  getSkillTagsToImprove,
  questionHasExplanationContent,
} from "@/lib/questionExplanation";
import type { Choice, Question } from "@/types";
import { cn } from "@/lib/utils";

type QuestionSolutionPanelProps = {
  question: Question;
  /** When set, shows a Correct / Incorrect header. Omit for review-only panels. */
  isCorrect?: boolean;
  showHeader?: boolean;
  selectedChoiceIds?: string[];
  className?: string;
};

function ChoiceBreakdownCard({
  choice,
  selected,
}: {
  choice: Choice;
  selected: boolean;
}) {
  const explanation = choice.explanation?.trim();
  const correct = choice.isCorrect;

  return (
    <div
      className={cn(
        "rounded-lg border px-4 py-3",
        correct
          ? "border-success/40 bg-success/5"
          : selected
            ? "border-destructive/40 bg-destructive/5"
            : "border-border bg-muted/40",
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "inline-flex h-6 min-w-6 items-center justify-center rounded-md px-1.5 text-xs font-semibold",
            correct
              ? "bg-success text-success-foreground"
              : selected
                ? "bg-destructive text-destructive-foreground"
                : "bg-muted-foreground/20 text-foreground",
          )}
        >
          {choice.label}
        </span>
        {correct ? (
          <Badge variant="outline" className="border-success/40 text-success">
            Correct
          </Badge>
        ) : selected ? (
          <Badge variant="outline" className="border-destructive/40 text-destructive">
            Your answer
          </Badge>
        ) : null}
      </div>
      {explanation ? (
        <p className="text-sm leading-relaxed text-foreground/90">{explanation}</p>
      ) : (
        <p className="text-sm italic text-muted-foreground">
          {correct ? "This is the correct choice." : "This choice is incorrect."}
        </p>
      )}
    </div>
  );
}

export function QuestionSolutionPanel({
  question,
  isCorrect,
  showHeader = true,
  selectedChoiceIds = [],
  className = "",
}: QuestionSolutionPanelProps) {
  const solutionText = getQuestionSolutionExplanation(question);
  const commonTrap = question.commonTrap?.trim();
  const skills = getSkillTagsToImprove(question);
  const choices = question.choices ?? [];
  const correctChoices = choices.filter((choice) => choice.isCorrect);
  const incorrectChoices = choices.filter((choice) => !choice.isCorrect);
  const hasChoiceExplanations = choices.some((choice) => choice.explanation?.trim());
  const selectedSet = new Set(selectedChoiceIds);
  const selectedLabels = formatChoiceLabels(question, selectedChoiceIds);
  const correctLabels = formatChoiceLabels(
    question,
    correctChoices.map((choice) => choice.id),
  );

  if (!questionHasExplanationContent(question) && choices.length === 0) {
    return null;
  }

  const headerLabel =
    isCorrect === undefined ? "Explanation" : isCorrect ? "Correct!" : "Not quite";

  return (
    <div className={cn("space-y-4 border-t pt-6", className)}>
      {showHeader && (
        <div className="space-y-1">
          <h4 className="flex items-center gap-2 font-semibold">
            {isCorrect === undefined ? null : isCorrect ? (
              <CheckCircle className="h-5 w-5 text-success" aria-hidden />
            ) : (
              <XCircle className="h-5 w-5 text-destructive" aria-hidden />
            )}
            {headerLabel}
          </h4>
          {choices.length > 0 && (selectedLabels || correctLabels) ? (
            <p className="text-sm text-muted-foreground">
              {selectedLabels ? <>You chose {selectedLabels}. </> : null}
              {correctLabels ? <>Correct answer: {correctLabels}</> : null}
            </p>
          ) : null}
        </div>
      )}

      {solutionText ? (
        <section className="space-y-2">
          <h5 className="flex items-center gap-2 text-sm font-semibold">
            <Lightbulb className="h-4 w-4 text-primary" aria-hidden />
            How to solve it
          </h5>
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
            {solutionText}
          </p>
        </section>
      ) : null}

      {hasChoiceExplanations && correctChoices.length > 0 ? (
        <section className="space-y-2">
          <h5 className="text-sm font-semibold">
            {correctChoices.length === 1
              ? `Why ${correctChoices[0].label} is correct`
              : "Why the correct answers work"}
          </h5>
          <div className="space-y-2">
            {correctChoices.map((choice) => (
              <ChoiceBreakdownCard
                key={choice.id}
                choice={choice}
                selected={selectedSet.has(choice.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {hasChoiceExplanations && incorrectChoices.length > 0 ? (
        <section className="space-y-2">
          <h5 className="text-sm font-semibold">Why the other choices are wrong</h5>
          <div className="space-y-2">
            {incorrectChoices.map((choice) => (
              <ChoiceBreakdownCard
                key={choice.id}
                choice={choice}
                selected={selectedSet.has(choice.id)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {commonTrap ? <CommonTrapCallout commonTrap={commonTrap} /> : null}

      {skills.length > 0 ? (
        <section className="space-y-2">
          <h5 className="flex items-center gap-2 text-sm font-semibold">
            <Target className="h-4 w-4 text-primary" aria-hidden />
            Skill to improve
          </h5>
          <div className="flex flex-wrap gap-2">
            {skills.map((skill) => (
              <Badge key={skill.code} variant="secondary">
                {skill.label}
              </Badge>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}