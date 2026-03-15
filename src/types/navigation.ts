export interface TopicGroup {
  id: string;
  label: string;
  color: string;
  questionCount: number;
  tags: string[];
}

export interface SubjectNavigation {
  subject: 'ELA' | 'MATH';
  totalQuestions: number;
  groups: TopicGroup[];
}