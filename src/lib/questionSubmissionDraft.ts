import type { Subject } from "@/types";
import type {
  QuestionFormatCode,
  QuestionModule,
  QuestionSubmissionType,
} from "@/types/questionSubmission";

const DRAFT_PREFIX = "drillmaster.questionSubmission.draft.";
const RECEIPT_PREFIX = "drillmaster.questionSubmission.receipts.";
const RECEIPT_LIMIT = 20;
const TEXT_LIMIT = 20000;

const FORMATS = new Set<QuestionFormatCode>([
  "INDY-MCQ",
  "INDY-FIB",
  "INDY-ATA",
  "INDY-DND",
  "INDY-EE",
  "INDY-CGT",
  "INDY-WP",
  "INDY-IC",
  "INDY-HS",
  "INDY-MS",
  "INDY-GIF",
]);

const TYPES = new Set<QuestionSubmissionType>([
  "RC",
  "RE",
  "REB",
  "ALG",
  "GEO",
  "NUM",
  "APP",
  "DAT",
]);

export type QuestionSubmissionDraft = {
  section: Subject | "";
  module: QuestionModule | "";
  type: QuestionSubmissionType | "";
  format: QuestionFormatCode;
  skillTagCodes: string[];
  author: string;
  passageId: string;
  passage: string;
  question: string;
  choiceA: string;
  choiceB: string;
  choiceC: string;
  choiceD: string;
  correctAnswer: string;
  explanation: string;
  commonTrap: string;
};

export type QuestionSubmissionReceipt = {
  questionId: string;
  pending: boolean;
  preview: string;
  status: "In Review" | "Sent";
  submittedAt: number;
};

export const emptyQuestionSubmissionDraft: QuestionSubmissionDraft = {
  section: "",
  module: "",
  type: "",
  format: "INDY-MCQ",
  skillTagCodes: [],
  author: "",
  passageId: "",
  passage: "",
  question: "",
  choiceA: "",
  choiceB: "",
  choiceC: "",
  choiceD: "",
  correctAnswer: "",
  explanation: "",
  commonTrap: "",
};

const CONTENT_FIELDS = [
  "passageId",
  "passage",
  "question",
  "choiceA",
  "choiceB",
  "choiceC",
  "choiceD",
  "correctAnswer",
  "explanation",
  "commonTrap",
] as const;

function clip(value: unknown): string {
  return typeof value === "string" ? value.slice(0, TEXT_LIMIT) : "";
}

export function normalizeQuestionSubmissionDraft(value: unknown): QuestionSubmissionDraft | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.question !== "string" && typeof row.passage !== "string") return null;
  const section = row.section === "ELA" || row.section === "MATH" ? row.section : "";
  const module = row.module === "1" || row.module === "2" ? row.module : "";
  const type = typeof row.type === "string" && TYPES.has(row.type as QuestionSubmissionType)
    ? (row.type as QuestionSubmissionType)
    : "";
  const format = typeof row.format === "string" && FORMATS.has(row.format as QuestionFormatCode)
    ? (row.format as QuestionFormatCode)
    : "INDY-MCQ";
  const skillTagCodes = Array.isArray(row.skillTagCodes)
    ? row.skillTagCodes.filter((code): code is string => typeof code === "string").slice(0, 20)
    : [];
  return {
    section,
    module,
    type,
    format,
    skillTagCodes,
    author: clip(row.author),
    passageId: clip(row.passageId),
    passage: clip(row.passage),
    question: clip(row.question),
    choiceA: clip(row.choiceA),
    choiceB: clip(row.choiceB),
    choiceC: clip(row.choiceC),
    choiceD: clip(row.choiceD),
    correctAnswer: clip(row.correctAnswer),
    explanation: clip(row.explanation),
    commonTrap: clip(row.commonTrap),
  };
}

/** Author, section, and format alone are not a draft. */
export function questionSubmissionDraftHasContent(draft: QuestionSubmissionDraft): boolean {
  if (draft.skillTagCodes.some((code) => code.trim())) return true;
  return CONTENT_FIELDS.some((key) => draft[key].trim().length > 0);
}

export function questionSubmissionPreview(question: string): string {
  const compact = question.replace(/\s+/g, " ").trim();
  if (compact.length <= 120) return compact;
  return `${compact.slice(0, 117)}...`;
}

function draftKey(uid: string): string {
  return `${DRAFT_PREFIX}${uid}`;
}

function receiptKey(uid: string): string {
  return `${RECEIPT_PREFIX}${uid}`;
}

export function loadQuestionSubmissionDraft(uid: string): QuestionSubmissionDraft | null {
  if (!uid || typeof localStorage === "undefined") return null;
  try {
    const raw = localStorage.getItem(draftKey(uid));
    if (!raw) return null;
    const draft = normalizeQuestionSubmissionDraft(JSON.parse(raw));
    if (!draft || !questionSubmissionDraftHasContent(draft)) return null;
    return draft;
  } catch {
    return null;
  }
}

export function saveQuestionSubmissionDraft(uid: string, draft: QuestionSubmissionDraft): void {
  if (!uid || typeof localStorage === "undefined") return;
  try {
    if (!questionSubmissionDraftHasContent(draft)) {
      localStorage.removeItem(draftKey(uid));
      return;
    }
    localStorage.setItem(draftKey(uid), JSON.stringify(draft));
  } catch {
    // A full browser store should not block the form.
  }
}

export function clearQuestionSubmissionDraft(uid: string): void {
  if (!uid || typeof localStorage === "undefined") return;
  try {
    localStorage.removeItem(draftKey(uid));
  } catch {
    // Ignore a blocked store.
  }
}

function normalizeReceipt(value: unknown): QuestionSubmissionReceipt | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const submittedAt = typeof row.submittedAt === "number" ? row.submittedAt : 0;
  if (!submittedAt) return null;
  const questionId = typeof row.questionId === "string" ? row.questionId : "";
  const pending = row.pending === true || !questionId.trim();
  return {
    questionId,
    pending,
    preview: typeof row.preview === "string" ? row.preview.slice(0, 160) : "",
    status: pending ? "Sent" : "In Review",
    submittedAt,
  };
}

export function loadQuestionSubmissionReceipts(uid: string): QuestionSubmissionReceipt[] {
  if (!uid || typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(receiptKey(uid));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeReceipt).filter((row): row is QuestionSubmissionReceipt => row !== null);
  } catch {
    return [];
  }
}

export function recordQuestionSubmissionReceipt(
  uid: string,
  input: { questionId: string; pending?: boolean; question: string; submittedAt?: number },
): QuestionSubmissionReceipt[] {
  const submittedAt = input.submittedAt ?? Date.now();
  const questionId = input.questionId.trim();
  const pending = Boolean(input.pending) || !questionId;
  const receipt: QuestionSubmissionReceipt = {
    questionId,
    pending,
    preview: questionSubmissionPreview(input.question),
    status: pending ? "Sent" : "In Review",
    submittedAt,
  };
  const next = [receipt, ...loadQuestionSubmissionReceipts(uid)].slice(0, RECEIPT_LIMIT);
  if (!uid || typeof localStorage === "undefined") return next;
  try {
    localStorage.setItem(receiptKey(uid), JSON.stringify(next));
  } catch {
    // The on-page list still updates for this visit.
  }
  return next;
}
