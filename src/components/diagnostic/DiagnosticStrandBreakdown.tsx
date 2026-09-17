import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { DiagnosticStrandStat } from "@/lib/diagnosticReport";

function StrandGrid({ title, rows }: { title: string; rows: DiagnosticStrandStat[] }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {rows.map((row) => (
          <div key={row.id} className="rounded-lg border p-3">
            <p className="text-sm text-muted-foreground">{row.label}</p>
            <p className="text-xl font-semibold tabular-nums">
              {row.accuracyPct == null ? "—" : `${row.accuracyPct}%`}
            </p>
            <p className="text-xs text-muted-foreground tabular-nums">
              {row.correct}/{row.total} correct
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DiagnosticStrandBreakdown({
  ela,
  math,
}: {
  ela: DiagnosticStrandStat[];
  math: DiagnosticStrandStat[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">By section</CardTitle>
        <CardDescription>
          ELA splits into reading vs revising/editing. Math splits by NUM / ALG / GEO / DAT
          (plus Applied when those tags appear).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <StrandGrid title="ELA" rows={ela} />
        <StrandGrid title="Math" rows={math} />
      </CardContent>
    </Card>
  );
}
