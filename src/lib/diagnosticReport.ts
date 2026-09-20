import { isFormatTagCode, tagCategoryForCode } from "@/data/taggingScheme";
import { moduleLabel } from "@/lib/questionModule";
import type { PracticeSessionRecord } from "@/types/practiceSession";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";
import type { DiagnosticCompletedSave } from "@/lib/diagnosticExamStorage";
import type { QuestionModule } from "@/types";

export type DiagnosticStrandId = "rc" | "re" | "num" | "alg" | "app" | "geo" | "dat";

export interface DiagnosticStrandStat {
  id: DiagnosticStrandId;
  label: string;
  group: "ELA" | "MATH";
  correct: number;
  total: number;
  accuracyPct: number | null;
}

const ELA_STRANDS: Array<{ id: DiagnosticStrandId; label: string }> = [
  { id: "rc", label: "Reading Comprehension" },
  { id: "re", label: "Revising & Editing" },
];

const MATH_STRANDS: Array<{ id: DiagnosticStrandId; label: string }> = [
  { id: "num", label: "Number (NUM)" },
  { id: "alg", label: "Algebra (ALG)" },
  { id: "geo", label: "Geometry (GEO)" },
  { id: "dat", label: "Data (DAT)" },
  { id: "app", label: "Applied (APP)" },
];

function strandFromTags(tags: string[], subject: SessionAnalyticsEvent["subject"]): DiagnosticStrandId | null {
  const content = tags.filter((tag) => !isFormatTagCode(tag));
  for (const tag of content) {
    const category = tagCategoryForCode(tag);
    if (category === "rc" || category === "re" || category === "num" || category === "alg" || category === "geo" || category === "dat" || category === "app") {
      return category;
    }
  }
  if (tags.some((tag) => tag.startsWith("RC-"))) return "rc";
  if (tags.some((tag) => tag.startsWith("RE-"))) return "re";
  if (tags.some((tag) => tag.startsWith("NUM-"))) return "num";
  if (tags.some((tag) => tag.startsWith("ALG-"))) return "alg";
  if (tags.some((tag) => tag.startsWith("GEO-"))) return "geo";
  if (tags.some((tag) => tag.startsWith("DAT-"))) return "dat";
  if (tags.some((tag) => tag.startsWith("APP-"))) return "app";
  if (subject === "ELA") return "rc";
  return null;
}

function toStat(
  id: DiagnosticStrandId,
  label: string,
  group: "ELA" | "MATH",
  events: SessionAnalyticsEvent[],
): DiagnosticStrandStat {
  const total = events.length;
  const correct = events.filter((event) => event.correct).length;
  return {
    id,
    label,
    group,
    correct,
    total,
    accuracyPct: total ? Math.round((correct / total) * 100) : null,
  };
}

export function computeDiagnosticStrands(events: SessionAnalyticsEvent[]): {
  ela: DiagnosticStrandStat[];
  math: DiagnosticStrandStat[];
} {
  const buckets = new Map<DiagnosticStrandId, SessionAnalyticsEvent[]>();
  for (const event of events) {
    const strand = strandFromTags(event.tags, event.subject);
    if (!strand) continue;
    const list = buckets.get(strand) ?? [];
    list.push(event);
    buckets.set(strand, list);
  }

  const ela = ELA_STRANDS.map((strand) =>
    toStat(strand.id, strand.label, "ELA", buckets.get(strand.id) ?? []),
  );
  const math = MATH_STRANDS.map((strand) =>
    toStat(strand.id, strand.label, "MATH", buckets.get(strand.id) ?? []),
  ).filter((row) => row.id !== "app" || row.total > 0);

  return { ela, math };
}

export interface DiagnosticModuleBucket {
  module: QuestionModule;
  label: string;
  correct: number;
  total: number;
  accuracyPct: number | null;
  timeSeconds: number;
  avgTimeSeconds: number | null;
}

export interface DiagnosticSubjectModuleStat {
  subject: "ELA" | "MATH";
  label: string;
  modules: DiagnosticModuleBucket[];
  correct: number;
  total: number;
  accuracyPct: number | null;
  timeSeconds: number;
}

export function formatDiagnosticItemTime(seconds: number): string {
  const whole = Math.max(0, Math.round(Number(seconds) || 0));
  if (whole <= 0) return "-";
  const hours = Math.floor(whole / 3600);
  const minutes = Math.floor((whole % 3600) / 60);
  const secs = whole % 60;
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  }
  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

function toModuleBucket(
  module: QuestionModule,
  events: SessionAnalyticsEvent[],
): DiagnosticModuleBucket {
  const total = events.length;
  const correct = events.filter((event) => event.correct).length;
  const timeSeconds = events.reduce((sum, event) => sum + (Number(event.elapsedSeconds) || 0), 0);
  return {
    module,
    label: moduleLabel(module),
    correct,
    total,
    accuracyPct: total ? Math.round((correct / total) * 100) : null,
    timeSeconds,
    avgTimeSeconds: total ? timeSeconds / total : null,
  };
}

export function computeDiagnosticModuleBreakdown(events: SessionAnalyticsEvent[]): {
  overall: DiagnosticModuleBucket[];
  bySubject: DiagnosticSubjectModuleStat[];
} {
  const overall: DiagnosticModuleBucket[] = [
    toModuleBucket("1", events.filter((event) => event.module === "1")),
    toModuleBucket("2", events.filter((event) => event.module === "2")),
  ];

  const bySubject: DiagnosticSubjectModuleStat[] = (
    [
      ["ELA", "ELA"],
      ["MATH", "Math"],
    ] as const
  ).map(([subject, label]) => {
    const subset = events.filter((event) => event.subject === subject);
    const correct = subset.filter((event) => event.correct).length;
    const timeSeconds = subset.reduce(
      (sum, event) => sum + (Number(event.elapsedSeconds) || 0),
      0,
    );
    return {
      subject,
      label,
      modules: [
        toModuleBucket("1", subset.filter((event) => event.module === "1")),
        toModuleBucket("2", subset.filter((event) => event.module === "2")),
      ],
      correct,
      total: subset.length,
      accuracyPct: subset.length ? Math.round((correct / subset.length) * 100) : null,
      timeSeconds,
    };
  });

  return { overall, bySubject };
}

export function diagnosticAttemptLabel(attemptNumber: number, total: number): string {
  if (attemptNumber <= 1) return "First diagnostic";
  if (total > 1 && attemptNumber === total) return `Attempt ${attemptNumber} (latest)`;
  return `Attempt ${attemptNumber}`;
}

export function orderDiagnosticSessionsOldestFirst(
  sessions: PracticeSessionRecord[],
): PracticeSessionRecord[] {
  return [...sessions].sort((a, b) => {
    const aMs = a.completedAt?.toMillis?.() ?? 0;
    const bMs = b.completedAt?.toMillis?.() ?? 0;
    return aMs - bMs;
  });
}

export function firstAndLatestDiagnostic(
  sessions: PracticeSessionRecord[],
  userId?: string,
): { first: PracticeSessionRecord | null; latest: PracticeSessionRecord | null } {
  const filtered = sessions.filter(
    (session) =>
      session.sessionType === "diagnostic" && (!userId || session.userId === userId),
  );
  const ordered = orderDiagnosticSessionsOldestFirst(filtered);
  return {
    first: ordered[0] ?? null,
    latest: ordered[ordered.length - 1] ?? null,
  };
}

export function answersFromDiagnosticEvents(
  events: SessionAnalyticsEvent[],
  fallback?: Record<string, string>,
): Record<string, string> {
  const answers: Record<string, string> = { ...(fallback ?? {}) };
  for (const event of events) {
    if (event.answer) answers[event.questionId] = event.answer;
  }
  return answers;
}

export function localAttemptToViewModel(save: DiagnosticCompletedSave): {
  events: SessionAnalyticsEvent[];
  endedReason: DiagnosticCompletedSave["endedReason"];
  attemptNumber: number;
  completedAt: number;
  isBaseline: boolean;
} {
  return {
    events: save.events,
    endedReason: save.endedReason,
    attemptNumber: save.attemptNumber,
    completedAt: save.completedAt,
    isBaseline: save.isBaseline,
  };
}
