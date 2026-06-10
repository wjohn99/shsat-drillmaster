/**
 * Saved passage text keyed by Passage ID.
 * Stored in localStorage (per browser) — simple and avoids extra sheet/API wiring.
 * Upgrade path: sync from a "Passages" tab in the tracker spreadsheet.
 */

const STORAGE_KEY = "dm-passage-library";

export type PassageLibrary = Record<string, string>;

function readLibrary(): PassageLibrary {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as PassageLibrary;
    return typeof parsed === "object" && parsed !== null ? parsed : {};
  } catch {
    return {};
  }
}

function writeLibrary(library: PassageLibrary): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(library));
}

export function listPassageIds(): string[] {
  return Object.keys(readLibrary()).sort((a, b) => a.localeCompare(b));
}

export function getPassageText(passageId: string): string | undefined {
  const id = passageId.trim();
  if (!id) return undefined;
  return readLibrary()[id];
}

export function savePassage(passageId: string, passageText: string): void {
  const id = passageId.trim();
  const text = passageText.trim();
  if (!id || !text) return;

  const library = readLibrary();
  library[id] = text;
  writeLibrary(library);
}
