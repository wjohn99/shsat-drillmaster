import type { CgtSpec } from "@/types";
import { cn } from "@/lib/utils";

type CgtBlockProps = {
  spec: CgtSpec;
  className?: string;
};

export function CgtBlock({ spec, className }: CgtBlockProps) {
  const { visual, sourceNote } = spec;

  return (
    <div className={cn("space-y-3", className)}>
      {visual.type === "table" && <CgtTable visual={visual} />}
      {visual.type === "barChart" && <CgtBarChart visual={visual} />}
      {sourceNote ? (
        <p className="text-xs text-muted-foreground">{sourceNote}</p>
      ) : null}
    </div>
  );
}

function CgtTable({
  visual,
}: {
  visual: Extract<CgtSpec["visual"], { type: "table" }>;
}) {
  return (
    <div className="overflow-x-auto rounded-lg border border-foreground/15 bg-muted/20">
      {visual.caption ? (
        <p className="border-b border-foreground/10 bg-muted/40 px-3 py-2 text-center text-sm font-medium">
          {visual.caption}
        </p>
      ) : null}
      <table className="w-full min-w-[280px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-foreground/20 bg-background">
            {visual.headers.map((h, i) => (
              <th
                key={i}
                scope="col"
                className="px-3 py-2 text-left font-semibold text-foreground"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visual.rows.map((row, ri) => (
            <tr key={ri} className="border-b border-foreground/10 last:border-0">
              {row.map((cell, ci) => (
                <td key={ci} className="px-3 py-2 text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CgtBarChart({
  visual,
}: {
  visual: Extract<CgtSpec["visual"], { type: "barChart" }>;
}) {
  const max = Math.max(1, ...visual.values.map((v) => Math.abs(v)));

  return (
    <div className="rounded-lg border border-foreground/15 bg-muted/20 p-4">
      {visual.title ? (
        <p className="mb-4 text-center text-sm font-medium text-foreground">{visual.title}</p>
      ) : null}
      <div className="space-y-3">
        {visual.categories.map((cat, i) => {
          const v = visual.values[i] ?? 0;
          const pct = (Math.abs(v) / max) * 100;
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-right text-xs text-muted-foreground sm:w-32 sm:text-sm">
                {cat}
              </span>
              <div className="min-h-7 min-w-0 flex-1 rounded bg-background/80">
                <div
                  className="flex h-7 min-w-[2rem] items-center justify-end rounded bg-primary/85 px-2 text-xs font-medium text-primary-foreground transition-[width]"
                  style={{ width: `${Math.max(pct, 6)}%` }}
                >
                  <span className="tabular-nums">
                    {v}
                    {visual.valueSuffix ?? ""}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
