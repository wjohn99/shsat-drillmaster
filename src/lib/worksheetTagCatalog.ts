import type { Question, Tag } from '@/types';
import { DIAGNOSTIC_RESERVED_QUESTION_IDS } from '@/data/shsatDiagnosticForm';
import {
  TAG_CATEGORIES,
  WORKSHEET_CONTENT_SECTIONS,
  type TagCategoryId,
  tagCategoryForCode,
  getTagLabel,
  isFormatTagCode,
} from '@/data/taggingScheme';

export type WorksheetSectionId = TagCategoryId;

export const WORKSHEET_SECTIONS = WORKSHEET_CONTENT_SECTIONS;

export function worksheetSectionForTag(tag: Pick<Tag, 'code'>): WorksheetSectionId {
  return tagCategoryForCode(tag.code) ?? 'indy';
}

/**
 * Union of canonical tags and every tag on questions, grouped by tagging category.
 */
export function buildWorksheetTagCatalog(
  canonicalTags: Tag[],
  questions: Question[],
): Record<WorksheetSectionId, Tag[]> {
  const byCode = new Map<string, Tag>();

  for (const t of canonicalTags) {
    byCode.set(t.code, t);
  }

  for (const q of questions) {
    for (const t of q.tags) {
      const merged: Tag = {
        ...t,
        domain: t.domain ?? q.subject,
        label: t.label?.trim() ? t.label : getTagLabel(t.code),
      };
      const existing = byCode.get(t.code);
      if (!existing) {
        byCode.set(t.code, merged);
      } else if (!existing.label?.trim()) {
        byCode.set(t.code, { ...existing, label: merged.label });
      }
    }
  }

  const buckets = Object.fromEntries(
    TAG_CATEGORIES.map((c) => [c.id, [] as Tag[]]),
  ) as Record<WorksheetSectionId, Tag[]>;

  for (const tag of byCode.values()) {
    const section = worksheetSectionForTag(tag);
    buckets[section].push(tag);
  }

  for (const c of TAG_CATEGORIES) {
    buckets[c.id].sort((a, b) => a.label.localeCompare(b.label));
  }

  return buckets;
}

export function shuffleArray<T>(items: T[]): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Same cap as the worksheet size slider. */
export const WORKSHEET_QUESTION_CAP = 50;

function practicePool(questions: Question[], excludedIds?: ReadonlySet<string>): Question[] {
  return questions.filter(
    (q) => !DIAGNOSTIC_RESERVED_QUESTION_IDS.has(q.id) && !excludedIds?.has(q.id),
  );
}

/** Practice questions that match any selected skill, in catalog order, without duplicates. */
export function listWorksheetPool(
  questions: Question[],
  selectedTagCodes: Set<string>,
  excludedIds?: ReadonlySet<string>,
): Question[] {
  if (selectedTagCodes.size === 0) return [];
  const byId = new Map<string, Question>();
  for (const question of practicePool(questions, excludedIds)) {
    if (!question.tags.some((tag) => selectedTagCodes.has(tag.code))) continue;
    if (!byId.has(question.id)) byId.set(question.id, question);
  }
  return [...byId.values()];
}

/** Hand-picked ids, skipping anything outside the practice pool, grouped by passage. */
export function worksheetQuestionsFromIds(
  questions: Question[],
  ids: string[],
  excludedIds?: ReadonlySet<string>,
): Question[] {
  const byId = new Map(questions.map((question) => [question.id, question]));
  const picked: Question[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id) || excludedIds?.has(id)) continue;
    const question = byId.get(id);
    if (!question || DIAGNOSTIC_RESERVED_QUESTION_IDS.has(question.id)) continue;
    seen.add(id);
    picked.push(question);
  }
  return clusterQuestionsByPassage(picked);
}

export function contentSkillCodes(questions: Question[]): string[] {
  const codes: string[] = [];
  const seen = new Set<string>();
  for (const question of questions) {
    for (const tag of question.tags) {
      if (isFormatTagCode(tag.code) || seen.has(tag.code)) continue;
      seen.add(tag.code);
      codes.push(tag.code);
    }
  }
  return codes;
}

export function contentSkillLabels(questions: Question[]): string[] {
  const labels: string[] = [];
  const seen = new Set<string>();
  for (const question of questions) {
    for (const tag of question.tags) {
      if (isFormatTagCode(tag.code) || seen.has(tag.code)) continue;
      seen.add(tag.code);
      labels.push(tag.label?.trim() || getTagLabel(tag.code));
    }
  }
  return labels;
}

/** Random questions for a single subject (self-practice quick drills). */
export function pickWorksheetQuestionsBySubject(
  questions: Question[],
  subject: import('@/types').Subject,
  limit: number,
): Question[] {
  if (limit <= 0) return [];
  const matched = practicePool(questions).filter((q) => q.subject === subject);
  return shuffleArray(matched).slice(0, Math.min(limit, matched.length));
}

/** Questions that match any selected tag code, capped at `limit`. */
export function pickWorksheetQuestions(
  questions: Question[],
  selectedTagCodes: Set<string>,
  limit: number,
  excludedIds?: ReadonlySet<string>,
): Question[] {
  if (selectedTagCodes.size === 0 || limit <= 0) return [];
  const matched = listWorksheetPool(questions, selectedTagCodes, excludedIds);
  return clusterQuestionsByPassage(shuffleArray(matched).slice(0, Math.min(limit, matched.length)));
}

/** Keep every question that shares a passage together, in first-seen order. */
export function clusterQuestionsByPassage(questions: Question[]): Question[] {
  const byPassage = new Map<string, Question[]>();
  for (const question of questions) {
    if (!question.passageId) continue;
    const group = byPassage.get(question.passageId) ?? [];
    group.push(question);
    byPassage.set(question.passageId, group);
  }

  const seenPassages = new Set<string>();
  const clustered: Question[] = [];
  for (const question of questions) {
    if (!question.passageId) {
      clustered.push(question);
      continue;
    }
    if (seenPassages.has(question.passageId)) continue;
    seenPassages.add(question.passageId);
    clustered.push(...(byPassage.get(question.passageId) ?? [question]));
  }
  return clustered;
}
