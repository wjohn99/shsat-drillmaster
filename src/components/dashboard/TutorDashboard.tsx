import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  Circle,
  ClipboardList,
  Eye,
  Loader2,
  Tags,
  TrendingDown,
  Users,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DashboardShell } from "./DashboardShell";
import { StatTile } from "./StatTile";
import {
  fetchAssignmentsForTutor,
  fetchStudents,
} from "@/lib/assignmentService";
import { fetchPracticeSessionsForTutor } from "@/lib/practiceSessionService";
import { buildTutorDashboardAnalytics } from "@/lib/dashboardAnalytics";
import {
  countCompletedThisWeek,
  countOpenAssignments,
  formatAssignmentDate,
} from "@/lib/dashboardStats";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { StudentOption, TutorAssignmentRow } from "@/types/assignment";
import type { WorksheetsLocationState } from "@/types/worksheetsNavigation";
import { Button } from "@/components/ui/button";

const RECENT_LIMIT = 10;

export function TutorDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [allAssignments, setAllAssignments] = useState<TutorAssignmentRow[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [studentList, assignments] = await Promise.all([
          fetchStudents(),
          fetchAssignmentsForTutor(),
        ]);

        let sessionRows: PracticeSessionRecord[] = [];
        try {
          sessionRows = await fetchPracticeSessionsForTutor();
        } catch {
          // Sessions are optional for the dashboard; assignments still drive most views.
          sessionRows = [];
        }

        if (cancelled) return;

        const nameByUid = new Map(studentList.map((s) => [s.uid, s.displayName]));
        const rows: TutorAssignmentRow[] = assignments.map((a) => ({
          ...a,
          studentName: nameByUid.get(a.assignedToStudentUid) ?? "Student",
        }));

        setStudents(studentList);
        setAllAssignments(rows);
        setSessions(sessionRows);
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
    () => buildTutorDashboardAnalytics(students, allAssignments, sessions),
    [students, allAssignments, sessions],
  );

  const recentAssignments = useMemo(
    () => allAssignments.slice(0, RECENT_LIMIT),
    [allAssignments],
  );

  const stats = useMemo(
    () => ({
      students: students.length,
      open: countOpenAssignments(allAssignments),
      completedWeek: countCompletedThisWeek(allAssignments),
    }),
    [students.length, allAssignments],
  );

  if (loading) {
    return (
      <DashboardShell
        title="Tutor Dashboard"
        subtitle="Manage worksheets and track student progress."
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
        title="Tutor Dashboard"
        subtitle="Manage worksheets and track student progress."
      >
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Tutor Dashboard"
      subtitle="Manage worksheets and track student progress."
    >
      <div className="space-y-8">
        <section className="grid sm:grid-cols-3 gap-4">
          <StatTile label="Students" value={stats.students} icon={Users} />
          <StatTile
            label="Open assignments"
            value={stats.open}
            icon={Circle}
            hint="Awaiting student completion"
          />
          <StatTile
            label="Completed this week"
            value={stats.completedWeek}
            icon={CheckCircle2}
            hint="Last 7 days"
          />
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Student progress
            </CardTitle>
            <CardDescription>
              Per-student overview from assignments and completed practice sessions
            </CardDescription>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {analytics.studentRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No students yet. Ask learners to sign in with Google first.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead className="text-right">Open</TableHead>
                    <TableHead>Last active</TableHead>
                    <TableHead className="text-right">Avg accuracy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {analytics.studentRows.map((row) => (
                    <TableRow key={row.studentUid}>
                      <TableCell>
                        <div className="font-medium">{row.name}</div>
                        {row.email && (
                          <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                            {row.email}
                          </p>
                        )}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.openAssignments}
                      </TableCell>
                      <TableCell>{row.lastActiveLabel}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.avgAccuracy !== null ? `${row.avgAccuracy}%` : "—"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className={analytics.attentionItems.length > 0 ? "border-amber-500/40" : undefined}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
              Needs attention
            </CardTitle>
            <CardDescription>
              Past-due assignments and open work with no recent practice
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.attentionItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-2">
                All students are on track — no overdue assignments right now.
              </p>
            ) : (
              <ul className="divide-y">
                {analytics.attentionItems.map((item) => (
                  <li
                    key={`${item.assignmentId}-${item.reason}`}
                    className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{item.assignmentTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.studentName} · {item.detail}
                      </p>
                    </div>
                    <Badge variant={item.reason === "overdue" ? "destructive" : "secondary"}>
                      {item.reason === "overdue" ? "Overdue" : "Stale"}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <section className="grid lg:grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Tags className="h-5 w-5 text-primary" />
                Most assigned tags
              </CardTitle>
              <CardDescription>Top skills across worksheets you assigned</CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.mostAssignedTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tag data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {analytics.mostAssignedTags.map((tag) => (
                    <li
                      key={tag.tagCode}
                      className="flex items-center justify-between text-sm gap-2"
                    >
                      <span className="truncate">{tag.label}</span>
                      <Badge variant="outline">{tag.count} assignments</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <TrendingDown className="h-5 w-5 text-primary" />
                Weakest tags (class)
              </CardTitle>
              <CardDescription>
                Lowest accuracy on assigned work (min. 3 attempts per tag)
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.weakestClassTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Not enough completed practice yet to rank weak tags.
                </p>
              ) : (
                <ul className="space-y-2">
                  {analytics.weakestClassTags.map((tag) => (
                    <li
                      key={tag.tagCode}
                      className="flex items-center justify-between text-sm gap-2"
                    >
                      <span className="truncate">{tag.label}</span>
                      <Badge variant="secondary">{tag.accuracy}% accuracy</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Recent assignments
            </CardTitle>
            <CardDescription>Last {RECENT_LIMIT} worksheets you sent</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAssignments.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No assignments yet. Create one and assign it to a student.
              </p>
            ) : (
              <ul className="divide-y">
                {recentAssignments.map((row) => (
                  <li
                    key={row.id}
                    className="py-3 flex items-start justify-between gap-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium truncate">{row.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {row.studentName} · {row.questionIds.length} questions
                        {formatAssignmentDate(row) ? ` · ${formatAssignmentDate(row)}` : ""}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge variant={row.status === "completed" ? "secondary" : "default"}>
                        {row.status === "completed" ? (
                          <>
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Done
                          </>
                        ) : (
                          <>
                            <Circle className="h-3 w-3 mr-1" />
                            To Do
                          </>
                        )}
                      </Badge>
                      {row.status === "completed" ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            navigate("/worksheets", {
                              state: {
                                reviewAssignment: row,
                              } satisfies WorksheetsLocationState,
                            })
                          }
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          Review
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
