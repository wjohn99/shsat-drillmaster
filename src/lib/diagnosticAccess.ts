export const DIAGNOSTIC_ASSIGNMENT_REQUIRED_MESSAGE =
  "Your tutor has to assign this diagnostic before you can start it.";

export function roleCanStartDiagnostic(
  role: string | undefined,
  diagnosticAssigned: boolean,
): boolean {
  return role === "tutor" || diagnosticAssigned;
}

export function isPermissionDenied(err: unknown): boolean {
  return Boolean(
    err &&
      typeof err === "object" &&
      "code" in err &&
      (err as { code?: string }).code === "permission-denied",
  );
}
