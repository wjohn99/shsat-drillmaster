import type { ReactNode } from "react";
import type { DiagnosticLaunchStatus } from "@/lib/dashboardAnalytics";
import type { WorksheetProgressStatus } from "@/lib/dashboardStats";
import { cn } from "@/lib/utils";

/** Due, still open, and finished. The same three colors on the dashboard, board, and practice. */
export type StatusTone = "due" | "progress" | "finished" | "neutral";

const toneClass: Record<StatusTone, string> = {
  due: "bg-destructive/15 text-destructive",
  progress: "bg-warning/25 text-foreground",
  finished: "bg-success/15 text-success",
  neutral: "bg-muted text-muted-foreground",
};

export function worksheetStatusTone(status: WorksheetProgressStatus): StatusTone {
  if (status === "done") return "finished";
  if (status === "due") return "due";
  return "progress";
}

export function diagnosticStatusTone(status: DiagnosticLaunchStatus): StatusTone {
  if (status === "finished") return "finished";
  if (status === "not_assigned") return "neutral";
  return "progress";
}

export function StatusPill({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-sm font-medium",
        toneClass[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
