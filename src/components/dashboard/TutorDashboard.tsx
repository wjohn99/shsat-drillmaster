import { Fragment, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoTutorial } from "@/contexts/DemoTutorialContext";
import { useQuestionReports } from "@/contexts/QuestionReportsContext";
import { questionReportReasonLabel } from "@/types/questionReport";
import { toast } from "@/hooks/use-toast";
import { CheckCircle2, Circle, Eye, Loader2 } from "lucide-react";
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
import {
  fetchAssignmentsForTutor,
  fetchStudents,
} from "@/lib/assignmentService";
import { fetchPracticeSessionsForTutor } from "@/lib/practiceSessionService";
import { fetchDiagnosticProgressForTutor } from "@/lib/diagnosticProgressService";
import { buildTutorDashboardAnalytics, DIAGNOSTIC_STATUS_LABEL } from "@/lib/dashboardAnalytics";
import { ensureDemoSandbox } from "@/lib/demoSandbox";
import {
  fetchAllWorkspaceBoards,
  isDemoAccountBoard,
  studentUidsAssignedToTutor,
} from "@/lib/workspaceService";
import {
  countCompletedThisWeek,
  countOpenAssignments,
  formatAssignmentDate,
  worksheetProgressStatus,
  WORKSHEET_PROGRESS_LABEL,
} from "@/lib/dashboardStats";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { StudentOption, TutorAssignmentRow } from "@/types/assignment";
import { StudentQuickActions } from "@/components/workspace/StudentQuickActions";
import { WorksheetEmptyState } from "@/components/worksheets/WorksheetEmptyState";
import { assignToStudentNavState, type WorksheetsLocationState } from "@/types/worksheetsNavigation";
import { Button } from "@/components/ui/button";

const RECENT_LIMIT = 10;

function studentOptionFromBoard(
  board: { studentUid: string; studentName: string; studentEmail: string } | undefined,
  uid: string,
): StudentOption {
  return {
    uid,
    displayName: board?.studentName || "Student",
    email: board?.studentEmail || "",
  };
}

export function TutorDashboard() {
  const navigate = useNavigate();
  const { enterDemoMode, demoBusy, profile } = useAuth();
  const { startTutorial } = useDemoTutorial();
  const { openReports } = useQuestionReports();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [students, setStudents] = useState<StudentOption[]>([]);
  const [allAssignments, setAllAssignments] = useState<TutorAssignmentRow[]>([]);
  const [sessions, setSessions] = useState<PracticeSessionRecord[]>([]);
  const [diagnosticInProgressUids, setDiagnosticInProgressUids] = useState<string[]>([]);
  const [diagnosticAssignedUids, setDiagnosticAssignedUids] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (profile?.role === "demo" && profile.uid) {
          const boards = await ensureDemoSandbox(profile.uid);
          const assignments = await fetchAssignmentsForTutor().catch(() => []);
          if (cancelled) return;
          const assignedStudents = boards
            .map((board) => studentOptionFromBoard(board, board.studentUid))
            .sort((a, b) => a.displayName.localeCompare(b.displayName));
          const nameByUid = new Map(assignedStudents.map((student) => [student.uid, student.displayName]));
          const sandboxUids = new Set(assignedStudents.map((student) => student.uid));
          setStudents(assignedStudents);
          setAllAssignments(
            assignments
              .filter((assignment) => sandboxUids.has(assignment.assignedToStudentUid))
              .map((assignment) => ({
                ...assignment,
                studentName: nameByUid.get(assignment.assignedToStudentUid) ?? "Student",
              })),
          );
          setSessions([]);
          setDiagnosticInProgressUids([]);
          setDiagnosticAssignedUids(
            boards.filter((board) => board.diagnosticAssigned).map((board) => board.studentUid),
          );
          return;
        }

        const [studentList, assignments, boards] = await Promise.all([
          fetchStudents(),
          fetchAssignmentsForTutor(),
          fetchAllWorkspaceBoards().catch(() => []),
        ]);

        let sessionRows: PracticeSessionRecord[] = [];
        let inProgressUids: string[] = [];
        try {
          sessionRows = await fetchPracticeSessionsForTutor();
        } catch {
          sessionRows = [];
        }
        try {
          inProgressUids = (await fetchDiagnosticProgressForTutor()).map((row) => row.userId);
        } catch {
          inProgressUids = [];
        }

        if (cancelled) return;

        const hiddenDemoUids = new Set(
          boards
            .filter((board) => isDemoAccountBoard(board, profile?.uid))
            .map((board) => board.studentUid),
        );
        const visibleBoards = boards.filter((board) => !hiddenDemoUids.has(board.studentUid));
        const assignedStudentUids = studentUidsAssignedToTutor(visibleBoards, profile?.uid);
        const studentByUid = new Map(studentList.map((s) => [s.uid, s]));
        const boardByStudent = new Map(visibleBoards.map((board) => [board.studentUid, board]));
        const assignedStudents: StudentOption[] = [...assignedStudentUids]
          .map((uid) => studentByUid.get(uid) ?? studentOptionFromBoard(boardByStudent.get(uid), uid))
          .sort((a, b) => a.displayName.localeCompare(b.displayName));
        const nameByUid = new Map(assignedStudents.map((s) => [s.uid, s.displayName]));
        const rows: TutorAssignmentRow[] = assignments
          .filter((a) => assignedStudentUids.has(a.assignedToStudentUid))
          .map((a) => ({
            ...a,
            studentName: nameByUid.get(a.assignedToStudentUid) ?? "Student",
          }));

        setStudents(assignedStudents);
        setAllAssignments(rows);
        setSessions(sessionRows.filter((session) => assignedStudentUids.has(session.userId)));
        setDiagnosticInProgressUids(inProgressUids.filter((uid) => assignedStudentUids.has(uid)));
        setDiagnosticAssignedUids(
          visibleBoards
            .filter((board) => board.diagnosticAssigned && assignedStudentUids.has(board.studentUid))
            .map((board) => board.studentUid),
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
  }, [profile?.role, profile?.uid]);

  const analytics = useMemo(
    () =>
      buildTutorDashboardAnalytics(
        students,
        allAssignments,
        sessions,
        diagnosticInProgressUids,
        diagnosticAssignedUids,
      ),
    [students, allAssignments, sessions, diagnosticInProgressUids, diagnosticAssignedUids],
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
        title="Dashboard"
        subtitle="Your class, what needs a look, and the worksheets you just sent."
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
        subtitle="Your class, what needs a look, and the worksheets you just sent."
      >
        <Card className="border-destructive/30">
          <CardContent className="py-8 text-center text-muted-foreground">{error}</CardContent>
        </Card>
      </DashboardShell>
    );
  }

  const headerActions =
    profile?.role === "tutor" ? (
      <Button
        type="button"
        variant="outline"
        disabled={demoBusy}
        onClick={() => {
          void (async () => {
            try {
              await enterDemoMode();
              navigate("/dashboard", { replace: true });
            } catch (err) {
              toast({
                title: "Could not open demo account mode",
                description: err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
              });
            }
          })();
        }}
      >
        {demoBusy ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Opening demo…
          </>
        ) : (
          "Enter demo account"
        )}
      </Button>
    ) : profile?.role === "demo" ? (
      <Button type="button" variant="outline" onClick={startTutorial}>
        Review the tutorial
      </Button>
    ) : null;

  return (
    <DashboardShell
      title="Dashboard"
      subtitle="Your class, what needs a look, and the worksheets you just sent."
      actions={headerActions}
    >
      <div className="space-y-10">
        <section
          aria-label="Class snapshot"
          className="grid grid-cols-1 divide-y overflow-hidden rounded-xl border glass-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {[
            { label: "Students", value: stats.students, hint: "In this class" },
            { label: "Open assignments", value: stats.open, hint: "Waiting on a student" },
            { label: "Completed this week", value: stats.completedWeek, hint: "Last 7 days" },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-4">
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {stat.label}
              </p>
              <p className="mt-1.5 font-serif text-3xl font-semibold tabular-nums tracking-tight">
                {stat.value}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.hint}</p>
            </div>
          ))}
        </section>

        <Card data-tour="student-progress">
          <CardHeader>
            <CardTitle className="text-lg">Student progress</CardTitle>
            <CardDescription>
              Diagnostic, open worksheets, and results for each board
            </CardDescription>
          </CardHeader>
          <CardContent>
            {analytics.studentRows.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No students assigned to you yet. Add a student from Workspace, or ask another tutor
                to assign you their board.
              </p>
            ) : (
              <>
                <div className="space-y-3 lg:hidden">
                  {analytics.studentRows.map((row) => (
                    <div key={row.studentUid} className="space-y-3 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="font-medium">{row.name}</p>
                        {row.email ? (
                          <p className="truncate text-xs text-muted-foreground">{row.email}</p>
                        ) : null}
                      </div>
                      <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                        <div>
                          <dt className="text-xs text-muted-foreground">Diagnostic</dt>
                          <dd className="mt-1">
                            <Badge
                              variant={
                                row.diagnosticStatus === "finished"
                                  ? "secondary"
                                  : row.diagnosticStatus === "started"
                                    ? "default"
                                    : "outline"
                              }
                            >
                              {DIAGNOSTIC_STATUS_LABEL[row.diagnosticStatus]}
                            </Badge>
                          </dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Open</dt>
                          <dd className="mt-1 tabular-nums">{row.openAssignments}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Last active</dt>
                          <dd className="mt-1">{row.lastActiveLabel}</dd>
                        </div>
                        <div>
                          <dt className="text-xs text-muted-foreground">Avg accuracy</dt>
                          <dd className="mt-1 tabular-nums">
                            {row.avgAccuracy !== null ? `${row.avgAccuracy}%` : "-"}
                          </dd>
                        </div>
                      </dl>
                      <StudentQuickActions
                        compact
                        studentUid={row.studentUid}
                        studentName={row.name}
                        studentEmail={row.email}
                        lastSession={row.lastSession}
                        lastCompletedAssignment={row.lastCompletedAssignment}
                        firstDiagnostic={row.firstDiagnostic}
                        latestDiagnostic={row.latestDiagnostic}
                      />
                    </div>
                  ))}
                </div>
                <div className="hidden lg:block">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Diagnostic</TableHead>
                        <TableHead className="text-right">Open</TableHead>
                        <TableHead>Last active</TableHead>
                        <TableHead className="text-right">Avg accuracy</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {analytics.studentRows.map((row) => (
                        <Fragment key={row.studentUid}>
                          <TableRow className="border-b-0 hover:bg-transparent">
                            <TableCell className="pb-2">
                              <div className="font-medium">{row.name}</div>
                              {row.email ? (
                                <p className="max-w-[220px] truncate text-xs text-muted-foreground">
                                  {row.email}
                                </p>
                              ) : null}
                            </TableCell>
                            <TableCell className="pb-2">
                              <Badge
                                variant={
                                  row.diagnosticStatus === "finished"
                                    ? "secondary"
                                    : row.diagnosticStatus === "started"
                                      ? "default"
                                      : "outline"
                                }
                              >
                                {DIAGNOSTIC_STATUS_LABEL[row.diagnosticStatus]}
                              </Badge>
                            </TableCell>
                            <TableCell className="pb-2 text-right tabular-nums">
                              {row.openAssignments}
                            </TableCell>
                            <TableCell className="pb-2">{row.lastActiveLabel}</TableCell>
                            <TableCell className="pb-2 text-right tabular-nums">
                              {row.avgAccuracy !== null ? `${row.avgAccuracy}%` : "-"}
                            </TableCell>
                          </TableRow>
                          <TableRow className="hover:bg-transparent">
                            <TableCell colSpan={5} className="px-4 pb-4 pt-0">
                              <StudentQuickActions
                                compact
                                studentUid={row.studentUid}
                                studentName={row.name}
                                studentEmail={row.email}
                                lastSession={row.lastSession}
                                lastCompletedAssignment={row.lastCompletedAssignment}
                                firstDiagnostic={row.firstDiagnostic}
                                latestDiagnostic={row.latestDiagnostic}
                              />
                            </TableCell>
                          </TableRow>
                        </Fragment>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <section className="grid items-start gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Needs attention
                {analytics.attentionItems.length > 0 ? (
                  <Badge variant="secondary">{analytics.attentionItems.length}</Badge>
                ) : null}
              </CardTitle>
              <CardDescription>
                Past-due assignments and open work with no recent practice
              </CardDescription>
            </CardHeader>
            <CardContent>
              {analytics.attentionItems.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing is overdue, and no open worksheet has gone quiet.
                </p>
              ) : (
                <ul className="divide-y">
                  {analytics.attentionItems.map((item) => (
                    <li
                      key={`${item.assignmentId}-${item.reason}`}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{item.assignmentTitle}</p>
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

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                Question reports
                {openReports.length > 0 ? (
                  <Badge variant="secondary">{openReports.length}</Badge>
                ) : null}
              </CardTitle>
              <CardDescription>
                Open a report to read the note from the practice screen.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {openReports.length === 0 ? (
                <p className="text-sm text-muted-foreground">No open reports right now.</p>
              ) : (
                <>
                  <ul className="divide-y">
                    {openReports.slice(0, 8).map((report) => (
                      <li
                        key={report.id}
                        className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium">{report.questionId}</p>
                          <p className="truncate text-sm text-muted-foreground">
                            {questionReportReasonLabel(report.reason)} · {report.reporterName}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/question/${report.questionId}?practice=true`)}
                        >
                          Open
                        </Button>
                      </li>
                    ))}
                  </ul>
                  {openReports.length > 8 ? (
                    <p className="mt-3 text-xs text-muted-foreground">
                      Showing 8 of {openReports.length}
                    </p>
                  ) : null}
                </>
              )}
            </CardContent>
          </Card>
        </section>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent assignments</CardTitle>
            <CardDescription>Last {RECENT_LIMIT} worksheets you sent</CardDescription>
          </CardHeader>
          <CardContent>
            {recentAssignments.length === 0 ? (
              <WorksheetEmptyState
                role="tutor"
                onCreate={() => navigate("/worksheets", { state: assignToStudentNavState() })}
              />
            ) : (
              <ul className="divide-y">
                {recentAssignments.map((row) => {
                  const progress = worksheetProgressStatus(row);
                  return (
                    <li
                      key={row.id}
                      className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{row.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {row.studentName} · {row.questionIds.length} questions
                          {formatAssignmentDate(row) ? ` · ${formatAssignmentDate(row)}` : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge
                          variant={
                            progress === "done"
                              ? "secondary"
                              : progress === "due"
                                ? "destructive"
                                : "default"
                          }
                        >
                          {progress === "done" ? (
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                          ) : (
                            <Circle className="mr-1 h-3 w-3" />
                          )}
                          {WORKSHEET_PROGRESS_LABEL[progress]}
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
                            <Eye className="mr-1 h-3 w-3" />
                            View last results
                          </Button>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Class skills</CardTitle>
            <CardDescription>
              What you assign most, and where accuracy is lowest.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-8 lg:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Most assigned</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Top skills across worksheets you assigned
              </p>
              {analytics.mostAssignedTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">No tag data yet.</p>
              ) : (
                <ul className="space-y-2">
                  {analytics.mostAssignedTags.map((tag) => (
                    <li
                      key={tag.tagCode}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{tag.label}</span>
                      <Badge variant="outline">{tag.count} assignments</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="border-t pt-6 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
              <p className="text-sm font-medium">Weakest</p>
              <p className="mb-3 text-xs text-muted-foreground">
                Lowest accuracy on assigned work, at least 3 attempts per tag
              </p>
              {analytics.weakestClassTags.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Not enough completed practice yet to rank weak tags.
                </p>
              ) : (
                <ul className="space-y-2">
                  {analytics.weakestClassTags.map((tag) => (
                    <li
                      key={tag.tagCode}
                      className="flex items-center justify-between gap-2 text-sm"
                    >
                      <span className="truncate">{tag.label}</span>
                      <Badge variant="secondary">{tag.accuracy}% accuracy</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
