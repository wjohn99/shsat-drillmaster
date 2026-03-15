import { SubjectNavigation } from '@/types/navigation';
import { questions, allTags } from './mockData';

// Generate realistic question counts for topics
const generateQuestionCount = (baseCount: number, variance: number = 50) => {
  return Math.floor(baseCount + (Math.random() - 0.5) * variance);
};

export const navigationData: SubjectNavigation[] = [
  {
    subject: 'ELA',
    totalQuestions: 1590,
    groups: [
      // Reading Comprehension - Organized by Passages
      {
        id: 'passage-1',
        label: 'Passage 1: The Impact of Technology on Education',
        color: 'bg-purple-500',
        questionCount: 5,
        tags: ['RC-PASSAGE-1']
      },
      {
        id: 'passage-2',
        label: 'Passage 2: Climate Change and Renewable Energy',
        color: 'bg-purple-500',
        questionCount: 4,
        tags: ['RC-PASSAGE-2']
      },
      {
        id: 'passage-3',
        label: 'Passage 3: The History of Space Exploration',
        color: 'bg-purple-500',
        questionCount: 6,
        tags: ['RC-PASSAGE-3']
      },
      {
        id: 'passage-4',
        label: 'Passage 4: Artificial Intelligence in Healthcare',
        color: 'bg-purple-500',
        questionCount: 5,
        tags: ['RC-PASSAGE-4']
      },
      {
        id: 'passage-5',
        label: 'Passage 5: The Economics of Sustainable Agriculture',
        color: 'bg-purple-500',
        questionCount: 4,
        tags: ['RC-PASSAGE-5']
      },
      {
        id: 'passage-6',
        label: 'Passage 6: Social Media and Mental Health',
        color: 'bg-purple-500',
        questionCount: 5,
        tags: ['RC-PASSAGE-6']
      },
      {
        id: 'passage-7',
        label: 'Passage 7: The Renaissance and Scientific Revolution',
        color: 'bg-purple-500',
        questionCount: 6,
        tags: ['RC-PASSAGE-7']
      },
      {
        id: 'passage-8',
        label: 'Passage 8: Urban Planning and Smart Cities',
        color: 'bg-purple-500',
        questionCount: 4,
        tags: ['RC-PASSAGE-8']
      },
      // Revising and Editing - Organized by Grammar/Writing Tags
      {
        id: 're-word-choice',
        label: 'Word Choice',
        color: 'bg-teal-500',
        questionCount: 89,
        tags: ['RE-WC']
      },
      {
        id: 're-sentence-structure',
        label: 'Sentence Structure',
        color: 'bg-teal-500',
        questionCount: 94,
        tags: ['RE-SEN']
      },
      {
        id: 're-verb-tense',
        label: 'Verb Tense Consistency',
        color: 'bg-teal-500',
        questionCount: 67,
        tags: ['RE-TEN']
      },
      {
        id: 're-run-on',
        label: 'Run-on Sentences',
        color: 'bg-teal-500',
        questionCount: 72,
        tags: ['RE-RUN']
      },
      {
        id: 're-subject-verb',
        label: 'Subject-Verb Agreement',
        color: 'bg-teal-500',
        questionCount: 85,
        tags: ['RE-SVA']
      },
      {
        id: 're-pronouns',
        label: 'Pronouns',
        color: 'bg-teal-500',
        questionCount: 63,
        tags: ['RE-PRO']
      },
      {
        id: 're-comma',
        label: 'Comma Usage',
        color: 'bg-teal-500',
        questionCount: 98,
        tags: ['RE-COM']
      },
      {
        id: 're-colon',
        label: 'Colon Usage',
        color: 'bg-teal-500',
        questionCount: 45,
        tags: ['RE-COLN']
      },
      {
        id: 're-semicolon',
        label: 'Semicolon Usage',
        color: 'bg-teal-500',
        questionCount: 41,
        tags: ['RE-SEM']
      },
      {
        id: 're-apostrophe',
        label: 'Apostrophe Usage',
        color: 'bg-teal-500',
        questionCount: 53,
        tags: ['RE-APP']
      },
      {
        id: 're-organization',
        label: 'Organization',
        color: 'bg-teal-500',
        questionCount: 76,
        tags: ['RE-ORG']
      },
      {
        id: 're-clarity',
        label: 'Clarity / Conciseness',
        color: 'bg-teal-500',
        questionCount: 81,
        tags: ['RE-CL']
      }
    ]
  },
  {
    subject: 'MATH',
    totalQuestions: 1700,
    groups: [
      {
        id: 'algebra-expressions',
        label: 'Algebra and Expressions',
        color: 'bg-blue-500',
        questionCount: 425,
        tags: ['ALG-LIN', 'ALG-LIN-TWO', 'ALG-SYS', 'EQUIV-EXP', 'INEQ', 'FUNC-LIN', 'FUNC-NONLIN', 'NONLIN-EQ']
      },
      {
        id: 'applied-math',
        label: 'Applied Math',
        color: 'bg-blue-500',
        questionCount: 352,
        tags: ['PS-PR', 'PS-PERC', 'WORD-PROB', 'REAL-WORLD']
      },
      {
        id: 'geometry-measurement',
        label: 'Geometry and Measurement',
        color: 'bg-blue-500',
        questionCount: 280,
        tags: ['GEO-AREA', 'GEO-LINES', 'GEO-TRIG', 'GEO-CIRCLES', 'AREA-VOL', 'COORD-GEO']
      },
      {
        id: 'data-probability',
        label: 'Data and Probability',
        color: 'bg-blue-500',
        questionCount: 643,
        tags: ['PS-STAT-ONE', 'PS-STAT-TWO', 'PS-PROB', 'PS-STAT-INF', 'PS-STAT-EXP', 'DATA-ANALYSIS']
      }
    ]
  }
];

export const getQuestionsForTopic = (topicId: string) => {
  const topic = navigationData
    .flatMap(nav => nav.groups)
    .find(group => group.id === topicId);
  
  if (!topic) return [];
  
  return questions.filter(question => 
    question.tags.some(tag => topic.tags.includes(tag.code))
  );
};