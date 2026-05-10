import { useMemo, useState, type ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { computeSessionAnalytics, type SessionTagTableRow } from "@/lib/sessionAnalytics";
import { cn } from "@/lib/utils";
import { ArrowDown, ArrowUp, ArrowUpDown, Brain, Zap } from "lucide-react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

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
      if (tagSort.key === "tag") cmp = a.tag.localeCompare(b.tag);
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

        {results.errorPatterns.items.length > 0 ? (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Error patterns (time vs. correctness)</CardTitle>
              <p className="text-xs text-muted-foreground font-normal">
                {results.errorPatterns.thresholdSource === "correct_median"
                  ? `Baseline: median time on questions you got right (${results.errorPatterns.thresholdSeconds}s).`
                  : `Baseline: median time across this session (${results.errorPatterns.thresholdSeconds}s), since there were no correct answers to compare against.`}{" "}
                Wrong attempts under {results.errorPatterns.minConceptSeconds}s always count as rushed (guess or skim),
                not slow — even if they are above a very fast baseline. After that, slower than baseline is slow / concept
                gap.
              </p>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-orange-500/25 bg-orange-500/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-orange-700 dark:text-orange-300">
                    <Zap className="h-4 w-4 shrink-0" />
                    Rushed / careless
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">
                    {results.errorPatterns.rushedWrong}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Under {results.errorPatterns.minConceptSeconds}s on a miss, or quicker than your baseline — often a
                    guess, pacing, misread, or slip. Next step: slow down, annotate the prompt, or double-check work.
                  </p>
                </div>
                <div className="rounded-lg border border-blue-500/25 bg-blue-500/5 p-4">
                  <div className="flex items-center gap-2 text-sm font-medium text-blue-700 dark:text-blue-300">
                    <Brain className="h-4 w-4 shrink-0" />
                    Slow / concept gap
                  </div>
                  <div className="mt-1 text-2xl font-bold tabular-nums">
                    {results.errorPatterns.stuckWrong}
                  </div>
                  <p className="mt-2 text-xs text-muted-foreground">
                    Wrong and slower than baseline — often unsure of the method or stuck between choices. Next
                    step: reteach the skill, work a parallel example, or review the underlying rule.
                  </p>
                </div>
              </div>

              <div>
                <div className="text-xs font-medium text-muted-foreground mb-2">By question</div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-14 text-center">#</TableHead>
                      <TableHead>Tags</TableHead>
                      <TableHead className="text-right">Time (s)</TableHead>
                      <TableHead className="text-right">Pattern</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.errorPatterns.items.map((row, idx) => (
                      <TableRow key={`${row.questionNumber}-${idx}`}>
                        <TableCell className="text-center font-bold tabular-nums">{row.questionNumber}</TableCell>
                        <TableCell className="text-sm leading-snug">{row.tagsDisplay}</TableCell>
                        <TableCell className="text-right tabular-nums">{row.elapsedSeconds}</TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant="outline"
                            className={
                              row.pattern === "rushed"
                                ? "border-orange-500/40 text-orange-700 dark:text-orange-300"
                                : "border-blue-500/40 text-blue-700 dark:text-blue-300"
                            }
                          >
                            {row.pattern === "rushed" ? "Rushed" : "Slow"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ) : null}

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
                      <TableCell className="font-mono text-xs">{row.tag}</TableCell>
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

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accuracy + avg time by difficulty</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results.difficultyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="difficulty" />
                  <YAxis yAxisId="pct" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis
                    yAxisId="sec"
                    orientation="right"
                    tickFormatter={(v) => `${v}s`}
                    width={44}
                  />
                  <Tooltip
                    formatter={(v, name) =>
                      name === "accuracy" ? [`${v}%`, "Accuracy"] : [`${v}s`, "Avg time"]
                    }
                  />
                  <Bar
                    yAxisId="pct"
                    dataKey="accuracy"
                    fill="hsl(var(--primary))"
                    radius={[6, 6, 0, 0]}
                  />
                  <Line
                    yAxisId="sec"
                    type="monotone"
                    dataKey="avgTime"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Accuracy + avg time by subject</CardTitle>
            </CardHeader>
            <CardContent className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={results.subjectChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="subject" />
                  <YAxis yAxisId="pct" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
                  <YAxis
                    yAxisId="sec"
                    orientation="right"
                    tickFormatter={(v) => `${v}s`}
                    width={44}
                  />
                  <Tooltip
                    formatter={(v, name) =>
                      name === "accuracy" ? [`${v}%`, "Accuracy"] : [`${v}s`, "Avg time"]
                    }
                  />
                  <Bar
                    yAxisId="pct"
                    dataKey="accuracy"
                    fill="hsl(var(--secondary))"
                    radius={[6, 6, 0, 0]}
                  />
                  <Line
                    yAxisId="sec"
                    type="monotone"
                    dataKey="avgTime"
                    stroke="hsl(var(--foreground))"
                    strokeWidth={2}
                    dot={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {results.weakestTags.length > 0 && (
          <div className="rounded-lg border p-4">
            <div className="text-sm font-medium mb-2">Needs improvement (lowest-accuracy tags)</div>
            <div className="flex flex-wrap gap-2">
              {results.weakestTags.map((t) => (
                <Badge key={t.tag} variant="outline">
                  {t.tag} • {t.accuracy}% ({t.total})
                </Badge>
              ))}
            </div>
          </div>
        )}

        {footerActions ? <div className="flex flex-wrap gap-2">{footerActions}</div> : null}
      </CardContent>
    </Card>
  );
}
