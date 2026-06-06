import { Calendar, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { PracticeSessionRecord } from "@/types/practiceSession";

interface WorksheetHistoryListProps {
  sessions: PracticeSessionRecord[];
  loading?: boolean;
  emptyMessage?: string;
  getSessionDetail?: (session: PracticeSessionRecord) => string | undefined;
  onReview: (session: PracticeSessionRecord) => void;
}

function formatCompletedAt(session: PracticeSessionRecord): string {
  if (!session.completedAt?.toDate) return "Recently";
  return session.completedAt.toDate().toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export function WorksheetHistoryList({
  sessions,
  loading = false,
  emptyMessage = "No completed attempts saved yet.",
  getSessionDetail,
  onReview,
}: WorksheetHistoryListProps) {
  if (loading) {
    return (
      <div className="flex justify-center py-12" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="py-10 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 gap-4">
      {sessions.map((session) => (
        <Card key={session.id} className="hover:shadow-md transition-shadow">
          <CardHeader className="pb-2">
            <div className="flex items-start justify-between gap-2">
              <CardTitle className="text-base leading-snug">{session.title}</CardTitle>
              <Badge variant="secondary">{session.accuracyPct}%</Badge>
            </div>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatCompletedAt(session)}
            </p>
            {getSessionDetail?.(session) ? (
              <p className="text-xs text-primary font-medium">{getSessionDetail(session)}</p>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {session.correctCount} / {session.questionsAnswered} correct ·{" "}
              {Math.round(session.totalTimeSeconds)}s total
            </p>
            <Button className="w-full" size="sm" variant="outline" onClick={() => onReview(session)}>
              <Eye className="h-4 w-4 mr-2" />
              Review results
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
