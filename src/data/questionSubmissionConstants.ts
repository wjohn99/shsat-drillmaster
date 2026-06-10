import type { Subject } from "@/types";
import { QUESTION_FORMAT_TAGS, TAG_CATEGORIES } from "@/data/taggingScheme";
import type {
  QuestionFormatCode,
  QuestionModule,
  QuestionSubmissionType,
} from "@/types/questionSubmission";

export type FormatAnswerMode = "mcq" | "multi_select" | "free_response" | "structured";

export const FORMAT_OPTIONS = QUESTION_FORMAT_TAGS;

const FORMAT_ANSWER_MODES: Record<QuestionFormatCode, FormatAnswerMode> = {
  "INDY-MCQ": "mcq",
  "INDY-MS": "multi_select",
  "INDY-ATA": "multi_select",
  "INDY-FIB": "free_response",
  "INDY-EE": "free_response",
  "INDY-DND": "structured",
  "INDY-IC": "structured",
  "INDY-HS": "structured",
  "INDY-GIF": "structured",
  "INDY-CGT": "structured",
  "INDY-WP": "structured",
};

export function getFormatAnswerMode(format: QuestionFormatCode): FormatAnswerMode {
  return FORMAT_ANSWER_MODES[format];
}

export function formatRequiresChoices(format: QuestionFormatCode): boolean {
  const mode = getFormatAnswerMode(format);
  return mode === "mcq" || mode === "multi_select";
}

export function formatChoicesOptional(format: QuestionFormatCode): boolean {
  return getFormatAnswerMode(format) === "structured";
}

export interface QuestionTypeOption {
  value: QuestionSubmissionType;
  label: string;
  section: Subject;
  categoryId: string;
}

export const QUESTION_TYPE_OPTIONS: QuestionTypeOption[] = [
  { value: "RC", label: "Reading Comprehension", section: "ELA", categoryId: "rc" },
  { value: "RE", label: "Revising/Editing Part A (passage)", section: "ELA", categoryId: "re" },
  { value: "REB", label: "Revising/Editing Part B (standalone)", section: "ELA", categoryId: "re" },
  { value: "ALG", label: "Algebra", section: "MATH", categoryId: "alg" },
  { value: "GEO", label: "Geometry", section: "MATH", categoryId: "geo" },
  { value: "NUM", label: "Number Properties", section: "MATH", categoryId: "num" },
  { value: "APP", label: "Applied Math", section: "MATH", categoryId: "app" },
  { value: "DAT", label: "Data & Probability", section: "MATH", categoryId: "dat" },
];

export const MODULE_OPTIONS: { value: QuestionModule; label: string }[] = [
  { value: "1", label: "Module 1" },
  { value: "2", label: "Module 2" },
];

export const SECTION_OPTIONS: { value: Subject; label: string }[] = [
  { value: "ELA", label: "ELA" },
  { value: "MATH", label: "Math" },
];

const TYPE_BY_VALUE = new Map(
  QUESTION_TYPE_OPTIONS.map((option) => [option.value, option]),
);

export function getQuestionTypeOption(type: QuestionSubmissionType) {
  return TYPE_BY_VALUE.get(type);
}

export function getTypesForSection(section: Subject) {
  return QUESTION_TYPE_OPTIONS.filter((option) => option.section === section);
}

export function getSkillOptionsForType(type: QuestionSubmissionType) {
  const typeOption = getQuestionTypeOption(type);
  if (!typeOption) return [];

  const category = TAG_CATEGORIES.find((entry) => entry.id === typeOption.categoryId);
  return category?.tags ?? [];
}

export function sectionForType(type: QuestionSubmissionType): Subject {
  return getQuestionTypeOption(type)?.section ?? "ELA";
}

export function domainForType(type: QuestionSubmissionType): string {
  return getQuestionTypeOption(type)?.categoryId ?? "rc";
}

/** Sheet column D — matches tracker template ("ELA" / "Math"). */
export function formatSectionForSheet(section: Subject): string {
  return section === "MATH" ? "Math" : "ELA";
}

/** Sheet column E — matches tracker template ("Module 1" / "Module 2"). */
export function formatModuleForSheet(module: QuestionModule): string {
  return module === "2" ? "Module 2" : "Module 1";
}

/** ELA types with a shared passage separate from the question stem. */
export function isPassageBasedType(type: QuestionSubmissionType): boolean {
  return type === "RC" || type === "RE";
}
