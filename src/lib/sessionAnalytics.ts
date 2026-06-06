import { getTagLabel } from "@/data/taggingScheme";
import type { SessionAnalyticsEvent } from "@/types/sessionAnalytics";

/** One row per tag/skill: n = tagged attempts (a question with multiple tags increments each). */
export interface SessionTagTableRow {
  tag: string;
  n: number;
  accuracy: number;
  avgTime: number;
}

/** One bar per skill/tag for the focus chart (sorted lowest accuracy first in UI). */
export interface SessionSkillFocusRow {
  tag: string;
  label: string;
  n: number;
  accuracy: number;
  avgTime: number;
}

export interface SessionAnalyticsComputed {
  total: number;
  correct: number;
  accuracyPct: number;
  avgTime: number;
  tagTable: SessionTagTableRow[];
  skillFocusChart: SessionSkillFocusRow[];
  weakestTags: { tag: string; total: number; accuracy: number }[];
}

export function computeSessionAnalytics(events: SessionAnalyticsEvent[]): SessionAnalyticsComputed {
  const total = events.length;
  const correct = events.filter((e) => e.correct).length;
  const avgTime = total ? events.reduce((s, e) => s + e.elapsedSeconds, 0) / total : 0;

  const tagStats = new Map<string, { total: number; correct: number; timeSum: number }>();

  for (const e of events) {
    for (const tag of e.tags) {
      const cur = tagStats.get(tag) ?? { total: 0, correct: 0, timeSum: 0 };
      cur.total += 1;
      cur.correct += e.correct ? 1 : 0;
      cur.timeSum += e.elapsedSeconds;
      tagStats.set(tag, cur);
    }
  }

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

  const skillFocusChart: SessionSkillFocusRow[] = tagTable
    .map((row) => ({
      tag: row.tag,
      label: getTagLabel(row.tag),
      n: row.n,
      accuracy: row.accuracy,
      avgTime: row.avgTime,
    }))
    .sort((a, b) => a.accuracy - b.accuracy || b.n - a.n);

  return {
    total,
    correct,
    accuracyPct: total ? Math.round((correct / total) * 100) : 0,
    avgTime: Number(avgTime.toFixed(1)),
    tagTable,
    skillFocusChart,
    weakestTags,
  };
}
