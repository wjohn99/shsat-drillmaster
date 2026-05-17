import type { Question, Tag } from '@/types';
import {
  TAG_CATEGORIES,
  WORKSHEET_CONTENT_SECTIONS,
  type TagCategoryId,
  tagCategoryForCode,
  getTagLabel,
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

/** Random questions for a single subject (self-practice quick drills). */
export function pickWorksheetQuestionsBySubject(
  questions: Question[],
  subject: import('@/types').Subject,
  limit: number,
): Question[] {
  if (limit <= 0) return [];
  const matched = questions.filter((q) => q.subject === subject);
  return shuffleArray(matched).slice(0, Math.min(limit, matched.length));
}

/** Questions that match any selected tag code, capped at `limit`. */
export function pickWorksheetQuestions(
  questions: Question[],
  selectedTagCodes: Set<string>,
  limit: number,
): Question[] {
  if (selectedTagCodes.size === 0 || limit <= 0) return [];
  const matched = questions.filter((q) => q.tags.some((t) => selectedTagCodes.has(t.code)));
  const byId = new Map<string, Question>();
  for (const q of matched) {
    if (!byId.has(q.id)) byId.set(q.id, q);
  }
  return shuffleArray([...byId.values()]).slice(0, limit);
}
