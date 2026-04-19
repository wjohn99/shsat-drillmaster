import type { Question } from "@/types";

/** Reading comprehension (passage) or Revising & Editing — matches digital SHSAT ELA tools scope. */
export function shouldShowElaHighlighter(question: Question): boolean {
  if (question.subject !== "ELA") return false;
  if (question.passageId) return true;
  return question.tags.some((t) => t.code.startsWith("RE-"));
}
