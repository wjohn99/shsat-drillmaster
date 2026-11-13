import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useDemoTutorial } from "@/contexts/DemoTutorialContext";
import { useQuestionReports } from "@/contexts/QuestionReportsContext";
import { questionReportReasonLabel } from "@/types/questionReport";
import { toast } from "@/hooks/use-toast";
import { ClipboardList, Eye, Loader2, UserPlus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusPill, diagnosticStatusTone, worksheetStatusTone } from "@/components/status/StatusPill";
import { DashboardEmpty } from "./DashboardEmpty";
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
  isWorkspaceBoardArchived,
  studentUidsAssignedToTutor,
} from "@/lib/workspaceService";
import {
  countCompletedThisWeek,
  countOpenAssignments,
  formatAssignmentDate,
  hasOpenAssignmentDueToday,
  isAssignmentDueOnLocalDay,
  pickCurrentOpenAssignment,
  worksheetProgressStatus,
  worksheetStatusLabel,
} from "@/lib/dashboardStats";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { StudentOption, TutorAssignmentRow } from "@/types/assignment";
import { StudentQuickActions } from "@/components/workspace/StudentQuickActions";
import { openCurrentWorksheetNavState } from "@/types/worksheetsNavigation";
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
  const [archivedStudentCount, setArchivedStudentCount] = useState(0);
  const [dueTodayOnly, setDueTodayOnly] = useState(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        if (profile?.role === "demo" && profile.uid) {
          const sandboxBoards = await ensureDemoSandbox(profile.uid);
          const boards = sandboxBoards.filter((board) => !isWorkspaceBoardArchived(board));
          setArchivedStudentCount(
            new Set(
              sandboxBoards
                .filter((board) => isWorkspaceBoardArchived(board))
                .map((board) => board.studentUid),
            ).size,
          );
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
        const classBoards = boards.filter((board) => !hiddenDemoUids.has(board.studentUid));
        const visibleBoards = classBoards.filter((board) => !isWorkspaceBoardArchived(board));
        const assignedStudentUids = studentUidsAssignedToTutor(visibleBoards, profile?.uid);
        setArchivedStudentCount(
          studentUidsAssignedToTutor(
            classBoards.filter((board) => isWorkspaceBoardArchived(board)),
            profile?.uid,
          ).size,
        );
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

  const currentAssignmentByStudent = useMemo(() => {
    const grouped = new Map<string, TutorAssignmentRow[]>();
    for (const assignment of allAssignments) {
      const list = grouped.get(assignment.assignedToStudentUid) ?? [];
      list.push(assignment);
      grouped.set(assignment.assignedToStudentUid, list);
    }
    const current = new Map<string, TutorAssignmentRow>();
    for (const [uid, rows] of grouped) {
      const picked = pickCurrentOpenAssignment(rows);
      if (picked) current.set(uid, picked);
    }
    return current;
  }, [allAssignments]);

  const dueTodayStudentUids = useMemo(() => {
    const grouped = new Map<string, TutorAssignmentRow[]>();
    for (const assignment of allAssignments) {
      const list = grouped.get(assignment.assignedToStudentUid) ?? [];
      list.push(assignment);
      grouped.set(assignment.assignedToStudentUid, list);
    }
    return new Set(
      [...grouped.entries()]
        .filter(([, rows]) => hasOpenAssignmentDueToday(rows))
        .map(([uid]) => uid),
    );
  }, [allAssignments]);

  const dueTodayLead = useMemo(
    () =>
      analytics.studentRows.flatMap((row) => {
        if (!dueTodayStudentUids.has(row.studentUid)) return [];
        return allAssignments
          .filter(
            (assignment) =>
              assignment.assignedToStudentUid === row.studentUid &&
              assignment.status === "todo" &&
              isAssignmentDueOnLocalDay(assignment),
          )
          .map((assignment) => ({ row, assignment }));
      }),
    [allAssignments, analytics.studentRows, dueTodayStudentUids],
  );

  const visibleStudentRows = useMemo(
    () =>
      dueTodayOnly
        ? analytics.studentRows.filter((row) => dueTodayStudentUids.has(row.studentUid))
        : analytics.studentRows,
    [analytics.studentRows, dueTodayOnly, dueTodayStudentUids],
  );

  const stats = useMemo(() => {
    const finishedClass = students.length === 0 && archivedStudentCount > 0;
    return {
      students: finishedClass ? archivedStudentCount : students.length,
      open: countOpenAssignments(allAssignments),
      completedWeek: countCompletedThisWeek(allAssignments),
      archivedHint: finishedClass
        ? "Finished, still saved"
        : archivedStudentCount === 1
          ? "1 finished student, still saved"
          : archivedStudentCount > 1
            ? `${archivedStudentCount} finished students, still saved`
            : "In this class",
    };
  }, [students.length, allAssignments, archivedStudentCount]);

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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Due today</CardTitle>
            {dueTodayLead.length > 0 ? (
              <CardDescription>
                {dueTodayLead.length === 1
                  ? "1 student has a worksheet due today."
                  : `${dueTodayLead.length} worksheets are due today.`}
              </CardDescription>
            ) : null}
          </CardHeader>
          <CardContent>
            {dueTodayLead.length === 0 ? (
              <DashboardEmpty icon={ClipboardList}>No worksheets are due today.</DashboardEmpty>
            ) : (
              <ul className="divide-y">
                {dueTodayLead.map(({ row, assignment }) => (
                  <li
                    key={assignment.id}
                    className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{row.name}</p>
                      <p className="text-sm text-muted-foreground">{assignment.title}</p>
                    </div>
                    <Button variant="outline" size="sm" asChild>
                      <Link
                        to="/worksheets"
                        state={openCurrentWorksheetNavState(assignment, { returnTo: "/dashboard" })}
                        aria-label={
                          assignment.title
                            ? `Open worksheet: ${assignment.title}`
                            : "Open worksheet"
                        }
                      >
                        Open worksheet
                      </Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <section
          aria-label="Class snapshot"
          className="grid grid-cols-1 divide-y overflow-hidden rounded-xl border glass-surface sm:grid-cols-3 sm:divide-x sm:divide-y-0"
        >
          {[
            { label: "Students", value: stats.students, hint: stats.archivedHint },
            { label: "Open assignments", value: stats.open, hint: "Waiting on a student" },
            { label: "Completed this week", value: stats.completedWeek, hint: "Last 7 days" },
          ].map((stat) => (
            <div key={stat.label} className="px-5 py-4">
              <p className="text-sm font-medium text-muted-foreground">
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
          <CardHeader className="space-y-0 gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="space-y-1.5">
              <CardTitle className="text-lg">Student progress</CardTitle>
              <CardDescription>
                {dueTodayOnly
                  ? "Students with a worksheet due today"
                  : "Diagnostic, open worksheets, and results for each board"}
              </CardDescription>
            </div>
            {analytics.studentRows.length > 0 ? (
              <Button
                type="button"
                size="sm"
                variant={dueTodayOnly ? "default" : "outline"}
                aria-pressed={dueTodayOnly}
                className="shrink-0"
                onClick={() => setDueTodayOnly((on) => !on)}
              >
                Due today
                {dueTodayStudentUids.size > 0 ? ` (${dueTodayStudentUids.size})` : ""}
              </Button>
            ) : null}
          </CardHeader>
          <CardContent>
            {analytics.studentRows.length === 0 ? (
              <DashboardEmpty icon={UserPlus}>
                {archivedStudentCount > 0
                  ? archivedStudentCount === 1
                    ? "No active students. 1 finished student is still saved."
                    : `No active students. ${archivedStudentCount} finished students are still saved.`
                  : "No students yet, add one from Workspace or ask another tutor to assign you their board."}
              </DashboardEmpty>
            ) : visibleStudentRows.length === 0 ? (
              <DashboardEmpty icon={ClipboardList}>No worksheets are due today.</DashboardEmpty>
            ) : (
              <ul className="divide-y">
                {visibleStudentRows.map((row) => (
                  <li
                    key={row.studentUid}
                    className="flex flex-col gap-3 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium">{row.name}</p>
                        <StatusPill tone={diagnosticStatusTone(row.diagnosticStatus)}>
                          {DIAGNOSTIC_STATUS_LABEL[row.diagnosticStatus]}
                        </StatusPill>
                      </div>
                      {row.email ? (
                        <p className="truncate text-sm text-muted-foreground">{row.email}</p>
                      ) : null}
                      <p className="text-sm text-muted-foreground">
                        {row.openAssignments} open · Last active {row.lastActiveLabel}
                        {row.avgAccuracy !== null ? ` · ${row.avgAccuracy}% accuracy` : ""}
                      </p>
                    </div>
                    <StudentQuickActions
                      compact
                      studentUid={row.studentUid}
                      studentName={row.name}
                      studentEmail={row.email}
                      lastSession={row.lastSession}
                      lastCompletedAssignment={row.lastCompletedAssignment}
                      currentAssignment={currentAssignmentByStudent.get(row.studentUid) ?? null}
                      firstDiagnostic={row.firstDiagnostic}
                      latestDiagnostic={row.latestDiagnostic}
                      returnTo="/dashboard"
                    />
                  </li>
                ))}
              </ul>
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
                      <StatusPill tone={item.reason === "overdue" ? "due" : "progress"}>
                        {item.reason === "overdue" ? "Overdue" : "Stale"}
                      </StatusPill>
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
                        <StatusPill tone={worksheetStatusTone(progress)}>
                          {worksheetStatusLabel(row)}
                        </StatusPill>
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
