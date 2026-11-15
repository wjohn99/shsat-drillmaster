/** Furthest question a student may open when skipping is off. */
export function reachedQuestionIndex(input: {
  questionIds: string[];
  currentQuestionIndex: number;
  lockedQuestionIds?: string[];
  maxReachedIndex?: number;
}): number {
  const last = Math.max(0, input.questionIds.length - 1);
  let max = Math.max(0, Math.floor(input.currentQuestionIndex) || 0);
  if (typeof input.maxReachedIndex === "number" && Number.isFinite(input.maxReachedIndex)) {
    max = Math.max(max, Math.floor(input.maxReachedIndex));
  }
  for (const id of input.lockedQuestionIds ?? []) {
    const index = input.questionIds.indexOf(id);
    if (index > max) max = index;
  }
  return Math.min(last, max);
}
