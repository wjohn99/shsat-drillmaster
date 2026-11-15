import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Eye, Loader2, Printer } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { StatusPill, worksheetStatusTone } from "@/components/status/StatusPill";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { fetchDemoStudents } from "@/lib/demoSandbox";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAssignmentsForTutor, fetchStudents, removeOpenAssignment } from "@/lib/assignmentService";
import { worksheetProgressStatus, worksheetStatusLabel } from "@/lib/dashboardStats";
import { toast } from "@/hooks/use-toast";
import type { TutorAssignmentRow } from "@/types/assignment";
import { WorksheetEmptyState } from "./WorksheetEmptyState";

interface TutorAssignmentsGridProps {
  refreshKey?: number;
  onReviewAssignment: (assignment: TutorAssignmentRow) => void;
  onPrintAssignment?: (assignment: TutorAssignmentRow) => void;
  onCreate?: () => void;
}

export function TutorAssignmentsGrid({
  refreshKey = 0,
  onReviewAssignment,
  onPrintAssignment,
  onCreate,
}: TutorAssignmentsGridProps) {
  const { profile } = useAuth();
  const [assignments, setAssignments] = useState<TutorAssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [completedOpen, setCompletedOpen] = useState(false);
  const [assignmentToRemove, setAssignmentToRemove] = useState<TutorAssignmentRow | null>(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const students =
          profile?.role === "demo" && profile.uid
            ? await fetchDemoStudents(profile.uid)
            : await fetchStudents();
        const rows = await fetchAssignmentsForTutor();
        if (cancelled) return;

        const nameByUid = new Map(students.map((s) => [s.uid, s.displayName]));
        const visible =
          profile?.role === "demo"
            ? rows.filter((assignment) => nameByUid.has(assignment.assignedToStudentUid))
            : rows;
        const enriched: TutorAssignmentRow[] = visible.map((a) => ({
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
  }, [profile?.role, profile?.uid, refreshKey]);

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
    const progress = worksheetProgressStatus(assignment);
    const createdLabel = assignment.createdAt?.toDate
      ? assignment.createdAt.toDate().toLocaleDateString()
      : "";

    return (
      <Card key={assignment.id}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex flex-wrap items-center gap-2 min-w-0">
              <StatusPill tone={worksheetStatusTone(progress)}>
                {worksheetStatusLabel(assignment)}
              </StatusPill>
              {assignment.revealAnswers === false ? (
                <Badge variant="outline">Cold diagnostic</Badge>
              ) : null}
              {assignment.allowSkip === true ? (
                <Badge variant="outline">Skipping allowed</Badge>
              ) : null}
            </div>
            {createdLabel && (
              <span className="shrink-0 text-sm text-muted-foreground">Assigned {createdLabel}</span>
            )}
          </div>
          <p className="mb-1 text-sm font-medium text-primary">{assignment.studentName}</p>
          <CardTitle className="text-lg leading-tight">{assignment.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            {assignment.questionIds.length} question
            {assignment.questionIds.length === 1 ? "" : "s"}
            {assignment.tagCodes.length > 0 &&
              ` · ${assignment.tagCodes.length} skill tag${assignment.tagCodes.length === 1 ? "" : "s"}`}
          </p>
          <div className="flex flex-col gap-2">
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
            {onPrintAssignment ? (
              <Button
                className="w-full"
                size="sm"
                variant="outline"
                onClick={() => onPrintAssignment(assignment)}
              >
                <Printer className="h-4 w-4 mr-2" />
                Print / Save PDF
              </Button>
            ) : null}
            {isCompleted ? null : (
              <Button
                className="w-full"
                size="sm"
                variant="outline"
                onClick={() => setAssignmentToRemove(assignment)}
              >
                Remove
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  const confirmRemove = async () => {
    if (!assignmentToRemove) return;
    setRemoving(true);
    try {
      await removeOpenAssignment(assignmentToRemove);
      setAssignments((current) => current.filter((row) => row.id !== assignmentToRemove.id));
      toast({ title: "Worksheet removed" });
      setAssignmentToRemove(null);
    } catch (err) {
      toast({
        title: "Could not remove the worksheet",
        description: err instanceof Error ? err.message : "Please try again.",
        variant: "destructive",
      });
    } finally {
      setRemoving(false);
    }
  };

  return (
    <>
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
        <Collapsible open={completedOpen} onOpenChange={setCompletedOpen}>
          <CollapsibleTrigger className="group flex w-full items-center justify-between gap-3 rounded-lg py-1 text-left">
            <h3 className="text-lg font-semibold">
              Completed assignments
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {completedAssignments.length}
              </span>
            </h3>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
          </CollapsibleTrigger>
          <CollapsibleContent className="pt-4">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedAssignments.map(renderCard)}
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
    <AlertDialog
      open={assignmentToRemove != null}
      onOpenChange={(open) => {
        if (!open && !removing) setAssignmentToRemove(null);
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove this worksheet?</AlertDialogTitle>
          <AlertDialogDescription>
            {assignmentToRemove
              ? `${assignmentToRemove.studentName} will no longer see ${assignmentToRemove.title}. You can assign a new one after.`
              : "The student will no longer see this worksheet."}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={removing}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            disabled={removing}
            onClick={(event) => {
              event.preventDefault();
              void confirmRemove();
            }}
          >
            {removing ? "Removing…" : "Remove"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
