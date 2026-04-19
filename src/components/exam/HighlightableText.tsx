import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { Highlighter } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  addHighlightRange,
  getTextOffsetIn,
  loadHighlightRanges,
  saveHighlightRanges,
  type HighlightRange,
} from "@/lib/highlightRanges";

const MARK_CLASS =
  "rounded-sm px-px bg-[#FFEB3B] text-foreground dark:bg-[#FDD835] dark:text-foreground";

function renderHighlightedText(text: string, ranges: HighlightRange[]) {
  const valid = ranges.filter((r) => r.start < r.end && r.start < text.length);
  const sorted = [...valid].sort((a, b) => a.start - b.start);
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let k = 0;
  for (const r of sorted) {
    if (r.start > cursor) {
      nodes.push(
        <span key={`t-${k++}`}>{text.slice(cursor, r.start)}</span>
      );
    }
    const end = Math.min(r.end, text.length);
    nodes.push(
      <mark key={`m-${k++}`} className={MARK_CLASS}>
        {text.slice(r.start, end)}
      </mark>
    );
    cursor = end;
  }
  if (cursor < text.length) {
    nodes.push(<span key={`t-${k++}`}>{text.slice(cursor)}</span>);
  }
  return <>{nodes}</>;
}

type HighlightableTextProps = {
  text: string;
  storageKey: string;
  variant?: "passage" | "stem";
  className?: string;
};

export function HighlightableText({
  text,
  storageKey,
  variant = "stem",
  className,
}: HighlightableTextProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ranges, setRanges] = useState<HighlightRange[]>(() =>
    loadHighlightRanges(storageKey)
  );

  useEffect(() => {
    setRanges(loadHighlightRanges(storageKey));
  }, [storageKey]);

  useEffect(() => {
    setRanges((prev) =>
      prev
        .map((r) => ({
          ...r,
          start: Math.min(r.start, text.length),
          end: Math.min(r.end, text.length),
        }))
        .filter((r) => r.start < r.end)
    );
  }, [text]);

  useEffect(() => {
    saveHighlightRanges(storageKey, ranges);
  }, [storageKey, ranges]);

  const applyHighlight = useCallback(() => {
    const root = containerRef.current;
    if (!root) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return;
    const range = sel.getRangeAt(0);
    if (!root.contains(range.commonAncestorContainer)) return;

    const start = getTextOffsetIn(root, range.startContainer, range.startOffset);
    const end = getTextOffsetIn(root, range.endContainer, range.endOffset);
    const lo = Math.min(start, end);
    const hi = Math.max(start, end);
    if (hi <= lo) return;

    setRanges((prev) =>
      addHighlightRange(prev, { start: lo, end: hi }, text.length)
    );
    sel.removeAllRanges();
  }, [text.length]);

  const clearAll = useCallback(() => setRanges([]), []);

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={applyHighlight}
          className="inline-flex h-6 shrink-0 items-center gap-1 rounded border border-border/50 bg-muted/40 px-2 text-[11px] font-medium text-foreground shadow-sm hover:bg-muted/70"
          title="Highlight selected text"
        >
          <Highlighter className="h-3 w-3 opacity-70" aria-hidden />
          Highlight
        </button>
        <button
          type="button"
          onClick={clearAll}
          className="text-[11px] text-muted-foreground hover:text-foreground"
        >
          Clear
        </button>
      </div>

      <div
        ref={containerRef}
        className={cn(
          "select-text cursor-text rounded-sm px-0.5 outline-none focus-visible:ring-1 focus-visible:ring-ring",
          variant === "passage"
            ? "prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed"
            : "text-base leading-relaxed"
        )}
        tabIndex={0}
      >
        {variant === "passage" ? (
          renderHighlightedText(text, ranges)
        ) : (
          <p className="mb-0">{renderHighlightedText(text, ranges)}</p>
        )}
      </div>
    </div>
  );
}
