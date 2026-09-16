import type { Question } from "@/types";
import { isIndyCheckboxMultiSubtype, parseAtaAnswer } from "@/lib/indyAta";
import { isFormatTagCode } from "@/data/taggingScheme";

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

export function getSelectedChoiceIds(question: Question, rawAnswer?: string): string[] {
  if (!rawAnswer || !question.choices?.length) return [];
  if (isIndyCheckboxMultiSubtype(question.subtype)) {
    const allowed = new Set(question.choices.map((choice) => choice.id));
    return parseAtaAnswer(rawAnswer).filter((id) => allowed.has(id));
  }
  return question.choices.some((choice) => choice.id === rawAnswer) ? [rawAnswer] : [];
}

export function formatChoiceLabels(question: Question, choiceIds: string[]): string {
  if (!question.choices?.length) return "";
  return choiceIds
    .map((id) => question.choices?.find((choice) => choice.id === id)?.label)
    .filter((label): label is string => Boolean(label))
    .join(", ");
}

export function getSkillTagsToImprove(question: Question) {
  return question.tags.filter((tag) => !isFormatTagCode(tag.code));
}
