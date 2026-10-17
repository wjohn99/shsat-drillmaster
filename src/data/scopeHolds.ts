/**
 * Current-product audience holds (content/scope/grade8-holds.json).
 *
 * The current product serves Grade 8 test takers seeking Grade 9 entry. A held version is
 * mathematically valid but out of that scope. It is excluded from every current pool
 * (practice, bank, worksheets, Blitz, assigned sets, diagnostic) and kept in source for a
 * possible future Grade 9 test-taker product. A hold clears only for a revision whose
 * contentVersion is at least `clearedByContentVersion`.
 */
import type { ContentTrack, Question, ScopeHold } from "@/types";

export interface ScopeHoldEntry {
  id: string;
  track: ContentTrack;
  reason: string;
  evidence: string;
  /** Null: every version is held. Number: versions at or above it are in scope. */
  clearedByContentVersion: number | null;
}

interface HoldsFile {
  audience: "grade8";
  description: string;
  holds: ScopeHoldEntry[];
}

const holdsModules = import.meta.glob("../../content/scope/grade8-holds.json", { eager: true }) as Record<
  string,
  HoldsFile | { default: HoldsFile }
>;

function loadHoldsFile(): HoldsFile {
  const mod = Object.values(holdsModules)[0];
  if (!mod) return { audience: "grade8", description: "", holds: [] };
  return "default" in mod && mod.default ? mod.default : (mod as HoldsFile);
}

const file = loadHoldsFile();

export const GRADE8_SCOPE_HOLDS: readonly ScopeHoldEntry[] = file.holds;

const holdsByKey = new Map(file.holds.map((entry) => [`${entry.track}:${entry.id}`, entry]));

export function scopeHoldEntry(id: string, track: ContentTrack): ScopeHoldEntry | undefined {
  return holdsByKey.get(`${track}:${id}`);
}

/** The hold that applies to this exact version, if any. */
export function scopeHoldFor(question: Question, track: ContentTrack): ScopeHold | undefined {
  const entry = scopeHoldEntry(question.id, track);
  if (!entry) return undefined;
  const version = question.contentVersion ?? 1;
  if (entry.clearedByContentVersion !== null && version >= entry.clearedByContentVersion) {
    return undefined;
  }
  return { audience: "grade8", reason: entry.reason };
}

/** Attach `scopeHold` to held versions. Does not drop anything. */
export function annotateScopeHolds(questions: Question[], track: ContentTrack): Question[] {
  return questions.map((question) => {
    const hold = scopeHoldFor(question, track);
    if (hold) return { ...question, scopeHold: hold };
    if (!question.scopeHold) return question;
    const { scopeHold: _drop, ...rest } = question;
    return rest;
  });
}

export function isHeldFromCurrentProduct(question: Question): boolean {
  return Boolean(question.scopeHold);
}
