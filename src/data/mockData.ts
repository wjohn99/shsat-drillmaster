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

  // SHSAT Question Bank Tracker — Jed Approved imports (rows 2–8, 15)
  {
    id: 'ELA-REB-001',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: 'medium',
    stem: 'Which sentence contains an error in its construction and should be revised?\n\n1) Marcus had always wanted to visit the Museum of Natural History, so his parents surprised him with tickets for his birthday. (2) Rushing through the entrance, the dinosaur fossils were the first things Marcus noticed. (3) He spent nearly two hours in the fossil hall, sketching the bones in his notebook. (4) By the end of the day, Marcus had decided that paleontology was his favorite subject in science.',
    choices: [
      { id: 'ELA-REB-001-a', label: 'A', text: 'sentence 1', isCorrect: false },
      { id: 'ELA-REB-001-b', label: 'B', text: 'sentence 2', isCorrect: true },
      { id: 'ELA-REB-001-c', label: 'C', text: 'sentence 3', isCorrect: false },
      { id: 'ELA-REB-001-d', label: 'D', text: 'sentence 4', isCorrect: false },
    ],
    tags: [tag('RE-SEN'), tag('RE-APP')],
    timeToSolve: 120,
    createdAt: '2026-06-26T12:00:00Z',
  },
  {
    id: 'ELA-REB-002',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: 'hard',
    stem: 'Which sentence contains an error in its construction and should be revised?\n\n(1) The city council voted last Tuesday to approve a new plan for expanding the public transit system. (2) Supported by years of traffic data and rider surveys, the plan calls for three new subway lines and dozens of additional bus routes. (3) Several neighborhood groups have raised concerns about construction noise and disruption to local businesses during the expansion. (4) Having studied the issue for nearly two years, the final decision surprised many residents who had expected a different outcome.',
    choices: [
      { id: 'ELA-REB-002-a', label: 'A', text: 'sentence 1', isCorrect: false },
      { id: 'ELA-REB-002-b', label: 'B', text: 'sentence 2', isCorrect: false },
      { id: 'ELA-REB-002-c', label: 'C', text: 'sentence 3', isCorrect: false },
      { id: 'ELA-REB-002-d', label: 'D', text: 'sentence 4', isCorrect: true },
    ],
    tags: [tag('RE-SEN'), tag('RE-APP')],
    timeToSolve: 120,
    createdAt: '2026-06-26T12:01:00Z',
  },
  {
    id: 'ELA-REB-003',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: 'medium',
    stem: 'Which sentence of the paragraph should be revised to correct a vague pronoun?\n\n(1) Coach Rivera and the team captain met before the game to discuss their strategy. (2) The captain told the coach that he was worried the opposing team had studied their plays. (3) Both of them agreed that the team needed to stay focused and execute the game plan. (4) By halftime, the players had settled into a rhythm and were playing with confidence.',
    choices: [
      { id: 'ELA-REB-003-a', label: 'A', text: 'sentence 1', isCorrect: false },
      { id: 'ELA-REB-003-b', label: 'B', text: 'sentence 2', isCorrect: true },
      { id: 'ELA-REB-003-c', label: 'C', text: 'sentence 3', isCorrect: false },
      { id: 'ELA-REB-003-d', label: 'D', text: 'sentence 4', isCorrect: false },
    ],
    tags: [tag('RE-PRO')],
    timeToSolve: 120,
    createdAt: '2026-06-26T12:02:00Z',
  },
  {
    id: 'ELA-REB-004',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: 'medium',
    stem: 'Which sentence in the paragraph should be revised to correct an inappropriate shift in verb tense?\n\n(1) Last summer, Diego traveled to Costa Rica with his family for two weeks. (2) Every morning he woke up early to hike through the rainforest before the heat became too intense. (3) He photographed dozens of rare birds and kept a detailed journal of everything he observed. (4) By the end of the trip, Diego had decided that he wanted to study environmental science in college.',
    choices: [
      { id: 'ELA-REB-004-a', label: 'A', text: 'sentence 1', isCorrect: false },
      { id: 'ELA-REB-004-b', label: 'B', text: 'sentence 2', isCorrect: true },
      { id: 'ELA-REB-004-c', label: 'C', text: 'sentence 3', isCorrect: false },
      { id: 'ELA-REB-004-d', label: 'D', text: 'sentence 4', isCorrect: false },
    ],
    tags: [tag('RE-TEN')],
    timeToSolve: 120,
    createdAt: '2026-06-26T12:03:00Z',
  },
  {
    id: 'ELA-REB-005',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    difficulty: 'medium',
    stem: 'Read these sentences.\n\n(1) Malika practiced piano every day after school.\n\n(2) She performed flawlessly at the winter recital.\n\nWhat is the best way to combine the sentences to clarify the relationship between the ideas?',
    choices: [
      {
        id: 'ELA-REB-005-a',
        label: 'A',
        text: 'Malika practiced piano every day after school, but she performed flawlessly at the winter recital.',
        isCorrect: false,
      },
      {
        id: 'ELA-REB-005-b',
        label: 'B',
        text: 'Malika practiced piano every day after school, so she performed flawlessly at the winter recital.',
        isCorrect: true,
      },
      {
        id: 'ELA-REB-005-c',
        label: 'C',
        text: 'Malika practiced piano every day after school, and she performed flawlessly at the winter recital.',
        isCorrect: false,
      },
      {
        id: 'ELA-REB-005-d',
        label: 'D',
        text: 'Although Malika practiced piano every day after school, she performed flawlessly at the winter recital.',
        isCorrect: false,
      },
    ],
    tags: [tag('RE-SEN')],
    timeToSolve: 120,
    createdAt: '2026-06-26T12:04:00Z',
  },
  {
    id: 'MATH-ALG-001',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: 'hard',
    stem: 'Which of the following lines are parallel to y=3x+10',
    choices: [
      { id: 'MATH-ALG-001-a', label: 'A', text: 'y-3x=1', isCorrect: true },
      { id: 'MATH-ALG-001-b', label: 'B', text: '2y=3x+2', isCorrect: false },
      { id: 'MATH-ALG-001-c', label: 'C', text: 'y=6x+20', isCorrect: false },
      { id: 'MATH-ALG-001-d', label: 'D', text: 'y=0', isCorrect: false },
    ],
    tags: [tag('ALG-FUN')],
    timeToSolve: 120,
    createdAt: '2026-06-26T12:05:00Z',
  },
  {
    id: 'MATH-ALG-002',
    subject: 'MATH',
    subtype: 'MC4_A-D',
    difficulty: 'medium',
    stem: 'Which of the following equations has the same solution as the equation 8x-4=52',
    choices: [
      { id: 'MATH-ALG-002-a', label: 'A', text: '8x+4=56', isCorrect: false },
      { id: 'MATH-ALG-002-b', label: 'B', text: '2x-1=13', isCorrect: true },
      { id: 'MATH-ALG-002-c', label: 'C', text: 'x/2=3', isCorrect: false },
      { id: 'MATH-ALG-002-d', label: 'D', text: '2x-3=10', isCorrect: false },
    ],
    tags: [tag('ALG-EXP')],
    timeToSolve: 120,
    createdAt: '2026-06-26T12:06:00Z',
  },
  {
    id: 'MATH-APP-001',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'For a presentation, Ben can create 4 slides in 5 minutes, working at a constant rate. Dylan can create 3 slides in 10 minutes, working at his own constant rate. What is the total number of slides the two of them can create in one hour?',
    wp: {
      solutionExplanation:
        'Since Ben can make 4 slides in 5 minutes, he can make 48 slides in 60 minutes. Since Dylan can make 3 slides in 10 minutes, he can make 18 slides in 60 minutes. 48 + 18 = 66.',
    },
    choices: [
      { id: 'MATH-APP-001-a', label: 'A', text: '66', isCorrect: true },
      { id: 'MATH-APP-001-b', label: 'B', text: '48', isCorrect: false },
      { id: 'MATH-APP-001-c', label: 'C', text: '84', isCorrect: false },
      { id: 'MATH-APP-001-d', label: 'D', text: '42', isCorrect: false },
    ],
    tags: [tag('APP-RTD')],
    timeToSolve: 150,
    createdAt: '2026-06-26T12:07:00Z',
  },

  // SHSAT Question Bank Tracker — Jed Approved batch 2 (14 geometry/applied/num)

  {
    id: 'MATH-GEO-001',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'hard',
    stem: 'In triangle ABC, angle C is a right angle. Point D lies on AB such that CD is perpendicular to AB. If AC = 6 and BC = 8, what is the length of CD?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from computing the altitude using an incorrect formula, such as dividing the product of the legs by their sum: (6 × 8) ÷ (6 + 8) = 48 ÷ 14 ≈ 3.43, then adjusting through arithmetic error to 4.6. Choice B is correct. First find AB: √(6² + 8²) = √100 = 10. Area of triangle using the legs: ½ × 6 × 8 = 24. Area using the hypotenuse as base: ½ × 10 × CD = 24. So 5 × CD = 24, and CD = 4.8. Choice C is incorrect. This results from assuming CD bisects AB and computing half of the hypotenuse: AB ÷ 2 = 10 ÷ 2 = 5. Choice D is incorrect. This results from computing (AC + BC) ÷ AB = 14 ÷ 10 = 1.4, then multiplying by an incorrect factor to arrive near 5.4.',
    },
    choices: [
      { id: 'MATH-GEO-001-a', label: 'A', text: '4.6', isCorrect: false },
      { id: 'MATH-GEO-001-b', label: 'B', text: '4.8', isCorrect: true },
      { id: 'MATH-GEO-001-c', label: 'C', text: '5', isCorrect: false },
      { id: 'MATH-GEO-001-d', label: 'D', text: '5.4', isCorrect: false },
    ],
    tags: [tag('GEO-TRI')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-GEO-002',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'A rectangular swimming pool is 20 feet long and 10 feet wide. It is surrounded by a uniform walkway that is 2 feet wide on all sides. What is the area of the walkway alone?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from adding the walkway width to only one end of the length but both ends of the width, or from a similar partial-dimension error producing an incorrect outer rectangle. Choice B is incorrect. This results from computing the perimeter of the pool and multiplying by the walkway width: 2(20 + 10) × 2 = 120, treating the walkway as a border without corners. Choice C is correct. Pool area = 20 × 10 = 200 sq ft. The walkway adds 2 feet to each side, so the outer rectangle is (20 + 4) × (10 + 4) = 24 × 14 = 336 sq ft. Walkway area = 336 − 200 = 136 sq ft. Choice D is incorrect. This results from adding 2 feet to each dimension only once instead of twice, treating the walkway as extending on one side only: (20 + 2) × (10 + 2) = 22 × 12 = 264 − 200 = 64.',
    },
    choices: [
      { id: 'MATH-GEO-002-a', label: 'A', text: '112 sq ft', isCorrect: false },
      { id: 'MATH-GEO-002-b', label: 'B', text: '120 sq ft', isCorrect: false },
      { id: 'MATH-GEO-002-c', label: 'C', text: '136 sq ft', isCorrect: true },
      { id: 'MATH-GEO-002-d', label: 'D', text: '64 sq ft', isCorrect: false },
    ],
    tags: [tag('GEO-ARV')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-GEO-003',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'On a coordinate grid, point P is at (1, 3) and point Q is at (7, 11). Point R lies exactly halfway between P and Q. What are the coordinates of point R?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from finding half the distance between the points rather than the midpoint: (7−1)/2 = 3 and (11−3)/2 = 4, then reporting those values as coordinates instead of adding them to the starting point. Choice B is correct. Midpoint = ((1+7)/2, (3+11)/2) = (8/2, 14/2) = (4, 7). Choice C is incorrect. This results from correctly computing the x-coordinate (4) but misreading Q\'s y-coordinate as 13 instead of 11: (3+13)/2 = 8. Choice D is incorrect. This results from finding the distance between the points — (6, 8) — and reporting that as the midpoint, confusing displacement with location.',
    },
    choices: [
      { id: 'MATH-GEO-003-a', label: 'A', text: '(3, 4)', isCorrect: false },
      { id: 'MATH-GEO-003-b', label: 'B', text: '(4, 7)', isCorrect: true },
      { id: 'MATH-GEO-003-c', label: 'C', text: '(4, 8)', isCorrect: false },
      { id: 'MATH-GEO-003-d', label: 'D', text: '(6, 8)', isCorrect: false },
    ],
    tags: [tag('GEO-COO')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-GEO-004',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'A rectangular yard has a length that is 3 times its width. The yard is enclosed by 72 feet of fencing. What is the area of the yard?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from finding the width correctly (9 feet) but computing area as width × width: 9 × 9 = 81. Choice B is correct. Let width = w. Length = 3w. Perimeter: 2(w + 3w) = 72. 8w = 72. w = 9 feet. Length = 27 feet. Area = 9 × 27 = 243 sq ft. Choice C is incorrect. Instead of doing 8w=72, this uses 4w=72 and get w=18, resulting in an area of 972, forgetting to apply the dimensions of W and 3W on the opposite sides. Choice D is incorrect. This results from using the perimeter formula incorrectly — treating 72 as 2 × length only: length = 36, then computing 9 × 36 = 324.',
    },
    choices: [
      { id: 'MATH-GEO-004-a', label: 'A', text: '81 sq ft', isCorrect: false },
      { id: 'MATH-GEO-004-b', label: 'B', text: '243 sq ft', isCorrect: true },
      { id: 'MATH-GEO-004-c', label: 'C', text: '972 sq ft', isCorrect: false },
      { id: 'MATH-GEO-004-d', label: 'D', text: '324 sq ft', isCorrect: false },
    ],
    tags: [tag('GEO-QUAD')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-GEO-006',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'In a triangle, one angle measures 90 degrees, a second angle measures 2x degrees, and the third angle measures x degrees. What is the value of x?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from dividing the remaining 90 degrees by 6 instead of 3. Choice B is correct. The angles of a triangle sum to 180. So 90 + 2x + x = 180. 3x = 90. x = 30. Choice C is incorrect. This results from dividing the remaining angle sum by 2 instead of 3. Choice D is incorrect. This results from forgetting to subtract the 90-degree angle before dividing.',
    },
    choices: [
      { id: 'MATH-GEO-006-a', label: 'A', text: '15', isCorrect: false },
      { id: 'MATH-GEO-006-b', label: 'B', text: '30', isCorrect: true },
      { id: 'MATH-GEO-006-c', label: 'C', text: '45', isCorrect: false },
      { id: 'MATH-GEO-006-d', label: 'D', text: '60', isCorrect: false },
    ],
    tags: [tag('GEO-ANG')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-GEO-007',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'A right triangle has legs of length 9 and 12. What is the length of the hypotenuse?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from an arithmetic error when computing the square root. Choice B is incorrect. This results from rounding incorrectly. Choice C is correct. Using the Pythagorean theorem: √(9² + 12²) = √(81 + 144) = √225 = 15. Choice D is incorrect. This results from simply adding the two legs (9 + 12 = 21) instead of applying the Pythagorean theorem.',
    },
    choices: [
      { id: 'MATH-GEO-007-a', label: 'A', text: '13', isCorrect: false },
      { id: 'MATH-GEO-007-b', label: 'B', text: '14', isCorrect: false },
      { id: 'MATH-GEO-007-c', label: 'C', text: '15', isCorrect: true },
      { id: 'MATH-GEO-007-d', label: 'D', text: '21', isCorrect: false },
    ],
    tags: [tag('GEO-TRI')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-GEO-008',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'hard',
    stem: 'A rectangle has a length of 2x + 3 and a width of x. If the perimeter is 36, what is the area of the rectangle?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from confusing perimeter with area. Choice B is incorrect. This results from an arithmetic error after correctly solving for x. Choice C is correct. Perimeter: 2[(2x+3) + x] = 36. 2(3x+3) = 36. 3x+3 = 18. 3x = 15. x = 5. Length = 2(5)+3 = 13. Width = 5. Area = 13 × 5 = 65. Choice D is incorrect. This results from a multiplication error in the final step.',
    },
    choices: [
      { id: 'MATH-GEO-008-a', label: 'A', text: '36', isCorrect: false },
      { id: 'MATH-GEO-008-b', label: 'B', text: '50', isCorrect: false },
      { id: 'MATH-GEO-008-c', label: 'C', text: '65', isCorrect: true },
      { id: 'MATH-GEO-008-d', label: 'D', text: '78', isCorrect: false },
    ],
    tags: [tag('GEO-QUAD')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-GEO-009',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'A circle has a radius of 6. What is the area of one quarter of the circle?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from dividing the radius instead of the area by 4. Choice B is incorrect. This results from confusing the radius with part of the final answer. Choice C is correct. Area of full circle = πr² = π(6²) = 36π. One quarter = 36π ÷ 4 = 9π. Choice D is incorrect. This results from finding the full area of the circle, πr² = π(6²) = 36π.',
    },
    choices: [
      { id: 'MATH-GEO-009-a', label: 'A', text: '3π', isCorrect: false },
      { id: 'MATH-GEO-009-b', label: 'B', text: '6π', isCorrect: false },
      { id: 'MATH-GEO-009-c', label: 'C', text: '9π', isCorrect: true },
      { id: 'MATH-GEO-009-d', label: 'D', text: '36π', isCorrect: false },
    ],
    tags: [tag('GEO-CRC')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-APP-008',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'A sporting goods store buys a baseball glove from a supplier for $75. The store marks up the price by 40% to set the retail price. During a clearance sale, the retail price is then discounted by 20%. What is the final sale price?',
    wp: {
      solutionExplanation:
        'First, calculate the retail price after the 40% markup. Since a 40% increase means multiplying by 1.40, the retail price is 75 × 1.40 = 105. Next, apply the 20% discount to the retail price by multiplying by 0.80, since the customer pays 80% of the retail price. This gives 105 × 0.80 = 84. Therefore, the final sale price of the baseball glove is $84.',
    },
    choices: [
      { id: 'MATH-APP-008-a', label: 'A', text: '$80', isCorrect: false },
      { id: 'MATH-APP-008-b', label: 'B', text: '$84', isCorrect: true },
      { id: 'MATH-APP-008-c', label: 'C', text: '$90', isCorrect: false },
      { id: 'MATH-APP-008-d', label: 'D', text: '$105', isCorrect: false },
    ],
    tags: [tag('APP-PCT')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-APP-012',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'Maria invests $300 in an account that earns 4% simple interest per year. What is the total amount in her account after 5 years?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from computing only one year of interest. Choice B is incorrect. This results from an arithmetic error in computing total interest. Choice C is incorrect. This results from a partial calculation error. Choice D is correct. Interest per year = $300 × 0.04 = $12. Over 5 years: $12 × 5 = $60. Total = $300 + $60 = $360.',
    },
    choices: [
      { id: 'MATH-APP-012-a', label: 'A', text: '$312', isCorrect: false },
      { id: 'MATH-APP-012-b', label: 'B', text: '$324', isCorrect: false },
      { id: 'MATH-APP-012-c', label: 'C', text: '$336', isCorrect: false },
      { id: 'MATH-APP-012-d', label: 'D', text: '$360', isCorrect: true },
    ],
    tags: [tag('APP-FIN')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-APP-013',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'hard',
    stem: 'A price is increased by 20%, and the new price is decreased by 20%. What is the overall percent change from the original price?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This is the most common misconception — students assume the increase and decrease cancel out, but they apply to different base amounts. Choice B is correct. Start with $100. After a 20% increase: $120. After a 20% decrease: $120 × 0.80 = $96. This is a 4% decrease from the original $100. Choice C is incorrect. This results from a sign error in computing the net change. Choice D is incorrect. This results from subtracting the percentages directly (20% + 20% = 40%) without applying them sequentially.',
    },
    choices: [
      { id: 'MATH-APP-013-a', label: 'A', text: 'No change', isCorrect: false },
      { id: 'MATH-APP-013-b', label: 'B', text: '4% decrease', isCorrect: true },
      { id: 'MATH-APP-013-c', label: 'C', text: '4% increase', isCorrect: false },
      { id: 'MATH-APP-013-d', label: 'D', text: '40% decrease', isCorrect: false },
    ],
    tags: [tag('APP-PCT')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-APP-014',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'A pump fills a pool at a rate of 60 gallons every 15 minutes. At this rate, how many minutes will it take to fill a 480-gallon pool?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This results from an arithmetic error when setting up the proportion. Choice B is incorrect. This results from a rounding error. Choice C is incorrect. This results from a similar setup error. Choice D is correct. Rate = 60 gallons ÷ 15 minutes = 4 gallons per minute. Time to fill 480 gallons = 480 ÷ 4 = 120 minutes.',
    },
    choices: [
      { id: 'MATH-APP-014-a', label: 'A', text: '90 minutes', isCorrect: false },
      { id: 'MATH-APP-014-b', label: 'B', text: '100 minutes', isCorrect: false },
      { id: 'MATH-APP-014-c', label: 'C', text: '110 minutes', isCorrect: false },
      { id: 'MATH-APP-014-d', label: 'D', text: '120 minutes', isCorrect: true },
    ],
    tags: [tag('APP-RTD')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-NUM-009',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'A jar contains red and blue marbles in a ratio of 4 to 7. If there are 66 marbles total, how many are blue?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This is close to the number of red marbles but reflects a setup error. Choice B is incorrect. This results from dividing 66 by an incorrect number of parts. Choice C is incorrect. This results from a rounding or arithmetic error in finding the value of each part. Choice D is correct. The ratio has 4 + 7 = 11 total parts. Each part = 66 ÷ 11 = 6. Blue marbles = 7 × 6 = 42.',
    },
    choices: [
      { id: 'MATH-NUM-009-a', label: 'A', text: '24', isCorrect: false },
      { id: 'MATH-NUM-009-b', label: 'B', text: '30', isCorrect: false },
      { id: 'MATH-NUM-009-c', label: 'C', text: '36', isCorrect: false },
      { id: 'MATH-NUM-009-d', label: 'D', text: '42', isCorrect: true },
    ],
    tags: [tag('NUM-RAT')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
  },

  {
    id: 'MATH-APP-006',
    subject: 'MATH',
    subtype: 'INDY-WP',
    difficulty: 'medium',
    stem: 'Three friends split a restaurant bill. Amara pays twice as much as Ben. Carlos pays $6 more than Ben. Together they pay $54. How much does Amara pay?',
    wp: {
      solutionExplanation:
        'Choice A is incorrect. This is the amount Ben pays. Let b = Ben\'s share. Then b + 2b + (b + 6) = 54, so 4b = 48 and b = 12. Students who solve correctly for Ben but stop without finding Amara\'s share will select this. Choice B is incorrect. This results from dividing the total equally among three people: $54 ÷ 3 = $18, ignoring the relationships between amounts entirely. Choice C is correct. Let b = Ben\'s share. Amara = 2b. Carlos = b + 6. Total: b + 2b + (b + 6) = 54. 4b + 6 = 54. 4b = 48. b = 12. Amara = 2 × 12 = $24. Choice D is incorrect. This results from solving 4b = 54 instead of 4b = 48, forgetting to subtract the $6 constant before dividing: b ≈ 13.5, Amara ≈ $27, rounded up to $30.',
    },
    choices: [
      { id: 'MATH-APP-006-a', label: 'A', text: '$12', isCorrect: false },
      { id: 'MATH-APP-006-b', label: 'B', text: '$18', isCorrect: false },
      { id: 'MATH-APP-006-c', label: 'C', text: '$24', isCorrect: true },
      { id: 'MATH-APP-006-d', label: 'D', text: '$30', isCorrect: false },
    ],
    tags: [tag('NUM-RAT')],
    timeToSolve: 120,
    createdAt: '2026-07-12T12:00:00Z',
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