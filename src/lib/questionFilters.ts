import type { FilterOptions, Question, QuestionModule } from "@/types";

export type QuestionFilterInput = Partial<{
  subjects: string[];
  modules: QuestionModule[];
  tagCodes: string[];
  formatTagCodes: string[];
  passageOnly: boolean;
  searchQuery: string;
  userStatus: string[];
}>;

export function filterQuestions(
  filters: QuestionFilterInput,
  catalog: Question[],
): Question[] {
  return catalog.filter((question) => {
    if (filters.subjects?.length && !filters.subjects.includes(question.subject)) {
      return false;
    }

    if (filters.modules?.length && !filters.modules.includes(question.module)) {
      return false;
    }

    if (filters.tagCodes?.length) {
      const questionTagCodes = question.tags.map((t) => t.code);
      if (!filters.tagCodes.some((code) => questionTagCodes.includes(code))) {
        return false;
      }
    }

    if (filters.formatTagCodes?.length) {
      const questionTagCodes = question.tags.map((t) => t.code);
      if (!filters.formatTagCodes.some((code) => questionTagCodes.includes(code))) {
        return false;
      }
    }

    if (filters.passageOnly && !question.passageId) {
      return false;
    }

    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const dndParts = question.dnd
        ? [
            ...(question.dnd.instruction ? [question.dnd.instruction] : []),
            ...question.dnd.pool.map((d) => d.text),
            ...question.dnd.zones.flatMap((z) =>
              [z.prompt, z.beforeText, z.afterText].filter(Boolean) as string[],
            ),
          ]
        : [];
      const eeParts = question.ee
        ? [
            ...(question.ee.instruction ? [question.ee.instruction] : []),
            ...(question.ee.inputPrefix ? [question.ee.inputPrefix] : []),
            ...question.ee.acceptableAnswers,
          ]
        : [];
      const cgtParts = question.cgt
        ? (() => {
            const c = question.cgt;
            const v = c.visual;
            const note = c.sourceNote ? [c.sourceNote] : [];
            if (v.type === "table") {
              return [
                ...(v.caption ? [v.caption] : []),
                ...v.headers,
                ...v.rows.flat(),
                ...note,
              ];
            }
            return [
              ...(v.title ? [v.title] : []),
              ...v.categories,
              ...v.values.map(String),
              ...(v.valueSuffix ? [v.valueSuffix] : []),
              ...note,
            ];
          })()
        : [];
      const wpParts = question.wp
        ? [question.wp.instruction, question.wp.solutionExplanation].filter(Boolean) as string[]
        : [];
      const msParts = question.ms
        ? [
            String(question.ms.selectCount),
            ...(question.ms.instruction ? [question.ms.instruction] : []),
          ]
        : [];
      const icParts = question.ic
        ? [
            ...(question.ic.instruction ? [question.ic.instruction] : []),
            ...question.ic.segments
              .filter((s): s is { type: "text"; value: string } => s.type === "text")
              .map((s) => s.value),
            ...question.ic.slots.flatMap((s) => s.options.map((o) => o.text)),
          ]
        : [];
      const hsParts = question.hs
        ? [
            ...(question.hs.instruction ? [question.hs.instruction] : []),
            ...(question.hs.solutionExplanation ? [question.hs.solutionExplanation] : []),
            ...(question.hs.imageAlt ? [question.hs.imageAlt] : []),
          ]
        : [];
      const gifParts = question.gif
        ? [
            ...(question.gif.instruction ? [question.gif.instruction] : []),
            ...(question.gif.solutionExplanation ? [question.gif.solutionExplanation] : []),
          ]
        : [];
      const searchableText = [
        question.stem,
        ...(question.commonTrap ? [question.commonTrap] : []),
        ...(question.solutionExplanation ? [question.solutionExplanation] : []),
        ...(question.choices?.flatMap((c) => [c.text, ...(c.explanation ? [c.explanation] : [])]) ||
          []),
        ...dndParts,
        ...eeParts,
        ...cgtParts,
        ...wpParts,
        ...msParts,
        ...icParts,
        ...hsParts,
        ...gifParts,
        ...question.tags.map((t) => t.label),
      ]
        .join(" ")
        .toLowerCase();

      if (!searchableText.includes(query)) {
        return false;
      }
    }

    if (filters.userStatus?.length) {
      const statusChecks = {
        attempted: question.userAttempted === true,
        correct: question.userCorrect === true,
        bookmarked: question.userBookmarked === true,
      };

      if (!filters.userStatus.some((status) => statusChecks[status as keyof typeof statusChecks])) {
        return false;
      }
    }

    return true;
  });
}

/** @deprecated Use filterQuestions — kept for FilterOptions typing at call sites. */
export function getFilteredQuestions(
  filters: QuestionFilterInput,
  catalog: Question[],
): Question[] {
  return filterQuestions(filters, catalog);
}

export type { FilterOptions };
