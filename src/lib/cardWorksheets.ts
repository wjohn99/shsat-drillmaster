/** Worksheet assignment ids pinned to a workspace card, oldest first. */
export function worksheetIdsOnCard(card: {
  assignmentId?: string | null;
  assignmentIds?: readonly string[] | null;
}): string[] {
  const ids: string[] = [];
  const seen = new Set<string>();
  const push = (id: unknown) => {
    if (typeof id !== "string" || !id || seen.has(id)) return;
    seen.add(id);
    ids.push(id);
  };
  if (Array.isArray(card.assignmentIds)) {
    for (const id of card.assignmentIds) push(id);
  }
  push(card.assignmentId);
  return ids;
}

/** Add a worksheet without dropping the ones already on the card. */
export function worksheetIdsAfterLink(existing: readonly string[], assignmentId: string): string[] {
  if (!assignmentId || existing.includes(assignmentId)) return [...existing];
  return [...existing, assignmentId];
}
