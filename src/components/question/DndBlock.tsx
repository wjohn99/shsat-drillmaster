import { useCallback } from "react";
import type { DndSpec, DndZone } from "@/types";
import { cn } from "@/lib/utils";

const DND_MIME = "application/x-indy-dnd-id";

const DEFAULT_INSTRUCTION = "Move the correct answer into the correct box:";

type DndBlockProps = {
  spec: DndSpec;
  placements: Record<string, string | null>;
  onChange: (next: Record<string, string | null>) => void;
  disabled?: boolean;
  showSolution?: boolean;
};

function draggableById(spec: DndSpec, id: string) {
  return spec.pool.find((p) => p.id === id);
}

function isInlineZone(zone: DndZone): boolean {
  return zone.beforeText !== undefined || zone.afterText !== undefined;
}

export function DndBlock({ spec, placements, onChange, disabled, showSolution }: DndBlockProps) {
  const usedIds = new Set(
    Object.values(placements).filter((v): v is string => v != null && v !== "")
  );
  const poolItems = spec.pool.filter((p) => !usedIds.has(p.id));
  const instruction = spec.instruction?.trim() || DEFAULT_INSTRUCTION;

  const handleDragStart = useCallback((e: React.DragEvent, draggableId: string) => {
    e.dataTransfer.setData(DND_MIME, draggableId);
    e.dataTransfer.effectAllowed = "move";
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDropOnPool = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const draggableId = e.dataTransfer.getData(DND_MIME);
      if (!draggableId) return;
      const next = { ...placements };
      for (const z of spec.zones) {
        if (next[z.id] === draggableId) next[z.id] = null;
      }
      onChange(next);
    },
    [disabled, placements, onChange, spec.zones]
  );

  const handleDropOnZone = useCallback(
    (zoneId: string) => (e: React.DragEvent) => {
      e.preventDefault();
      if (disabled) return;
      const draggableId = e.dataTransfer.getData(DND_MIME);
      if (!draggableId) return;
      const next = { ...placements };
      for (const z of spec.zones) {
        if (z.id !== zoneId && next[z.id] === draggableId) {
          next[z.id] = null;
        }
      }
      next[zoneId] = draggableId;
      onChange(next);
    },
    [disabled, placements, onChange, spec.zones]
  );

  const DraggableChip = ({
    draggableId,
    zoneId,
    className,
  }: {
    draggableId: string;
    zoneId?: string;
    className?: string;
  }) => {
    const item = draggableById(spec, draggableId);
    if (!item) return null;
    const expected = zoneId != null ? spec.correctMapping[zoneId] : undefined;
    const solutionCorrect = showSolution && zoneId != null ? draggableId === expected : undefined;

    return (
      <div
        draggable={!disabled}
        onDragStart={(e) => handleDragStart(e, draggableId)}
        className={cn(
          "inline-flex min-h-[2.5rem] min-w-[2.75rem] shrink-0 cursor-grab select-none items-center justify-center rounded-md border-2 border-primary bg-muted/60 px-3 py-1.5 text-center text-sm font-semibold text-primary shadow-sm active:cursor-grabbing",
          disabled && "cursor-default opacity-90",
          showSolution && solutionCorrect === true && "border-success text-success",
          showSolution && solutionCorrect === false && "border-destructive text-destructive",
          className
        )}
      >
        {item.text}
      </div>
    );
  };

  const zoneFeedback = (zone: DndZone, placedId: string | null | undefined) => {
    const expected = spec.correctMapping[zone.id];
    const filled = placedId != null;
    const zoneOk = showSolution && filled && placedId === expected;
    const zoneBad = showSolution && filled && placedId !== expected;
    const emptyBad = showSolution && !filled;
    return { zoneOk, zoneBad, emptyBad };
  };

  /** Empty inline slot: exam-style box; filled: same tile style as pool (no double frame). */
  const InlineDropSlot = ({ zone }: { zone: DndZone }) => {
    const placedId = placements[zone.id];
    const { emptyBad } = zoneFeedback(zone, placedId);

    if (placedId) {
      return (
        <span className="mx-0.5 inline-flex align-middle">
          <DraggableChip draggableId={placedId} zoneId={zone.id} />
        </span>
      );
    }

    return (
      <span
        className={cn(
          "mx-0.5 inline-flex min-h-[2.5rem] min-w-[3rem] items-center justify-center align-middle rounded border-2 border-foreground/85 bg-background",
          emptyBad && "border-destructive/80 bg-destructive/5"
        )}
        onDragOver={handleDragOver}
        onDrop={handleDropOnZone(zone.id)}
      >
        <span className="select-none text-[0.65rem] text-muted-foreground/50" aria-hidden>
          &nbsp;
        </span>
      </span>
    );
  };

  return (
    <div className="space-y-5">
      <p className="text-base text-foreground">{instruction}</p>

      {/* Answer bank — variable count, wraps on small screens */}
      <div
        className="flex flex-wrap gap-3"
        onDragOver={handleDragOver}
        onDrop={handleDropOnPool}
      >
        {poolItems.length === 0 ? (
          <span className="text-sm text-muted-foreground">
            Drag a value back here to remove it from a box.
          </span>
        ) : (
          poolItems.map((p) => <DraggableChip key={p.id} draggableId={p.id} />)
        )}
      </div>

      {/* Drop zones */}
      <div className="space-y-6">
        {spec.zones.map((zone) => {
          const placedId = placements[zone.id];
          if (isInlineZone(zone)) {
            const before = zone.beforeText ?? "";
            const after = zone.afterText ?? "";
            return (
              <p
                key={zone.id}
                className="text-base leading-relaxed text-foreground [text-wrap:pretty]"
              >
                <span>{before}</span>
                <InlineDropSlot zone={zone} />
                <span>{after}</span>
              </p>
            );
          }

          const { zoneOk, zoneBad, emptyBad } = zoneFeedback(zone, placedId);
          return (
            <div key={zone.id} className="space-y-2">
              {zone.prompt ? (
                <p className="text-base font-medium leading-snug text-foreground">{zone.prompt}</p>
              ) : null}
              <div
                className={cn(
                  "flex min-h-[52px] items-center rounded-lg border-2 p-3 transition-colors",
                  !showSolution && "border-dashed border-muted-foreground/40 bg-muted/20",
                  placedId && !showSolution && "border-primary/40 bg-background",
                  zoneOk && "border-success bg-success/5",
                  zoneBad && "border-destructive bg-destructive/5",
                  emptyBad && "border-destructive/70 bg-destructive/5"
                )}
                onDragOver={handleDragOver}
                onDrop={handleDropOnZone(zone.id)}
              >
                {placedId ? (
                  <DraggableChip draggableId={placedId} zoneId={zone.id} />
                ) : (
                  <span className="text-sm text-muted-foreground">Drop answer here</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
