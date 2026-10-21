import { moduleFromLegacyAnalytics } from "@/lib/questionModule";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

export const WORKSHEET_SELF_SCOPE_ID = "self";

export type WorksheetProgressRunSource = "assignment" | "self";

export type WorksheetProgressSave = {
  userId: string;
  scopeId: string;
  runSource: WorksheetProgressRunSource;
  assignmentId: string | null;
  title: string;
  tagCodes: string[];
  questionIds: string[];
  currentQuestionIndex: number;
  answers: Record<string, string>;
  flagged: string[];
  lockedQuestionIds: string[];
  eliminated: Record<string, string[]>;
  events: SessionAnalyticsEvent[];
  notepad: string;
  revealAnswers: boolean;
  tutorUid: string | null;
  startedAt: number;
  updatedAt: number;
};

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

export function worksheetProgressDocId(userId: string, scopeId: string): string {
  return `${userId}__${scopeId}`;
}

export function parseWorksheetProgressEvents(raw: unknown): SessionAnalyticsEvent[] {
  if (!Array.isArray(raw)) return [];
  const events: SessionAnalyticsEvent[] = [];
  for (const item of raw) {
    const event = asRecord(item);
    const questionId = String(event.questionId ?? "");
    if (!questionId) continue;
    events.push({
      questionId,
      subject: event.subject === "ELA" ? "ELA" : "MATH",
      module: moduleFromLegacyAnalytics(event.module ?? event.difficulty),
      correct: Boolean(event.correct),
      elapsedSeconds: Number(event.elapsedSeconds) || 0,
      tags: Array.isArray(event.tags) ? event.tags.map(String) : [],
      ...(typeof event.answer === "string" && event.answer.length > 0 ? { answer: event.answer } : {}),
      ...(typeof event.contentVersion === "number" ? { contentVersion: event.contentVersion } : {}),
    });
  }
  return events;
}

export function normalizeWorksheetProgressSave(raw: unknown): WorksheetProgressSave | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = asRecord(raw);
  const userId = typeof parsed.userId === "string" ? parsed.userId : "";
  const scopeId = typeof parsed.scopeId === "string" ? parsed.scopeId : "";
  if (!userId || !scopeId) return null;
  const runSource: WorksheetProgressRunSource = parsed.runSource === "self" ? "self" : "assignment";
  const answersRaw = asRecord(parsed.answers);
  const answers: Record<string, string> = {};
  for (const [key, value] of Object.entries(answersRaw)) {
    if (typeof value === "string") answers[key] = value;
  }
  const eliminatedRaw = asRecord(parsed.eliminated);
  const eliminated: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(eliminatedRaw)) {
    if (Array.isArray(value)) eliminated[key] = value.map(String);
  }
  const questionIds = Array.isArray(parsed.questionIds) ? parsed.questionIds.map(String) : [];
  const currentQuestionIndex = Math.max(0, Math.floor(Number(parsed.currentQuestionIndex) || 0));
  return {
    userId,
    scopeId,
    runSource,
    assignmentId: typeof parsed.assignmentId === "string" ? parsed.assignmentId : null,
    title: typeof parsed.title === "string" ? parsed.title : "Worksheet",
    tagCodes: Array.isArray(parsed.tagCodes) ? parsed.tagCodes.map(String) : [],
    questionIds,
    currentQuestionIndex:
      questionIds.length > 0 ? Math.min(currentQuestionIndex, questionIds.length - 1) : currentQuestionIndex,
    answers,
    flagged: Array.isArray(parsed.flagged) ? parsed.flagged.map(String) : [],
    lockedQuestionIds: Array.isArray(parsed.lockedQuestionIds) ? parsed.lockedQuestionIds.map(String) : [],
    eliminated,
    events: parseWorksheetProgressEvents(parsed.events),
    notepad: typeof parsed.notepad === "string" ? parsed.notepad : "",
    revealAnswers: parsed.revealAnswers === true,
    tutorUid: typeof parsed.tutorUid === "string" ? parsed.tutorUid : null,
    startedAt: Number(parsed.startedAt) || Date.now(),
    updatedAt: Number(parsed.updatedAt) || Number(parsed.startedAt) || 0,
  };
}

export function worksheetProgressIsStarted(save: WorksheetProgressSave | null | undefined): boolean {
  if (!save) return false;
  return (
    save.currentQuestionIndex > 0 ||
    Object.keys(save.answers).length > 0 ||
    save.lockedQuestionIds.length > 0 ||
    save.events.length > 0 ||
    save.notepad.trim().length > 0
  );
}

export function pickNewerWorksheetProgress(
  a: WorksheetProgressSave | null,
  b: WorksheetProgressSave | null,
): WorksheetProgressSave | null {
  if (!a) return b;
  if (!b) return a;
  return b.updatedAt >= a.updatedAt ? b : a;
}

function storageKey(userId: string, scopeId: string): string {
  return `worksheet-progress:${userId}:${scopeId}`;
}

export function loadWorksheetProgressLocal(
  userId: string,
  scopeId: string,
): WorksheetProgressSave | null {
  try {
    const raw = localStorage.getItem(storageKey(userId, scopeId));
    if (!raw) return null;
    return normalizeWorksheetProgressSave(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function persistWorksheetProgressLocal(save: WorksheetProgressSave): void {
  localStorage.setItem(storageKey(save.userId, save.scopeId), JSON.stringify(save));
}

export function clearWorksheetProgressLocal(userId: string, scopeId: string): void {
  localStorage.removeItem(storageKey(userId, scopeId));
}
