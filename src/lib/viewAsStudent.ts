const STORAGE_KEY = "drillmaster.viewAsStudent";

export interface ViewAsStudent {
  uid: string;
  displayName: string;
  email: string;
}

export function readStoredViewAsStudent(): ViewAsStudent | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<ViewAsStudent>;
    if (!parsed.uid || !parsed.displayName) return null;
    return {
      uid: parsed.uid,
      displayName: parsed.displayName,
      email: parsed.email ?? "",
    };
  } catch {
    return null;
  }
}

export function writeStoredViewAsStudent(student: ViewAsStudent | null): void {
  try {
    if (!student) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(student));
  } catch {
    // Private mode can block storage. The in-memory view still works.
  }
}
