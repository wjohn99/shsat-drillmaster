import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronDown, ClipboardList, Eye, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DashboardEmpty } from "@/components/dashboard/DashboardEmpty";
import { StatusPill, diagnosticStatusTone, worksheetStatusTone } from "@/components/status/StatusPill";
import { DiagnosticItemReview } from "@/components/diagnostic/DiagnosticItemReview";
import { DiagnosticModuleBreakdown } from "@/components/diagnostic/DiagnosticModuleBreakdown";
import { DiagnosticStrandBreakdown } from "@/components/diagnostic/DiagnosticStrandBreakdown";
import { SessionResultsDashboard } from "@/components/session/SessionResultsDashboard";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAssignmentsForParent } from "@/lib/assignmentService";
import { DIAGNOSTIC_STATUS_LABEL, type DiagnosticLaunchStatus } from "@/lib/dashboardAnalytics";
import {
  worksheetProgressStatus,
  worksheetStatusLabel,
} from "@/lib/dashboardStats";
import {
  computeDiagnosticModuleBreakdown,
  computeDiagnosticStrands,
} from "@/lib/diagnosticReport";
import { fetchDiagnosticProgressDocument } from "@/lib/diagnosticProgressService";
import { assembleDiagnosticExam } from "@/lib/shsatDiagnostic";
import { fetchParentLink, type ParentLink } from "@/lib/parentLinkService";
import { fetchPracticeSessionsForParent } from "@/lib/practiceSessionService";
import { emptyStudentRoadmap, formatNextSessionLabel } from "@/lib/studentRoadmap";
import { fetchWorkspaceBoard } from "@/lib/workspaceService";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { WorksheetsLocationState } from "@/types/worksheetsNavigation";
import type { WorkspaceBoard } from "@/types/workspace";
import { DashboardShell } from "./DashboardShell";

const UNLINKED_MESSAGE =
  "This parent account is not linked to a student. Sign in again as a parent with the student's email.";

function diagnosticStatus(
  assigned: boolean,
  inProgress: boolean,
  finishedCount: number,
): DiagnosticLaunchStatus {
  if (inProgress) return "started";
  if (finishedCount > 0) return "finished";
  if (assigned) return "assigned";
  return "not_assigned";
}

function sessionDate(session: PracticeSessionRecord): string {
  if (!session.completedAt?.toDate) return "";
  return session.completedAt.toDate().toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function ParentDashboard() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [link, setLink] = useState<ParentLink | null>(null);
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [diagnosticAssigned, setDiagnosticAssigned] = useState(false);
  const [diagnosticInProgress, setDiagnosticInProgress] = useState(false);
  const [board, setBoard] = useState<WorkspaceBoard | null>(null);

  const parentUid = profile?.uid;

  useEffect(() => {
    if (!parentUid) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const parentLink = await fetchParentLink(parentUid);
        if (cancelled) return;
        setLink(parentLink);

        const studentUid =
          parentLink?.status === "approved" ? parentLink.studentUid : null;
        if (!studentUid) {
          setAssignments([]);
          setSessions([]);
          setBoard(null);
          setDiagnosticAssigned(false);
          setDiagnosticInProgress(false);
          return;
        }

        const [assignmentRows, sessionRows, boardRow, progress] = await Promise.all([
          fetchAssignmentsForParent(parentUid, studentUid),
          fetchPracticeSessionsForParent(parentUid, studentUid, ["assignment", "diagnostic"]),
          fetchWorkspaceBoard(studentUid).catch(() => null),
          fetchDiagnosticProgressDocument(studentUid).catch(() => null),
        ]);
        if (cancelled) return;
        setAssignments(assignmentRows);
        setSessions(sessionRows);
        setBoard(boardRow);
        setDiagnosticAssigned(Boolean(boardRow?.diagnosticAssigned));
        setDiagnosticInProgress(Boolean(progress));
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load this student's progress.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [parentUid]);

  const approved = link?.status === "approved" && Boolean(link.studentUid);
  const studentName = link?.studentName || link?.studentEmail || "your student";
  const diagnostics = useMemo(
    () => sessions.filter((session) => session.sessionType === "diagnostic"),
    [sessions],
  );
  const latestDiagnostic = diagnostics[0] ?? null;
  const diagnosticExam = useMemo(() => assembleDiagnosticExam(), []);
  const diagnosticReport = useMemo(() => {
    if (!latestDiagnostic) return null;
    return {
      modules: computeDiagnosticModuleBreakdown(latestDiagnostic.events),
      strands: computeDiagnosticStrands(latestDiagnostic.events),
    };
  }, [latestDiagnostic]);
  const assignmentSessions = useMemo(
    () => sessions.filter((session) => session.sessionType === "assignment"),
    [sessions],
  );
  const status = diagnosticStatus(diagnosticAssigned, diagnosticInProgress, diagnostics.length);
  const dueWorksheets = useMemo(
    () => assignments.filter((assignment) => assignment.status !== "completed"),
    [assignments],
  );
  const completedWorksheets = assignments.length - dueWorksheets.length;
  const openWorksheets = dueWorksheets.length;
  const latestScore = latestDiagnostic
    ? `${latestDiagnostic.correctCount}/${latestDiagnostic.questionsAnswered}`
    : "None yet";
  const nextSessionLabel = formatNextSessionLabel(board?.roadmap ?? emptyStudentRoadmap());
  const nextSessionNotes = board?.roadmap.nextSessionNotes.trim() ?? "";

  const recent = useMemo(() => {
    const items = [
      ...diagnostics.map((session) => ({
        key: `diagnostic-${session.id}`,
        title: session.title || "SHSAT diagnostic",
        kind: "Diagnostic" as const,
        dateMs: session.completedAt?.toMillis?.() ?? 0,
        dateLabel: sessionDate(session),
        detail: `${session.correctCount}/${session.questionsAnswered} correct, ${session.accuracyPct}% accuracy`,
        session,
      })),
      ...assignments
        .filter((assignment) => assignment.status === "completed")
        .map((assignment) => {
          const session = assignmentSessions.find((row) => row.assignmentId === assignment.id) ?? null;
          return {
            key: `assignment-${assignment.id}`,
            title: assignment.title,
            kind: "Worksheet" as const,
            dateMs: assignment.completedAt?.toMillis?.() ?? assignment.createdAt?.toMillis?.() ?? 0,
            dateLabel: assignment.completedAt?.toDate
              ? assignment.completedAt.toDate().toLocaleDateString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "",
            detail: session
              ? `${session.correctCount}/${session.questionsAnswered} correct, ${session.accuracyPct}% accuracy`
              : "Completed",
            session,
          };
        }),
    ];
    return items.sort((a, b) => b.dateMs - a.dateMs);
  }, [assignmentSessions, assignments, diagnostics]);

  const openResults = (kind: "Diagnostic" | "Worksheet", session: PracticeSessionRecord) => {
    if (kind === "Diagnostic") {
      navigate("/practice/diagnostic", { state: { reviewSession: session } });
      return;
    }
    navigate("/worksheets", {
      state: {
        reviewSession: session,
        returnTo: "/dashboard",
      } satisfies WorksheetsLocationState,
    });
  };

  if (loading) {
    return (
      <DashboardShell title="Dashboard" subtitle="Student progress, view only.">
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell title="Dashboard" subtitle="Student progress, view only.">
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      </DashboardShell>
    );
  }

  if (!approved) {
    return (
      <DashboardShell title="Dashboard" subtitle="Student progress, view only.">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Parent account is not linked</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{UNLINKED_MESSAGE}</p>
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={studentName}
      subtitle={
        link.studentEmail
          ? `${link.studentEmail}. View only, this account cannot start or change work.`
          : "View only, this account cannot start or change work."
      }
    >
      <div className="space-y-8">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Next session</CardTitle>
            <p className="text-base font-medium text-foreground">{nextSessionLabel}</p>
          </CardHeader>
          {nextSessionNotes ? (
            <CardContent>
              <p className="whitespace-pre-wrap text-sm text-muted-foreground">{nextSessionNotes}</p>
            </CardContent>
          ) : null}
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Still due</CardTitle>
            <CardDescription>
              {openWorksheets === 0
                ? "Nothing here can be started."
                : `${openWorksheets} still due, ${completedWorksheets} finished. Nothing here can be started.`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {dueWorksheets.length === 0 ? (
              <DashboardEmpty icon={ClipboardList}>No worksheets are due.</DashboardEmpty>
            ) : (
              <ul className="divide-y">
                {dueWorksheets.map((assignment) => {
                  const progress = worksheetProgressStatus(assignment);
                  return (
                    <li key={assignment.id} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{assignment.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {assignment.questionIds.length} questions
                        </p>
                      </div>
                      <StatusPill tone={worksheetStatusTone(progress)} className="shrink-0">
                        {worksheetStatusLabel(assignment)}
                      </StatusPill>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Collapsible>
          <Card>
            <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left">
              <span>
                <span className="block text-lg font-semibold">Scores</span>
                <span className="mt-1 block text-sm text-muted-foreground">
                  {latestDiagnostic
                    ? `Latest diagnostic ${latestScore}, ${latestDiagnostic.accuracyPct}% accuracy`
                    : "No diagnostic finished yet"}
                </span>
              </span>
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
            </CollapsibleTrigger>
            <CollapsibleContent className="space-y-4 px-6 pb-6">
              <StatusPill tone={diagnosticStatusTone(status)}>
                {DIAGNOSTIC_STATUS_LABEL[status]}
              </StatusPill>
              {latestDiagnostic ? (
                <SessionResultsDashboard
                  title="Latest diagnostic"
                  events={latestDiagnostic.events}
                  collapseDetails
                  tagTableTitle="Fine-grained tags"
                  summaryMetrics={[
                    { label: "Correct", value: latestDiagnostic.correctCount },
                    { label: "Answered", value: latestDiagnostic.questionsAnswered },
                    { label: "Accuracy", value: `${latestDiagnostic.accuracyPct}%` },
                  ]}
                  footnote={
                    latestDiagnostic.endedReason === "time" ? (
                      <p>Time ran out. Unanswered items were scored as incorrect.</p>
                    ) : (
                      <p>
                        Official SHSAT scores are scaled by item difficulty. These numbers are raw Module
                        1 and Module 2 accuracy and time on this fixed form.
                      </p>
                    )
                  }
                  extraSections={
                    diagnosticReport ? (
                      <div className="space-y-4">
                        <DiagnosticModuleBreakdown
                          overall={diagnosticReport.modules.overall}
                          bySubject={diagnosticReport.modules.bySubject}
                        />
                        <DiagnosticStrandBreakdown
                          ela={diagnosticReport.strands.ela}
                          math={diagnosticReport.strands.math}
                        />
                        <DiagnosticItemReview exam={diagnosticExam} events={latestDiagnostic.events} />
                      </div>
                    ) : null
                  }
                />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Charts show here after a diagnostic is finished.
                </p>
              )}
            </CollapsibleContent>
          </Card>
        </Collapsible>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Completed work</CardTitle>
            <CardDescription>Finished diagnostics and worksheets.</CardDescription>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-sm text-muted-foreground">No completed work yet.</p>
            ) : (
              <ul className="divide-y">
                {recent.map((item) => {
                  const session = item.session;
                  return (
                  <li key={item.key} className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="min-w-0">
                      <div className="mb-0.5 flex items-center gap-2">
                        <Badge variant="secondary">{item.kind}</Badge>
                        {item.dateLabel ? (
                          <span className="text-sm text-muted-foreground">{item.dateLabel}</span>
                        ) : null}
                      </div>
                      <p className="font-medium">{item.title}</p>
                      <p className="text-sm text-muted-foreground">{item.detail}</p>
                    </div>
                    {session ? (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => openResults(item.kind, session)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        View results
                      </Button>
                    ) : null}
                  </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
