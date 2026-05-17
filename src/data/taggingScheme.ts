import type { QuestionSubtype, Subject, Tag } from '@/types';

/** Content & format categories from Tagging Scheme v05.10.26 */
export type TagCategoryId =
  | 'rc'
  | 're'
  | 'num'
  | 'alg'
  | 'app'
  | 'geo'
  | 'dat'
  | 'indy';

export interface TagDefinition {
  code: string;
  label: string;
}

export interface TagCategory {
  id: TagCategoryId;
  title: string;
  description: string;
  /** Subject used for chip styling and filters; INDY spans both exam sections. */
  subject: Subject | 'BOTH';
  tags: TagDefinition[];
}

export const TAG_CATEGORIES: TagCategory[] = [
  {
    id: 'rc',
    title: 'Reading Comprehension',
    description: 'Passage-based reading, evidence, inference, and literary analysis',
    subject: 'ELA',
    tags: [
      { code: 'RC-MI', label: 'Main Idea / Central Idea' },
      { code: 'RC-INF', label: 'Inference / Implied Meaning' },
      { code: 'RC-EV', label: 'Evidence-Based (Textual Support)' },
      { code: 'RC-VOC', label: 'Context-Based Vocabulary' },
      { code: 'RC-TXT', label: "Text Structure / Author's Technique" },
      { code: 'RC-THE', label: 'Theme, Tone, or Mood' },
      { code: 'RC-SEQ', label: 'Sequencing & Plot Development' },
      { code: 'RC-ANL', label: 'Literary Analysis (Character, Setting, Conflict, etc.)' },
      { code: 'RC-THM', label: 'Historical/Scientific Text Themes' },
    ],
  },
  {
    id: 're',
    title: 'Revising & Editing',
    description: 'Grammar, usage, conventions, and expression of ideas',
    subject: 'ELA',
    tags: [
      { code: 'RE-WC', label: 'Word Choice' },
      { code: 'RE-SEN', label: 'Sentence Structure' },
      { code: 'RE-TEN', label: 'Verb Tense Consistency' },
      { code: 'RE-RUN', label: 'Run-on Sentences' },
      { code: 'RE-SVA', label: 'Subject-Verb Agreement' },
      { code: 'RE-PRO', label: 'Pronouns' },
      { code: 'RE-COM', label: 'Comma Usage' },
      { code: 'RE-COLN', label: 'Colon Usage' },
      { code: 'RE-SEM', label: 'Semicolon Usage' },
      { code: 'RE-APP', label: 'Apostrophe Usage' },
      { code: 'RE-ORG', label: 'Organization' },
      { code: 'RE-CL', label: 'Clarity / Conciseness' },
    ],
  },
  {
    id: 'num',
    title: 'Number Properties & Arithmetic',
    description: 'Integers, fractions, ratios, exponents, and factors',
    subject: 'MATH',
    tags: [
      { code: 'NUM-INT', label: 'Integers & Absolute Value' },
      { code: 'NUM-FR', label: 'Fractions, Decimals, Percents' },
      { code: 'NUM-EXP', label: 'Exponents & Roots' },
      { code: 'NUM-RAT', label: 'Ratios, Rates, Proportions' },
      { code: 'NUM-FAC', label: 'Factors' },
    ],
  },
  {
    id: 'alg',
    title: 'Algebra & Expressions',
    description: 'Equations, expressions, systems, and functions',
    subject: 'MATH',
    tags: [
      { code: 'ALG-LIN', label: 'Linear Equations & Inequalities' },
      { code: 'ALG-EXP', label: 'Expressions & Manipulations' },
      { code: 'ALG-SYS', label: 'Systems of Equations' },
      { code: 'ALG-FUN', label: 'Functions & Graphs' },
    ],
  },
  {
    id: 'app',
    title: 'Applied Math / Word Problems',
    description: 'Percent, rate, distance, and real-world modeling',
    subject: 'MATH',
    tags: [
      { code: 'APP-PCT', label: 'Percent, Discounts, Tax, Tip' },
      { code: 'APP-RTD', label: 'Rate, Time, Distance' },
      { code: 'APP-PLG', label: 'Inputting Values from Question' },
      { code: 'APP-FIN', label: 'Financial Math (Pay, Budget, Sales)' },
    ],
  },
  {
    id: 'geo',
    title: 'Geometry & Measurement',
    description: 'Shapes, area, volume, and coordinate geometry',
    subject: 'MATH',
    tags: [
      { code: 'GEO-ANG', label: 'Angles' },
      { code: 'GEO-TRI', label: 'Triangles' },
      { code: 'GEO-QUAD', label: 'Quadrilaterals' },
      { code: 'GEO-CRC', label: 'Circles' },
      { code: 'GEO-ARV', label: 'Area, Volume, Surface Area, Perimeter' },
      { code: 'GEO-COO', label: 'Coordinate Geometry / Graphs' },
      { code: 'GEO-3D', label: '3-Dimensional Shapes' },
      { code: 'GEO-MSC', label: 'Other' },
    ],
  },
  {
    id: 'dat',
    title: 'Data & Probability',
    description: 'Graphs, statistics, and probability',
    subject: 'MATH',
    tags: [
      { code: 'DAT-GR', label: 'Graphs & Tables' },
      { code: 'DAT-STA', label: 'Statistics (Mean, Median, Mode)' },
      { code: 'DAT-PROB', label: 'Probability & Combinatorics' },
    ],
  },
  {
    id: 'indy',
    title: 'Question Format',
    description: 'Independent question types (format tags)',
    subject: 'BOTH',
    tags: [
      { code: 'INDY-MCQ', label: 'Multiple Choice Question' },
      { code: 'INDY-FIB', label: 'Fill in the Blank' },
      { code: 'INDY-ATA', label: 'All That Apply' },
      { code: 'INDY-DND', label: 'Drag and Drop' },
      { code: 'INDY-EE', label: 'Equation Editor' },
      { code: 'INDY-CGT', label: 'Charts, Graphs, or Tables' },
      { code: 'INDY-WP', label: 'Word Problem' },
      { code: 'INDY-IC', label: 'Inline Choice / Dropdown' },
      { code: 'INDY-HS', label: 'Hot Spot' },
      { code: 'INDY-MS', label: 'Multi-Select' },
      { code: 'INDY-GIF', label: 'Graphing & Interactive Figures' },
    ],
  },
];

const CATEGORY_BY_CODE = new Map<string, TagCategoryId>();
for (const category of TAG_CATEGORIES) {
  for (const tag of category.tags) {
    CATEGORY_BY_CODE.set(tag.code, category.id);
  }
}

const TAG_DEF_BY_CODE = new Map<string, TagDefinition & { categoryId: TagCategoryId }>();
for (const category of TAG_CATEGORIES) {
  for (const tag of category.tags) {
    TAG_DEF_BY_CODE.set(tag.code, { ...tag, categoryId: category.id });
  }
}

function domainForCategory(categoryId: TagCategoryId): Subject {
  const category = TAG_CATEGORIES.find((c) => c.id === categoryId);
  if (!category || category.subject === 'BOTH') return 'MATH';
  return category.subject;
}

/** Build a `Tag` for attaching to questions (canonical codes + student-facing labels). */
export function tag(code: string): Tag {
  const def = TAG_DEF_BY_CODE.get(code);
  if (!def) {
    throw new Error(`Unknown tag code: ${code}`);
  }
  return {
    id: `tag-${code.toLowerCase()}`,
    domain: domainForCategory(def.categoryId),
    code: def.code,
    label: def.label,
  };
}

export function getTagLabel(code: string): string {
  return TAG_DEF_BY_CODE.get(code)?.label ?? code;
}

export function tagCategoryForCode(code: string): TagCategoryId | undefined {
  return CATEGORY_BY_CODE.get(code);
}

/** All canonical tags — use for filters, worksheets, and new question authoring. */
export const allTags: Tag[] = TAG_CATEGORIES.flatMap((category) =>
  category.tags.map((t) => tag(t.code)),
);

/** Worksheet / bank section list (same order as the tagging PDF). */
export const TAG_CATEGORY_SECTIONS = TAG_CATEGORIES.map((c) => ({
  id: c.id,
  title: c.title,
  description: c.description,
  subject: c.subject,
}));

/** Content skill sections for custom worksheets (excludes question-format / INDY). */
export const WORKSHEET_CONTENT_SECTIONS = TAG_CATEGORY_SECTIONS.filter(
  (s) => s.id !== "indy",
);

export const QUESTION_FORMAT_CATEGORY = TAG_CATEGORIES.find((c) => c.id === "indy")!;

export const QUESTION_FORMAT_TAGS = QUESTION_FORMAT_CATEGORY.tags;

const FORMAT_TAG_CODE_SET = new Set(QUESTION_FORMAT_TAGS.map((t) => t.code));

export function isFormatTagCode(code: string): boolean {
  return FORMAT_TAG_CODE_SET.has(code);
}

/** Maps internal question `subtype` to canonical INDY format tag from the tagging PDF. */
export function formatTagCodeForSubtype(subtype: QuestionSubtype): string {
  switch (subtype) {
    case "MC4_A-D":
    case "MC4_E-H":
      return "INDY-MCQ";
    case "GRID_IN":
      return "INDY-FIB";
    case "TEI_DRAG_DROP":
      return "INDY-DND";
    case "TEI_MULTIPLE_SELECT":
      return "INDY-MS";
    case "INDY-ATA":
    case "INDY-DND":
    case "INDY-EE":
    case "INDY-CGT":
    case "INDY-WP":
    case "INDY-IC":
    case "INDY-MS":
    case "INDY-HS":
    case "INDY-GIF":
      return subtype;
    default:
      return "INDY-MCQ";
  }
}

/** Ensures each question has exactly one format tag plus its content skill tags. */
export function normalizeQuestionTags(question: {
  subtype: QuestionSubtype;
  tags: Tag[];
}): Tag[] {
  const formatCode = formatTagCodeForSubtype(question.subtype);
  const contentTags = question.tags.filter((t) => !isFormatTagCode(t.code));
  return [...contentTags, tag(formatCode)];
}
