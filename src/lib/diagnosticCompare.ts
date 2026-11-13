import {
  computeDiagnosticModuleBreakdown,
  computeDiagnosticStrands,
  type DiagnosticStrandStat,
} from "@/lib/diagnosticReport";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

export type DiagnosticCompareTarget = {
  first: PracticeSessionRecord;
  latest: PracticeSessionRecord;
  returnTo?: string;
};

export interface DiagnosticCompareRow {
  label: string;
  first: string;
  latest: string;
  change: string;
}

function accuracy(events: SessionAnalyticsEvent[]): number | null {
  if (events.length === 0) return null;
  return Math.round((events.filter((event) => event.correct).length / events.length) * 100);
}

function percentCell(value: number | null): string {
  return value == null ? "-" : `${value}%`;
}

function changeCell(latest: number | null, first: number | null): string {
  if (latest == null || first == null) return "-";
  const delta = latest - first;
  if (delta === 0) return "0";
  return delta > 0 ? `+${delta}` : String(delta);
}

function row(label: string, first: number | null, latest: number | null): DiagnosticCompareRow {
  return {
    label,
    first: percentCell(first),
    latest: percentCell(latest),
    change: changeCell(latest, first),
  };
}

function strandRows(
  firstRows: DiagnosticStrandStat[],
  latestRows: DiagnosticStrandStat[],
): DiagnosticCompareRow[] {
  const seen = new Set<string>();
  const rows: DiagnosticCompareRow[] = [];
  for (const item of [...firstRows, ...latestRows]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    const first = firstRows.find((row) => row.id === item.id);
    const latest = latestRows.find((row) => row.id === item.id);
    if ((first?.total ?? 0) === 0 && (latest?.total ?? 0) === 0) continue;
    rows.push(row(item.label, first?.accuracyPct ?? null, latest?.accuracyPct ?? null));
  }
  return rows;
}

export function buildDiagnosticCompareRows(
  firstEvents: SessionAnalyticsEvent[],
  latestEvents: SessionAnalyticsEvent[],
): DiagnosticCompareRow[] {
  const firstModules = computeDiagnosticModuleBreakdown(firstEvents);
  const latestModules = computeDiagnosticModuleBreakdown(latestEvents);
  const firstStrands = computeDiagnosticStrands(firstEvents);
  const latestStrands = computeDiagnosticStrands(latestEvents);
  return [
    row("Accuracy", accuracy(firstEvents), accuracy(latestEvents)),
    row(
      "ELA",
      accuracy(firstEvents.filter((event) => event.subject === "ELA")),
      accuracy(latestEvents.filter((event) => event.subject === "ELA")),
    ),
    row(
      "Math",
      accuracy(firstEvents.filter((event) => event.subject === "MATH")),
      accuracy(latestEvents.filter((event) => event.subject === "MATH")),
    ),
    row(
      "Module 1",
      firstModules.overall[0]?.accuracyPct ?? null,
      latestModules.overall[0]?.accuracyPct ?? null,
    ),
    row(
      "Module 2",
      firstModules.overall[1]?.accuracyPct ?? null,
      latestModules.overall[1]?.accuracyPct ?? null,
    ),
    ...strandRows(firstStrands.ela, latestStrands.ela),
    ...strandRows(firstStrands.math, latestStrands.math),
  ];
}
