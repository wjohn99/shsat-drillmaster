/**
 * Jed Approved rows imported from the SHSAT Question Bank Tracker spreadsheet.
 * Update via import scripts — not loaded at runtime from mockData or converted_questions.json.
 */
import { Question } from '@/types';
import { tag } from '@/data/taggingScheme';

export const trackerQuestions: Question[] = [
  // SHSAT Question Bank Tracker — Jed Approved imports (rows 2–8, 15)
  {
    id: 'ELA-REB-001',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    module: '1',
    stem: 'Which sentence contains an error in its construction and should be revised?\n\n1) Marcus had always wanted to visit the Museum of Natural History, so his parents surprised him with tickets for his birthday. (2) Rushing through the entrance, the dinosaur fossils were the first things Marcus noticed. (3) He spent nearly two hours in the fossil hall, sketching the bones in his notebook. (4) By the end of the day, Marcus had decided that paleontology was his favorite subject in science.',
    solutionExplanation:
      'Sentence 2 opens with the participial phrase "Rushing through the entrance," which must describe Marcus—the person doing the rushing—not the fossils. Revise so Marcus is the subject immediately after the comma (e.g., "Rushing through the entrance, Marcus noticed the dinosaur fossils first.").',
    commonTrap:
      'Students often skim for any sentence that "sounds odd" and pick sentence 1 because it is long, or sentence 4 because it shifts topic—without checking whether an introductory phrase clearly modifies the right noun.',
    choices: [
      {
        id: 'ELA-REB-001-a',
        label: 'A',
        text: 'sentence 1',
        isCorrect: false,
        explanation: 'Sentence 1 is grammatically sound; the error is the dangling modifier in sentence 2.',
      },
      {
        id: 'ELA-REB-001-b',
        label: 'B',
        text: 'sentence 2',
        isCorrect: true,
        explanation: 'Correct. The opening phrase "Rushing through the entrance" illogically modifies "dinosaur fossils" instead of Marcus.',
      },
      {
        id: 'ELA-REB-001-c',
        label: 'C',
        text: 'sentence 3',
        isCorrect: false,
        explanation: 'Sentence 3 correctly uses pronouns and verb tense; it is not the flawed sentence.',
      },
      {
        id: 'ELA-REB-001-d',
        label: 'D',
        text: 'sentence 4',
        isCorrect: false,
        explanation: 'Sentence 4 is a logical conclusion, not a construction error.',
      },
    ],
    tags: [tag('RE-SEN'), tag('RE-APP')],
    timeToSolve: 120,
    createdAt: '2026-06-26T12:00:00Z',
  },
  {
    id: 'ELA-REB-002',
    subject: 'ELA',
    subtype: 'MC4_A-D',
    module: '2',
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
    module: '1',
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
    module: '1',
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
    module: '1',
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
    module: '2',
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
    module: '1',
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
    module: '1',
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
    module: '2',
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
    module: '1',
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
    module: '1',
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
    module: '1',
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
    module: '1',
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
    module: '1',
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
    module: '2',
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
    module: '1',
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
    module: '1',
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
    module: '1',
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
    module: '2',
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
    module: '1',
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
    module: '1',
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
    module: '1',
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