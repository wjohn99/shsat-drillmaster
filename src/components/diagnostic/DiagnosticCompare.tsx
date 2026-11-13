import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { buildDiagnosticCompareRows } from "@/lib/diagnosticCompare";
import { diagnosticSittingDate } from "@/lib/diagnosticResultLabel";
import type { PracticeSessionRecord } from "@/types/practiceSession";

export function DiagnosticCompare({
  first,
  latest,
  onOpenFirst,
  onOpenLatest,
}: {
  first: PracticeSessionRecord;
  latest: PracticeSessionRecord;
  onOpenFirst: () => void;
  onOpenLatest: () => void;
}) {
  const rows = useMemo(
    () => buildDiagnosticCompareRows(first.events, latest.events),
    [first.events, latest.events],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>First and latest diagnostic</CardTitle>
        <CardDescription>
          The first sitting is the baseline. Change is the latest percentage minus the first.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">First</p>
            <p className="text-sm text-muted-foreground">{diagnosticSittingDate(first)}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={onOpenFirst}>
              Open first
            </Button>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-sm font-medium">Latest</p>
            <p className="text-sm text-muted-foreground">{diagnosticSittingDate(latest)}</p>
            <Button className="mt-3" size="sm" variant="outline" onClick={onOpenLatest}>
              Open latest
            </Button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-left text-xs uppercase tracking-[0.12em] text-muted-foreground">
                <th className="py-2 pr-3 font-medium">Score</th>
                <th className="py-2 pr-3 font-medium">First</th>
                <th className="py-2 pr-3 font-medium">Latest</th>
                <th className="py-2 font-medium">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b last:border-0">
                  <th className="py-2 pr-3 text-left font-medium">{row.label}</th>
                  <td className="py-2 pr-3 tabular-nums">{row.first}</td>
                  <td className="py-2 pr-3 tabular-nums">{row.latest}</td>
                  <td className="py-2 tabular-nums">{row.change}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
