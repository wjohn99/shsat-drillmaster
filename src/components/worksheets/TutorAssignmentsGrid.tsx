import { useEffect, useMemo, useState } from "react";
import { BookOpen, CheckCircle2, Circle, Eye, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { fetchAssignmentsForTutor, fetchStudents } from "@/lib/assignmentService";
import { formatAssignmentDueDate, isAssignmentOverdue } from "@/lib/dashboardStats";
import type { TutorAssignmentRow } from "@/types/assignment";

interface TutorAssignmentsGridProps {
  refreshKey?: number;
  onReviewAssignment: (assignment: TutorAssignmentRow) => void;
}

export function TutorAssignmentsGrid({
  refreshKey = 0,
  onReviewAssignment,
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
    return (
      <Card className="border-dashed">
        <CardContent className="py-12 text-center">
          <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="font-medium">No assignments yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Create a custom worksheet and assign it to a student.
          </p>
        </CardContent>
      </Card>
    );
  }

  const renderCard = (assignment: TutorAssignmentRow) => {
    const isCompleted = assignment.status === "completed";
    const overdue = isAssignmentOverdue(assignment);
    const dueLabel = formatAssignmentDueDate(assignment);
    const createdLabel = assignment.createdAt?.toDate
      ? assignment.createdAt.toDate().toLocaleDateString()
      : "";

    return (
      <Card key={assignment.id} className="hover:shadow-lg transition-all duration-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <Badge
                variant={isCompleted ? "secondary" : overdue ? "destructive" : "default"}
                className="gap-1"
              >
                {isCompleted ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" />
                    Completed
                  </>
                ) : overdue ? (
                  "Overdue"
                ) : (
                  <>
                    <Circle className="h-3 w-3" />
                    To Do
                  </>
                )}
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
              Review student results
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
