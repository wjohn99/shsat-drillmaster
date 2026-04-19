import type { Choice } from "@/types";

/** Checkbox multi-select UIs (ATA = “select all that apply”; MS = exactly N). */
export function isIndyCheckboxMultiSubtype(subtype: string): boolean {
  return subtype === "INDY-ATA" || subtype === "INDY-MS";
}

/** All-or-nothing: selected set must exactly match the set of correct choice ids. */
export function isAtaAnswerCorrect(choices: Choice[], selectedIds: string[]): boolean {
  const correct = choices.filter((c) => c.isCorrect).map((c) => c.id).sort();
  const sel = [...selectedIds].sort();
  if (correct.length !== sel.length) return false;
  return correct.every((id, i) => id === sel[i]);
}

export function parseAtaAnswer(stored: string | undefined): string[] {
  if (!stored) return [];
  return stored.split(",").filter(Boolean);
}

export function serializeAtaAnswer(ids: string[]): string {
  return [...ids].sort().join(",");
}
