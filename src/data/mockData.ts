import { Difficulty, Question, Passage, Form } from '@/types';
import { allTags, normalizeQuestionTags, tag } from '@/data/taggingScheme';

export { allTags };

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
  },
  {
    id: 'passage-ela-001',
    title: 'School Gardening Clubs',
    lexile: 980,
    sourceMeta: 'Informational article on student gardening programs',
    body: `(1) Many schools across the country have recently started gardening clubs for students.

(2) Students in these clubs learn how to grow vegetables and flowers while also learning about environmental responsibility.

(3) The gardens are usually maintained after school and during weekends.

(4) Some students say that gardening helps them feel less stressed after long school days.

(5) In addition many schools donate extra vegetables from the gardens to local food pantries.

(6) Gardening clubs have become increasingly popular in urban schools over the past few years.`,
    questions: [],
  },
];

const scoreBandToDifficulty = (scoreBand: number): Difficulty => {
  if (scoreBand <= 3) return 'easy';
  if (scoreBand <= 6) return 'medium';
  return 'hard';
};

// Sample Questions (format tags normalized after definition)
const rawQuestions: Question[] = [
  // ELA Questions
  {
    id: 'q1',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: scoreBandToDifficulty(5),
    stem: 'Based on the passage, what was the primary factor that drove changes in urban planning during the Industrial Revolution?',
    choices: [
      { id: 'q1-a', label: 'A', text: 'The desire to create more aesthetically pleasing cities', isCorrect: false },
      { id: 'q1-b', label: 'B', text: 'Rapid population growth and inadequate infrastructure', isCorrect: true },
      { id: 'q1-c', label: 'C', text: 'The invention of new construction materials', isCorrect: false },
      { id: 'q1-d', label: 'D', text: 'Government regulations requiring systematic planning', isCorrect: false },
    ],
    tags: [tag('RC-MI'), tag('RC-INF')],
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
    difficulty: scoreBandToDifficulty(7),
    stem: 'Which choice provides the best evidence for the answer to the previous question?',
    choices: [
      { id: 'q2-a', label: 'A', text: '"The earliest cities...were planned with basic geometric patterns"', isCorrect: false },
      { id: 'q2-b', label: 'B', text: '"Cities grew exponentially, often without adequate infrastructure"', isCorrect: true },
      { id: 'q2-c', label: 'C', text: '"Smart city initiatives leverage data analytics"', isCorrect: false },
      { id: 'q2-d', label: 'D', text: '"These innovations represent a fundamental shift"', isCorrect: false },
    ],
    tags: [tag('RC-EV')],
    passageId: 'passage-1',
    timeToSolve: 90,
    userAttempted: false,
    createdAt: '2024-01-15T10:01:00Z'
  },
  {
    id: 'q3',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: scoreBandToDifficulty(3),
    stem: 'According to the passage, where are short-term memories initially processed?',
    choices: [
      { id: 'q3-a', label: 'A', text: 'The cerebral cortex', isCorrect: false },
      { id: 'q3-b', label: 'B', text: 'The hippocampus', isCorrect: true },
      { id: 'q3-c', label: 'C', text: 'The synapses', isCorrect: false },
      { id: 'q3-d', label: 'D', text: 'The neural networks', isCorrect: false },
    ],
    tags: [tag('RC-MI')],
    passageId: 'passage-2',
    timeToSolve: 75,
    userAttempted: true,
    userCorrect: false,
    createdAt: '2024-01-15T10:02:00Z'
  },

  // Math Questions
  {
    id: 'q4',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: scoreBandToDifficulty(4),
    stem: 'If 3x + 7 = 22, what is the value of x?',
    choices: [
      { id: 'q4-a', label: 'A', text: '3', isCorrect: false },
      { id: 'q4-b', label: 'B', text: '5', isCorrect: true },
      { id: 'q4-c', label: 'C', text: '7', isCorrect: false },
      { id: 'q4-d', label: 'D', text: '15', isCorrect: false },
    ],
    tags: [tag('ALG-LIN')],
    timeToSolve: 90,
    userAttempted: true,
    userCorrect: true,
    createdAt: '2024-01-15T10:03:00Z'
  },
  {
    id: 'q5',
    subject: 'MATH',
    subtype: 'GRID_IN',
    difficulty: scoreBandToDifficulty(6),
    stem: 'A recipe calls for 2/3 cup of flour for every 1/4 cup of sugar. If Maria uses 1 1/2 cups of flour, how many cups of sugar should she use? Express your answer as a fraction in lowest terms.',
    tags: [tag('NUM-RAT')],
    timeToSolve: 180,
    userAttempted: false,
    createdAt: '2024-01-15T10:04:00Z'
  },
  {
    id: 'q6',
    subject: 'MATH',
    subtype: 'MC4_E-H',
    difficulty: scoreBandToDifficulty(2),
    stem: 'What is the area of a rectangle with length 8 feet and width 6 feet?',
    choices: [
      { id: 'q6-e', label: 'E', text: '14 square feet', isCorrect: false },
      { id: 'q6-f', label: 'F', text: '28 square feet', isCorrect: false },
      { id: 'q6-g', label: 'G', text: '48 square feet', isCorrect: true },
      { id: 'q6-h', label: 'H', text: '64 square feet', isCorrect: false },
    ],
    tags: [tag('GEO-ARV')],
    timeToSolve: 60,
    userAttempted: true,
    userCorrect: true,
    createdAt: '2024-01-15T10:05:00Z'
  },
  {
    id: 'q7',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: scoreBandToDifficulty(8),
    stem: 'The system of equations 2x + 3y = 12 and 4x - y = 10 has a solution (x, y). What is the value of x + y?',
    choices: [
      { id: 'q7-a', label: 'A', text: '2', isCorrect: false },
      { id: 'q7-b', label: 'B', text: '4', isCorrect: true },
      { id: 'q7-c', label: 'C', text: '6', isCorrect: false },
      { id: 'q7-d', label: 'D', text: '8', isCorrect: false },
    ],
    tags: [tag('ALG-SYS')],
    timeToSolve: 240,
    userAttempted: false,
    createdAt: '2024-01-15T10:06:00Z'
  },
  {
    id: 'q8',
    subject: 'MATH',
    subtype: 'MC4_E-H',
    difficulty: scoreBandToDifficulty(5),
    stem: 'In a class of 30 students, 18 play basketball and 20 play soccer. If 12 students play both sports, how many students play neither sport?',
    choices: [
      { id: 'q8-e', label: 'E', text: '2', isCorrect: false },
      { id: 'q8-f', label: 'F', text: '4', isCorrect: true },
      { id: 'q8-g', label: 'G', text: '6', isCorrect: false },
      { id: 'q8-h', label: 'H', text: '8', isCorrect: false },
    ],
    tags: [tag('DAT-PROB')],
    timeToSolve: 150,
    userAttempted: true,
    userCorrect: false,
    createdAt: '2024-01-15T10:07:00Z'
  },

  // Additional Math Questions from ScoreSmartMATH.json
  {
    id: 'q9',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: scoreBandToDifficulty(2),
    stem: 'A bicycle that originally cost $420 is on sale for 30% off. What is the sale price of the bicycle?',
    choices: [
      { id: 'q9-a', label: 'A', text: '$126', isCorrect: false },
      { id: 'q9-b', label: 'B', text: '$294', isCorrect: true },
      { id: 'q9-c', label: 'C', text: '$300', isCorrect: false },
      { id: 'q9-d', label: 'D', text: '$390', isCorrect: false },
    ],
    tags: [tag('APP-PCT')],
    timeToSolve: 60,
    userAttempted: false,
    createdAt: '2024-01-15T10:08:00Z'
  },
  {
    id: 'q10',
    subject: 'MATH',
    subtype: 'MC4_E-H',
    difficulty: scoreBandToDifficulty(4),
    stem: 'A circle with a radius of 4 inches is inscribed perfectly inside a square. What is the area of the region that is inside the square but outside the circle, in square inches?',
    choices: [
      { id: 'q10-e', label: 'E', text: '64−16π', isCorrect: true },
      { id: 'q10-f', label: 'F', text: '64−8π', isCorrect: false },
      { id: 'q10-g', label: 'G', text: '16−16π', isCorrect: false },
      { id: 'q10-h', label: 'H', text: '16−8π', isCorrect: false },
    ],
    tags: [tag('GEO-ARV'), tag('GEO-CRC'), tag('GEO-QUAD')],
    timeToSolve: 120,
    userAttempted: false,
    createdAt: '2024-01-15T10:09:00Z'
  },
  {
    id: 'q11',
    subject: 'MATH',
    subtype: 'GRID_IN',
    difficulty: scoreBandToDifficulty(2),
    stem: 'What is the value of the expression 20 − 3 × (4 − 2)?',
    tags: [tag('NUM-INT')],
    timeToSolve: 60,
    userAttempted: false,
    createdAt: '2024-01-15T10:10:00Z'
  },
  {
    id: 'q12',
    subject: 'MATH',
    subtype: 'MC4_E-H',
    difficulty: scoreBandToDifficulty(2),
    stem: 'If 9k − 15 = 4k + 5, what is the value of k?',
    choices: [
      { id: 'q12-e', label: 'E', text: '1', isCorrect: false },
      { id: 'q12-f', label: 'F', text: '2', isCorrect: false },
      { id: 'q12-g', label: 'G', text: '3', isCorrect: false },
      { id: 'q12-h', label: 'H', text: '4', isCorrect: true },
    ],
    tags: [tag('NUM-INT')],
    timeToSolve: 90,
    userAttempted: false,
    createdAt: '2024-01-15T10:11:00Z'
  },
  {
    id: 'q13',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: scoreBandToDifficulty(2),
    stem: 'The mean of five test scores is 85. If four of the scores are 80, 92, 78, and 88, what is the fifth score?',
    choices: [
      { id: 'q13-a', label: 'A', text: '85', isCorrect: false },
      { id: 'q13-b', label: 'B', text: '87', isCorrect: true },
      { id: 'q13-c', label: 'C', text: '89', isCorrect: false },
      { id: 'q13-d', label: 'D', text: '91', isCorrect: false },
    ],
    tags: [tag('DAT-STA')],
    timeToSolve: 90,
    userAttempted: false,
    createdAt: '2024-01-15T10:12:00Z'
  },
  {
    id: 'q14',
    subject: 'MATH',
    subtype: 'INDY-ATA',
    difficulty: scoreBandToDifficulty(4),
    stem: 'Select all values of x that satisfy the equation (x − 2)(x + 3) = 0.',
    choices: [
      { id: 'q14-a', label: 'A', text: 'x = 2', isCorrect: true },
      { id: 'q14-b', label: 'B', text: 'x = −3', isCorrect: true },
      { id: 'q14-c', label: 'C', text: 'x = 3', isCorrect: false },
      { id: 'q14-d', label: 'D', text: 'x = −2', isCorrect: false },
      { id: 'q14-e', label: 'E', text: 'x = 6', isCorrect: false },
    ],
    tags: [tag('ALG-EXP')],
    timeToSolve: 120,
    userAttempted: false,
    createdAt: '2024-01-15T10:13:00Z'
  },
  {
    id: 'q15',
    subject: 'MATH',
    subtype: 'INDY-DND',
    difficulty: scoreBandToDifficulty(5),
    stem: 'The mean of a set of five numbers is 11. If four of the numbers in the set are 9, 14, 7, and 12, what is the value of the fifth number?',
    dnd: {
      instruction: 'Move the correct answer into the correct box:',
      pool: [
        { id: 'q15-d1', text: '10' },
        { id: 'q15-d2', text: '15' },
        { id: 'q15-d3', text: '19' },
        { id: 'q15-d4', text: '13' },
        { id: 'q15-d5', text: '8' },
        { id: 'q15-d6', text: '17' },
      ],
      zones: [
        {
          id: 'q15-z1',
          beforeText: 'The value of the fifth number is ',
          afterText: '.',
        },
      ],
      correctMapping: {
        'q15-z1': 'q15-d4',
      },
    },
    tags: [tag('DAT-STA')],
    timeToSolve: 120,
    userAttempted: false,
    createdAt: '2024-01-15T10:14:00Z'
  },
  {
    id: 'q16',
    subject: 'MATH',
    subtype: 'INDY-EE',
    difficulty: scoreBandToDifficulty(4),
    stem: 'A customer buys a shirt for $22.00 and a pair of pants for $38.00. If the sales tax rate is 8%, what is the total cost of the purchase, in dollars?',
    ee: {
      instruction: 'Enter your answer in the space.',
      inputPrefix: 'Total = $',
      acceptableAnswers: ['64.80', '64.8'],
      solutionExplanation:
        'The subtotal is 22 + 38 = 60 dollars. Sales tax is 8% of 60, which is 4.80 dollars. The total is 60 + 4.80 = 64.80 dollars.',
    },
    tags: [tag('APP-PCT')],
    timeToSolve: 120,
    userAttempted: false,
    createdAt: '2024-01-15T10:15:00Z'
  },
  {
    id: 'q17',
    subject: 'MATH',
    subtype: 'INDY-CGT',
    difficulty: scoreBandToDifficulty(3),
    stem: 'The table shows the number of books read by four students last month. Which student read the greatest number of books?',
    cgt: {
      visual: {
        type: 'table',
        caption: 'Books read by student',
        headers: ['Student', 'Books read'],
        rows: [
          ['Ana', '7'],
          ['Ben', '5'],
          ['Chen', '9'],
          ['Dana', '4'],
        ],
      },
      sourceNote: 'Each student read only whole books.',
      solutionExplanation:
        'Compare the numbers in the second column: 9 is the greatest value, so Chen read the most books.',
    },
    choices: [
      { id: 'q17-a', label: 'A', text: 'Ana', isCorrect: false },
      { id: 'q17-b', label: 'B', text: 'Ben', isCorrect: false },
      { id: 'q17-c', label: 'C', text: 'Chen', isCorrect: true },
      { id: 'q17-d', label: 'D', text: 'Dana', isCorrect: false },
    ],
    tags: [tag('DAT-GR')],
    timeToSolve: 90,
    userAttempted: false,
    createdAt: '2024-01-15T10:16:00Z'
  },
  {
    id: 'q18',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: scoreBandToDifficulty(4),
    stem: 'A train travels at a constant speed of 72 miles per hour. How far does the train travel in 2.5 hours?',
    wp: {
      instruction: 'Use the relationship distance = rate × time. Select the best answer.',
      solutionExplanation:
        'Distance equals rate multiplied by time: 72 × 2.5 = 180 miles.',
    },
    choices: [
      { id: 'q18-a', label: 'A', text: '144 miles', isCorrect: false },
      { id: 'q18-b', label: 'B', text: '156 miles', isCorrect: false },
      { id: 'q18-c', label: 'C', text: '180 miles', isCorrect: true },
      { id: 'q18-d', label: 'D', text: '192 miles', isCorrect: false },
    ],
    tags: [tag('APP-RTD')],
    timeToSolve: 120,
    userAttempted: false,
    createdAt: '2024-01-15T10:17:00Z'
  },
  {
    id: 'q19',
    subject: 'MATH',
    subtype: 'INDY-IC',
    difficulty: scoreBandToDifficulty(3),
    stem: 'Complete the sentence using the menu for the blank.',
    ic: {
      instruction: 'Select the value that makes the statement true.',
      segments: [
        { type: 'text', value: 'If 3x = 18, then x equals ' },
        { type: 'slot', slotId: 'ic19-s1' },
        { type: 'text', value: '.' },
      ],
      slots: [
        {
          slotId: 'ic19-s1',
          options: [
            { id: 'ic19-o1', text: '3' },
            { id: 'ic19-o2', text: '6' },
            { id: 'ic19-o3', text: '9' },
            { id: 'ic19-o4', text: '18' },
          ],
        },
      ],
      correctMapping: {
        'ic19-s1': 'ic19-o2',
      },
      solutionExplanation: 'Divide both sides of 3x = 18 by 3 to get x = 6.',
    },
    tags: [tag('ALG-LIN')],
    timeToSolve: 90,
    userAttempted: false,
    createdAt: '2024-01-15T10:18:00Z'
  },
  {
    id: 'q22',
    subject: 'MATH',
    subtype: 'INDY-GIF',
    difficulty: scoreBandToDifficulty(5),
    stem:
      'Plot the point (3, 4) on the coordinate plane. The viewing window is shown; use the grid to align your answer.',
    gif: {
      mode: 'plotPoint',
      xMin: -1,
      xMax: 8,
      yMin: -1,
      yMax: 8,
      correctX: 3,
      correctY: 4,
      tolerance: 0.35,
      snapToGrid: 0.5,
      showGrid: true,
      gridStep: 1,
      instruction:
        'Click once in the shaded region to plot your point. Points snap to half-unit grid intersections.',
      solutionExplanation:
        'The ordered pair (3, 4) is located 3 units to the right of the origin and 4 units up.',
    },
    tags: [tag('GEO-COO')],
    timeToSolve: 120,
    userAttempted: false,
    createdAt: '2024-01-15T10:21:00Z'
  },

  // ELA — School Gardening Clubs passage (Revising & Editing)
  {
    id: 'q-ela-garden-com',
    subject: 'ELA',
    subtype: 'INDY-IC',
    difficulty: 'medium',
    stem: 'In the passage, choose the punctuation that correctly completes sentence 5.',
    passageId: 'passage-ela-001',
    ic: {
      instruction: 'Select the punctuation mark that belongs in the blank.',
      segments: [
        { type: 'text', value: 'In addition ' },
        { type: 'slot', slotId: 'garden-com-s1' },
        { type: 'text', value: ' many schools donate extra vegetables from the gardens to local food pantries.' },
      ],
      slots: [
        {
          slotId: 'garden-com-s1',
          options: [
            { id: 'garden-com-o-dash', text: '—' },
            { id: 'garden-com-o-comma', text: ',' },
            { id: 'garden-com-o-semicolon', text: ';' },
            { id: 'garden-com-o-colon', text: ':' },
          ],
        },
      ],
      correctMapping: {
        'garden-com-s1': 'garden-com-o-comma',
      },
      solutionExplanation:
        'The phrase “In addition” introduces the rest of the sentence, so it must be followed by a comma before the main clause. Without that comma, the sentence incorrectly runs the introductory words into the subject.',
    },
    tags: [tag('RE-COM')],
    timeToSolve: 90,
    createdAt: '2026-05-17T12:00:00Z',
  },
  {
    id: 'q-ela-garden-org1',
    subject: 'ELA',
    subtype: 'INDY-DND',
    difficulty: 'medium',
    stem: 'Drag the sentence to the best location in the paragraph.',
    passageId: 'passage-ela-001',
    dnd: {
      instruction: 'Drag the sentence into the box that shows where it fits best in the passage.',
      singlePlacement: true,
      pool: [
        {
          id: 'garden-org1-sentence',
          text: 'Some schools also create compost bins near the gardens.',
        },
      ],
      zones: [
        { id: 'garden-org1-loc-1', prompt: 'After sentence 1' },
        { id: 'garden-org1-loc-2', prompt: 'After sentence 2' },
        { id: 'garden-org1-loc-3', prompt: 'After sentence 3' },
        { id: 'garden-org1-loc-4', prompt: 'After sentence 4' },
        { id: 'garden-org1-loc-5', prompt: 'After sentence 5' },
        { id: 'garden-org1-loc-6', prompt: 'After sentence 6' },
      ],
      correctMapping: {
        'garden-org1-loc-3': 'garden-org1-sentence',
      },
      solutionExplanation:
        'Sentence 3 describes when gardens are maintained, and the compost-bin sentence naturally extends that idea by describing another way schools care for the gardens. Placing it earlier would interrupt the flow before maintenance is introduced.',
    },
    tags: [tag('RE-ORG')],
    timeToSolve: 120,
    createdAt: '2026-05-17T12:01:00Z',
  },
  {
    id: 'q-ela-garden-cl',
    subject: 'ELA',
    subtype: 'INDY-MS',
    difficulty: 'hard',
    stem: 'Select TWO revisions that most improve sentence 2 in the passage.',
    passageId: 'passage-ela-001',
    ms: {
      selectCount: 2,
      instruction: 'Select exactly two answer choices.',
      solutionExplanation:
        'Strong revisions keep the original meaning while removing repetition and vague wording. The first and third options are concise and precise; the other options repeat “clubs” or use awkward phrasing such as “environmental things.”',
    },
    choices: [
      {
        id: 'garden-cl-a',
        label: 'A',
        text: 'Students in these clubs learn how to grow vegetables and flowers while learning about environmental responsibility.',
        isCorrect: true,
      },
      {
        id: 'garden-cl-b',
        label: 'B',
        text: 'These clubs are clubs where students learn many things involving gardens.',
        isCorrect: false,
      },
      {
        id: 'garden-cl-c',
        label: 'C',
        text: 'Students in these clubs learn gardening skills and environmental responsibility.',
        isCorrect: true,
      },
      {
        id: 'garden-cl-d',
        label: 'D',
        text: 'Students learn flowers, vegetables, and environmental things in the clubs.',
        isCorrect: false,
      },
    ],
    tags: [tag('RE-CL')],
    timeToSolve: 120,
    createdAt: '2026-05-17T12:02:00Z',
  },
  {
    id: 'q-ela-garden-sva',
    subject: 'ELA',
    subtype: 'INDY-IC',
    difficulty: 'medium',
    stem: 'In the passage, choose the verb form that correctly completes sentence 6.',
    passageId: 'passage-ela-001',
    ic: {
      instruction: 'Select the verb that agrees with the subject of the sentence.',
      segments: [
        { type: 'text', value: 'Gardening clubs ' },
        { type: 'slot', slotId: 'garden-sva-s1' },
        { type: 'text', value: ' become increasingly popular in urban schools over the past few years.' },
      ],
      slots: [
        {
          slotId: 'garden-sva-s1',
          options: [
            { id: 'garden-sva-o-has', text: 'has' },
            { id: 'garden-sva-o-have', text: 'have' },
            { id: 'garden-sva-o-becoming', text: 'becoming' },
            { id: 'garden-sva-o-had', text: 'had' },
          ],
        },
      ],
      correctMapping: {
        'garden-sva-s1': 'garden-sva-o-have',
      },
      solutionExplanation:
        'The subject “Gardening clubs” is plural, so it needs the plural verb “have,” not “has.” “Becoming” would not form a complete predicate with “become,” and “had” does not match the present-time meaning of the sentence.',
    },
    tags: [tag('RE-SVA')],
    timeToSolve: 90,
    createdAt: '2026-05-17T12:03:00Z',
  },
  {
    id: 'q-ela-garden-org2',
    subject: 'ELA',
    subtype: 'INDY-DND',
    difficulty: 'hard',
    stem: 'Drag the sentence to the best location in the paragraph.',
    passageId: 'passage-ela-001',
    dnd: {
      instruction: 'Drag the sentence into the box that shows where it fits best in the passage.',
      singlePlacement: true,
      pool: [
        {
          id: 'garden-org2-sentence',
          text: 'Many teachers say the clubs also encourage teamwork and responsibility.',
        },
      ],
      zones: [
        { id: 'garden-org2-loc-1', prompt: 'After sentence 1' },
        { id: 'garden-org2-loc-2', prompt: 'After sentence 2' },
        { id: 'garden-org2-loc-3', prompt: 'After sentence 3' },
        { id: 'garden-org2-loc-4', prompt: 'After sentence 4' },
        { id: 'garden-org2-loc-5', prompt: 'After sentence 5' },
        { id: 'garden-org2-loc-6', prompt: 'After sentence 6' },
      ],
      correctMapping: {
        'garden-org2-loc-2': 'garden-org2-sentence',
      },
      solutionExplanation:
        'Sentence 2 explains what students learn in gardening clubs, and the teachers’ sentence adds another educational benefit. It belongs right after that learning focus, before the paragraph shifts to when gardens are maintained.',
    },
    tags: [tag('RE-ORG')],
    timeToSolve: 120,
    createdAt: '2026-05-17T12:04:00Z',
  },
];

export const questions: Question[] = rawQuestions.map((q) => ({
  ...q,
  tags: normalizeQuestionTags(q),
}));

// Update passages with their questions
passages[0].questions = questions.filter(q => q.passageId === 'passage-1');
passages[1].questions = questions.filter(q => q.passageId === 'passage-2');
passages[2].questions = questions.filter(q => q.passageId === 'passage-ela-001');

// Sample Forms
export const forms: Form[] = [
  {
    id: 'form-1',
    name: 'Ratios & Proportions Drill',
    description: 'Practice problems focusing on ratios, proportions, and percent calculations',
    questions: questions.filter(q => q.tags.some(t => t.code === 'NUM-RAT')),
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

export const getFilteredQuestions = (
  filters: Partial<{
    subjects: string[];
    difficulties: Difficulty[];
    tagCodes: string[];
    formatTagCodes: string[];
    passageOnly: boolean;
    searchQuery: string;
    userStatus: string[];
  }>,
  catalog: Question[] = questions,
) => {
  return catalog.filter(question => {
    // Subject filter
    if (filters.subjects?.length && !filters.subjects.includes(question.subject)) {
      return false;
    }

    // Difficulty filter
    if (filters.difficulties?.length && !filters.difficulties.includes(question.difficulty)) {
      return false;
    }

    // Tag filter
    if (filters.tagCodes?.length) {
      const questionTagCodes = question.tags.map(tag => tag.code);
      if (!filters.tagCodes.some(code => questionTagCodes.includes(code))) {
        return false;
      }
    }

    // Question format filter (INDY-* tags)
    if (filters.formatTagCodes?.length) {
      const questionTagCodes = question.tags.map((t) => t.code);
      if (!filters.formatTagCodes.some((code) => questionTagCodes.includes(code))) {
        return false;
      }
    }

    // Passage only filter
    if (filters.passageOnly && !question.passageId) {
      return false;
    }

    // Search query filter
    if (filters.searchQuery) {
      const query = filters.searchQuery.toLowerCase();
      const dndParts = question.dnd
        ? [
            ...(question.dnd.instruction ? [question.dnd.instruction] : []),
            ...question.dnd.pool.map((d) => d.text),
            ...question.dnd.zones.flatMap((z) =>
              [z.prompt, z.beforeText, z.afterText].filter(Boolean) as string[]
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
            if (v.type === 'table') {
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
              .filter((s): s is { type: 'text'; value: string } => s.type === 'text')
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
        ...(question.choices?.map(c => c.text) || []),
        ...dndParts,
        ...eeParts,
        ...cgtParts,
        ...wpParts,
        ...msParts,
        ...icParts,
        ...hsParts,
        ...gifParts,
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