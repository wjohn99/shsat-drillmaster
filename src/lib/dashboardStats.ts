import type { WorksheetAssignment } from "@/types/assignment";
import type { WorkspaceCardAttachment } from "@/types/workspace";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function countOpenAssignments(assignments: WorksheetAssignment[]): number {
  return assignments.filter((a) => a.status === "todo").length;
}

export function countCompletedThisWeek(assignments: WorksheetAssignment[]): number {
  const cutoff = Date.now() - WEEK_MS;
  return assignments.filter((a) => {
    if (a.status !== "completed") return false;
    const completedAt = a.completedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
    return completedAt >= cutoff;
  }).length;
}

export function getNextTodoAssignment(
  assignments: WorksheetAssignment[],
): WorksheetAssignment | null {
  return assignments.find((a) => a.status === "todo") ?? null;
}

export function formatAssignmentDate(assignment: WorksheetAssignment): string {
  if (!assignment.createdAt?.toDate) return "";
  return assignment.createdAt.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatAssignmentDueDate(assignment: WorksheetAssignment): string {
  if (!assignment.dueAt?.toDate) return "";
  return assignment.dueAt.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isAssignmentOverdue(assignment: WorksheetAssignment): boolean {
  if (assignment.status !== "todo") return false;
  const dueMs = assignment.dueAt?.toMillis?.() ?? 0;
  return dueMs > 0 && dueMs < Date.now();
}

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfLocalDay(ms: number): number {
  const date = new Date(ms);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function dueMillis(assignment: { dueAt?: { toMillis?: () => number } | null }): number {
  const due = assignment.dueAt?.toMillis?.() ?? 0;
  return due > 0 ? due : Number.POSITIVE_INFINITY;
}

/** True when the due timestamp falls on the same local calendar day as `now`. */
export function isAssignmentDueOnLocalDay(
  assignment: { dueAt?: { toMillis?: () => number } | null },
  now = Date.now(),
): boolean {
  const due = dueMillis(assignment);
  if (!Number.isFinite(due)) return false;
  const start = startOfLocalDay(now);
  return due >= start && due < start + DAY_MS;
}

export function hasOpenAssignmentDueToday(
  assignments: Array<{ status: WorksheetAssignment["status"]; dueAt?: WorksheetAssignment["dueAt"] }>,
  now = Date.now(),
): boolean {
  return assignments.some(
    (assignment) => assignment.status === "todo" && isAssignmentDueOnLocalDay(assignment, now),
  );
}

type OpenAssignmentCandidate = {
  status: WorksheetAssignment["status"];
  dueAt?: { toMillis?: () => number } | null;
  createdAt?: { toMillis?: () => number } | null;
};

/** Soonest open worksheet. Undated work comes after anything with a due date. */
export function pickCurrentOpenAssignment<T extends OpenAssignmentCandidate>(
  assignments: T[],
): T | null {
  const open = assignments.filter((assignment) => assignment.status === "todo");
  if (open.length === 0) return null;
  return [...open].sort((a, b) => {
    const dueDelta = dueMillis(a) - dueMillis(b);
    if (dueDelta !== 0) return dueDelta;
    const aCreated = a.createdAt?.toMillis?.() ?? 0;
    const bCreated = b.createdAt?.toMillis?.() ?? 0;
    return aCreated - bCreated;
  })[0];
}

export type WorksheetProgressStatus = "assigned" | "due" | "done";

export const WORKSHEET_PROGRESS_LABEL: Record<WorksheetProgressStatus, string> = {
  assigned: "Assigned",
  due: "Due",
  done: "Done",
};

export function worksheetProgressStatus(
  assignment: WorksheetAssignment,
): WorksheetProgressStatus {
  if (assignment.status === "completed") return "done";
  if (isAssignmentOverdue(assignment)) return "due";
  return "assigned";
}

/** Status word for a worksheet pill. The due date stays on the pill while the work is open. */
export function worksheetStatusLabel(assignment: WorksheetAssignment | null | undefined): string {
  const status = assignment ? worksheetProgressStatus(assignment) : "assigned";
  const dueLabel = assignment && status !== "done" ? formatAssignmentDueDate(assignment) : "";
  if (status === "due" && dueLabel) return `Due ${dueLabel}`;
  if (status === "assigned" && dueLabel) return `Assigned, due ${dueLabel}`;
  return WORKSHEET_PROGRESS_LABEL[status];
}

export function pickLatestCompletedAssignment<T extends WorksheetAssignment>(
  assignments: T[],
): T | null {
  const completed = assignments.filter((a) => a.status === "completed");
  if (completed.length === 0) return null;
  return [...completed].sort((a, b) => {
    const aMs = a.completedAt?.toMillis?.() ?? a.createdAt?.toMillis?.() ?? 0;
    const bMs = b.completedAt?.toMillis?.() ?? b.createdAt?.toMillis?.() ?? 0;
    return bMs - aMs;
  })[0];
}

export function formatAttachmentDueDate(attachment: WorkspaceCardAttachment): string {
  if (!attachment.dueAt?.toDate) return "";
  return attachment.dueAt.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function isAttachmentOverdue(
  attachment: WorkspaceCardAttachment,
  hasSubmission: boolean,
): boolean {
  if (hasSubmission) return false;
  const dueMs = attachment.dueAt?.toMillis?.() ?? 0;
  return dueMs > 0 && dueMs < Date.now();
}
