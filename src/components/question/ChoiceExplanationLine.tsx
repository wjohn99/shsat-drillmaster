import type { Choice } from "@/types";

type ChoiceExplanationLineProps = {
  choice: Choice;
  showSolution: boolean;
};

export function ChoiceExplanationLine({ choice, showSolution }: ChoiceExplanationLineProps) {
  if (!showSolution || !choice.explanation?.trim()) {
    return null;
  }

  return (
    <p
      className={`ml-7 border-l-2 pl-3 text-xs leading-relaxed ${
        choice.isCorrect
          ? "border-success/50 text-success/90"
          : "border-muted-foreground/30 text-muted-foreground"
      }`}
    >
      {choice.explanation}
    </p>
  );
}
