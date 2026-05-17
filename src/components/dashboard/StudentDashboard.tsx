import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Flame,
  Loader2,
  Play,
  Target,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { DashboardShell } from "./DashboardShell";
import { StatTile } from "./StatTile";
import { AccuracyTrendChart } from "./AccuracyTrendChart";
import { fetchAssignmentsForStudent } from "@/lib/assignmentService";
import { fetchPracticeSessionsForStudent } from "@/lib/practiceSessionService";
import {
  buildStudentDashboardAnalytics,
  WEEKLY_QUESTION_GOAL,
} from "@/lib/dashboardAnalytics";
import {
  countOpenAssignments,
  formatAssignmentDate,
  getNextTodoAssignment,
} from "@/lib/dashboardStats";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { WorksheetsLocationState } from "@/types/worksheetsNavigation";

const PREVIEW_LIMIT = 3;

export function StudentDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<WorksheetAssignment[]>([]);
  const [selfSessions, setSelfSessions] = useState<PracticeSessionRecord[]>([]);
  const [assignmentSessions, setAssignmentSessions] = useState<PracticeSessionRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [assignmentRows, allSessions] = await Promise.all([
          fetchAssignmentsForStudent(),
          fetchPracticeSessionsForStudent(),
        ]);
        if (cancelled) return;

        setAssignments(assignmentRows);
        setSelfSessions(allSessions.filter((s) => s.sessionType === "self"));
        setAssignmentSessions(allSessions.filter((s) => s.sessionType === "assignment"));
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
  }, []);

  const analytics = useMemo(
    () =>
      buildStudentDashboardAnalytics(
        selfSessions,
        assignmentSessions,
        assignments.filter((a) => a.status === "completed"),
      ),
    [selfSessions, assignmentSessions, assignments],
  );

  const nextAssignment = useMemo(() => getNextTodoAssignment(assignments), [assignments]);
  const openCount = countOpenAssignments(assignments);
  const completedCount = assignments.filter((a) => a.status === "completed").length;
  const recentPreview = assignments.slice(0, PREVIEW_LIMIT);
  const goalPct = Math.min(
    100,
    Math.round((analytics.weeklyGoalProgress / analytics.weeklyGoalTarget) * 100),
  );

  const startAssignment = (assignment: WorksheetAssignment) => {
    const state: WorksheetsLocationState = { autoStartAssignment: assignment };
    navigate("/worksheets", { state });
  };

  if (loading) {
    return (
      <DashboardShell
        title="Student Dashboard"
        subtitle="Your assigned practice and performance at a glance."
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
        title="Student Dashboard"
        subtitle="Your assigned practice and performance at a glance."
      >
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Student Dashboard"
      subtitle="Your assigned practice and performance at a glance."
    >
      <div className="space-y-8">
        {nextAssignment ? (
          <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent shadow-md">
            <CardHeader>
              <p className="text-xs font-medium text-primary uppercase tracking-wide">
                Up next
              </p>
              <CardTitle className="text-2xl">{nextAssignment.title}</CardTitle>
              <CardDescription>
                From your tutor · {nextAssignment.questionIds.length} questions
                {formatAssignmentDate(nextAssignment)
                  ? ` · Assigned ${formatAssignmentDate(nextAssignment)}`
                  : ""}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button size="lg" onClick={() => startAssignment(nextAssignment)}>
                <Play className="h-5 w-5 mr-2" />
                Start assignment
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="border-dashed">
            <CardContent className="py-8 text-center">
              <CheckCircle2 className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">You&apos;re all caught up!</p>
              <p className="text-sm text-muted-foreground mt-1">
                No open assignments — practice on your own or check back later.
              </p>
            </CardContent>
          </Card>
        )}

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

        <section>
          <h2 className="text-lg font-semibold mb-1">Personal practice</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Self-practice stats only — not shared with your tutor.
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
                    ? "Goal reached — great work!"
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

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent activity</CardTitle>
            <CardDescription>Latest completed assignment and self-practice</CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.recentActivity.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                Finish a worksheet to see your activity here.
              </p>
            ) : (
              <ul className="divide-y">
                {analytics.recentActivity.map((item, i) => (
                  <li
                    key={`${item.kind}-${item.title}-${i}`}
                    className="py-3 flex items-center justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant={item.kind === "assignment" ? "default" : "secondary"}>
                          {item.kind === "assignment" ? "Assignment" : "Self-practice"}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{item.dateLabel}</span>
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
                      <Badge variant={row.status === "completed" ? "secondary" : "default"}>
                        {row.status === "completed" ? "Done" : "To Do"}
                      </Badge>
                      {row.status === "todo" && (
                        <Button size="sm" variant="outline" onClick={() => startAssignment(row)}>
                          Start
                        </Button>
                      )}
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
