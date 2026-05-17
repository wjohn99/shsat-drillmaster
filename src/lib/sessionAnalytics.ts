import { getTagLabel } from "@/data/taggingScheme";
import type { Difficulty, Question } from "@/types";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

function tagCodesToDisplayNames(codes: string[]): string {
  if (codes.length === 0) return "—";
  const unique = [...new Set(codes)];
  return unique.map((c) => getTagLabel(c)).join(", ");
}

/** One row per tag/skill: n = tagged attempts (a question with multiple tags increments each). */
export interface SessionTagTableRow {
  tag: string;
  n: number;
  accuracy: number;
  avgTime: number;
}

export type SessionErrorPatternKind = "rushed" | "stuck";

export interface SessionErrorPatternItem {
  /** 1-based position in this session (same order as questions were attempted). */
  questionNumber: number;
  /** Human-readable tag labels for this question. */
  tagsDisplay: string;
  elapsedSeconds: number;
  pattern: SessionErrorPatternKind;
}

/**
 * Wrong attempts shorter than this are never "slow" — they are too fast to reflect a real read/solve
 * (guess, misclick, or skim), even if they are slightly above a very low session median.
 */
export const ERROR_PATTERN_MIN_CONCEPT_SECONDS = 12;

/** Wrong answers split by time vs baseline: fast → pacing/careless, slow → concept gap. */
export interface SessionErrorPatterns {
  /** Median seconds used as the split (see thresholdSource). */
  thresholdSeconds: number;
  thresholdSource: "correct_median" | "session_median";
  /** Same as {@link ERROR_PATTERN_MIN_CONCEPT_SECONDS}; surfaced for UI copy. */
  minConceptSeconds: number;
  rushedWrong: number;
  stuckWrong: number;
  items: SessionErrorPatternItem[];
}

function medianSeconds(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  if (s.length % 2 === 1) return s[mid];
  return (s[mid - 1] + s[mid]) / 2;
}

function computeErrorPatterns(events: SessionAnalyticsEvent[]): SessionErrorPatterns {
  const correctTimes = events.filter((e) => e.correct).map((e) => e.elapsedSeconds);
  const allTimes = events.map((e) => e.elapsedSeconds);
  const thresholdSource: SessionErrorPatterns["thresholdSource"] =
    correctTimes.length > 0 ? "correct_median" : "session_median";
  const thresholdSeconds =
    correctTimes.length > 0 ? medianSeconds(correctTimes) : medianSeconds(allTimes);

  const items: SessionErrorPatternItem[] = [];
  let rushedWrong = 0;
  let stuckWrong = 0;

  for (let i = 0; i < events.length; i++) {
    const e = events[i];
    if (e.correct) continue;
    const t = e.elapsedSeconds;
    const pattern: SessionErrorPatternKind =
      t < ERROR_PATTERN_MIN_CONCEPT_SECONDS || t <= thresholdSeconds ? "rushed" : "stuck";
    if (pattern === "rushed") rushedWrong += 1;
    else stuckWrong += 1;
    items.push({
      questionNumber: i + 1,
      tagsDisplay: tagCodesToDisplayNames(e.tags),
      elapsedSeconds: Number(t.toFixed(1)),
      pattern,
    });
  }

  return {
    thresholdSeconds: Number(thresholdSeconds.toFixed(1)),
    thresholdSource,
    minConceptSeconds: ERROR_PATTERN_MIN_CONCEPT_SECONDS,
    rushedWrong,
    stuckWrong,
    items,
  };
}

export interface SessionAnalyticsComputed {
  total: number;
  correct: number;
  accuracyPct: number;
  avgTime: number;
  difficultyChart: { difficulty: string; accuracy: number; avgTime: number; total: number }[];
  subjectChart: { subject: string; accuracy: number; avgTime: number; total: number }[];
  tagTable: SessionTagTableRow[];
  weakestTags: { tag: string; total: number; accuracy: number }[];
  errorPatterns: SessionErrorPatterns;
}

export function computeSessionAnalytics(events: SessionAnalyticsEvent[]): SessionAnalyticsComputed {
  const total = events.length;
  const correct = events.filter((e) => e.correct).length;
  const avgTime = total ? events.reduce((s, e) => s + e.elapsedSeconds, 0) / total : 0;

  const byDifficulty: Record<Difficulty, { total: number; correct: number; avgTime: number }> = {
    easy: { total: 0, correct: 0, avgTime: 0 },
    medium: { total: 0, correct: 0, avgTime: 0 },
    hard: { total: 0, correct: 0, avgTime: 0 },
  };
  const bySubject: Record<Question["subject"], { total: number; correct: number; avgTime: number }> = {
    MATH: { total: 0, correct: 0, avgTime: 0 },
    ELA: { total: 0, correct: 0, avgTime: 0 },
  };
  const tagStats = new Map<string, { total: number; correct: number; timeSum: number }>();

  for (const e of events) {
    const d = byDifficulty[e.difficulty];
    d.total += 1;
    d.correct += e.correct ? 1 : 0;
    d.avgTime += e.elapsedSeconds;

    const s = bySubject[e.subject];
    s.total += 1;
    s.correct += e.correct ? 1 : 0;
    s.avgTime += e.elapsedSeconds;

    for (const tag of e.tags) {
      const cur = tagStats.get(tag) ?? { total: 0, correct: 0, timeSum: 0 };
      cur.total += 1;
      cur.correct += e.correct ? 1 : 0;
      cur.timeSum += e.elapsedSeconds;
      tagStats.set(tag, cur);
    }
  }
  for (const k of Object.keys(byDifficulty) as Difficulty[]) {
    const d = byDifficulty[k];
    if (d.total) d.avgTime = d.avgTime / d.total;
  }
  for (const k of Object.keys(bySubject) as Array<Question["subject"]>) {
    const s = bySubject[k];
    if (s.total) s.avgTime = s.avgTime / s.total;
  }

  const difficultyChart = (["easy", "medium", "hard"] as Difficulty[]).map((k) => ({
    difficulty: k.toUpperCase(),
    accuracy: byDifficulty[k].total ? Math.round((byDifficulty[k].correct / byDifficulty[k].total) * 100) : 0,
    avgTime: Number(byDifficulty[k].avgTime.toFixed(1)),
    total: byDifficulty[k].total,
  }));
  const subjectChart = (["MATH", "ELA"] as Array<Question["subject"]>).map((k) => ({
    subject: k,
    accuracy: bySubject[k].total ? Math.round((bySubject[k].correct / bySubject[k].total) * 100) : 0,
    avgTime: Number(bySubject[k].avgTime.toFixed(1)),
    total: bySubject[k].total,
  }));

  const tagTable: SessionTagTableRow[] = [...tagStats.entries()]
    .map(([tag, v]) => ({
      tag,
      n: v.total,
      accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0,
      avgTime: Number((v.timeSum / v.total).toFixed(1)),
    }))
    .sort((a, b) => a.tag.localeCompare(b.tag));

  const weakestTags = [...tagStats.entries()]
    .map(([tag, v]) => ({
      tag,
      total: v.total,
      accuracy: v.total ? Math.round((v.correct / v.total) * 100) : 0,
    }))
    .filter((x) => x.total >= 2)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total)
    .slice(0, 6);

  const errorPatterns = computeErrorPatterns(events);

  return {
    total,
    correct,
    accuracyPct: total ? Math.round((correct / total) * 100) : 0,
    avgTime: Number(avgTime.toFixed(1)),
    difficultyChart,
    subjectChart,
    tagTable,
    weakestTags,
    errorPatterns,
  };
}
