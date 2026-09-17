import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchAssignmentsForTutor, fetchStudents } from "@/lib/assignmentService";
import {
  formatAssignmentDueDate,
  isAssignmentOverdue,
  worksheetProgressStatus,
  WORKSHEET_PROGRESS_LABEL,
} from "@/lib/dashboardStats";
import type { TutorAssignmentRow } from "@/types/assignment";
import { WorksheetEmptyState } from "./WorksheetEmptyState";

interface TutorAssignmentsGridProps {
  refreshKey?: number;
  onReviewAssignment: (assignment: TutorAssignmentRow) => void;
  onCreate?: () => void;
}

export function TutorAssignmentsGrid({
  refreshKey = 0,
  onReviewAssignment,
  onCreate,
}: TutorAssignmentsGridProps) {
  const [assignments, setAssignments] = useState<TutorAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [rows, students] = await Promise.all([
          fetchAssignmentsForTutor(),
          fetchStudents(),
        ]);
        if (cancelled) return;

        const nameByUid = new Map(students.map((s) => [s.uid, s.displayName]));
        const enriched: TutorAssignmentRow[] = rows.map((a) => ({
          ...a,
          studentName: nameByUid.get(a.assignedToStudentUid) ?? "Student",
        }));
        setAssignments(enriched);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load assignments.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  const { openAssignments, completedAssignments } = useMemo(() => {
    const open = assignments.filter((a) => a.status === "todo");
    const completed = assignments.filter((a) => a.status === "completed");
    return { openAssignments: open, completedAssignments: completed };
  }, [assignments]);

  if (loading) {
    return (
      <div className="flex justify-center py-16" aria-busy="true">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/30">
        <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
      </Card>
    );
  }

  if (assignments.length === 0) {
    return <WorksheetEmptyState role="tutor" onCreate={onCreate} />;
  }

  const renderCard = (assignment: TutorAssignmentRow) => {
    const isCompleted = assignment.status === "completed";
    const overdue = isAssignmentOverdue(assignment);
    const progress = worksheetProgressStatus(assignment);
    const dueLabel = formatAssignmentDueDate(assignment);
    const createdLabel = assignment.createdAt?.toDate
      ? assignment.createdAt.toDate().toLocaleDateString()
      : "";

    return (
      <Card key={assignment.id}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge
                variant={progress === "done" ? "secondary" : progress === "due" ? "destructive" : "default"}
                className="gap-1"
              >
                {progress === "done" ? (
                  <CheckCircle2 className="h-3 w-3" />
                ) : progress === "assigned" ? (
                  <Circle className="h-3 w-3" />
                ) : null}
                {WORKSHEET_PROGRESS_LABEL[progress]}
              </Badge>
              {dueLabel && !isCompleted ? (
                <span className={`text-xs ${overdue ? "text-destructive font-medium" : "text-muted-foreground"}`}>
                  Due {dueLabel}
                </span>
              ) : null}
            </div>
            {createdLabel && (
              <span className="text-xs text-muted-foreground shrink-0">Assigned {createdLabel}</span>
            )}
          </div>
          <p className="text-xs font-medium text-primary mb-1">{assignment.studentName}</p>
          <CardTitle className="text-lg leading-tight">{assignment.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {assignment.questionIds.length} question
            {assignment.questionIds.length === 1 ? "" : "s"}
            {assignment.tagCodes.length > 0 &&
              ` · ${assignment.tagCodes.length} skill tag${assignment.tagCodes.length === 1 ? "" : "s"}`}
          </p>
          {isCompleted ? (
            <Button className="w-full" size="sm" onClick={() => onReviewAssignment(assignment)}>
              <Eye className="h-4 w-4 mr-2" />
              View last results
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-1">
              Waiting for the student to complete this worksheet.
            </p>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-10">
      {openAssignments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Open assignments</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {openAssignments.map(renderCard)}
          </div>
        </div>
      )}
      {completedAssignments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4">Completed assignments</h3>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedAssignments.map(renderCard)}
          </div>
        </div>
      )}
    </div>
  );
}
