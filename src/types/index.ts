export type Subject = 'MATH' | 'ELA';

/** SHSAT adaptive module (1 or 2), aligned with tracker column E. */
export type QuestionModule = '1' | '2';

export type QuestionSubtype =
  | 'MC4_A-D'
  | 'MC4_E-H'
  | 'GRID_IN'
  | 'TEI_DRAG_DROP'
  | 'TEI_MULTIPLE_SELECT'
  | 'INDY-ATA'
  | 'INDY-DND'
  | 'INDY-EE'
  | 'INDY-CGT'
  | 'INDY-WP'
  | 'INDY-IC'
  | 'INDY-MS'
  | 'INDY-HS'
  | 'INDY-GIF';

/** Draggable label in the pool (may include distractors unused in the correct mapping). */
export interface DndDraggableItem {
  id: string;
  text: string;
}

/**
 * A drop target; student places exactly one draggable per zone for credit.
 *
 * **Block layout** — `prompt` above a dashed drop area (expressions / multi-line tasks).
 * **Inline layout** — `beforeText` + slot + `afterText` in one sentence (exam-style fill-in).
 */
export interface DndZone {
  id: string;
  /** Block layout: label above the drop box. */
  prompt?: string;
  /** Inline layout: text before the drop box (sentence continues into the slot). */
  beforeText?: string;
  /** Inline layout: text after the drop box. */
  afterText?: string;
}

/**
 * INDY-DND: all-or-nothing — final state must match correctMapping exactly
 * (every zone filled correctly; wrong or empty zone → 0 points).
 */
export interface DndSpec {
  pool: DndDraggableItem[];
  zones: DndZone[];
  correctMapping: Record<string, string>;
  /** Shown under the stem, above the answer bank (e.g. “Move the correct answer…”). */
  instruction?: string;
  /**
   * One draggable is placed in exactly one zone (e.g. sentence-ordering in a passage).
   * Other zones must stay empty; only zones listed in `correctMapping` are scored.
   */
  singlePlacement?: boolean;
  solutionExplanation?: string;
}

/**
 * INDY-EE — custom equation editor keypad; answer compared to acceptable forms (numeric tolerance).
 */
export interface EeSpec {
  instruction?: string;
  /** Static label before the dotted entry field (e.g. `Total = $`). */
  inputPrefix?: string;
  /** Accepted answers after normalization ($, commas stripped). */
  acceptableAnswers: string[];
  /** Optional explanation shown with the solution in practice mode. */
  solutionExplanation?: string;
}

/** Table for INDY-CGT */
export interface CgtTableVisual {
  type: 'table';
  caption?: string;
  headers: string[];
  rows: string[][];
}

/** Simple horizontal bar chart (CSS) for INDY-CGT */
export interface CgtBarChartVisual {
  type: 'barChart';
  title?: string;
  categories: string[];
  values: number[];
  /** Suffix for bar labels (e.g. "%", " students") */
  valueSuffix?: string;
}

export type CgtVisual = CgtTableVisual | CgtBarChartVisual;

/**
 * INDY-CGT — read from a chart, graph, or table; answer is usually MCQ (`choices` on the question).
 */
export interface CgtSpec {
  visual: CgtVisual;
  /** Optional line under the visual (e.g. data source). */
  sourceNote?: string;
  solutionExplanation?: string;
}

/**
 * INDY-WP — narrative word problem; typically answered with MCQ (`choices`).
 */
export interface WpSpec {
  /** Hint under the stem (e.g. “You may use scratch paper.”). */
  instruction?: string;
  solutionExplanation?: string;
}

/**
 * INDY-MS — select exactly `selectCount` options (not “select all that apply”).
 * `selectCount` must match the number of `choices` with `isCorrect: true`.
 */
export interface MsSpec {
  selectCount: number;
  instruction?: string;
  solutionExplanation?: string;
}

export type IcSegment =
  | { type: 'text'; value: string }
  | { type: 'slot'; slotId: string };

export interface IcSlotOption {
  id: string;
  text: string;
}

export interface IcSlot {
  slotId: string;
  options: IcSlotOption[];
}

/**
 * INDY-IC — inline dropdown(s) embedded in a sentence (often with a linked passage).
 */
export interface IcSpec {
  instruction?: string;
  segments: IcSegment[];
  slots: IcSlot[];
  correctMapping: Record<string, string>;
  solutionExplanation?: string;
}

/** Rectangle as percentages of the image (0–100), from the top-left corner. */
export interface HsSpot {
  id: string;
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * INDY-HS — select one region on an image (hot spot).
 */
export interface HsSpec {
  /** Public URL or path (e.g. `/diagram.png`). */
  imageSrc: string;
  imageAlt?: string;
  spots: HsSpot[];
  correctSpotId: string;
  /** Shown under the stem, above the image. */
  instruction?: string;
  solutionExplanation?: string;
}

/**
 * INDY-GIF — plot a single point on a coordinate plane (`mode: 'plotPoint'`).
 * More interactive figure modes can extend `GifSpec` later.
 */
export interface GifPlotPointSpec {
  mode: 'plotPoint';
  xMin: number;
  xMax: number;
  yMin: number;
  yMax: number;
  correctX: number;
  correctY: number;
  /** Euclidean distance in coordinate units for full credit. */
  tolerance: number;
  /** If set, snap the plotted point to this grid step (e.g. 0.5 or 1). */
  snapToGrid?: number;
  /** Draw grid lines for readability. */
  showGrid?: boolean;
  /** Distance between grid lines in coordinate units; inferred if omitted. */
  gridStep?: number;
  instruction?: string;
  solutionExplanation?: string;
}

export type GifSpec = GifPlotPointSpec;

export interface Tag {
  id: string;
  domain: Subject;
  code: string;
  label: string;
}

export interface Choice {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
  /** Why this option is correct or a common reason students pick it (tracker per-choice column). */
  explanation?: string;
}

/** Second-review gate. Missing status is final, those items were already reviewed. */
export type ReviewStatus = "provisional" | "final";

/** Which copy of an ID a record belongs to. Bank and diagnostic versions of the same ID are separate content. */
export type ContentTrack = "bank" | "diagnostic";

/**
 * A current-product audience hold. The question is not wrong; it is out of scope for the
 * Grade 8 (Grade 9 entry) product. The original stays in source for future review.
 */
export interface ScopeHold {
  audience: "grade8";
  reason: string;
}

export interface Question {
  id: string;
  subject: Subject;
  /** Adaptive SHSAT module (tracker column E). */
  module: QuestionModule;
  subtype: QuestionSubtype;
  /**
   * `provisional` questions stay visible to students and demo accounts.
   * Only tutors see the Provisional label. Legacy tracker items omit this.
   */
  reviewStatus?: ReviewStatus;
  /**
   * Content version for this ID within its track (bank or diagnostic). Originals are 1.
   * Each audited revision in content/revisions increments it; the original stays in its source file.
   */
  contentVersion?: number;
  /** Set when this version is held from the current Grade 8 product (see content/scope). */
  scopeHold?: ScopeHold;
  stem: string;
  /** Tutor-facing note on the wrong-answer lure (tracker column P). */
  commonTrap?: string;
  /** Step-by-step solution (tracker explanation column); TEI subtypes may also use spec.solutionExplanation. */
  solutionExplanation?: string;
  choices?: Choice[];
  /** Present when subtype is INDY-DND */
  dnd?: DndSpec;
  /** Present when subtype is INDY-EE */
  ee?: EeSpec;
  /** Present when subtype is INDY-CGT */
  cgt?: CgtSpec;
  /** Present when subtype is INDY-WP */
  wp?: WpSpec;
  /** Present when subtype is INDY-IC */
  ic?: IcSpec;
  /** Present when subtype is INDY-MS (exactly `selectCount` checkbox selections) */
  ms?: MsSpec;
  /** Present when subtype is INDY-HS */
  hs?: HsSpec;
  /** Present when subtype is INDY-GIF */
  gif?: GifSpec;
  tags: Tag[];
  passageId?: string;
  timeToSolve?: number; // in seconds
  userAttempted?: boolean;
  userCorrect?: boolean;
  userBookmarked?: boolean;
  createdAt: string;
}

export interface Passage {
  id: string;
  title: string;
  lexile?: number;
  sourceMeta?: string;
  body: string;
  questions: Question[];
  /** Original passages are 1; audited revisions in content/revisions increment it. */
  contentVersion?: number;
}

export interface Form {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  timeLimit?: number; // in minutes
}

export type ReviewQueueFilter = "provisional" | "needs_jed" | "reported";

export interface FilterOptions {
  subjects: Subject[];
  modules: QuestionModule[];
  /** Content skill tag codes (RC-*, RE-*, NUM-*, etc.; excludes INDY format tags). */
  tagCodes: string[];
  /** Question format tag codes (INDY-* from tagging scheme). */
  formatTagCodes: string[];
  passageOnly: boolean;
  searchQuery: string;
  userStatus: ('attempted' | 'correct' | 'bookmarked')[];
  /** Tutor-only. `provisional` is unreviewed; `needs_jed` waits on Jed; `reported` has an open error report. */
  reviewQueue: ReviewQueueFilter[];
}