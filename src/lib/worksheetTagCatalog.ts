import type { Question, Subject, Tag } from '@/types';

/** NYC SHSAT-style worksheet sections (4 columns in the custom builder). */
export type WorksheetSectionId = 'ela-re-a' | 'ela-re-b' | 'ela-rc' | 'math';

export const WORKSHEET_SECTIONS: {
  id: WorksheetSectionId;
  title: string;
  description: string;
}[] = [
  {
    id: 'ela-re-a',
    title: 'Revising & Editing — Part A',
    description: 'Standard English conventions, grammar, and usage',
  },
  {
    id: 'ela-re-b',
    title: 'Revising & Editing — Part B',
    description: 'Expression of ideas, organization, and rhetoric',
  },
  {
    id: 'ela-rc',
    title: 'Reading Comprehension',
    description: 'Passage-based reading, evidence, and inference',
  },
  {
    id: 'math',
    title: 'Mathematics',
    description: 'All math content domains',
  },
];

/** Part A–style ELA skill tags (conventions). */
const RE_PART_A_CODES = new Set(['SEC', 'BOUNDARIES', 'FORM-STRUCT']);

/** Part B–style ELA skill tags (expression / rhetoric). */
const RE_PART_B_CODES = new Set(['EXPRESS-IDEAS', 'RHETORIC', 'TRANS']);

/** Reading comprehension–style ELA tags. */
const READING_CODES = new Set([
  'CRAFT',
  'CROSS-TEXT',
  'TEXT-STRUCT',
  'WIC',
  'INFO-IDEAS',
  'CENTRAL-IDEAS',
  'COMMAND-EVIDENCE',
  'INFERENCES',
]);

export function worksheetSectionForTag(tag: Pick<Tag, 'domain' | 'code'>): WorksheetSectionId {
  if (tag.domain === 'MATH') return 'math';
  if (RE_PART_A_CODES.has(tag.code)) return 'ela-re-a';
  if (RE_PART_B_CODES.has(tag.code)) return 'ela-re-b';
  if (READING_CODES.has(tag.code)) return 'ela-rc';
  // New ELA tags not yet classified: default to Reading so they still appear and are selectable.
  return 'ela-rc';
}

/**
 * Union of `allTags` and every tag attached to a question, grouped by SHSAT section.
 * Any tag that appears only on questions (not in `allTags`) still shows up — future-proof for new tags.
 */
export function buildWorksheetTagCatalog(allTags: Tag[], questions: Question[]): Record<WorksheetSectionId, Tag[]> {
  const byCode = new Map<string, Tag>();

  for (const t of allTags) {
    byCode.set(t.code, t);
  }

  for (const q of questions) {
    for (const t of q.tags) {
      const domain: Subject = t.domain ?? q.subject;
      const merged: Tag = {
        ...t,
        domain,
        label: t.label?.trim() ? t.label : t.code.replace(/-/g, ' '),
      };
      const existing = byCode.get(t.code);
      if (!existing) {
        byCode.set(t.code, merged);
      } else {
        byCode.set(t.code, {
          ...existing,
          label: existing.label?.trim() ? existing.label : merged.label,
        });
      }
    }
  }

  for (const [code, t] of byCode) {
    if (!t.label?.trim()) {
      byCode.set(code, { ...t, label: code.replace(/-/g, ' ') });
    }
  }

  const buckets: Record<WorksheetSectionId, Tag[]> = {
    'ela-re-a': [],
    'ela-re-b': [],
    'ela-rc': [],
    math: [],
  };

  for (const tag of byCode.values()) {
    const section = worksheetSectionForTag(tag);
    buckets[section].push(tag);
  }

  for (const k of Object.keys(buckets) as WorksheetSectionId[]) {
    buckets[k].sort((a, b) => a.label.localeCompare(b.label));
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

/** Questions that match any selected tag code, capped at `limit`. */
export function pickWorksheetQuestions(questions: Question[], selectedTagCodes: Set<string>, limit: number): Question[] {
  if (selectedTagCodes.size === 0 || limit <= 0) return [];
  const matched = questions.filter((q) => q.tags.some((t) => selectedTagCodes.has(t.code)));
  const byId = new Map<string, Question>();
  for (const q of matched) {
    if (!byId.has(q.id)) byId.set(q.id, q);
  }
  return shuffleArray([...byId.values()]).slice(0, limit);
}
