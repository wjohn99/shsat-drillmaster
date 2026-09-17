import { SHSAT_DIAGNOSTIC_SPEC, type DiagnosticSubject } from "@/data/shsatDiagnosticForm";
import type { DiagnosticEndReason } from "@/types/practiceSession";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

export interface DiagnosticExamSave {
  specId: string;
  startedAt: number;
  deadlineAt: number;
  firstSection: DiagnosticSubject;
  sectionIndex: number;
  unitIndex: number;
  questionIndexInUnit: number;
  answers: Record<string, string>;
  flagged: string[];
  lockedUnitKeys: string[];
  eliminated: Record<string, string[]>;
  notepad: string;
  clockHidden: boolean;
  events: SessionAnalyticsEvent[];
}

export interface DiagnosticCompletedSave {
  specId: string;
  localId: string;
  completedAt: number;
  title: string;
  events: SessionAnalyticsEvent[];
  questionIds: string[];
  tagCodes: string[];
  firestoreId: string | null;
  endedReason?: DiagnosticEndReason;
  answers?: Record<string, string>;
  attemptNumber: number;
  isBaseline: boolean;
}

export function formatDiagnosticClock(totalSeconds: number): string {
  const clamped = Math.max(0, totalSeconds);
  const h = Math.floor(clamped / 3600);
  const m = Math.floor((clamped % 3600) / 60);
  const s = clamped % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function remainingDiagnosticSeconds(deadlineAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((deadlineAt - now) / 1000));
}

export function isDiagnosticSaveExpired(save: DiagnosticExamSave, now = Date.now()): boolean {
  return save.deadlineAt <= now;
}

function storageKey(userId: string): string {
  return `shsat-diagnostic:${SHSAT_DIAGNOSTIC_SPEC.id}:${userId}`;
}

function resultsKey(userId: string): string {
  return `shsat-diagnostic-results:${SHSAT_DIAGNOSTIC_SPEC.id}:${userId}`;
}

function newLocalId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `dx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeAttempt(raw: Partial<DiagnosticCompletedSave>, index: number): DiagnosticCompletedSave | null {
  if (!raw || raw.specId !== SHSAT_DIAGNOSTIC_SPEC.id || !Array.isArray(raw.events)) return null;
  const attemptNumber = raw.attemptNumber && raw.attemptNumber > 0 ? raw.attemptNumber : index + 1;
  return {
    specId: SHSAT_DIAGNOSTIC_SPEC.id,
    localId: raw.localId || `legacy-${raw.completedAt ?? index}`,
    completedAt: Number(raw.completedAt) || 0,
    title: raw.title || SHSAT_DIAGNOSTIC_SPEC.name,
    events: raw.events,
    questionIds: raw.questionIds ?? raw.events.map((e) => e.questionId),
    tagCodes: raw.tagCodes ?? [],
    firestoreId: raw.firestoreId ?? null,
    endedReason: raw.endedReason === "time" || raw.endedReason === "submit" ? raw.endedReason : undefined,
    answers: raw.answers,
    attemptNumber,
    isBaseline: raw.isBaseline === true || attemptNumber === 1,
  };
}

export function loadDiagnosticAttempts(userId: string): DiagnosticCompletedSave[] {
  try {
    const raw = localStorage.getItem(resultsKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DiagnosticCompletedSave | { attempts?: DiagnosticCompletedSave[] };
    const list = Array.isArray((parsed as { attempts?: DiagnosticCompletedSave[] }).attempts)
      ? (parsed as { attempts: DiagnosticCompletedSave[] }).attempts
      : [parsed as DiagnosticCompletedSave];
    return list
      .map((item, index) => normalizeAttempt(item, index))
      .filter((item): item is DiagnosticCompletedSave => item != null)
      .sort((a, b) => a.completedAt - b.completedAt)
      .map((item, index) => ({
        ...item,
        attemptNumber: item.attemptNumber || index + 1,
        isBaseline: index === 0,
      }));
  } catch {
    return [];
  }
}

export function loadDiagnosticResults(userId: string): DiagnosticCompletedSave | null {
  const attempts = loadDiagnosticAttempts(userId);
  return attempts[attempts.length - 1] ?? null;
}

export function loadDiagnosticBaseline(userId: string): DiagnosticCompletedSave | null {
  const attempts = loadDiagnosticAttempts(userId);
  return attempts[0] ?? null;
}

export function persistDiagnosticResults(userId: string, save: DiagnosticCompletedSave): void {
  const existing = loadDiagnosticAttempts(userId);
  const without = existing.filter((item) => item.localId !== save.localId);
  const next = [...without, save].sort((a, b) => a.completedAt - b.completedAt);
  localStorage.setItem(
    resultsKey(userId),
    JSON.stringify({ specId: SHSAT_DIAGNOSTIC_SPEC.id, attempts: next }),
  );
}

export function appendDiagnosticResults(
  userId: string,
  input: Omit<DiagnosticCompletedSave, "localId" | "attemptNumber" | "isBaseline"> & {
    localId?: string;
    attemptNumber?: number;
    isBaseline?: boolean;
  },
): DiagnosticCompletedSave {
  const existing = loadDiagnosticAttempts(userId);
  const attemptNumber = input.attemptNumber ?? existing.length + 1;
  const save: DiagnosticCompletedSave = {
    ...input,
    localId: input.localId ?? newLocalId(),
    attemptNumber,
    isBaseline: input.isBaseline ?? existing.length === 0,
  };
  persistDiagnosticResults(userId, save);
  return save;
}

export function markDiagnosticResultsSynced(
  userId: string,
  firestoreId: string,
  localId?: string,
): void {
  const attempts = loadDiagnosticAttempts(userId);
  if (attempts.length === 0) return;
  const targetId = localId ?? attempts[attempts.length - 1]?.localId;
  const next = attempts.map((item) =>
    item.localId === targetId ? { ...item, firestoreId } : item,
  );
  localStorage.setItem(
    resultsKey(userId),
    JSON.stringify({ specId: SHSAT_DIAGNOSTIC_SPEC.id, attempts: next }),
  );
}

export function loadDiagnosticSave(userId: string): DiagnosticExamSave | null {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiagnosticExamSave;
    if (parsed.specId !== SHSAT_DIAGNOSTIC_SPEC.id) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function persistDiagnosticSave(userId: string, save: DiagnosticExamSave): void {
  localStorage.setItem(storageKey(userId), JSON.stringify(save));
}

export function clearDiagnosticSave(userId: string): void {
  localStorage.removeItem(storageKey(userId));
}
