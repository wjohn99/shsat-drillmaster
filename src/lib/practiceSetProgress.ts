export const PRACTICE_SET_TYPE_IDS = [
  "reading-comprehension",
  "revising-editing-a",
  "revising-editing-b",
  "math",
] as const;

export type PracticeSetTypeId = (typeof PRACTICE_SET_TYPE_IDS)[number];

export function isPracticeSetType(value: string | null | undefined): value is PracticeSetTypeId {
  return PRACTICE_SET_TYPE_IDS.includes(value as PracticeSetTypeId);
}

export function practiceSetScopeId(type: PracticeSetTypeId): string {
  return `practice-set:${type}`;
}

export function practiceSetTypeFromScopeId(scopeId: string): PracticeSetTypeId | null {
  const prefix = "practice-set:";
  if (!scopeId.startsWith(prefix)) return null;
  return isPracticeSetType(scopeId.slice(prefix.length)) ? (scopeId.slice(prefix.length) as PracticeSetTypeId) : null;
}

export function unfinishedSetLabel(index: number, total: number): string {
  const count = Math.max(total, 1);
  const current = Math.min(Math.max(index, 0) + 1, count);
  return `Unfinished set, question ${current} of ${count}.`;
}

/** Resume only when every saved question is still in the bank, in the saved order. */
export function restoredPracticeQuestions<T>(savedIds: string[], byId: Map<string, T>): T[] | null {
  if (savedIds.length === 0) return null;
  const restored: T[] = [];
  for (const id of savedIds) {
    const question = byId.get(id);
    if (!question) return null;
    restored.push(question);
  }
  return restored;
}
