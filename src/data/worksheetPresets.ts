import type { Question, Subject } from "@/types";
import { TAG_CATEGORIES, type TagCategoryId } from "@/data/taggingScheme";
import { pickWorksheetQuestions } from "@/lib/worksheetTagCatalog";

export type WorksheetPresetDefinition = {
  id: string;
  title: string;
  description: string;
  subject: Subject;
  categoryIds: TagCategoryId[];
  questionLimit: number;
};

export type WorksheetPreset = WorksheetPresetDefinition & {
  tagCodes: string[];
  availableCount: number;
  questionCount: number;
  estimatedMinutes: number;
};

function tagCodesFor(categoryIds: TagCategoryId[]): string[] {
  const wanted = new Set(categoryIds);
  return TAG_CATEGORIES.filter((category) => wanted.has(category.id)).flatMap((category) =>
    category.tags.map((tag) => tag.code),
  );
}

export const WORKSHEET_PRESET_DEFINITIONS: WorksheetPresetDefinition[] = [
  {
    id: "algebra",
    title: "Algebra",
    description: "Linear equations, expressions, systems, and functions",
    subject: "MATH",
    categoryIds: ["alg"],
    questionLimit: 12,
  },
  {
    id: "number-properties",
    title: "Number properties",
    description: "Integers, fractions, ratios, exponents, and factors",
    subject: "MATH",
    categoryIds: ["num"],
    questionLimit: 12,
  },
  {
    id: "geometry",
    title: "Geometry",
    description: "Shapes, area, volume, and coordinate geometry",
    subject: "MATH",
    categoryIds: ["geo"],
    questionLimit: 12,
  },
  {
    id: "applied-math",
    title: "Applied math",
    description: "Percents, rates, distance, and word problems",
    subject: "MATH",
    categoryIds: ["app"],
    questionLimit: 12,
  },
  {
    id: "data-probability",
    title: "Data and probability",
    description: "Graphs, statistics, and probability",
    subject: "MATH",
    categoryIds: ["dat"],
    questionLimit: 10,
  },
  {
    id: "reading",
    title: "Reading comprehension",
    description: "Informational and literary passages with evidence and inference",
    subject: "ELA",
    categoryIds: ["rc"],
    questionLimit: 12,
  },
  {
    id: "revising",
    title: "Revising and editing",
    description: "Grammar, usage, sentence structure, and organization",
    subject: "ELA",
    categoryIds: ["re"],
    questionLimit: 12,
  },
  {
    id: "mixed-math",
    title: "Mixed math",
    description: "A cross-section of algebra, number, geometry, and data",
    subject: "MATH",
    categoryIds: ["num", "alg", "app", "geo", "dat"],
    questionLimit: 16,
  },
  {
    id: "mixed-ela",
    title: "Mixed ELA",
    description: "Reading and revising items in one set",
    subject: "ELA",
    categoryIds: ["rc", "re"],
    questionLimit: 12,
  },
];

export function buildWorksheetPresets(questions: Question[]): WorksheetPreset[] {
  return WORKSHEET_PRESET_DEFINITIONS.map((definition) => {
    const tagCodes = tagCodesFor(definition.categoryIds);
    const availableCount = pickWorksheetQuestions(
      questions,
      new Set(tagCodes),
      Number.MAX_SAFE_INTEGER,
    ).length;
    const questionCount = Math.min(definition.questionLimit, availableCount);
    return {
      ...definition,
      tagCodes,
      availableCount,
      questionCount,
      estimatedMinutes: Math.max(1, questionCount * 2),
    };
  }).filter((preset) => preset.availableCount > 0);
}
