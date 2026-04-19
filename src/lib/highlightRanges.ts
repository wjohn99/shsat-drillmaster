export interface HighlightRange {
  start: number;
  end: number;
}

const STORAGE_PREFIX = "ela-highlighter-v1";

function normalizeEntry(r: unknown): HighlightRange | null {
  if (!r || typeof r !== "object") return null;
  const o = r as Record<string, unknown>;
  if (typeof o.start !== "number" || typeof o.end !== "number") return null;
  return { start: o.start, end: o.end };
}

export function loadHighlightRanges(storageKey: string): HighlightRange[] {
  try {
    const raw = localStorage.getItem(`${STORAGE_PREFIX}:${storageKey}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeEntry)
      .filter((x): x is HighlightRange => x != null && x.start < x.end);
  } catch {
    return [];
  }
}

export function saveHighlightRanges(storageKey: string, ranges: HighlightRange[]): void {
  try {
    localStorage.setItem(`${STORAGE_PREFIX}:${storageKey}`, JSON.stringify(ranges));
  } catch {
    /* ignore quota */
  }
}

/**
 * Insert a new highlight; overlapping parts of existing ranges are removed (new wins).
 */
export function addHighlightRange(
  existing: HighlightRange[],
  next: HighlightRange,
  textLen: number
): HighlightRange[] {
  let s = Math.max(0, Math.min(next.start, textLen));
  let e = Math.max(s, Math.min(next.end, textLen));
  if (e <= s) return existing;

  const clipped: HighlightRange[] = [];
  for (const r of existing) {
    if (r.end <= s || r.start >= e) {
      clipped.push(r);
    } else {
      if (r.start < s) clipped.push({ ...r, end: s });
      if (r.end > e) clipped.push({ ...r, start: e });
    }
  }
  clipped.push({ start: s, end: e });
  return clipped.sort((a, b) => a.start - b.start);
}

/** Text offset from start of `root` to (node, offset) among text nodes in document order. */
export function getTextOffsetIn(root: HTMLElement, node: Node, offset: number): number {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let total = 0;
  while (walker.nextNode()) {
    const tn = walker.currentNode as Text;
    if (tn === node) return total + offset;
    total += tn.length;
  }
  return total;
}
