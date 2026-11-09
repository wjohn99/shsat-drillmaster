export function diagnosticSubmitCheckLine(unanswered: number, flagged: number): string {
  const unansweredPart = unanswered === 0 ? "No unanswered questions" : `${unanswered} unanswered`;
  const flaggedPart = flagged === 0 ? "none flagged" : `${flagged} flagged`;
  return `${unansweredPart}, ${flaggedPart}.`;
}

export function missedQuestionIds(events: { questionId: string; correct: boolean }[]): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  for (const event of events) {
    if (event.correct || seen.has(event.questionId)) continue;
    seen.add(event.questionId);
    ids.push(event.questionId);
  }
  return ids;
}

export function practiceMissedQuestionsHref(ids: string[]): string {
  const params = new URLSearchParams();
  params.set("questionIds", ids.join(","));
  return `/practice-set?${params.toString()}`;
}

export function practiceMissedQuestionsLabel(count: number): string {
  return count === 1 ? "Practice 1 missed question" : `Practice ${count} missed questions`;
}
