import { SubjectNavigation } from '@/types/navigation';
import { TAG_CATEGORIES } from '@/data/taggingScheme';
import { questions } from './mockData';

const ELA_COLORS = ['bg-purple-500', 'bg-violet-500', 'bg-fuchsia-500'];
const MATH_COLORS = ['bg-blue-500', 'bg-sky-500', 'bg-indigo-500'];

function countQuestionsForTags(tagCodes: string[]): number {
  return questions.filter((q) => q.tags.some((t) => tagCodes.includes(t.code))).length;
}

function buildSubjectGroups(subject: 'ELA' | 'MATH') {
  const colors = subject === 'ELA' ? ELA_COLORS : MATH_COLORS;
  return TAG_CATEGORIES.filter((c) => c.subject === subject).flatMap((category, categoryIndex) =>
    category.tags.map((t, tagIndex) => ({
      id: `${category.id}-${t.code.toLowerCase()}`,
      label: t.label,
      color: colors[(categoryIndex + tagIndex) % colors.length],
      questionCount: Math.max(countQuestionsForTags([t.code]), 0),
      tags: [t.code],
    })),
  );
}

export const navigationData: SubjectNavigation[] = [
  {
    subject: 'ELA',
    totalQuestions: questions.filter((q) => q.subject === 'ELA').length,
    groups: buildSubjectGroups('ELA'),
  },
  {
    subject: 'MATH',
    totalQuestions: questions.filter((q) => q.subject === 'MATH').length,
    groups: buildSubjectGroups('MATH'),
  },
];

export const getQuestionsForTopic = (topicId: string) => {
  const topic = navigationData.flatMap((nav) => nav.groups).find((group) => group.id === topicId);

  if (!topic) return [];

  return questions.filter((question) =>
    question.tags.some((tag) => topic.tags.includes(tag.code)),
  );
};
