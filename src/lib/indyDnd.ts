import type { DndSpec } from "@/types";

export function createEmptyDndPlacements(spec: DndSpec): Record<string, string | null> {
  return Object.fromEntries(spec.zones.map((z) => [z.id, null]));
}

/** All-or-nothing: every zone must match correctMapping exactly. */
export function isDndPlacementCorrect(
  spec: DndSpec,
  placements: Record<string, string | null>
): boolean {
  for (const z of spec.zones) {
    const placed = placements[z.id];
    const expected = spec.correctMapping[z.id];
    if (placed == null || placed !== expected) return false;
  }
  return true;
}

export function allDndZonesFilled(
  spec: DndSpec,
  placements: Record<string, string | null>
): boolean {
  return spec.zones.every((z) => placements[z.id] != null && placements[z.id] !== "");
}

export function serializeDndPlacements(placements: Record<string, string | null>): string {
  return JSON.stringify(placements);
}

export function parseDndPlacements(raw: string | undefined): Record<string, string | null> {
  if (!raw) return {};
  try {
    const o = JSON.parse(raw) as Record<string, string | null>;
    return typeof o === "object" && o !== null ? o : {};
  } catch {
    return {};
  }
}

/** Merge saved placements with empty template so every zone key exists. */
export function parseDndPlacementsForQuestion(
  spec: DndSpec,
  raw: string | undefined
): Record<string, string | null> {
  return { ...createEmptyDndPlacements(spec), ...parseDndPlacements(raw) };
}
