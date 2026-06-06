import { getTagLabel } from "@/data/taggingScheme";
import type {
  StudentOption,
  TutorAssignmentRow,
  WorksheetAssignment,
} from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export const STALE_ASSIGNMENT_DAYS = 7;
export const WEEKLY_QUESTION_GOAL = 20;

function tagLabel(code: string): string {
  return getTagLabel(code);
}

function toMillis(ts: PracticeSessionRecord["completedAt"] | WorksheetAssignment["createdAt"]): number {
  return ts?.toMillis?.() ?? 0;
}

function formatRelativeDate(ms: number): string {
  if (!ms) return "Never";
  return new Date(ms).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatLastActiveLabel(ms: number): string {
  if (!ms) return "Never";

  const diff = Date.now() - ms;
  const minute = 60 * 1000;
  const hour = 60 * minute;

  if (diff < minute) return "Just now";
  if (diff < hour) {
    const mins = Math.floor(diff / minute);
    return `${mins} min ago`;
  }
  if (diff < DAY_MS) {
    const hrs = Math.floor(diff / hour);
    return hrs === 1 ? "1 hour ago" : `${hrs} hours ago`;
  }
  if (diff < 2 * DAY_MS) return "Yesterday";

  return formatRelativeDate(ms);
}

export interface StudentProgressRow {
  studentUid: string;
  name: string;
  email: string;
  openAssignments: number;
  lastActiveLabel: string;
  avgAccuracy: number | null;
}

export interface AttentionItem {
  studentUid: string;
  studentName: string;
  assignmentId: string;
  assignmentTitle: string;
  reason: "overdue" | "stale";
  detail: string;
}

export interface TagInsightRow {
  tagCode: string;
  label: string;
  count: number;
  accuracy: number | null;
}

export interface TutorDashboardAnalytics {
  studentRows: StudentProgressRow[];
  attentionItems: AttentionItem[];
  mostAssignedTags: TagInsightRow[];
  weakestClassTags: TagInsightRow[];
}

export function buildTutorDashboardAnalytics(
  students: StudentOption[],
  assignments: TutorAssignmentRow[],
  sessions: PracticeSessionRecord[],
): TutorDashboardAnalytics {
  const now = Date.now();
  const staleCutoff = now - STALE_ASSIGNMENT_DAYS * DAY_MS;

  const sessionsByStudent = new Map<string, PracticeSessionRecord[]>();
  for (const s of sessions) {
    const list = sessionsByStudent.get(s.userId) ?? [];
    list.push(s);
    sessionsByStudent.set(s.userId, list);
  }

  const assignmentsByStudent = new Map<string, TutorAssignmentRow[]>();
  for (const a of assignments) {
    const list = assignmentsByStudent.get(a.assignedToStudentUid) ?? [];
    list.push(a);
    assignmentsByStudent.set(a.assignedToStudentUid, list);
  }

  const studentRows: StudentProgressRow[] = students.map((student) => {
    const studentAssignments = assignmentsByStudent.get(student.uid) ?? [];
    const openAssignments = studentAssignments.filter((a) => a.status === "todo").length;
    const studentSessions = sessionsByStudent.get(student.uid) ?? [];
    const sessionLastMs = studentSessions.length
      ? Math.max(...studentSessions.map((s) => toMillis(s.completedAt)))
      : 0;
    const loginLastMs = student.lastActiveAt?.toMillis?.() ?? 0;
    const lastMs = Math.max(sessionLastMs, loginLastMs);

    const completedSessions = studentSessions.filter((s) => s.questionsAnswered > 0);
    const avgAccuracy =
      completedSessions.length > 0
        ? Math.round(
            completedSessions.reduce((sum, s) => sum + s.accuracyPct, 0) /
              completedSessions.length,
          )
        : null;

    return {
      studentUid: student.uid,
      name: student.displayName,
      email: student.email,
      openAssignments,
      lastActiveLabel: formatLastActiveLabel(lastMs),
      avgAccuracy,
    };
  });

  studentRows.sort((a, b) => a.name.localeCompare(b.name));

  const attentionItems: AttentionItem[] = [];
  for (const a of assignments) {
    if (a.status !== "todo") continue;
    const createdMs = toMillis(a.createdAt);
    const dueMs = a.dueAt?.toMillis?.() ?? 0;
    const studentName =
      students.find((s) => s.uid === a.assignedToStudentUid)?.displayName ?? "Student";

    if (dueMs > 0 && dueMs < now) {
      const dueLabel = new Date(dueMs).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      });
      const daysOverdue = Math.max(1, Math.floor((now - dueMs) / DAY_MS));
      attentionItems.push({
        studentUid: a.assignedToStudentUid,
        studentName,
        assignmentId: a.id,
        assignmentTitle: a.title,
        reason: "overdue",
        detail:
          daysOverdue === 1
            ? `Due ${dueLabel} (1 day overdue)`
            : `Due ${dueLabel} (${daysOverdue} days overdue)`,
      });
      continue;
    }

    const hasRecentSession = sessions.some(
      (s) =>
        s.assignmentId === a.id &&
        toMillis(s.completedAt) >= now - STALE_ASSIGNMENT_DAYS * DAY_MS,
    );
    if (!hasRecentSession && createdMs > 0 && createdMs < now - 3 * DAY_MS) {
      attentionItems.push({
        studentUid: a.assignedToStudentUid,
        studentName,
        assignmentId: a.id,
        assignmentTitle: a.title,
        reason: "stale",
        detail: "No recent practice on this assignment",
      });
    }
  }

  attentionItems.sort((a, b) => a.studentName.localeCompare(b.studentName));

  const assignedTagCounts = new Map<string, number>();
  for (const a of assignments) {
    for (const code of a.tagCodes) {
      assignedTagCounts.set(code, (assignedTagCounts.get(code) ?? 0) + 1);
    }
  }

  const mostAssignedTags: TagInsightRow[] = [...assignedTagCounts.entries()]
    .map(([tagCode, count]) => ({
      tagCode,
      label: tagLabel(tagCode),
      count,
      accuracy: null,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const tagPerformance = new Map<string, { total: number; correct: number }>();
  for (const session of sessions) {
    for (const evt of session.events) {
      for (const code of evt.tags) {
        const cur = tagPerformance.get(code) ?? { total: 0, correct: 0 };
        cur.total += 1;
        cur.correct += evt.correct ? 1 : 0;
        tagPerformance.set(code, cur);
      }
    }
  }

  const weakestClassTags: TagInsightRow[] = [...tagPerformance.entries()]
    .filter(([, v]) => v.total >= 3)
    .map(([tagCode, v]) => ({
      tagCode,
      label: tagLabel(tagCode),
      count: v.total,
      accuracy: Math.round((v.correct / v.total) * 100),
    }))
    .sort((a, b) => (a.accuracy ?? 100) - (b.accuracy ?? 100) || b.count - a.count)
    .slice(0, 6);

  return {
    studentRows,
    attentionItems,
    mostAssignedTags,
    weakestClassTags,
  };
}

export interface AccuracyTrendPoint {
  label: string;
  accuracyPct: number;
}

export interface RecentActivityItem {
  kind: "assignment" | "self";
  title: string;
  accuracyPct: number;
  questionsAnswered: number;
  dateLabel: string;
}

export interface StudentDashboardAnalytics {
  sessionsThisWeek: number;
  questionsThisWeek: number;
  weeklyGoalProgress: number;
  weeklyGoalTarget: number;
  practiceStreakDays: number;
  accuracyTrend: AccuracyTrendPoint[];
  recentActivity: RecentActivityItem[];
}

function startOfLocalDay(ms: number): number {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function computeStreak(sessionDays: number[]): number {
  if (sessionDays.length === 0) return 0;
  const uniqueDays = [...new Set(sessionDays.map(startOfLocalDay))].sort((a, b) => b - a);
  const today = startOfLocalDay(Date.now());
  const yesterday = today - DAY_MS;

  let streak = 0;
  let expected = uniqueDays[0] === today ? today : uniqueDays[0] === yesterday ? yesterday : -1;
  if (expected < 0) return 0;

  for (const day of uniqueDays) {
    if (day === expected) {
      streak += 1;
      expected -= DAY_MS;
    } else if (day < expected) {
      break;
    }
  }
  return streak;
}

export function buildStudentDashboardAnalytics(
  selfSessions: PracticeSessionRecord[],
  assignmentSessions: PracticeSessionRecord[],
  completedAssignments: WorksheetAssignment[],
): StudentDashboardAnalytics {
  const now = Date.now();
  const weekCutoff = now - WEEK_MS;

  const selfThisWeek = selfSessions.filter((s) => toMillis(s.completedAt) >= weekCutoff);
  const sessionsThisWeek = selfThisWeek.length;
  const questionsThisWeek = selfThisWeek.reduce((s, r) => s + r.questionsAnswered, 0);

  const sessionDays = selfSessions.map((s) => toMillis(s.completedAt)).filter(Boolean);
  const practiceStreakDays = computeStreak(sessionDays);

  const accuracyTrend: AccuracyTrendPoint[] = selfSessions
    .slice(0, 5)
    .reverse()
    .map((s) => ({
      label: formatRelativeDate(toMillis(s.completedAt)),
      accuracyPct: s.accuracyPct,
    }));

  const recentActivity: RecentActivityItem[] = [];

  const lastAssignmentSession = assignmentSessions[0];
  const lastCompletedAssignment = completedAssignments.find((a) => a.status === "completed");

  if (lastAssignmentSession) {
    recentActivity.push({
      kind: "assignment",
      title: lastAssignmentSession.title,
      accuracyPct: lastAssignmentSession.accuracyPct,
      questionsAnswered: lastAssignmentSession.questionsAnswered,
      dateLabel: formatRelativeDate(toMillis(lastAssignmentSession.completedAt)),
    });
  } else if (lastCompletedAssignment) {
    recentActivity.push({
      kind: "assignment",
      title: lastCompletedAssignment.title,
      accuracyPct: 0,
      questionsAnswered: lastCompletedAssignment.questionIds.length,
      dateLabel: formatAssignmentDate(lastCompletedAssignment),
    });
  }

  const lastSelf = selfSessions[0];
  if (lastSelf) {
    recentActivity.push({
      kind: "self",
      title: lastSelf.title,
      accuracyPct: lastSelf.accuracyPct,
      questionsAnswered: lastSelf.questionsAnswered,
      dateLabel: formatRelativeDate(toMillis(lastSelf.completedAt)),
    });
  }

  return {
    sessionsThisWeek,
    questionsThisWeek,
    weeklyGoalProgress: questionsThisWeek,
    weeklyGoalTarget: WEEKLY_QUESTION_GOAL,
    practiceStreakDays,
    accuracyTrend,
    recentActivity,
  };
}

function formatAssignmentDate(assignment: WorksheetAssignment): string {
  if (!assignment.completedAt?.toDate && !assignment.createdAt?.toDate) return "";
  const d = assignment.completedAt?.toDate?.() ?? assignment.createdAt?.toDate?.();
  return d
    ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" })
    : "";
}
