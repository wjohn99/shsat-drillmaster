import type { Question } from "@/types";

/** Resolve the primary step-by-step explanation for a question. */
export function getQuestionSolutionExplanation(question: Question): string | undefined {
  if (question.solutionExplanation?.trim()) {
    return question.solutionExplanation.trim();
  }

  switch (question.subtype) {
    case "INDY-DND":
      return question.dnd?.solutionExplanation?.trim();
    case "INDY-EE":
      return question.ee?.solutionExplanation?.trim();
    case "INDY-CGT":
      return question.cgt?.solutionExplanation?.trim();
    case "INDY-WP":
      return question.wp?.solutionExplanation?.trim();
    case "INDY-IC":
      return question.ic?.solutionExplanation?.trim();
    case "INDY-HS":
      return question.hs?.solutionExplanation?.trim();
    case "INDY-GIF":
      return question.gif?.solutionExplanation?.trim();
    case "INDY-MS":
      return question.ms?.solutionExplanation?.trim();
    default:
      return undefined;
  }
}

export function questionHasExplanationContent(question: Question): boolean {
  if (question.commonTrap?.trim()) return true;
  if (getQuestionSolutionExplanation(question)) return true;
  return Boolean(question.choices?.some((c) => c.explanation?.trim()));
}
