import { cn } from "@/lib/utils";
import {
  ATTENTION_STATUS_LABEL,
  type StudentAttentionStatus,
} from "@/types/workspace";

/** Solid fills used by both the dropdown dots and the board/homepage labels. */
const FILL: Record<StudentAttentionStatus, string> = {
  follow_up: "bg-destructive",
  next_session: "bg-primary",
  active_work: "bg-warning",
  on_track: "bg-success",
};

const LABEL: Record<StudentAttentionStatus, string> = {
  follow_up: "border-destructive bg-destructive text-destructive-foreground",
  next_session: "border-primary bg-primary text-primary-foreground",
  active_work: "border-warning bg-warning text-warning-foreground",
  on_track: "border-success bg-success text-success-foreground",
};

export function AttentionStatusLabel({
  status,
  className,
}: {
  status: StudentAttentionStatus | null;
  className?: string;
}) {
  if (!status) {
    return (
      <span
        className={cn(
          "inline-flex shrink-0 items-center rounded-full border border-border/70 bg-muted/60 px-2 py-0.5 text-[11px] font-medium tracking-wide text-muted-foreground",
          className,
        )}
      >
        No status
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium tracking-wide",
        LABEL[status],
        className,
      )}
    >
      {ATTENTION_STATUS_LABEL[status]}
    </span>
  );
}

export function AttentionStatusSwatch({ status }: { status: StudentAttentionStatus }) {
  return <span className={cn("h-2 w-2 shrink-0 rounded-full", FILL[status])} aria-hidden />;
}
