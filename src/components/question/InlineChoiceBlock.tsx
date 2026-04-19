import type { IcSpec } from "@/types";
import { cn } from "@/lib/utils";

type InlineChoiceBlockProps = {
  spec: IcSpec;
  selections: Record<string, string | null>;
  onChange: (next: Record<string, string | null>) => void;
  disabled?: boolean;
  showSolution?: boolean;
};

function slotDef(spec: IcSpec, slotId: string) {
  return spec.slots.find((s) => s.slotId === slotId);
}

export function InlineChoiceBlock({
  spec,
  selections,
  onChange,
  disabled,
  showSolution,
}: InlineChoiceBlockProps) {
  const setSlot = (slotId: string, optionId: string | null) => {
    onChange({ ...selections, [slotId]: optionId });
  };

  return (
    <div className="space-y-3">
      {spec.instruction ? (
        <p className="text-sm text-muted-foreground">{spec.instruction}</p>
      ) : null}

      <p className="text-base leading-relaxed text-foreground [text-wrap:pretty]">
        {spec.segments.map((seg, i) => {
          if (seg.type === "text") {
            return <span key={i}>{seg.value}</span>;
          }
          const def = slotDef(spec, seg.slotId);
          const value = selections[seg.slotId] ?? "";
          const expected = spec.correctMapping[seg.slotId];
          const filled = value !== "";
          const ok = showSolution && filled && value === expected;
          const bad = showSolution && filled && value !== expected;
          const emptyBad = showSolution && !filled;

          if (!def) {
            return (
              <span key={i} className="text-destructive">
                [missing slot]
              </span>
            );
          }

          return (
            <span key={i} className="mx-0.5 inline-block align-baseline">
              <select
                value={value}
                disabled={disabled}
                onChange={(e) => {
                  const v = e.target.value;
                  setSlot(seg.slotId, v === "" ? null : v);
                }}
                aria-label={`Choice for blank ${seg.slotId}`}
                className={cn(
                  "inline-block min-w-[7.5rem] max-w-[min(100%,18rem)] rounded-md border bg-background px-2 py-1 text-sm font-medium shadow-sm",
                  !showSolution && "border-input",
                  ok && "border-success ring-1 ring-success",
                  bad && "border-destructive ring-1 ring-destructive",
                  emptyBad && "border-destructive/80 ring-1 ring-destructive/50",
                  disabled && "cursor-not-allowed opacity-90"
                )}
              >
                <option value="">— Select —</option>
                {def.options.map((opt) => (
                  <option key={opt.id} value={opt.id}>
                    {opt.text}
                  </option>
                ))}
              </select>
            </span>
          );
        })}
      </p>
    </div>
  );
}
