"use strict";
// export const SKILL_ASSESSMENT_PROMPTS = {
//   QUESTION_GENERATION: `
//     Generate {questionCount} {difficulty} level questions for {skillCategory} skill assessment.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SKILL_ASSESSMENT_PROMPTS = void 0;
//     Question Distribution (IMPORTANT):
//     - 80% Multiple Choice Questions (MCQ) with exactly 4 options each
//     - 15% Short Answer questions requiring 1-2 sentence responses
//     - 5% Code snippet questions with small practical examples
//     Candidate Context:
//     - Experience Level: {experienceLevel}
//     - Previous Skills: {existingSkills}
//     - Industry: {industry}
//     Requirements:
//     - Prioritize MCQ format for efficient assessment completion
//     - Include real-world scenarios relevant to candidate's background
//     - Progressive difficulty throughout the assessment
//     - Questions should be clear, unambiguous, and professionally relevant
//     - Focus on practical application over theoretical knowledge
//     - Ensure questions test understanding, not just memorization
//     MCQ Guidelines:
//     - Provide exactly 4 options per MCQ question
//     - Only one correct answer per question
//     - Make distractors plausible but clearly wrong
//     - Avoid "All of the above" or "None of the above" options
//     Time Limits:
//     - MCQ questions: 60-90 seconds
//     - Short Answer: 120 seconds
//     - Code snippets: 180 seconds
//     Format: Return JSON array with each question having:
//     - questionText: String (clear, specific question)
//     - type: String ("MCQ", "SHORT_ANSWER", or "CODE")
//     - options: Array of 4 strings (for MCQ only, empty array for others)
//     - correctAnswer: String (exact answer or option text)
//     - difficulty: String ("{difficulty}")
//     - timeLimit: Number (in seconds)
//     - questionId: String (unique identifier like "q1", "q2", etc.)
//     - explanation: String (brief explanation of why answer is correct)
//   `,
//   ANSWER_EVALUATION: `
//     Evaluate this candidate's answer for a {skillCategory} assessment question.
//     Question Context:
//     - Question: {question}
//     - Expected Answer: {expectedAnswer}
//     - User's Answer: {userAnswer}
//     - Question Type: MCQ/SHORT_ANSWER/CODE
//     Evaluation Criteria:
//     1. Correctness Assessment (0-100 scale):
//        - MCQ: 100 for correct, 0 for incorrect
//        - Short Answer: Partial credit based on understanding demonstrated
//        - Code: Functionality, syntax, best practices
//     2. Provide constructive feedback:
//        - What the candidate did well
//        - Areas for improvement
//        - Specific suggestions for learning
//     3. Identify strengths and weaknesses:
//        - Technical understanding demonstrated
//        - Problem-solving approach
//        - Knowledge gaps revealed
//     4. Confidence level in evaluation (0-100):
//        - How certain you are about the assessment
//        - Consider ambiguity in answer interpretation
//     Format: Return JSON object with:
//     - score: Number (0-100)
//     - feedback: String (constructive, specific feedback)
//     - strengths: Array of strings (what candidate did well)
//     - improvements: Array of strings (areas to work on)
//     - confidence: Number (0-100, your confidence in this evaluation)
//     - isCorrect: Boolean (true/false for overall correctness)
//   `,
//   DIFFICULTY_ADJUSTMENT: `
//     Analyze candidate performance and recommend difficulty adjustment for adaptive assessment.
//     Performance Context:
//     - Current Difficulty Level: {currentDifficulty}
//     - Recent Question Scores: {recentScores}
//     - Average Time Per Question: {avgTimePerQuestion} seconds
//     - Questions Answered So Far: Count from recentScores array
//     Analysis Guidelines:
//     1. Score-based adjustment:
//        - 90%+ correct: Consider increasing difficulty
//        - 70-89% correct: Maintain current difficulty
//        - 50-69% correct: Consider slight decrease
//        - <50% correct: Decrease difficulty significantly
//     2. Time-based considerations:
//        - Very fast completion: May indicate questions too easy
//        - Very slow completion: May indicate questions too difficult
//        - Consider optimal engagement time
//     3. Progression logic:
//        - BEGINNER → INTERMEDIATE → ADVANCED → EXPERT
//        - Allow gradual progression only
//        - Avoid jumping more than one level
//     Recommendation Criteria:
//     - Maintain challenge without causing frustration
//     - Ensure accurate skill level assessment
//     - Consider candidate engagement and motivation
//     Format: Return JSON object with:
//     - recommendedDifficulty: String ("BEGINNER", "INTERMEDIATE", "ADVANCED", or "EXPERT")
//     - reasoning: String (clear explanation for the recommendation)
//     - confidence: Number (0-100, confidence in this recommendation)
//     - adjustmentType: String ("INCREASE", "MAINTAIN", "DECREASE")
//   `,
//   COMPREHENSIVE_REPORT: `
//     Generate a comprehensive skill assessment report based on candidate performance.
//     Assessment Data:
//     - Skill Category: {skillCategory}
//     - Total Questions Answered: {totalQuestions}
//     - Overall Score: {overallScore}% 
//     - Total Time Taken: {totalTime} minutes
//     - Detailed Performance: {performanceData}
//     Report Components:
//     1. Skill Level Classification:
//        - Based on overall performance and question difficulty progression
//        - Categories: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
//        - Consider consistency across different question types
//     2. Performance Analysis:
//        - Identify top 3 demonstrated strengths
//        - Highlight 3 key areas needing improvement
//        - Note any patterns in performance (e.g., stronger in theory vs practice)
//     3. Learning Recommendations:
//        - Specific, actionable suggestions for skill development
//        - Recommend resources, practice areas, or learning paths
//        - Prioritize recommendations based on impact potential
//     4. Career Guidance:
//        - Suggest career paths aligned with demonstrated skills
//        - Identify market opportunities in {skillCategory}
//        - Recommend next skills to learn for career advancement
//     5. Market Readiness Assessment:
//        - Evaluate readiness for job market in {skillCategory}
//        - Suggest experience level for job applications
//        - Identify competitive advantages and gaps
//     Quality Standards:
//     - Be specific and actionable in recommendations
//     - Maintain encouraging but realistic tone
//     - Base all conclusions on actual performance data
//     - Provide practical next steps
//     Format: Return JSON object with:
//     - overallScore: Number (calculated average score)
//     - skillLevel: String (BEGINNER/INTERMEDIATE/ADVANCED/EXPERT)
//     - strengths: Array of strings (top 3 demonstrated strengths)
//     - weaknesses: Array of strings (top 3 improvement areas)
//     - recommendations: Array of strings (specific learning suggestions)
//     - careerSuggestions: Array of strings (relevant career paths)
//     - marketReadiness: String (assessment of job market readiness)
//     - confidenceScore: Number (0-100, confidence in this assessment)
//     - nextSteps: Array of strings (immediate actionable steps)
//   `
// };
exports.SKILL_ASSESSMENT_PROMPTS = {
    QUESTION_GENERATION: `
    Generate {questionCount} {difficulty} level questions for {skillCategory} skill assessment.
    
    Question Distribution (IMPORTANT):
    - 80% Multiple Choice Questions (MCQ) with exactly 4 options each
    - 15% Short Answer questions requiring 1-2 sentence responses
    - 5% Code snippet questions with small practical examples
    
    Candidate Context:
    - Experience Level: {experienceLevel}
    - Previous Skills: {existingSkills}
    - Industry: {industry}
    
    Requirements:
    - Prioritize MCQ format for efficient assessment completion
    - Include real-world scenarios relevant to candidate's background
    - Progressive difficulty throughout the assessment
    - Questions should be clear, unambiguous, and professionally relevant
    - Focus on practical application over theoretical knowledge
    - Ensure questions test understanding, not just memorization
    - Keep explanations BRIEF - max 1 sentence (10 words max)
    
    MCQ Guidelines:
    - Provide exactly 4 options per MCQ question
    - Only one correct answer per question
    - Make distractors plausible but clearly wrong
    - Avoid "All of the above" or "None of the above" options
    
    Time Limits:
    - MCQ questions: 60-90 seconds
    - Short Answer: 120 seconds
    - Code snippets: 180 seconds
    
    Format: Return JSON array with each question having:
    - questionText: String (clear, specific question)
    - type: String ("MCQ", "SHORT_ANSWER", or "CODE")
    - options: Array of 4 strings (for MCQ only, empty array for others)
    - correctAnswer: String (exact answer or option text)
    - difficulty: String ("{difficulty}")
    - timeLimit: Number (in seconds)
    - questionId: String (unique identifier like "q1", "q2", etc.)
    - explanation: String (BRIEF - max 10 words explaining correct answer)
  `,
    ANSWER_EVALUATION: `
    Evaluate this candidate's answer for {skillCategory} assessment. Keep ALL responses concise.
    
    Question Context:
    - Question: {question}
    - Expected Answer: {expectedAnswer}
    - User's Answer: {userAnswer}
    - Question Type: MCQ/SHORT_ANSWER/CODE
    
    Evaluation Criteria:
    1. Correctness Assessment (0-100 scale):
       - MCQ: 100 for correct, 0 for incorrect
       - Short Answer: Partial credit based on understanding demonstrated
       - Code: Functionality, syntax, best practices
    
    2. Provide CONCISE feedback (max 12 words):
       - What they did right/wrong in one brief sentence
    
    3. Identify strengths and weaknesses (max 2-3 words each):
       - Technical understanding demonstrated
       - Problem-solving approach
       - Knowledge gaps revealed
    
    4. Confidence level in evaluation (0-100):
       - How certain you are about the assessment
    
    STRICT LENGTH LIMITS:
    - feedback: Maximum 12 words, one sentence only
    - strengths: Maximum 3 items, 2-3 words each
    - improvements: Maximum 3 items, 2-3 words each
    
    Format: Return JSON object with:
    - score: Number (0-100)
    - feedback: String (max 12 words, concise feedback)
    - strengths: Array of strings (max 3 items, 2-3 words each)
    - improvements: Array of strings (max 3 items, 2-3 words each)
    - confidence: Number (0-100, your confidence in this evaluation)
    - isCorrect: Boolean (true/false for overall correctness)
  `,
    DIFFICULTY_ADJUSTMENT: `
    Analyze candidate performance and recommend difficulty adjustment for adaptive assessment.
    
    Performance Context:
    - Current Difficulty Level: {currentDifficulty}
    - Recent Question Scores: {recentScores}
    - Average Time Per Question: {avgTimePerQuestion} seconds
    - Questions Answered So Far: Count from recentScores array
    
    Analysis Guidelines:
    1. Score-based adjustment:
       - 90%+ correct: Consider increasing difficulty
       - 70-89% correct: Maintain current difficulty
       - 50-69% correct: Consider slight decrease
       - <50% correct: Decrease difficulty significantly
    
    2. Time-based considerations:
       - Very fast completion: May indicate questions too easy
       - Very slow completion: May indicate questions too difficult
       - Consider optimal engagement time
    
    3. Progression logic:
       - BEGINNER → INTERMEDIATE → ADVANCED → EXPERT
       - Allow gradual progression only
       - Avoid jumping more than one level
    
    Recommendation Criteria:
    - Maintain challenge without causing frustration
    - Ensure accurate skill level assessment
    - Consider candidate engagement and motivation
    - Keep reasoning BRIEF (max 15 words)
    
    Format: Return JSON object with:
    - recommendedDifficulty: String ("BEGINNER", "INTERMEDIATE", "ADVANCED", or "EXPERT")
    - reasoning: String (max 15 words explaining the recommendation)
    - confidence: Number (0-100, confidence in this recommendation)
    - adjustmentType: String ("INCREASE", "MAINTAIN", "DECREASE")
  `,
    COMPREHENSIVE_REPORT: `
    Generate a CONCISE skill assessment report based on candidate performance.
    
    Assessment Data:
    - Skill Category: {skillCategory}
    - Total Questions Answered: {totalQuestions}
    - Overall Score: {overallScore}% 
    - Total Time Taken: {totalTime} minutes
    - Detailed Performance: {performanceData}
    
    Report Components - ALL MUST BE BRIEF:
    
    1. Skill Level Classification:
       - Based on overall performance and question difficulty progression
       - Categories: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    
    2. Performance Analysis (CONCISE):
       - Top 3 strengths (2-3 words each)
       - Top 3 improvement areas (2-3 words each)
    
    3. Learning Recommendations (BRIEF):
       - Max 3 actionable suggestions (5-8 words each)
       - Prioritize high-impact recommendations
    
    4. Career Guidance (SHORT):
       - Career paths aligned with skills (2-3 words each)
       - Max 3 career suggestions
    
    5. Market Readiness (ONE WORD):
       - Single word assessment: Beginner/Ready/Intermediate/Advanced
    
    STRICT LENGTH LIMITS:
    - strengths: Max 3 items, 2-3 words each
    - weaknesses: Max 3 items, 2-3 words each  
    - recommendations: Max 3 items, 5-8 words each
    - careerSuggestions: Max 3 items, 2-3 words each
    - marketReadiness: Single word only
    - nextSteps: Max 3 items, 4-6 words each
    
    Quality Standards:
    - Be specific but concise
    - Maintain encouraging but realistic tone
    - Base conclusions on actual performance data
    - NO lengthy explanations
    
    Format: Return JSON object with:
    - overallScore: Number (calculated average score)
    - skillLevel: String (BEGINNER/INTERMEDIATE/ADVANCED/EXPERT)
    - strengths: Array of strings (max 3, 2-3 words each)
    - weaknesses: Array of strings (max 3, 2-3 words each)
    - recommendations: Array of strings (max 3, 5-8 words each)
    - careerSuggestions: Array of strings (max 3, 2-3 words each)
    - marketReadiness: String (single word assessment)
    - confidenceScore: Number (0-100, confidence in this assessment)
    - nextSteps: Array of strings (max 3, 4-6 words each)
  `,
    // Additional prompt for skill recommendations API
    SKILL_RECOMMENDATIONS: `
    Generate CONCISE skill recommendations for candidate based on assessment history.
    
    Candidate Context:
    - Current Skills: {currentSkills}
    - Assessment Results: {assessmentHistory}
    - Experience Level: {experienceLevel}
    - Career Goals: {careerGoals}
    
    Requirements - Keep ALL responses SHORT:
    - Max 5 skill recommendations
    - Each reason: 5-8 words max
    - Each description: 6-10 words max
    - Learning time estimates: Simple format (e.g., "2-3 weeks")
    
    STRICT LIMITS:
    - skillName: 1-2 words
    - reason: 5-8 words explaining why recommend this skill
    - description: 6-10 words about skill benefits
    - estimatedTime: Simple format (e.g., "2-3 weeks", "1 month")
    - difficulty: BEGINNER/INTERMEDIATE/ADVANCED only
    
    Format: Return JSON object with:
    - recommendations: Array of objects with:
      - skillName: String (1-2 words)
      - priority: String ("HIGH", "MEDIUM", "LOW")
      - reason: String (5-8 words max)
      - description: String (6-10 words max)
      - estimatedTime: String (simple format)
      - difficulty: String (BEGINNER/INTERMEDIATE/ADVANCED)
    - careerPaths: Array of strings (max 3, 2-3 words each)
    - marketReadiness: String (single word)
  `
};
