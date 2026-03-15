// Script to convert ScoreSmartMATH.json questions to mockData format
const fs = require('fs');
const path = require('path');

// Read the JSON file
const jsonData = JSON.parse(fs.readFileSync('/Users/wjohn/Downloads/ScoreSmartMATH.json', 'utf8'));

// Helper function to map difficulty numbers to strings
function mapDifficulty(difficulty) {
  switch(difficulty) {
    case 1: return 'Easy';
    case 2: return 'Medium';
    case 3: return 'Hard';
    default: return 'Medium';
  }
}

// Helper function to map question types
function mapQuestionType(questionType) {
  switch(questionType) {
    case 'MCQ': return 'MC4_A-D'; // Most MCQ questions use A-D format
    case 'FIB': return 'GRID_IN'; // Fill in the blank
    case 'TEI_drag_drop': return 'TEI_DRAG_DROP';
    case 'TEI_select_all': return 'TEI_MULTIPLE_SELECT';
    default: return 'MC4_A-D';
  }
}

// Helper function to map tags to existing math tags
function mapTags(tags) {
  const tagMapping = {
    'percent': 'math-10', // Percentages
    'discount': 'math-10', // Percentages
    'arithmetic': 'math-1', // Linear equations
    'geometry': 'math-16', // Area and volume
    'area': 'math-16', // Area and volume
    'circles': 'math-19', // Circles
    'squares': 'math-17', // Lines, angles, and triangles
    'order_of_operations': 'math-1', // Linear equations
    'algebra': 'math-1', // Linear equations
    'solve_linear_equation': 'math-1', // Linear equations
    'statistics': 'math-11', // One-variable data
    'mean': 'math-11', // One-variable data
    'sales_tax': 'math-10', // Percentages
    'multi_step': 'math-1', // Linear equations
    'number_theory': 'math-1', // Linear equations
    'prime_factorization': 'math-1', // Linear equations
    'rate': 'math-9', // Ratios, rates, proportional relationships
    'average_speed': 'math-9', // Ratios, rates, proportional relationships
    'weighted_average': 'math-11', // One-variable data
    'distributive_property': 'math-7', // Equivalent expressions
    'select_all': 'math-7', // Equivalent expressions
    'probability': 'math-13', // Probability and conditional probability
    'without_replacement': 'math-13', // Probability and conditional probability
    'coordinate_geometry': 'math-17', // Lines, angles, and triangles
    'midpoint': 'math-17', // Lines, angles, and triangles
    'ratio_proportion': 'math-9', // Ratios, rates, proportional relationships
    'scale_up': 'math-9', // Ratios, rates, proportional relationships
    'ratios': 'math-9', // Ratios, rates, proportional relationships
    'triangle_sum': 'math-17', // Lines, angles, and triangles
    'finance': 'math-10', // Percentages
    'simple_interest': 'math-10', // Percentages
    'trapezoid': 'math-16', // Area and volume
    'number_properties': 'math-1', // Linear equations
    'parity': 'math-1', // Linear equations
    'complement': 'math-13', // Probability and conditional probability
    'slope': 'math-2', // Linear functions
    'perpendicular_lines': 'math-2', // Linear functions
    'proportion': 'math-9', // Ratios, rates, proportional relationships
    'substitution': 'math-7', // Equivalent expressions
    'expressions': 'math-7', // Equivalent expressions
    'pythagorean_theorem': 'math-18', // Right triangles and trigonometry
    'distance': 'math-18', // Right triangles and trigonometry
    'median': 'math-11', // One-variable data
    'factors_multiples': 'math-1', // Linear equations
    'systems': 'math-4', // Systems of two linear equations
    'number_logic': 'math-1', // Linear equations
    'volume': 'math-16', // Area and volume
    'cylinders': 'math-16', // Area and volume
    'piecewise_speed': 'math-9', // Ratios, rates, proportional relationships
    'average_speed': 'math-9', // Ratios, rates, proportional relationships
    'simplify_expressions': 'math-7', // Equivalent expressions
    'exponents': 'math-7', // Equivalent expressions
    'mean_median': 'math-11', // One-variable data
    'linear_equation': 'math-1', // Linear equations
    'one_variable': 'math-1', // Linear equations
    'triangles': 'math-17', // Lines, angles, and triangles
    'tables': 'math-11', // One-variable data
    'proportions': 'math-9', // Ratios, rates, proportional relationships
    'total_from_part': 'math-9', // Ratios, rates, proportional relationships
    'fractions': 'math-9', // Ratios, rates, proportional relationships
    'budget': 'math-10', // Percentages
    'unit_rate': 'math-9', // Ratios, rates, proportional relationships
    'area_composite': 'math-16', // Area and volume
    'sample_space': 'math-13', // Probability and conditional probability
    'approximation': 'math-1', // Linear equations
    'distance_formula': 'math-18', // Right triangles and trigonometry
    'laws_of_exponents': 'math-7', // Equivalent expressions
    'systems_of_equations': 'math-4', // Systems of two linear equations
    'linear_algebra': 'math-4', // Systems of two linear equations
    'relative_speed': 'math-9', // Ratios, rates, proportional relationships
    'rate_time_distance': 'math-9', // Ratios, rates, proportional relationships
    'percent_increase': 'math-10', // Percentages
    'markup': 'math-10', // Percentages
    'surface_area': 'math-16', // Area and volume
    'cubes': 'math-16', // Area and volume
    'fractions_decimals_percents': 'math-10', // Percentages
    'equivalents': 'math-7', // Equivalent expressions
  };

  return tags.map(tag => {
    const mappedTagId = tagMapping[tag] || 'math-1'; // Default to linear equations
    return { id: mappedTagId, domain: 'MATH', code: '', label: tag };
  });
}

// Convert questions
const convertedQuestions = jsonData.questions.map((q, index) => {
  const questionId = `q${index + 9}`; // Start from q9 since we have q1-q8 already
  
  // Convert answer choices
  let choices = [];
  if (q.answer_choices && q.answer_choices.length > 0) {
    choices = q.answer_choices.map((choice, choiceIndex) => ({
      id: `${questionId}-${choice.label.toLowerCase()}`,
      label: choice.label,
      text: choice.text,
      isCorrect: false // We'll need to determine this based on correct_answer
    }));
  }

  // Map tags
  const mappedTags = mapTags(q.tags || []);

  return {
    id: questionId,
    subject: 'MATH',
    subtype: mapQuestionType(q.question_type),
    difficulty: mapDifficulty(q.difficulty),
    scoreBand: Math.min(8, Math.max(1, q.difficulty * 2)),
    stem: q.question_text,
    choices: choices.length > 0 ? choices : undefined,
    tags: mappedTags,
    timeToSolve: Math.max(60, Math.min(300, q.difficulty * 60)), // 1-5 minutes based on difficulty
    userAttempted: false,
    createdAt: new Date().toISOString()
  };
});

// Save converted questions to a file
fs.writeFileSync('converted_questions.json', JSON.stringify(convertedQuestions, null, 2));

console.log(`Successfully converted ${convertedQuestions.length} questions!`);
console.log('First 3 converted questions:');
console.log(JSON.stringify(convertedQuestions.slice(0, 3), null, 2));
