import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import { getTagLabel } from "@/data/taggingScheme";
import { computeSessionAnalytics, type SessionTagTableRow } from "@/lib/sessionAnalytics";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

function skillBarFill(accuracy: number): string {
  if (accuracy < 50) return "hsl(var(--destructive))";
  if (accuracy < 70) return "hsl(25 95% 53%)";
  return "hsl(var(--primary))";
}

export interface SessionSummaryMetric {
  label: string;
  value: string | number;
}

export interface SessionResultsDashboardProps {
  title: string;
  events: SessionAnalyticsEvent[];
  summaryMetrics: SessionSummaryMetric[];
  footerActions?: ReactNode;
  /** Shown under the charts (e.g. streak explanation for Blitz). */
  footnote?: ReactNode;
}

type TagSortKey = keyof Pick<SessionTagTableRow, "tag" | "n" | "accuracy" | "avgTime">;

function defaultSortDir(key: TagSortKey): "asc" | "desc" {
  return key === "tag" || key === "accuracy" ? "asc" : "desc";
}

export function SessionResultsDashboard({
  title,
  events,
  summaryMetrics,
  footerActions,
  footnote,
}: SessionResultsDashboardProps) {
  const results = useMemo(() => computeSessionAnalytics(events), [events]);
  const [tagSort, setTagSort] = useState<{ key: TagSortKey; dir: "asc" | "desc" }>({
    key: "accuracy",
    dir: "asc",
  });

  const sortedTagRows = useMemo(() => {
    const rows = [...results.tagTable];
    const factor = tagSort.dir === "asc" ? 1 : -1;
    rows.sort((a, b) => {
      let cmp = 0;
      if (tagSort.key === "tag") cmp = getTagLabel(a.tag).localeCompare(getTagLabel(b.tag));
      else if (tagSort.key === "n") cmp = a.n - b.n;
      else if (tagSort.key === "accuracy") cmp = a.accuracy - b.accuracy;
      else cmp = a.avgTime - b.avgTime;
      return cmp * factor;
    });
    return rows;
  }, [results.tagTable, tagSort]);

  const setTagSortKey = (key: TagSortKey) => {
    setTagSort((prev) =>
      prev.key === key
        ? { key, dir: prev.dir === "asc" ? "desc" : "asc" }
        : { key, dir: defaultSortDir(key) }
    );
  };

  const SortHead = ({
    colKey,
    label,
    align = "left",
  }: {
    colKey: TagSortKey;
    label: string;
    align?: "left" | "right";
  }) => {
    const active = tagSort.key === colKey;
    const Icon = !active ? ArrowUpDown : tagSort.dir === "asc" ? ArrowUp : ArrowDown;
    return (
      <TableHead className={cn(align === "right" && "text-right")}>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "h-8 gap-1 font-medium text-muted-foreground hover:text-foreground",
            align === "right" ? "w-full justify-end -mr-3" : "-ml-3"
          )}
          onClick={() => setTagSortKey(colKey)}
        >
          {label}
          <Icon className="h-3.5 w-3.5 shrink-0 opacity-70" />
        </Button>
      </TableHead>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div
          className={`grid gap-3 ${
            summaryMetrics.length >= 5
              ? "md:grid-cols-5"
              : summaryMetrics.length === 4
                ? "md:grid-cols-4"
                : "md:grid-cols-3"
          }`}
        >
          {summaryMetrics.map((m) => (
            <div key={m.label} className="rounded-lg border p-3">
              <div className="text-xs text-muted-foreground">{m.label}</div>
              <div className="text-2xl font-bold">{m.value}</div>
            </div>
          ))}
        </div>

        {footnote ? <div className="text-sm text-muted-foreground">{footnote}</div> : null}


        {results.tagTable.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Tags & skills</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                Each row counts every question that carried that tag. One question can appear in multiple rows.
              </p>
            </CardHeader>
            <CardContent className="pt-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortHead colKey="tag" label="Tag / skill" />
                    <SortHead colKey="n" label="n" align="right" />
                    <SortHead colKey="accuracy" label="Accuracy" align="right" />
                    <SortHead colKey="avgTime" label="Avg time (s)" align="right" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedTagRows.map((row) => (
                    <TableRow key={row.tag}>
                      <TableCell className="text-sm">{getTagLabel(row.tag)}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.n}</TableCell>
                      <TableCell className="text-right tabular-nums">{row.accuracy}%</TableCell>
                      <TableCell className="text-right tabular-nums">{row.avgTime}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableCaption className="mt-2 text-left">
                  Click a column header to sort. Default: lowest accuracy first.
                </TableCaption>
              </Table>
            </CardContent>
          </Card>
        ) : null}

        {results.skillFocusChart.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Where to focus next</CardTitle>
              <CardDescription>
                Accuracy by skill in this session (lowest at top). Red and orange bars are the best targets for
                your next practice set or tutor review. Dashed line is your overall session accuracy (
                {results.accuracyPct}%).
              </CardDescription>
            </CardHeader>
            <CardContent
              className="pt-0"
              style={{
                height: Math.min(520, Math.max(240, results.skillFocusChart.length * 40)),
              }}
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  layout="vertical"
                  data={results.skillFocusChart}
                  margin={{ top: 4, right: 16, left: 4, bottom: 24 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                  <XAxis
                    type="number"
                    domain={[0, 100]}
                    tickFormatter={(v) => `${v}%`}
                    tick={{ fontSize: 11 }}
                    label={{
                      value: "Accuracy",
                      position: "insideBottom",
                      offset: -8,
                      style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                    }}
                  />
                  <YAxis
                    type="category"
                    dataKey="label"
                    width={168}
                    tick={{ fontSize: 11 }}
                    interval={0}
                  />
                  <Tooltip
                    cursor={{ fill: "hsl(var(--muted) / 0.35)" }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const row = payload[0].payload as (typeof results.skillFocusChart)[0];
                      return (
                        <div className="rounded-md border bg-popover px-3 py-2 text-xs shadow-md">
                          <div className="font-medium">{row.label}</div>
                          <div className="text-muted-foreground font-mono">{row.tag}</div>
                          <div className="mt-1 tabular-nums">
                            {row.accuracy}% accuracy · {row.n} question{row.n === 1 ? "" : "s"} ·{" "}
                            {row.avgTime}s avg
                          </div>
                        </div>
                      );
                    }}
                  />
                  <ReferenceLine
                    x={results.accuracyPct}
                    stroke="hsl(var(--muted-foreground))"
                    strokeDasharray="4 4"
                    label={{
                      value: "Session avg",
                      position: "insideTopRight",
                      fill: "hsl(var(--muted-foreground))",
                      fontSize: 10,
                    }}
                  />
                  <Bar dataKey="accuracy" radius={[0, 4, 4, 0]} maxBarSize={28}>
                    {results.skillFocusChart.map((row) => (
                      <Cell key={row.tag} fill={skillBarFill(row.accuracy)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        ) : null}


        {footerActions ? <div className="flex flex-wrap gap-2">{footerActions}</div> : null}
      </CardContent>
    </Card>
  );
}
