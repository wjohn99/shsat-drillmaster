import type { QuestionModule } from "@/types";

export const QUESTION_MODULES: QuestionModule[] = ["1", "2"];

export function moduleLabel(module: QuestionModule): string {
  return module === "1" ? "Module 1" : "Module 2";
}

export function moduleBadgeColor(module: QuestionModule): string {
  return module === "1" ? "hsl(var(--module-1))" : "hsl(var(--module-2))";
}

export function isQuestionModule(value: string): value is QuestionModule {
  return value === "1" || value === "2";
}

/** Legacy session events stored `difficulty` before module-based filtering. */
export function moduleFromLegacyAnalytics(value: unknown): QuestionModule {
  if (value === "1" || value === "2") return value;
  if (value === "hard") return "2";
  return "1";
}
