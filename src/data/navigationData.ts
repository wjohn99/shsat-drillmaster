import { SubjectNavigation } from "@/types/navigation";
import { TAG_CATEGORIES } from "@/data/taggingScheme";
import type { Question } from "@/types";

const ELA_COLORS = ["bg-purple-500", "bg-violet-500", "bg-fuchsia-500"];
const MATH_COLORS = ["bg-blue-500", "bg-sky-500", "bg-indigo-500"];

function countQuestionsForTags(questions: Question[], tagCodes: string[]): number {
  return questions.filter((q) => q.tags.some((t) => tagCodes.includes(t.code))).length;
}

function buildSubjectGroups(questions: Question[], subject: "ELA" | "MATH") {
  const colors = subject === "ELA" ? ELA_COLORS : MATH_COLORS;
  return TAG_CATEGORIES.filter((c) => c.subject === subject).flatMap((category, categoryIndex) =>
    category.tags.map((t, tagIndex) => ({
      id: `${category.id}-${t.code.toLowerCase()}`,
      label: t.label,
      color: colors[(categoryIndex + tagIndex) % colors.length],
      questionCount: Math.max(countQuestionsForTags(questions, [t.code]), 0),
      tags: [t.code],
    })),
  );
}

export function buildNavigationData(questions: Question[]): SubjectNavigation[] {
  return [
    {
      subject: "ELA",
      totalQuestions: questions.filter((q) => q.subject === "ELA").length,
      groups: buildSubjectGroups(questions, "ELA"),
    },
    {
      subject: "MATH",
      totalQuestions: questions.filter((q) => q.subject === "MATH").length,
      groups: buildSubjectGroups(questions, "MATH"),
    },
  ];
}

export function getQuestionsForTopic(
  questions: Question[],
  topicId: string,
  navigationData: SubjectNavigation[],
): Question[] {
  const topic = navigationData.flatMap((nav) => nav.groups).find((group) => group.id === topicId);

  if (!topic) return [];

  return questions.filter((question) =>
    question.tags.some((tag) => topic.tags.includes(tag.code)),
  );
}
