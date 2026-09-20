import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ModuleBadge } from "@/components/question/ModuleBadge";
import {
  formatDiagnosticItemTime,
  type DiagnosticModuleBucket,
  type DiagnosticSubjectModuleStat,
} from "@/lib/diagnosticReport";

function ModuleStatCard({ bucket }: { bucket: DiagnosticModuleBucket }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <ModuleBadge module={bucket.module} className="h-5 px-2 text-[10px]" />
        <p className="text-xs text-muted-foreground tabular-nums">
          {bucket.total} item{bucket.total === 1 ? "" : "s"}
        </p>
      </div>
      <p className="text-2xl font-semibold tabular-nums">
        {bucket.accuracyPct == null ? "—" : `${bucket.accuracyPct}%`}
      </p>
      <p className="text-xs text-muted-foreground tabular-nums">
        {bucket.correct}/{bucket.total} correct
      </p>
      <p className="mt-1 text-xs text-muted-foreground tabular-nums">
        Time {formatDiagnosticItemTime(bucket.timeSeconds)}
        {bucket.avgTimeSeconds != null
          ? ` · avg ${formatDiagnosticItemTime(bucket.avgTimeSeconds)}`
          : ""}
      </p>
    </div>
  );
}

export function DiagnosticModuleBreakdown({
  overall,
  bySubject,
}: {
  overall: DiagnosticModuleBucket[];
  bySubject: DiagnosticSubjectModuleStat[];
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Module 1 vs Module 2</CardTitle>
        <CardDescription>
          The official adaptive SHSAT scores by the difficulty of items a student gets right, not
          only how many. This form is fixed, so these are raw Module 1 and Module 2 counts — not a
          scaled SHSAT score.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Overall
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            {overall.map((bucket) => (
              <ModuleStatCard key={bucket.module} bucket={bucket} />
            ))}
          </div>
        </div>
        {bySubject.map((row) => (
          <div key={row.subject}>
            <p className="mb-2 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              {row.label}
              {row.accuracyPct != null ? (
                <span className="ml-2 font-normal normal-case tracking-normal tabular-nums">
                  {row.correct}/{row.total} · {row.accuracyPct}% ·{" "}
                  {formatDiagnosticItemTime(row.timeSeconds)}
                </span>
              ) : null}
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {row.modules.map((bucket) => (
                <ModuleStatCard key={`${row.subject}-${bucket.module}`} bucket={bucket} />
              ))}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
