export type Subject = 'MATH' | 'ELA';

export type QuestionSubtype = 'MC4_A-D' | 'MC4_E-H' | 'GRID_IN' | 'TEI_DRAG_DROP' | 'TEI_MULTIPLE_SELECT';

export type ScoreBand = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

export interface Tag {
  id: string;
  domain: Subject;
  code: string;
  label: string;
}

export interface Choice {
  id: string;
  label: string;
  text: string;
  isCorrect: boolean;
}

export interface Question {
  id: string;
  subject: Subject;
  subtype: QuestionSubtype;
  scoreBand: ScoreBand;
  stem: string;
  choices?: Choice[];
  tags: Tag[];
  passageId?: string;
  timeToSolve?: number; // in seconds
  userAttempted?: boolean;
  userCorrect?: boolean;
  userBookmarked?: boolean;
  createdAt: string;
}

export interface Passage {
  id: string;
  title: string;
  lexile?: number;
  sourceMeta?: string;
  body: string;
  questions: Question[];
}

export interface Form {
  id: string;
  name: string;
  description: string;
  questions: Question[];
  timeLimit?: number; // in minutes
}

export interface FilterOptions {
  subjects: Subject[];
  scoreBands: ScoreBand[];
  tagCodes: string[];
  subtypes: QuestionSubtype[];
  passageOnly: boolean;
  searchQuery: string;
  userStatus: ('attempted' | 'correct' | 'bookmarked')[];
}