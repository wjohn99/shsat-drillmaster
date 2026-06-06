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
