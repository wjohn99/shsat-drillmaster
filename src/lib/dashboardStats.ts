import type { WorksheetAssignment } from "@/types/assignment";

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
