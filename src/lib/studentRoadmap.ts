import { getTagLabel, isFormatTagCode } from "@/data/taggingScheme";
import { isAssignmentOverdue, pickLatestCompletedAssignment } from "@/lib/dashboardStats";
import { firstAndLatestDiagnostic, orderDiagnosticSessionsOldestFirst } from "@/lib/diagnosticReport";
import {
  daysUntilIsoDate,
  formatIsoDateLabel,
} from "@/lib/shsat2026";
import type { WorksheetAssignment } from "@/types/assignment";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type {
  RoadmapFollowUp,
  StudentAttentionStatus,
  StudentRoadmap,
  WorkspaceBoard,
} from "@/types/workspace";
import { ATTENTION_STATUS_LABEL } from "@/types/workspace";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function emptyStudentRoadmap(): StudentRoadmap {
  return {
    startingPoint: "",
    currentScores: "",
    targetComposite: null,
    targetSchool: "undecided",
    testDate: "",
    currentPriority: "",
    longTermPriorities: "",
    strengthsNotes: "",
    growthNotes: "",
    nextSessionDate: "",
    nextSessionTime: "",
    nextSessionNotes: "",
    followUps: [],
    status: null,
    statusManual: false,
  };
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function parseFollowUp(raw: unknown): RoadmapFollowUp | null {
  const row = asRecord(raw);
  const text = typeof row.text === "string" ? row.text.trim() : "";
  if (!text) return null;
  return {
    id: typeof row.id === "string" && row.id ? row.id : `fu-${row.createdAtMs ?? Date.now()}`,
    text,
    open: row.open !== false,
    createdAtMs: Number(row.createdAtMs) || Date.now(),
  };
}

export function parseStudentRoadmap(raw: unknown): StudentRoadmap {
  const parsed = asRecord(raw);
  const status = parsed.status;
  const allowed: StudentAttentionStatus[] = [
    "follow_up",
    "next_session",
    "active_work",
    "on_track",
  ];
  const followUps = Array.isArray(parsed.followUps)
    ? parsed.followUps.map(parseFollowUp).filter((row): row is RoadmapFollowUp => row != null)
    : [];
  const target =
    parsed.targetComposite == null || parsed.targetComposite === ""
      ? null
      : Number(parsed.targetComposite);
  return {
    startingPoint: typeof parsed.startingPoint === "string" ? parsed.startingPoint : "",
    currentScores: typeof parsed.currentScores === "string" ? parsed.currentScores : "",
    targetComposite: Number.isFinite(target) ? Math.round(target as number) : null,
    targetSchool: typeof parsed.targetSchool === "string" ? parsed.targetSchool : "undecided",
    testDate: typeof parsed.testDate === "string" ? parsed.testDate : "",
    currentPriority: typeof parsed.currentPriority === "string" ? parsed.currentPriority : "",
    longTermPriorities:
      typeof parsed.longTermPriorities === "string" ? parsed.longTermPriorities : "",
    strengthsNotes: typeof parsed.strengthsNotes === "string" ? parsed.strengthsNotes : "",
    growthNotes: typeof parsed.growthNotes === "string" ? parsed.growthNotes : "",
    nextSessionDate: typeof parsed.nextSessionDate === "string" ? parsed.nextSessionDate : "",
    nextSessionTime: typeof parsed.nextSessionTime === "string" ? parsed.nextSessionTime : "",
    nextSessionNotes: typeof parsed.nextSessionNotes === "string" ? parsed.nextSessionNotes : "",
    followUps,
    status:
      typeof status === "string" && allowed.includes(status as StudentAttentionStatus)
        ? (status as StudentAttentionStatus)
        : null,
    statusManual: parsed.statusManual === true,
  };
}

export function serializeStudentRoadmap(roadmap: StudentRoadmap): Record<string, unknown> {
  return {
    startingPoint: roadmap.startingPoint,
    currentScores: roadmap.currentScores,
    targetComposite: roadmap.targetComposite,
    targetSchool: roadmap.targetSchool,
    testDate: roadmap.testDate,
    currentPriority: roadmap.currentPriority,
    longTermPriorities: roadmap.longTermPriorities,
    strengthsNotes: roadmap.strengthsNotes,
    growthNotes: roadmap.growthNotes,
    nextSessionDate: roadmap.nextSessionDate,
    nextSessionTime: roadmap.nextSessionTime,
    nextSessionNotes: roadmap.nextSessionNotes,
    followUps: roadmap.followUps.map((row) => ({
      id: row.id,
      text: row.text,
      open: row.open,
      createdAtMs: row.createdAtMs,
    })),
    status: roadmap.status,
    statusManual: roadmap.statusManual,
  };
}

/** Overlay known fields onto the stored map so older/newer keys are not dropped. */
export function mergeRoadmapForWrite(
  existingRaw: unknown,
  next: StudentRoadmap,
): Record<string, unknown> {
  return { ...asRecord(existingRaw), ...serializeStudentRoadmap(next) };
}

export function newRoadmapFollowUp(text: string): RoadmapFollowUp {
  return {
    id:
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `fu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    text: text.trim(),
    open: true,
    createdAtMs: Date.now(),
  };
}

export interface RoadmapTagStat {
  tagCode: string;
  label: string;
  count: number;
  accuracy: number;
}

function sessionMillis(session: PracticeSessionRecord): number {
  return session.completedAt?.toMillis?.() ?? 0;
}

function nextSessionMillis(roadmap: StudentRoadmap): number | null {
  if (!roadmap.nextSessionDate) return null;
  const time = roadmap.nextSessionTime || "09:00";
  const ms = Date.parse(`${roadmap.nextSessionDate}T${time}`);
  return Number.isFinite(ms) ? ms : null;
}

export function formatNextSessionLabel(roadmap: StudentRoadmap): string {
  if (!roadmap.nextSessionDate) return "Not scheduled";
  const dateLabel = formatIsoDateLabel(roadmap.nextSessionDate);
  if (roadmap.nextSessionTime) {
    const [hoursRaw, minutesRaw] = roadmap.nextSessionTime.split(":");
    const hours = Number(hoursRaw);
    const minutes = Number(minutesRaw);
    if (Number.isFinite(hours) && Number.isFinite(minutes)) {
      const display = new Date(2000, 0, 1, hours, minutes);
      return `${dateLabel} · ${display.toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })}`;
    }
  }
  return dateLabel;
}

function computeTagStats(sessions: PracticeSessionRecord[]): RoadmapTagStat[] {
  const buckets = new Map<string, { total: number; correct: number }>();
  for (const session of sessions) {
    for (const event of session.events ?? []) {
      for (const code of event.tags ?? []) {
        if (isFormatTagCode(code)) continue;
        const cur = buckets.get(code) ?? { total: 0, correct: 0 };
        cur.total += 1;
        cur.correct += event.correct ? 1 : 0;
        buckets.set(code, cur);
      }
    }
  }
  return [...buckets.entries()]
    .filter(([, value]) => value.total >= 2)
    .map(([tagCode, value]) => ({
      tagCode,
      label: getTagLabel(tagCode),
      count: value.total,
      accuracy: Math.round((value.correct / value.total) * 100),
    }));
}

export function deriveAttentionStatus(input: {
  roadmap: StudentRoadmap;
  openFollowUps: RoadmapFollowUp[];
  assignments: WorksheetAssignment[];
  diagnosticInProgress: boolean;
  now?: number;
}): StudentAttentionStatus {
  if (input.roadmap.statusManual && input.roadmap.status) return input.roadmap.status;
  const now = input.now ?? Date.now();
  if (input.openFollowUps.length > 0) return "follow_up";
  if (input.assignments.some(isAssignmentOverdue)) return "follow_up";
  const nextMs = nextSessionMillis(input.roadmap);
  if (nextMs != null && nextMs < now - 12 * 60 * 60 * 1000) return "follow_up";
  if (nextMs != null && nextMs <= now + WEEK_MS) return "next_session";
  if (input.assignments.some((row) => row.status === "todo") || input.diagnosticInProgress) {
    return "active_work";
  }
  return "on_track";
}

export interface StudentRoadmapSnapshot {
  board: WorkspaceBoard;
  roadmap: StudentRoadmap;
  status: StudentAttentionStatus;
  statusLabel: string;
  currentPriority: string;
  activeAssignment: WorksheetAssignment | null;
  activeAssignmentLabel: string;
  nextSessionLabel: string;
  followUpLabel: string;
  followUpsOpen: RoadmapFollowUp[];
  diagnosticInProgress: boolean;
  baseline: PracticeSessionRecord | null;
  latestDiagnostic: PracticeSessionRecord | null;
  baselineAccuracy: number | null;
  currentAccuracy: number | null;
  diagnosticSittings: PracticeSessionRecord[];
  recentSessions: PracticeSessionRecord[];
  strengths: RoadmapTagStat[];
  growthAreas: RoadmapTagStat[];
  suggestedTagCodes: string[];
  testDateLabel: string;
  daysUntilTest: number | null;
  lastSession: PracticeSessionRecord | null;
  lastCompletedAssignment: WorksheetAssignment | null;
}

export function buildStudentRoadmapSnapshot(input: {
  board: WorkspaceBoard;
  sessions: PracticeSessionRecord[];
  assignments: WorksheetAssignment[];
  diagnosticInProgress?: boolean;
  now?: number;
}): StudentRoadmapSnapshot {
  const now = input.now ?? Date.now();
  const roadmap = input.board.roadmap ?? emptyStudentRoadmap();
  const studentSessions = input.sessions.filter((session) => session.userId === input.board.studentUid);
  const studentAssignments = input.assignments.filter(
    (row) => row.assignedToStudentUid === input.board.studentUid,
  );
  const openAssignments = studentAssignments
    .filter((row) => row.status === "todo")
    .sort((a, b) => (a.dueAt?.toMillis?.() ?? Infinity) - (b.dueAt?.toMillis?.() ?? Infinity));
  const activeAssignment = openAssignments[0] ?? null;
  const diagnosticPair = firstAndLatestDiagnostic(studentSessions, input.board.studentUid);
  const diagnosticSittings = orderDiagnosticSessionsOldestFirst(
    studentSessions.filter((session) => session.sessionType === "diagnostic"),
  );
  const followUpsOpen = roadmap.followUps.filter((row) => row.open);
  const diagnosticInProgress = Boolean(input.diagnosticInProgress);
  const overdue = studentAssignments.filter(isAssignmentOverdue);
  const status = deriveAttentionStatus({
    roadmap,
    openFollowUps: followUpsOpen,
    assignments: studentAssignments,
    diagnosticInProgress,
    now,
  });
  const tagStats = computeTagStats(studentSessions);
  const growthAreas = [...tagStats]
    .sort((a, b) => a.accuracy - b.accuracy || b.count - a.count)
    .slice(0, 4);
  const strengths = [...tagStats]
    .filter((row) => row.accuracy >= 70)
    .sort((a, b) => b.accuracy - a.accuracy || b.count - a.count)
    .slice(0, 4);
  const currentPriority =
    roadmap.currentPriority.trim() ||
    growthAreas[0]?.label ||
    (diagnosticInProgress ? "Finish the diagnostic" : "Set a current priority");
  let followUpLabel = "None";
  if (followUpsOpen[0]) followUpLabel = followUpsOpen[0].text;
  else if (overdue[0]) followUpLabel = `Overdue: ${overdue[0].title}`;
  else if (nextSessionMillis(roadmap) != null && (nextSessionMillis(roadmap) ?? 0) < now) {
    followUpLabel = "Last session time passed";
  }

  let activeAssignmentLabel = "None";
  if (activeAssignment) activeAssignmentLabel = activeAssignment.title;
  else if (diagnosticInProgress) activeAssignmentLabel = "Diagnostic in progress";

  const recentSessions = [...studentSessions]
    .filter((session) => session.sessionType !== "tutor-preview")
    .sort((a, b) => sessionMillis(b) - sessionMillis(a))
    .slice(0, 6);

  return {
    board: input.board,
    roadmap,
    status,
    statusLabel: ATTENTION_STATUS_LABEL[status],
    currentPriority,
    activeAssignment,
    activeAssignmentLabel,
    nextSessionLabel: formatNextSessionLabel(roadmap),
    followUpLabel,
    followUpsOpen,
    diagnosticInProgress,
    baseline: diagnosticPair.first,
    latestDiagnostic: diagnosticPair.latest,
    baselineAccuracy: diagnosticPair.first?.accuracyPct ?? null,
    currentAccuracy: diagnosticPair.latest?.accuracyPct ?? null,
    diagnosticSittings,
    recentSessions,
    strengths,
    growthAreas,
    suggestedTagCodes: growthAreas.slice(0, 3).map((row) => row.tagCode),
    testDateLabel: formatIsoDateLabel(roadmap.testDate) || "Not set",
    daysUntilTest: daysUntilIsoDate(roadmap.testDate, now),
    lastSession: recentSessions[0] ?? null,
    lastCompletedAssignment: pickLatestCompletedAssignment(studentAssignments),
  };
}

export function formatSessionKind(session: PracticeSessionRecord): string {
  if (session.sessionType === "diagnostic") return "Diagnostic";
  if (session.sessionType === "assignment") return "Worksheet";
  if (session.sessionType === "self") return "Self practice";
  return "Session";
}

export function formatSessionDate(session: PracticeSessionRecord): string {
  const ms = sessionMillis(session);
  if (!ms) return "";
  return new Date(ms).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}
