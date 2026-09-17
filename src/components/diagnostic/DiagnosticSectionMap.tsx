import { cn } from "@/lib/utils";

export type DiagnosticMapCell = {
  id: string;
  number: number;
  current: boolean;
  answered: boolean;
  locked: boolean;
  flagged: boolean;
  canJump: boolean;
};

interface DiagnosticSectionMapProps {
  subject: string;
  answered: number;
  total: number;
  cells: DiagnosticMapCell[];
  jumpHint: string;
  showFlagged?: boolean;
  onJump: (questionId: string) => void;
}

function cellLabel(cell: DiagnosticMapCell): string {
  const parts = [`Question ${cell.number}`];
  if (cell.current) parts.push("current");
  if (cell.answered) parts.push("answered");
  if (cell.flagged) parts.push("flagged");
  if (cell.locked) parts.push("locked");
  else if (cell.canJump) parts.push("jump available");
  return parts.join(", ");
}

export function DiagnosticSectionMap({
  subject,
  answered,
  total,
  cells,
  jumpHint,
  showFlagged = false,
  onJump,
}: DiagnosticSectionMapProps) {
  return (
    <section className="rounded-xl border glass-surface p-3 sm:p-4">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className="font-serif text-base font-semibold tracking-tight">Section map</h2>
          <p className="text-xs text-muted-foreground">
            {subject} · {answered}/{total} answered. {jumpHint}
          </p>
        </div>
        <ul className="flex flex-wrap items-center gap-3 text-[11px] text-muted-foreground">
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-primary" aria-hidden />
            Current
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-success" aria-hidden />
            Answered
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-3 w-3 rounded bg-muted" aria-hidden />
            Locked
          </li>
          {showFlagged ? (
            <li className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded ring-2 ring-warning" aria-hidden />
              Flagged
            </li>
          ) : null}
        </ul>
      </div>
      <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
        {cells.map((cell) => (
          <button
            key={cell.id}
            type="button"
            disabled={!cell.canJump}
            aria-current={cell.current ? "step" : undefined}
            aria-label={cellLabel(cell)}
            title={cellLabel(cell)}
            onClick={() => onJump(cell.id)}
            className={cn(
              "flex h-7 w-full items-center justify-center rounded-md text-[10px] font-medium tabular-nums sm:h-8 sm:text-xs",
              cell.current && "bg-primary text-primary-foreground",
              !cell.current && cell.answered && "bg-success text-white",
              !cell.current && !cell.answered && cell.locked && "bg-muted text-muted-foreground",
              !cell.current && !cell.answered && !cell.locked && "border border-border bg-background",
              cell.flagged && !cell.current && "ring-2 ring-warning",
              cell.canJump && "hover:ring-2 hover:ring-primary/50",
              !cell.canJump && "cursor-default",
              cell.locked && cell.answered && !cell.current && "opacity-75",
            )}
          >
            {cell.number}
          </button>
        ))}
      </div>
    </section>
  );
}
