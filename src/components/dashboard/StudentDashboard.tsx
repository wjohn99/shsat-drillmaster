import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Flame,
  Loader2,
  ChevronDown,
  Play,
  Target,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusPill, worksheetStatusTone } from "@/components/status/StatusPill";
import { Progress } from "@/components/ui/progress";
import { DashboardShell } from "./DashboardShell";
import { StatTile } from "./StatTile";
import { AccuracyTrendChart } from "./AccuracyTrendChart";
import { useAuth } from "@/contexts/AuthContext";
import { fetchAssignmentsForStudent } from "@/lib/assignmentService";
import { diagnosticAssignmentStatusLine } from "@/lib/diagnosticAccess";
import type { DiagnosticExamSave } from "@/lib/diagnosticExamStorage";
import { fetchDiagnosticProgress } from "@/lib/diagnosticProgressService";
import { fetchPracticeSessionsForStudent } from "@/lib/practiceSessionService";
import { fetchWorksheetProgressForUser } from "@/lib/worksheetProgressService";
import { worksheetProgressIsStarted } from "@/lib/worksheetProgressStorage";
import { loadTutorVisibleStudentView } from "@/lib/studentView";
import type { ViewAsStudent } from "@/lib/viewAsStudent";
import { assembleDiagnosticExam, diagnosticResumePlace } from "@/lib/shsatDiagnostic";
import { fetchWorkspaceBoard } from "@/lib/workspaceService";
import {
  buildStudentDashboardAnalytics,
  WEEKLY_QUESTION_GOAL,
} from "@/lib/dashboardAnalytics";
import {
  countOpenAssignments,
  formatAssignmentDate,
  getNextTodoAssignment,
  worksheetProgressStatus,
  worksheetStatusLabel,
} from "@/lib/dashboardStats";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { WorksheetsLocationState } from "@/types/worksheetsNavigation";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

const PREVIEW_LIMIT = 3;

export function StudentDashboard({ viewAs = null }: { viewAs?: ViewAsStudent | null }) {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const preview = Boolean(viewAs);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([]);
  const [selfSessions, setSelfSessions] = useState<PracticeSessionRecord[]>([]);
  const [assignmentSessions, setAssignmentSessions] = useState<PracticeSessionRecord[]>([]);
  const [diagnosticSessions, setDiagnosticSessions] = useState<PracticeSessionRecord[]>([]);
  const [diagnosticAssigned, setDiagnosticAssigned] = useState(false);
  const [diagnosticInProgress, setDiagnosticInProgress] = useState(false);
  const [diagnosticSave, setDiagnosticSave] = useState<DiagnosticExamSave | null>(null);
  const diagnosticExam = useMemo(() => assembleDiagnosticExam(), []);
  const [inProgressAssignmentIds, setInProgressAssignmentIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!profile) return;
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (viewAs) {
          const visible = await loadTutorVisibleStudentView(viewAs.uid);
          if (cancelled) return;
          setAssignments(visible.assignments);
          setSelfSessions([]);
          setAssignmentSessions(visible.sessions.filter((s) => s.sessionType === "assignment"));
          setDiagnosticSessions(visible.sessions.filter((s) => s.sessionType === "diagnostic"));
          setDiagnosticAssigned(Boolean(visible.board?.diagnosticAssigned));
          setDiagnosticInProgress(visible.diagnosticInProgress);
          setDiagnosticSave(null);
          setInProgressAssignmentIds(new Set());
          return;
        }

        const [assignmentRows, allSessions, board, progress, worksheetProgress] = await Promise.all([
          fetchAssignmentsForStudent(),
          fetchPracticeSessionsForStudent(),
          fetchWorkspaceBoard(profile.uid).catch(() => null),
          fetchDiagnosticProgress(profile.uid).catch(() => null),
          fetchWorksheetProgressForUser(profile.uid).catch(() => []),
        ]);
        if (cancelled) return;

        setAssignments(assignmentRows);
        setSelfSessions(allSessions.filter((s) => s.sessionType === "self"));
        setAssignmentSessions(allSessions.filter((s) => s.sessionType === "assignment"));
        setDiagnosticSessions(allSessions.filter((s) => s.sessionType === "diagnostic"));
        setDiagnosticAssigned(Boolean(board?.diagnosticAssigned));
        setDiagnosticInProgress(Boolean(progress));
        setDiagnosticSave(progress);
        setInProgressAssignmentIds(
          new Set(
            worksheetProgress
              .filter((save) => save.runSource === "assignment" && worksheetProgressIsStarted(save))
              .map((save) => save.scopeId),
          ),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load dashboard.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, viewAs]);

  const analytics = useMemo(
    () =>
      buildStudentDashboardAnalytics(
        selfSessions,
        assignmentSessions,
        assignments.filter((a) => a.status === "completed"),
        diagnosticSessions,
      ),
    [selfSessions, assignmentSessions, assignments, diagnosticSessions],
  );

  const nextAssignment = useMemo(() => getNextTodoAssignment(assignments), [assignments]);
  const resumeWorksheet =
    assignments.find(
      (assignment) => assignment.status === "todo" && inProgressAssignmentIds.has(assignment.id),
    ) ?? null;
  const leadWorksheet = resumeWorksheet ?? nextAssignment;
  const showDiagnosticLead = !leadWorksheet && (diagnosticInProgress || diagnosticAssigned);
  const diagnosticPlace = diagnosticSave ? diagnosticResumePlace(diagnosticExam, diagnosticSave) : null;
  const openCount = countOpenAssignments(assignments);
  const completedCount = assignments.filter((a) => a.status === "completed").length;
  const recentPreview = assignments.slice(0, PREVIEW_LIMIT);
  const goalPct = Math.min(
    100,
    Math.round((analytics.weeklyGoalProgress / analytics.weeklyGoalTarget) * 100),
  );

  const startAssignment = (assignment: WorksheetAssignment) => {
    if (preview) return;
    const state: WorksheetsLocationState = { autoStartAssignment: assignment };
    navigate("/worksheets", { state });
  };

  const openAssignmentResults = (assignment: WorksheetAssignment) => {
    const session = assignmentSessions.find((row) => row.assignmentId === assignment.id);
    const state: WorksheetsLocationState = session
      ? { reviewSession: session, returnTo: "/dashboard" }
      : { reviewAssignment: assignment, returnTo: "/dashboard" };
    navigate("/worksheets", { state });
  };

  if (loading) {
    return (
      <DashboardShell
        title={viewAs ? viewAs.displayName : "Dashboard"}
        subtitle={
          viewAs
            ? "Student view. Submitted work opens the same results the student sees."
            : "Your assigned practice and performance at a glance."
        }
      >
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardShell>
    );
  }

  if (error) {
    return (
      <DashboardShell
        title="Dashboard"
        subtitle={
          viewAs
            ? "Student view. Submitted work opens the same results the student sees."
            : "Your assigned practice and performance at a glance."
        }
      >
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title={viewAs ? viewAs.displayName : "Dashboard"}
      subtitle={
        viewAs
          ? "Student view. Submitted work opens the same results the student sees."
          : "Your assigned practice and performance at a glance."
      }
    >
      <div className="space-y-8">
        {leadWorksheet ? (
          <Card className="border-primary/20">
            <CardHeader>
              <p className="text-sm font-medium text-primary">
                {resumeWorksheet ? "Resume" : "Start"}
              </p>
              <CardTitle className="text-2xl">{leadWorksheet.title}</CardTitle>
              <CardDescription>
                From your tutor · {leadWorksheet.questionIds.length} questions
                {formatAssignmentDate(leadWorksheet)
                  ? ` · Assigned ${formatAssignmentDate(leadWorksheet)}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-start gap-3">
              <StatusPill tone={worksheetStatusTone(worksheetProgressStatus(leadWorksheet))}>
                {resumeWorksheet && worksheetProgressStatus(leadWorksheet) !== "due"
                  ? "In progress"
                  : worksheetStatusLabel(leadWorksheet)}
              </StatusPill>
              {preview ? (
                <p className="text-sm text-muted-foreground">
                  {viewAs?.displayName} starts this worksheet from their account.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <Button size="lg" onClick={() => startAssignment(leadWorksheet)}>
                    <Play className="h-5 w-5 mr-2" />
                    {resumeWorksheet ? "Resume" : "Start"}
                  </Button>
                  {diagnosticInProgress ? (
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/practice/diagnostic">Resume diagnostic</Link>
                    </Button>
                  ) : diagnosticAssigned ? (
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/practice/diagnostic">Open diagnostic</Link>
                    </Button>
                  ) : null}
                </div>
              )}
            </CardContent>
          </Card>
        ) : showDiagnosticLead ? null : (
          <Card>
            <CardHeader>
              <p className="text-sm font-medium text-primary">Start</p>
              <CardTitle className="text-2xl">Practice on your own</CardTitle>
              <CardDescription>No worksheet or diagnostic is waiting.</CardDescription>
            </CardHeader>
            {preview ? null : (
              <CardContent>
                <Button size="lg" asChild>
                  <Link to="/practice">
                    <Play className="h-5 w-5 mr-2" />
                    Start practice
                  </Link>
                </Button>
              </CardContent>
            )}
          </Card>
        )}

        {showDiagnosticLead ? (
        <Card className="border-primary/20">
          <CardHeader>
            <p className="text-sm font-medium text-primary">
              {diagnosticInProgress ? "Resume" : "Start"}
            </p>
            <CardTitle className="text-2xl">SHSAT diagnostic</CardTitle>
            <CardDescription>
              50 ELA · 50 Math · 180 minutes · scored after you submit
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-start gap-3">
            <StatusPill
              tone={diagnosticInProgress || diagnosticAssigned ? "progress" : "neutral"}
            >
              {diagnosticInProgress ? "In progress" : diagnosticAssigned ? "Assigned" : "Not assigned"}
            </StatusPill>
            <p className="text-sm text-muted-foreground">
              {preview
                ? diagnosticAssigned
                  ? "The diagnostic is assigned. Results show here after they submit."
                  : "The diagnostic is not assigned yet."
                : diagnosticAssignmentStatusLine(diagnosticAssigned, diagnosticInProgress)}
              {!preview && diagnosticPlace ? ` Saved at ${diagnosticPlace}.` : ""}
            </p>
            <div className="flex flex-wrap gap-2">
            {preview ? null : diagnosticInProgress ? (
              <Button size="lg" asChild>
                <Link to="/practice/diagnostic">
                  <Play className="h-5 w-5 mr-2" />
                  Resume diagnostic
                </Link>
              </Button>
            ) : diagnosticAssigned ? (
              <Button size="lg" asChild>
                <Link to="/practice/diagnostic">
                  <Play className="h-5 w-5 mr-2" />
                  Open diagnostic
                </Link>
              </Button>
            ) : (
              <Button size="lg" disabled>
                <Play className="h-5 w-5 mr-2" />
                Open diagnostic
              </Button>
            )}
            {diagnosticSessions.length === 1 ? (
              <Button size="lg" variant="outline" asChild>
                <Link
                  to="/practice/diagnostic"
                  state={{ reviewSession: diagnosticSessions[0] }}
                >
                  View results
                </Link>
              </Button>
            ) : diagnosticSessions.length > 1 ? (
              <>
                <Button size="lg" variant="outline" asChild>
                  <Link
                    to="/practice/diagnostic"
                    state={{
                      reviewSession: [...diagnosticSessions].sort(
                        (a, b) =>
                          (a.completedAt?.toMillis?.() ?? 0) - (b.completedAt?.toMillis?.() ?? 0),
                      )[0],
                    }}
                  >
                    Diagnostic results
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link
                    to="/practice/diagnostic"
                    state={{ reviewSession: diagnosticSessions[0] }}
                  >
                    View latest results
                  </Link>
                </Button>
              </>
            ) : null}
            </div>
          </CardContent>
        </Card>
        ) : null}

        {diagnosticSessions.length > 0 && !showDiagnosticLead ? (
          <Collapsible>
            <Card>
              <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 px-6 py-4 text-left">
                <span>
                  <span className="block text-lg font-semibold">Scores</span>
                  <span className="mt-1 block text-sm text-muted-foreground">
                    Diagnostic results from finished sittings
                  </span>
                </span>
                <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <CardContent className="flex flex-wrap gap-2 pt-0">
                  {diagnosticSessions.length === 1 ? (
                    <Button variant="outline" asChild>
                      <Link to="/practice/diagnostic" state={{ reviewSession: diagnosticSessions[0] }}>
                        View results
                      </Link>
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" asChild>
                        <Link
                          to="/practice/diagnostic"
                          state={{
                            reviewSession: [...diagnosticSessions].sort(
                              (a, b) =>
                                (a.completedAt?.toMillis?.() ?? 0) - (b.completedAt?.toMillis?.() ?? 0),
                            )[0],
                          }}
                        >
                          Diagnostic results
                        </Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link to="/practice/diagnostic" state={{ reviewSession: diagnosticSessions[0] }}>
                          View latest results
                        </Link>
                      </Button>
                    </>
                  )}
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ) : null}

        <section className="grid sm:grid-cols-2 gap-4">
          <StatTile
            label="To do"
            value={openCount}
            icon={Circle}
            hint="Assigned by your tutor"
          />
          <StatTile
            label="Completed"
            value={completedCount}
            icon={CheckCircle2}
            hint="All time"
          />
        </section>

        {preview ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Personal practice</CardTitle>
              <CardDescription>
                Self-practice stays on the student account and is not included in this view.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
        <section>
          <h2 className="text-lg font-semibold mb-1">Personal practice</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Self-practice stats only, not shared with your tutor.
          </p>
          <div className="grid sm:grid-cols-3 gap-4 mb-6">
            <StatTile
              label="Sessions this week"
              value={analytics.sessionsThisWeek}
              icon={TrendingUp}
              hint="Self-practice"
            />
            <StatTile
              label="Questions this week"
              value={analytics.questionsThisWeek}
              icon={Target}
              hint="Self-practice"
            />
            <StatTile
              label="Practice streak"
              value={`${analytics.practiceStreakDays} day${analytics.practiceStreakDays === 1 ? "" : "s"}`}
              icon={Flame}
              hint="Consecutive days"
            />
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Weekly goal</CardTitle>
                <CardDescription>
                  {WEEKLY_QUESTION_GOAL} questions in self-practice this week
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium tabular-nums">
                    {analytics.weeklyGoalProgress} / {analytics.weeklyGoalTarget}
                  </span>
                </div>
                <Progress value={goalPct} className="h-2" />
                <p className="text-xs text-muted-foreground">
                  {goalPct >= 100
                    ? "Goal reached, great work!"
                    : `${analytics.weeklyGoalTarget - analytics.weeklyGoalProgress} questions to go`}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Accuracy trend</CardTitle>
                <CardDescription>Last 5 self-practice sessions</CardDescription>
              </CardHeader>
              <CardContent>
                <AccuracyTrendChart points={analytics.accuracyTrend} />
              </CardContent>
            </Card>
          </div>
        </section>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent activity</CardTitle>
            <CardDescription>Latest completed assignment and self-practice</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentActivity.length === 0 ? (
              <div className="py-2 text-center space-y-1">
                <p className="font-medium">No results yet</p>
                <p className="text-sm text-muted-foreground">
                  {preview
                    ? "Results show here after they submit a worksheet or diagnostic."
                    : "Finish a worksheet to see them here."}
                </p>
              </div>
            ) : (
              <ul className="divide-y">
                {analytics.recentActivity.map((item, i) => (
                  <li
                    key={`${item.kind}-${item.title}-${i}`}
                    className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge
                          variant={
                            item.kind === "assignment"
                              ? "default"
                              : item.kind === "diagnostic"
                                ? "default"
                                : "secondary"
                          }
                        >
                          {item.kind === "assignment"
                            ? "Assignment"
                            : item.kind === "diagnostic"
                              ? "Diagnostic"
                              : "Self-practice"}
                        </Badge>
                        <span className="text-sm text-muted-foreground">{item.dateLabel}</span>
                      </div>
                      <p className="font-medium truncate">{item.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.questionsAnswered} questions
                        {item.accuracyPct > 0 ? ` · ${item.accuracyPct}% accuracy` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        {assignments.length > 0 && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div>
                <CardTitle className="text-lg">Recent assignments</CardTitle>
                <CardDescription>Latest from your tutor</CardDescription>
              </div>
              <Button variant="ghost" size="sm" asChild>
                <Link to="/worksheets">
                  View all
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              <ul className="divide-y">
                {recentPreview.map((row) => (
                  <li
                    key={row.id}
                    className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{row.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.questionIds.length} questions
                        {formatAssignmentDate(row) ? ` · ${formatAssignmentDate(row)}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <StatusPill tone={worksheetStatusTone(worksheetProgressStatus(row))}>
                        {worksheetProgressStatus(row) === "assigned" && inProgressAssignmentIds.has(row.id)
                          ? "In progress"
                          : worksheetStatusLabel(row)}
                      </StatusPill>
                      {row.status === "completed" ? (
                        <Button size="sm" variant="outline" onClick={() => openAssignmentResults(row)}>
                          View results
                        </Button>
                      ) : null}
                      {row.status === "todo" && !preview ? (
                        <Button size="sm" variant="outline" onClick={() => startAssignment(row)}>
                          {inProgressAssignmentIds.has(row.id) ? "Resume" : "Start"}
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardShell>
  );
}
