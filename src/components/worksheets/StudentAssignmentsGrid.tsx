import { useEffect, useState } from "react";
import { BookOpen, CheckCircle2, Circle, Loader2, Play } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAssignmentsForStudent } from "@/lib/assignmentService";
import type { WorksheetAssignment } from "@/types/assignment";

interface StudentAssignmentsGridProps {
  onStartAssignment: (assignment: WorksheetAssignment) => void;
  refreshKey?: number;
}

export function StudentAssignmentsGrid({
  onStartAssignment,
  refreshKey = 0,
}: StudentAssignmentsGridProps) {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile?.uid) {
      setLoading(false);
      return;
    }

    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const rows = await fetchAssignmentsForStudent();
        if (!cancelled) {
          setAssignments(rows);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Could not load your assignments.",
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile?.uid, refreshKey]);

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
            When your tutor assigns a worksheet, it will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {assignments.map((assignment) => {
        const isCompleted = assignment.status === "completed";
        const createdLabel = assignment.createdAt?.toDate
          ? assignment.createdAt.toDate().toLocaleDateString()
          : "";

        return (
          <Card key={assignment.id} className="group hover:shadow-lg transition-all duration-300">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2 mb-2">
                <Badge
                  variant={isCompleted ? "secondary" : "default"}
                  className="gap-1"
                >
                  {isCompleted ? (
                    <>
                      <CheckCircle2 className="h-3 w-3" />
                      Completed
                    </>
                  ) : (
                    <>
                      <Circle className="h-3 w-3" />
                      To Do
                    </>
                  )}
                </Badge>
                {createdLabel && (
                  <span className="text-xs text-muted-foreground">{createdLabel}</span>
                )}
              </div>
              <p className="text-xs font-medium text-primary mb-1">From your tutor</p>
              <CardTitle className="text-lg leading-tight">{assignment.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                {assignment.questionIds.length} question
                {assignment.questionIds.length === 1 ? "" : "s"}
                {assignment.tagCodes.length > 0 &&
                  ` · ${assignment.tagCodes.length} skill tag${assignment.tagCodes.length === 1 ? "" : "s"}`}
              </p>
              <Button
                className="w-full"
                size="sm"
                variant={isCompleted ? "outline" : "default"}
                onClick={() => onStartAssignment(assignment)}
              >
                <Play className="h-4 w-4 mr-2" />
                {isCompleted ? "Practice again" : "Start practice"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
