import {
  WORKSHEETS_PATH,
  parseWorksheetAttemptParam,
  worksheetAttemptSearch,
} from "@/types/worksheetsNavigation";

const ACTIVE_KEY = "drillmaster.activeWorksheet";
const RELOAD_KEY = "drillmaster.resumeWorksheetAfterReload";

type StoredWorksheet = {
  uid: string;
  scopeId: string;
};

function readStored(key: string): StoredWorksheet | null {
  try {
    const raw = sessionStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredWorksheet>;
    if (!parsed.uid || !parsed.scopeId) return null;
    return { uid: parsed.uid, scopeId: parsed.scopeId };
  } catch {
    return null;
  }
}

function writeStored(key: string, value: StoredWorksheet): void {
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode can block session storage. The attempt query still resumes this tab.
  }
}

export function rememberActiveWorksheet(uid: string, scopeId: string): void {
  writeStored(ACTIVE_KEY, { uid, scopeId });
}

/** Called when the worksheet page is unloading, so the next load can reopen it. */
export function markWorksheetResumeAfterReload(uid: string, scopeId: string): void {
  const value = { uid, scopeId };
  writeStored(ACTIVE_KEY, value);
  writeStored(RELOAD_KEY, value);
}

export function readWorksheetResumeAfterReload(uid: string): string | null {
  const stored = readStored(RELOAD_KEY);
  if (!stored || stored.uid !== uid) return null;
  return stored.scopeId;
}

export function clearWorksheetReloadFlag(): void {
  try {
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function forgetActiveWorksheet(): void {
  try {
    sessionStorage.removeItem(ACTIVE_KEY);
    sessionStorage.removeItem(RELOAD_KEY);
  } catch {
    // Ignore storage failures.
  }
}

export function isWorksheetAttemptLocation(
  pathname: string,
  search: string,
  scopeId: string,
): boolean {
  return pathname === WORKSHEETS_PATH && parseWorksheetAttemptParam(search) === scopeId;
}

/** Path to open after a reload, or null when the student should stay put. */
export function worksheetResumePath(
  pathname: string,
  search: string,
  uid: string | null,
  role: string | null,
): string | null {
  if (role !== "student" || !uid) return null;
  const scopeId = readWorksheetResumeAfterReload(uid);
  if (!scopeId || isWorksheetAttemptLocation(pathname, search, scopeId)) return null;
  return `${WORKSHEETS_PATH}${worksheetAttemptSearch(scopeId)}`;
}
