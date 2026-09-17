import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StudentAssignmentsGrid } from "./StudentAssignmentsGrid";
import { WorksheetHistoryList } from "./WorksheetHistoryList";
import { fetchPracticeSessionsForStudent } from "@/lib/practiceSessionService";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";

interface StudentWorksheetsHomeProps {
  assignmentsRefreshKey: number;
  onStartAssignment: (assignment: WorksheetAssignment) => void;
  onReviewAssignment: (assignment: WorksheetAssignment) => void;
  onReviewSession: (session: PracticeSessionRecord) => void;
  onCreateCustomPractice: () => void;
}

export function StudentWorksheetsHome({
  assignmentsRefreshKey,
  onStartAssignment,
  onReviewAssignment,
  onReviewSession,
  onCreateCustomPractice,
}: StudentWorksheetsHomeProps) {
  const [historySessions, setHistorySessions] = useState<PracticeSessionRecord[]>([]);
  const [historyLoading, setHistoryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setHistoryLoading(true);
      try {
        const rows = await fetchPracticeSessionsForStudent(["assignment"]);
        if (!cancelled) setHistorySessions(rows);
      } catch {
        if (!cancelled) setHistorySessions([]);
      } finally {
        if (!cancelled) setHistoryLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [assignmentsRefreshKey]);

  return (
    <div className="mx-auto max-w-6xl space-y-12">
      <section>
        <div className="mb-4">
          <h2 className="font-serif text-xl font-semibold">Active assignments</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Worksheets from your tutor — complete these when assigned.
          </p>
        </div>
        <StudentAssignmentsGrid
          refreshKey={assignmentsRefreshKey}
          onStartAssignment={onStartAssignment}
          onReviewAssignment={onReviewAssignment}
        />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="font-serif text-xl font-semibold">Assignment history</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Review your saved results from completed tutor worksheets anytime.
          </p>
        </div>
        <WorksheetHistoryList
          sessions={historySessions}
          loading={historyLoading}
          role="student"
          onReview={onReviewSession}
        />
      </section>

      <section>
        <div className="mb-4">
          <h2 className="font-serif text-xl font-semibold">Practice on your own</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Build a custom worksheet anytime. Self-practice is private and not graded by your
            tutor.
          </p>
        </div>

        <div className="glass-surface flex flex-col gap-3 rounded-2xl border p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-medium">Create custom practice</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Pick skill tags from all four SHSAT sections and practice at your own pace.
            </p>
          </div>
          <Button className="shrink-0" onClick={onCreateCustomPractice}>
            Build worksheet
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </section>
    </div>
  );
}
