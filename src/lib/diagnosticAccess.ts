export const DIAGNOSTIC_ASSIGNMENT_REQUIRED_MESSAGE =
  "Your tutor has to assign this diagnostic before you can start it.";

/** Status a student should see before the start button. */
export function diagnosticAssignmentStatusLine(assigned: boolean, inProgress: boolean): string {
  if (inProgress && assigned) return "Assigned. You can resume the sitting in progress.";
  if (inProgress) {
    return "In progress. Your tutor has to assign the diagnostic before you can start a new one.";
  }
  if (assigned) return "Assigned. You can start when you are ready.";
  return DIAGNOSTIC_ASSIGNMENT_REQUIRED_MESSAGE;
}

export function roleCanStartDiagnostic(
  role: string | undefined,
  diagnosticAssigned: boolean,
): boolean {
  return role === "tutor" || role === "demo" || diagnosticAssigned;
}

export function isPermissionDenied(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "permission-denied",
  );
}
