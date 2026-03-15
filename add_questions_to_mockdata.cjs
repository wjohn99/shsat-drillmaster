// Script to add converted questions to mockData.ts
const fs = require('fs');

// Read the converted questions
const convertedQuestions = JSON.parse(fs.readFileSync('converted_questions.json', 'utf8'));

// Read the current mockData.ts file
const mockDataContent = fs.readFileSync('src/data/mockData.ts', 'utf8');

// Extract the existing math tags from the file
const mathTagsMatch = mockDataContent.match(/const mathTags: Tag\[\] = \[([\s\S]*?)\];/);
if (!mathTagsMatch) {
  console.error('Could not find mathTags in mockData.ts');
  process.exit(1);
}

// Create a mapping from tag IDs to tag objects
const tagMapping = {
  'math-1': { id: 'math-1', domain: 'MATH', code: 'ALG-LIN', label: 'Linear equations in one variable' },
  'math-2': { id: 'math-2', domain: 'MATH', code: 'FUNC-LIN', label: 'Linear functions' },
  'math-3': { id: 'math-3', domain: 'MATH', code: 'ALG-LIN-TWO', label: 'Linear equations in two variables' },
  'math-4': { id: 'math-4', domain: 'MATH', code: 'ALG-SYS', label: 'Systems of two linear equations in two variables' },
  'math-5': { id: 'math-5', domain: 'MATH', code: 'INEQ', label: 'Linear inequalities in one or two variables' },
  'math-6': { id: 'math-6', domain: 'MATH', code: 'FUNC-NONLIN', label: 'Nonlinear functions' },
  'math-7': { id: 'math-7', domain: 'MATH', code: 'EQUIV-EXP', label: 'Equivalent expressions' },
  'math-8': { id: 'math-8', domain: 'MATH', code: 'NONLIN-EQ', label: 'Nonlinear equations in one variable and systems of equations in two variables' },
  'math-9': { id: 'math-9', domain: 'MATH', code: 'PS-PR', label: 'Ratios, rates, proportional relationships, and units' },
  'math-10': { id: 'math-10', domain: 'MATH', code: 'PS-PERC', label: 'Percentages' },
  'math-11': { id: 'math-11', domain: 'MATH', code: 'PS-STAT-ONE', label: 'One-variable data: Distributions and measures of center and spread' },
  'math-12': { id: 'math-12', domain: 'MATH', code: 'PS-STAT-TWO', label: 'Two-variable data: Models and scatterplots' },
  'math-13': { id: 'math-13', domain: 'MATH', code: 'PS-PROB', label: 'Probability and conditional probability' },
  'math-14': { id: 'math-14', domain: 'MATH', code: 'PS-STAT-INF', label: 'Inference from sample statistics and margin of error' },
  'math-15': { id: 'math-15', domain: 'MATH', code: 'PS-STAT-EXP', label: 'Evaluating statistical claims: Observational studies and experiments' },
  'math-16': { id: 'math-16', domain: 'MATH', code: 'GEO-AREA', label: 'Area and volume' },
  'math-17': { id: 'math-17', domain: 'MATH', code: 'GEO-LINES', label: 'Lines, angles, and triangles' },
  'math-18': { id: 'math-18', domain: 'MATH', code: 'GEO-TRIG', label: 'Right triangles and trigonometry' },
  'math-19': { id: 'math-19', domain: 'MATH', code: 'GEO-CIRCLES', label: 'Circles' }
};

// Fix the tags in converted questions
const fixedQuestions = convertedQuestions.map(q => ({
  ...q,
  tags: q.tags.map(tag => tagMapping[tag.id] || tagMapping['math-1'])
}));

// Generate the TypeScript code for the new questions
const questionsCode = fixedQuestions.map(q => {
  let code = `  {\n`;
  code += `    id: '${q.id}',\n`;
  code += `    subject: '${q.subject}',\n`;
  code += `    subtype: '${q.subtype}',\n`;
  code += `    difficulty: '${q.difficulty}',\n`;
  code += `    scoreBand: ${q.scoreBand},\n`;
  code += `    stem: '${q.stem.replace(/'/g, "\\'")}',\n`;
  
  if (q.choices && q.choices.length > 0) {
    code += `    choices: [\n`;
    q.choices.forEach(choice => {
      code += `      { id: '${choice.id}', label: '${choice.label}', text: '${choice.text.replace(/'/g, "\\'")}', isCorrect: ${choice.isCorrect} },\n`;
    });
    code += `    ],\n`;
  }
  
  code += `    tags: [${q.tags.map(tag => `mathTags[${parseInt(tag.id.split('-')[1]) - 1}]`).join(', ')}],\n`;
  code += `    timeToSolve: ${q.timeToSolve},\n`;
  code += `    userAttempted: ${q.userAttempted},\n`;
  code += `    createdAt: '${q.createdAt}'\n`;
  code += `  }`;
  
  return code;
}).join(',\n');

// Find where to insert the new questions (after the existing questions)
const questionsArrayMatch = mockDataContent.match(/export const questions: Question\[\] = \[([\s\S]*?)\];/);
if (!questionsArrayMatch) {
  console.error('Could not find questions array in mockData.ts');
  process.exit(1);
}

// Insert the new questions before the closing bracket
const newQuestionsContent = mockDataContent.replace(
  /export const questions: Question\[\] = \[([\s\S]*?)\];/,
  `export const questions: Question[] = [$1,\n${questionsCode}\n];`
);

// Write the updated file
fs.writeFileSync('src/data/mockData.ts', newQuestionsContent);

console.log(`Successfully added ${fixedQuestions.length} new math questions to mockData.ts!`);
console.log('The questions have been added to the questions array.');
