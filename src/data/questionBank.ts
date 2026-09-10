/**
 * @deprecated Import `useQuestions()` in React, or `@/data/questionCatalog` in scripts.
 */
import { loadQuestionCatalogSync } from "@/data/questionCatalog";

export { allTags } from "@/data/taggingScheme";
export {
  buildQuestionCatalog,
  loadQuestionCatalog,
  loadQuestionCatalogSync,
  getFilteredQuestions,
} from "@/data/questionCatalog";
export { trackerQuestions } from "@/data/trackerQuestions";

const catalog = loadQuestionCatalogSync();

export const questions = catalog.questions;
export const passages = catalog.passages;
export const forms = catalog.forms;
