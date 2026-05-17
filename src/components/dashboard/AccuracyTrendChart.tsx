import type { AccuracyTrendPoint } from "@/lib/dashboardAnalytics";

interface AccuracyTrendChartProps {
  points: AccuracyTrendPoint[];
}

export function AccuracyTrendChart({ points }: AccuracyTrendChartProps) {
  if (points.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">
        Complete a self-practice session to see your trend.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {points.map((point, i) => (
        <li key={`${point.label}-${i}`}>
          <div className="flex items-center justify-between text-xs mb-1 gap-2">
            <span className="text-muted-foreground shrink-0">{point.label}</span>
            <span className="font-medium tabular-nums">{point.accuracyPct}%</span>
          </div>
          <div className="h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${Math.min(100, Math.max(0, point.accuracyPct))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
