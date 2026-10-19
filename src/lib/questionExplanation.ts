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

/** Trailing A–D (or E–H) on a stored choice id, including revised ids like MATH-ALG-114-v2-c. */
function choiceLetterFromStoredId(id: string): string | undefined {
  const match = id.trim().match(/(?:-v\d+)?-([A-Ha-h])$/);
  return match ? match[1].toUpperCase() : undefined;
}

function resolveOneChoiceId(
  choices: NonNullable<Question["choices"]>,
  raw: string,
): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;

  const exact = choices.find((choice) => choice.id === trimmed);
  if (exact) return exact.id;

  const asLabel = trimmed.replace(/\.$/, "").toUpperCase();
  if (/^[A-H]$/.test(asLabel)) {
    const byLabel = choices.find((choice) => choice.label.toUpperCase() === asLabel);
    if (byLabel) return byLabel.id;
  }

  const letter = choiceLetterFromStoredId(trimmed);
  if (letter) {
    const byLetter = choices.find(
      (choice) =>
        choice.label.toUpperCase() === letter || choiceLetterFromStoredId(choice.id) === letter,
    );
    if (byLetter) return byLetter.id;
  }

  const byText = choices.find((choice) => choice.text.trim() === trimmed);
  return byText?.id;
}

export function getSelectedChoiceIds(question: Question, rawAnswer?: string): string[] {
  if (!rawAnswer || !question.choices?.length) return [];
  if (isIndyCheckboxMultiSubtype(question.subtype)) {
    return parseAtaAnswer(rawAnswer)
      .map((id) => resolveOneChoiceId(question.choices!, id))
      .filter((id): id is string => Boolean(id));
  }
  const resolved = resolveOneChoiceId(question.choices, rawAnswer);
  return resolved ? [resolved] : [];
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
