import { useEffect, useState } from "react";
import { CircleAlert } from "lucide-react";
import { useQuestionReports } from "@/contexts/QuestionReportsContext";
import { toast } from "@/hooks/use-toast";
import { questionReportReasonLabel, type QuestionReport } from "@/types/questionReport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

function formatReportDate(ms: number): string {
  if (!ms) return "";
  return new Date(ms).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QuestionReportsPanel({ questionId }: { questionId: string }) {
  const { canManage, loadQuestionReports, resolveReport } = useQuestionReports();
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!canManage) return;
    let cancelled = false;
    setLoading(true);
    void loadQuestionReports(questionId)
      .then((rows) => {
        if (!cancelled) setReports(rows);
      })
      .catch(() => {
        if (!cancelled) setReports([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [canManage, loadQuestionReports, questionId]);

  if (!canManage) return null;
  if (!loading && reports.length === 0) return null;

  const handleResolve = async (reportId: string) => {
    try {
      await resolveReport(reportId);
      setReports((prev) =>
        prev.map((row) => (row.id === reportId ? { ...row, status: "resolved" } : row)),
      );
      toast({ title: "Report marked resolved" });
    } catch (err) {
      toast({
        title: "Could not resolve report",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <CircleAlert className="h-5 w-5" />
          Question reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading reports…</p>
        ) : (
          reports.map((report) => (
            <div key={report.id} className="rounded-lg border p-3 space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant={report.status === "open" ? "destructive" : "secondary"}>
                    {report.status === "open" ? "Open" : "Resolved"}
                  </Badge>
                  <span className="text-sm font-medium">
                    {questionReportReasonLabel(report.reason)}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatReportDate(report.updatedAtMs)}
                </span>
              </div>
              <p className="text-sm whitespace-pre-wrap">{report.comment}</p>
              <p className="text-xs text-muted-foreground">
                {report.reporterName || "Someone"} · {report.reporterRole}
                {report.reporterEmail ? ` · ${report.reporterEmail}` : ""}
              </p>
              {report.status === "open" ? (
                <Button size="sm" variant="outline" onClick={() => void handleResolve(report.id)}>
                  Mark resolved
                </Button>
              ) : null}
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
