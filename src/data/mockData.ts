import { Question, Tag, Passage, Form, Subject, Difficulty, QuestionSubtype } from '@/types';

// ELA Tags
const elaTags: Tag[] = [
  { id: 'ela-1', domain: 'ELA', code: 'CRAFT', label: 'Craft and Structure' },
  { id: 'ela-2', domain: 'ELA', code: 'CROSS-TEXT', label: 'Cross-Text Connections' },
  { id: 'ela-3', domain: 'ELA', code: 'TEXT-STRUCT', label: 'Text Structure and Purpose' },
  { id: 'ela-4', domain: 'ELA', code: 'WIC', label: 'Words in Context' },
  { id: 'ela-5', domain: 'ELA', code: 'EXPRESS-IDEAS', label: 'Expression of Ideas' },
  { id: 'ela-6', domain: 'ELA', code: 'RHETORIC', label: 'Rhetorical Synthesis' },
  { id: 'ela-7', domain: 'ELA', code: 'TRANS', label: 'Transitions' },
  { id: 'ela-8', domain: 'ELA', code: 'INFO-IDEAS', label: 'Information and Ideas' },
  { id: 'ela-9', domain: 'ELA', code: 'CENTRAL-IDEAS', label: 'Central Ideas and Details' },
  { id: 'ela-10', domain: 'ELA', code: 'COMMAND-EVIDENCE', label: 'Command of Evidence' },
  { id: 'ela-11', domain: 'ELA', code: 'INFERENCES', label: 'Inferences' },
  { id: 'ela-12', domain: 'ELA', code: 'SEC', label: 'Standard English Conventions' },
  { id: 'ela-13', domain: 'ELA', code: 'BOUNDARIES', label: 'Boundaries' },
  { id: 'ela-14', domain: 'ELA', code: 'FORM-STRUCT', label: 'Form, Structure, and Sense' },
];

// Math Tags
const mathTags: Tag[] = [
  { id: 'math-1', domain: 'MATH', code: 'ALG-LIN', label: 'Linear equations in one variable' },
  { id: 'math-2', domain: 'MATH', code: 'FUNC-LIN', label: 'Linear functions' },
  { id: 'math-3', domain: 'MATH', code: 'ALG-LIN-TWO', label: 'Linear equations in two variables' },
  { id: 'math-4', domain: 'MATH', code: 'ALG-SYS', label: 'Systems of two linear equations in two variables' },
  { id: 'math-5', domain: 'MATH', code: 'INEQ', label: 'Linear inequalities in one or two variables' },
  { id: 'math-6', domain: 'MATH', code: 'FUNC-NONLIN', label: 'Nonlinear functions' },
  { id: 'math-7', domain: 'MATH', code: 'EQUIV-EXP', label: 'Equivalent expressions' },
  { id: 'math-8', domain: 'MATH', code: 'NONLIN-EQ', label: 'Nonlinear equations in one variable and systems of equations in two variables' },
  { id: 'math-9', domain: 'MATH', code: 'PS-PR', label: 'Ratios, rates, proportional relationships, and units' },
  { id: 'math-10', domain: 'MATH', code: 'PS-PERC', label: 'Percentages' },
  { id: 'math-11', domain: 'MATH', code: 'PS-STAT-ONE', label: 'One-variable data: Distributions and measures of center and spread' },
  { id: 'math-12', domain: 'MATH', code: 'PS-STAT-TWO', label: 'Two-variable data: Models and scatterplots' },
  { id: 'math-13', domain: 'MATH', code: 'PS-PROB', label: 'Probability and conditional probability' },
  { id: 'math-14', domain: 'MATH', code: 'PS-STAT-INF', label: 'Inference from sample statistics and margin of error' },
  { id: 'math-15', domain: 'MATH', code: 'PS-STAT-EXP', label: 'Evaluating statistical claims: Observational studies and experiments' },
  { id: 'math-16', domain: 'MATH', code: 'GEO-AREA', label: 'Area and volume' },
  { id: 'math-17', domain: 'MATH', code: 'GEO-LINES', label: 'Lines, angles, and triangles' },
  { id: 'math-18', domain: 'MATH', code: 'GEO-TRIG', label: 'Right triangles and trigonometry' },
  { id: 'math-19', domain: 'MATH', code: 'GEO-CIRCLES', label: 'Circles' },
];

export const allTags = [...elaTags, ...mathTags];

// Sample ELA Passages
export const passages: Passage[] = [
  {
    id: 'passage-1',
    title: 'The Evolution of Urban Planning',
    lexile: 1200,
    sourceMeta: 'Adapted from "Cities of Tomorrow" by Jane Urbanist',
    body: `Urban planning has undergone significant transformations throughout history, evolving from ancient grid systems to modern sustainable development approaches. The earliest cities, such as those in Mesopotamia, were planned with basic geometric patterns that prioritized defense and trade routes.

During the Industrial Revolution, rapid urbanization created new challenges that planners had never encountered. Cities grew exponentially, often without adequate infrastructure to support their populations. This period saw the emergence of comprehensive planning theories that sought to address issues of public health, transportation, and quality of life.

Today's urban planners face complex challenges including climate change, technological integration, and social equity. Smart city initiatives leverage data analytics and Internet of Things (IoT) technologies to optimize everything from traffic flow to energy consumption. These innovations represent a fundamental shift toward evidence-based planning decisions.`,
    questions: []
  },
  {
    id: 'passage-2',
    title: 'The Science of Memory Formation',
    lexile: 1150,
    sourceMeta: 'From "Neural Networks" by Dr. Maria Chen',
    body: `Memory formation is one of the most fascinating processes in neuroscience. When we learn something new, our brains create intricate networks of connections between neurons. These connections, called synapses, strengthen or weaken based on how frequently they are activated.

The process begins in the hippocampus, a seahorse-shaped structure deep within the brain. Here, short-term memories are temporarily stored and processed. Through a process called consolidation, important memories are gradually transferred to the cerebral cortex for long-term storage.

Recent research has revealed that sleep plays a crucial role in memory consolidation. During sleep, the brain replays the day's experiences, strengthening important neural pathways while eliminating unnecessary connections. This process explains why students often perform better on tests after a good night's sleep.`,
    questions: []
  }
];

// Sample Questions
export const questions: Question[] = [
  // ELA Questions
  {
    id: 'q1',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: 'Medium',
    scoreBand: 5,
    stem: 'Based on the passage, what was the primary factor that drove changes in urban planning during the Industrial Revolution?',
    choices: [
      { id: 'q1-a', label: 'A', text: 'The desire to create more aesthetically pleasing cities', isCorrect: false },
      { id: 'q1-b', label: 'B', text: 'Rapid population growth and inadequate infrastructure', isCorrect: true },
      { id: 'q1-c', label: 'C', text: 'The invention of new construction materials', isCorrect: false },
      { id: 'q1-d', label: 'D', text: 'Government regulations requiring systematic planning', isCorrect: false },
    ],
    tags: [elaTags[0], elaTags[1]], // Main Ideas, Inference
    passageId: 'passage-1',
    timeToSolve: 120,
    userAttempted: true,
    userCorrect: true,
    createdAt: '2024-01-15T10:00:00Z'
  },
  {
    id: 'q2',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: 'Hard',
    scoreBand: 7,
    stem: 'Which choice provides the best evidence for the answer to the previous question?',
    choices: [
      { id: 'q2-a', label: 'A', text: '"The earliest cities...were planned with basic geometric patterns"', isCorrect: false },
      { id: 'q2-b', label: 'B', text: '"Cities grew exponentially, often without adequate infrastructure"', isCorrect: true },
      { id: 'q2-c', label: 'C', text: '"Smart city initiatives leverage data analytics"', isCorrect: false },
      { id: 'q2-d', label: 'D', text: '"These innovations represent a fundamental shift"', isCorrect: false },
    ],
    tags: [elaTags[1]], // Inference
    passageId: 'passage-1',
    timeToSolve: 90,
    userAttempted: false,
    createdAt: '2024-01-15T10:01:00Z'
  },
  {
    id: 'q3',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: 'Easy',
    scoreBand: 3,
    stem: 'According to the passage, where are short-term memories initially processed?',
    choices: [
      { id: 'q3-a', label: 'A', text: 'The cerebral cortex', isCorrect: false },
      { id: 'q3-b', label: 'B', text: 'The hippocampus', isCorrect: true },
      { id: 'q3-c', label: 'C', text: 'The synapses', isCorrect: false },
      { id: 'q3-d', label: 'D', text: 'The neural networks', isCorrect: false },
    ],
    tags: [elaTags[0]], // Main Ideas
    passageId: 'passage-2',
    timeToSolve: 75,
    userAttempted: true,
    userCorrect: false,
    userBookmarked: true,
    createdAt: '2024-01-15T10:02:00Z'
  },

  // Math Questions
  {
    id: 'q4',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: 'Medium',
    scoreBand: 4,
    stem: 'If 3x + 7 = 22, what is the value of x?',
    choices: [
      { id: 'q4-a', label: 'A', text: '3', isCorrect: false },
      { id: 'q4-b', label: 'B', text: '5', isCorrect: true },
      { id: 'q4-c', label: 'C', text: '7', isCorrect: false },
      { id: 'q4-d', label: 'D', text: '15', isCorrect: false },
    ],
    tags: [mathTags[0]], // Linear Equations
    timeToSolve: 90,
    userAttempted: true,
    userCorrect: true,
    createdAt: '2024-01-15T10:03:00Z'
  },
  {
    id: 'q5',
    subject: 'MATH',
    subtype: 'GRID_IN',
    difficulty: 'Hard',
    scoreBand: 6,
    stem: 'A recipe calls for 2/3 cup of flour for every 1/4 cup of sugar. If Maria uses 1 1/2 cups of flour, how many cups of sugar should she use? Express your answer as a fraction in lowest terms.',
    tags: [mathTags[5]], // Ratios & Proportions
    timeToSolve: 180,
    userAttempted: false,
    createdAt: '2024-01-15T10:04:00Z'
  },
  {
    id: 'q6',
    subject: 'MATH',
    subtype: 'MC4_E-H',
    difficulty: 'Easy',
    scoreBand: 2,
    stem: 'What is the area of a rectangle with length 8 feet and width 6 feet?',
    choices: [
      { id: 'q6-e', label: 'E', text: '14 square feet', isCorrect: false },
      { id: 'q6-f', label: 'F', text: '28 square feet', isCorrect: false },
      { id: 'q6-g', label: 'G', text: '48 square feet', isCorrect: true },
      { id: 'q6-h', label: 'H', text: '64 square feet', isCorrect: false },
    ],
    tags: [mathTags[10]], // Area & Volume
    timeToSolve: 60,
    userAttempted: true,
    userCorrect: true,
    createdAt: '2024-01-15T10:05:00Z'
  },
  {
    id: 'q7',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: 'Hard',
    scoreBand: 8,
    stem: 'The system of equations 2x + 3y = 12 and 4x - y = 10 has a solution (x, y). What is the value of x + y?',
    choices: [
      { id: 'q7-a', label: 'A', text: '2', isCorrect: false },
      { id: 'q7-b', label: 'B', text: '4', isCorrect: true },
      { id: 'q7-c', label: 'C', text: '6', isCorrect: false },
      { id: 'q7-d', label: 'D', text: '8', isCorrect: false },
    ],
    tags: [mathTags[1]], // Systems of Equations
    timeToSolve: 240,
    userAttempted: false,
    createdAt: '2024-01-15T10:06:00Z'
  },
  {
    id: 'q8',
    subject: 'MATH',
    subtype: 'MC4_E-H',
    difficulty: 'Medium',
    scoreBand: 5,
    stem: 'In a class of 30 students, 18 play basketball and 20 play soccer. If 12 students play both sports, how many students play neither sport?',
    choices: [
      { id: 'q8-e', label: 'E', text: '2', isCorrect: false },
      { id: 'q8-f', label: 'F', text: '4', isCorrect: true },
      { id: 'q8-g', label: 'G', text: '6', isCorrect: false },
      { id: 'q8-h', label: 'H', text: '8', isCorrect: false },
    ],
    tags: [mathTags[7]], // Statistics
    timeToSolve: 150,
    userAttempted: true,
    userCorrect: false,
    userBookmarked: true,
    createdAt: '2024-01-15T10:07:00Z'
  },

  // Additional Math Questions from ScoreSmartMATH.json
  {
    id: 'q9',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: 'Easy',
    scoreBand: 2,
    stem: 'A bicycle that originally cost $420 is on sale for 30% off. What is the sale price of the bicycle?',
    choices: [
      { id: 'q9-a', label: 'A', text: '$126', isCorrect: false },
      { id: 'q9-b', label: 'B', text: '$294', isCorrect: true },
      { id: 'q9-c', label: 'C', text: '$300', isCorrect: false },
      { id: 'q9-d', label: 'D', text: '$390', isCorrect: false },
    ],
    tags: [mathTags[9], mathTags[9], mathTags[0]], // Percentages, Percentages, Linear equations
    timeToSolve: 60,
    userAttempted: false,
    createdAt: '2024-01-15T10:08:00Z'
  },
  {
    id: 'q10',
    subject: 'MATH',
    subtype: 'MC4_E-H',
    difficulty: 'Medium',
    scoreBand: 4,
    stem: 'A circle with a radius of 4 inches is inscribed perfectly inside a square. What is the area of the region that is inside the square but outside the circle, in square inches?',
    choices: [
      { id: 'q10-e', label: 'E', text: '64−16π', isCorrect: true },
      { id: 'q10-f', label: 'F', text: '64−8π', isCorrect: false },
      { id: 'q10-g', label: 'G', text: '16−16π', isCorrect: false },
      { id: 'q10-h', label: 'H', text: '16−8π', isCorrect: false },
    ],
    tags: [mathTags[15], mathTags[15], mathTags[18], mathTags[16]], // Area and volume, Circles, Lines angles triangles
    timeToSolve: 120,
    userAttempted: false,
    createdAt: '2024-01-15T10:09:00Z'
  },
  {
    id: 'q11',
    subject: 'MATH',
    subtype: 'GRID_IN',
    difficulty: 'Easy',
    scoreBand: 2,
    stem: 'What is the value of the expression 20 − 3 × (4 − 2)?',
    tags: [mathTags[0], mathTags[0]], // Linear equations
    timeToSolve: 60,
    userAttempted: false,
    createdAt: '2024-01-15T10:10:00Z'
  },
  {
    id: 'q12',
    subject: 'MATH',
    subtype: 'MC4_E-H',
    difficulty: 'Easy',
    scoreBand: 2,
    stem: 'If 9k − 15 = 4k + 5, what is the value of k?',
    choices: [
      { id: 'q12-e', label: 'E', text: '1', isCorrect: false },
      { id: 'q12-f', label: 'F', text: '2', isCorrect: false },
      { id: 'q12-g', label: 'G', text: '3', isCorrect: false },
      { id: 'q12-h', label: 'H', text: '4', isCorrect: true },
    ],
    tags: [mathTags[0], mathTags[0]], // Linear equations
    timeToSolve: 90,
    userAttempted: false,
    createdAt: '2024-01-15T10:11:00Z'
  },
  {
    id: 'q13',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: 'Easy',
    scoreBand: 2,
    stem: 'The mean of five test scores is 85. If four of the scores are 80, 92, 78, and 88, what is the fifth score?',
    choices: [
      { id: 'q13-a', label: 'A', text: '85', isCorrect: false },
      { id: 'q13-b', label: 'B', text: '87', isCorrect: true },
      { id: 'q13-c', label: 'C', text: '89', isCorrect: false },
      { id: 'q13-d', label: 'D', text: '91', isCorrect: false },
    ],
    tags: [mathTags[10], mathTags[10], mathTags[0]], // One-variable data, Linear equations
    timeToSolve: 90,
    userAttempted: false,
    createdAt: '2024-01-15T10:12:00Z'
  }
];

// Update passages with their questions
passages[0].questions = questions.filter(q => q.passageId === 'passage-1');
passages[1].questions = questions.filter(q => q.passageId === 'passage-2');

// Sample Forms
export const forms: Form[] = [
  {
    id: 'form-1',
    name: 'Ratios & Proportions Drill',
    description: 'Practice problems focusing on ratios, proportions, and percent calculations',
    questions: questions.filter(q => q.tags.some(tag => tag.code === 'PS-PR')),
    timeLimit: 15
  },
  {
    id: 'form-2',
    name: 'ELA Inference Practice',
    description: 'Reading comprehension questions that require making inferences from text',
    questions: questions.filter(q => q.tags.some(tag => tag.code === 'RC-INF')),
    timeLimit: 20
  }
];

export const getFilteredQuestions = (filters: Partial<{
  subjects: string[];
  difficulties: string[];
  scoreBands: number[];
  tagCodes: string[];
  subtypes: string[];
  passageOnly: boolean;
  searchQuery: string;
  userStatus: string[];
}>) => {
  return questions.filter(question => {
    // Subject filter
    if (filters.subjects?.length && !filters.subjects.includes(question.subject)) {
      return false;
    }

    // Difficulty filter
    if (filters.difficulties?.length && !filters.difficulties.includes(question.difficulty)) {
      return false;
    }

    // Score band filter
    if (filters.scoreBands?.length && !filters.scoreBands.includes(question.scoreBand)) {
      return false;
    }

    // Tag filter
    if (filters.tagCodes?.length) {
      const questionTagCodes = question.tags.map(tag => tag.code);
      if (!filters.tagCodes.some(code => questionTagCodes.includes(code))) {
        return false;
      }
    }

    // Subtype filter
    if (filters.subtypes?.length && !filters.subtypes.includes(question.subtype)) {
      return false;
    }

    // Passage only filter
    if (filters.passageOnly && !question.passageId) {
      return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const searchableText = [
        question.stem,
        ...(question.choices?.map(c => c.text) || []),
        ...question.tags.map(t => t.label)
      ].join(' ').toLowerCase();
      
      if (!searchableText.includes(query)) {
        return false;
      }
    }

    // User status filter
    if (filters.userStatus?.length) {
      const statusChecks = {
        attempted: question.userAttempted === true,
        correct: question.userCorrect === true,
        bookmarked: question.userBookmarked === true
      };
      
      if (!filters.userStatus.some(status => statusChecks[status as keyof typeof statusChecks])) {
        return false;
      }
    }

    return true;
  });
};