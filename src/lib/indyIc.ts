import type { IcSpec } from "@/types";

export function createEmptyIcSelections(spec: IcSpec): Record<string, string | null> {
  return Object.fromEntries(spec.slots.map((s) => [s.slotId, null]));
}

export function allIcSlotsFilled(
  spec: IcSpec,
  selections: Record<string, string | null>
): boolean {
  return spec.slots.every((s) => {
    const v = selections[s.slotId];
    return v != null && v !== "";
  });
}

/** All-or-nothing: every slot must match `correctMapping`. */
export function isIcSelectionCorrect(
  spec: IcSpec,
  selections: Record<string, string | null>
): boolean {
  for (const s of spec.slots) {
    const picked = selections[s.slotId];
    const expected = spec.correctMapping[s.slotId];
    if (picked == null || picked === "" || picked !== expected) return false;
  }
  return true;
}

export function serializeIcSelections(selections: Record<string, string | null>): string {
  return JSON.stringify(selections);
}

export function parseIcSelections(raw: string | undefined): Record<string, string | null> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, string | null>;
    return typeof o === "object" && o !== null ? o : {};
  } catch {
    return {};
  }
}

export function parseIcSelectionsForQuestion(
  spec: IcSpec,
  raw: string | undefined
): Record<string, string | null> {
  return { ...createEmptyIcSelections(spec), ...parseIcSelections(raw) };
}
