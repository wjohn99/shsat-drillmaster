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

/** Shared link. Student sign-in, then the exam. */
export const DIAGNOSTIC_SIGNUP_PATH = "/login?start=diagnostic";

export function isDiagnosticSignupSearch(search: string): boolean {
  return new URLSearchParams(search).get("start") === "diagnostic";
}

export function roleCanStartDiagnostic(
  role: string | undefined,
  diagnosticAssigned: boolean,
): boolean {
  return role === "tutor" || role === "demo" || diagnosticAssigned;
}

export function studentCanStartDiagnostic(input: {
  role?: string | null;
  profileAssigned?: boolean;
  boardAssigned?: boolean;
}): boolean {
  return roleCanStartDiagnostic(
    input.role ?? undefined,
    Boolean(input.profileAssigned || input.boardAssigned),
  );
}

/** Students who opened the diagnostic link and do not have a board yet. */
export function diagnosticProspects<T extends { uid: string; diagnosticAssigned?: boolean }>(
  students: T[],
  boardStudentUids: Iterable<string>,
): T[] {
  const onABoard = new Set(boardStudentUids);
  return students.filter((student) => student.diagnosticAssigned === true && !onABoard.has(student.uid));
}

export function isPermissionDenied(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "permission-denied",
  );
}
