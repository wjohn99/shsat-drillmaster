import type { Choice, MsSpec } from "@/types";
import { isAtaAnswerCorrect } from "@/lib/indyAta";

/** True when the student has selected exactly the required number of options. */
export function isMsSelectionCountMet(selectedIds: string[], ms: MsSpec): boolean {
  return selectedIds.length === ms.selectCount;
}

/** All-or-nothing: exactly `selectCount` selections, and they must match all correct choice ids. */
export function isMsAnswerCorrect(
  choices: Choice[],
  selectedIds: string[],
  ms: MsSpec
): boolean {
  if (!isMsSelectionCountMet(selectedIds, ms)) return false;
  return isAtaAnswerCorrect(choices, selectedIds);
}
