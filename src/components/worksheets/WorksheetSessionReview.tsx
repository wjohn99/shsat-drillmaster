import { useMemo } from "react";
import { ArrowLeft, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SessionResultsDashboard } from "@/components/session/SessionResultsDashboard";
import type { PracticeSessionRecord } from "@/types/practiceSession";

interface WorksheetSessionReviewProps {
  session: PracticeSessionRecord;
  subtitle?: string;
  viewerRole?: "student" | "tutor";
  onBack: () => void;
}

function formatCompletedAt(session: PracticeSessionRecord): string {
  if (!session.completedAt?.toDate) return "";
  return session.completedAt.toDate().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function WorksheetSessionReview({
  session,
  subtitle,
  viewerRole = "student",
  onBack,
}: WorksheetSessionReviewProps) {
  const completedLabel = formatCompletedAt(session);

  const summaryMetrics = useMemo(
    () => [
      { label: "Questions answered", value: session.questionsAnswered },
      { label: "Correct", value: session.correctCount },
      { label: "Accuracy", value: `${session.accuracyPct}%` },
      { label: "Total time", value: `${Math.round(session.totalTimeSeconds)}s` },
    ],
    [session],
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back
      </Button>

      <div className="space-y-1">
        <h1 className="text-2xl font-bold">{session.title}</h1>
        {subtitle ? <p className="text-muted-foreground">{subtitle}</p> : null}
        {completedLabel ? (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" />
            Completed {completedLabel}
          </p>
        ) : null}
      </div>

      <SessionResultsDashboard
        title="Session results"
        events={session.events}
        summaryMetrics={summaryMetrics}
        footnote={
          viewerRole === "tutor"
            ? "Saved student attempt — answers and timing match what they submitted."
            : "This is your saved attempt — question order and answers match what you submitted."
        }
        footerActions={
          <Badge variant="outline" className="text-xs font-normal">
            {session.questionIds.length} questions in this worksheet
          </Badge>
        }
      />
    </div>
  );
}
