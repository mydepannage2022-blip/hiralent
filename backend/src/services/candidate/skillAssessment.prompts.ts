
// export const SKILL_ASSESSMENT_PROMPTS = {
//   QUESTION_GENERATION: `
//     Generate {questionCount} {difficulty} level questions for {skillCategory} skill assessment.
    
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
//     - Keep explanations BRIEF - max 1 sentence (10 words max)
    
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
//     - explanation: String (BRIEF - max 10 words explaining correct answer)
//   `,
  
//   ANSWER_EVALUATION: `
//     Evaluate this candidate's answer for {skillCategory} assessment. Keep ALL responses concise.
    
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
    
//     2. Provide CONCISE feedback (max 12 words):
//        - What they did right/wrong in one brief sentence
    
//     3. Identify strengths and weaknesses (max 2-3 words each):
//        - Technical understanding demonstrated
//        - Problem-solving approach
//        - Knowledge gaps revealed
    
//     4. Confidence level in evaluation (0-100):
//        - How certain you are about the assessment
    
//     STRICT LENGTH LIMITS:
//     - feedback: Maximum 12 words, one sentence only
//     - strengths: Maximum 3 items, 2-3 words each
//     - improvements: Maximum 3 items, 2-3 words each
    
//     Format: Return JSON object with:
//     - score: Number (0-100)
//     - feedback: String (max 12 words, concise feedback)
//     - strengths: Array of strings (max 3 items, 2-3 words each)
//     - improvements: Array of strings (max 3 items, 2-3 words each)
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
//     - Keep reasoning BRIEF (max 15 words)
    
//     Format: Return JSON object with:
//     - recommendedDifficulty: String ("BEGINNER", "INTERMEDIATE", "ADVANCED", or "EXPERT")
//     - reasoning: String (max 15 words explaining the recommendation)
//     - confidence: Number (0-100, confidence in this recommendation)
//     - adjustmentType: String ("INCREASE", "MAINTAIN", "DECREASE")
//   `,
  
//   COMPREHENSIVE_REPORT: `
//     Generate a CONCISE skill assessment report based on candidate performance.
    
//     Assessment Data:
//     - Skill Category: {skillCategory}
//     - Total Questions Answered: {totalQuestions}
//     - Overall Score: {overallScore}% 
//     - Total Time Taken: {totalTime} minutes
//     - Detailed Performance: {performanceData}
    
//     Report Components - ALL MUST BE BRIEF:
    
//     1. Skill Level Classification:
//        - Based on overall performance and question difficulty progression
//        - Categories: BEGINNER, INTERMEDIATE, ADVANCED, EXPERT
    
//     2. Performance Analysis (CONCISE):
//        - Top 3 strengths (2-3 words each)
//        - Top 3 improvement areas (2-3 words each)
    
//     3. Learning Recommendations (BRIEF):
//        - Max 3 actionable suggestions (5-8 words each)
//        - Prioritize high-impact recommendations
    
//     4. Career Guidance (SHORT):
//        - Career paths aligned with skills (2-3 words each)
//        - Max 3 career suggestions
    
//     5. Market Readiness (ONE WORD):
//        - Single word assessment: Beginner/Ready/Intermediate/Advanced
    
//     STRICT LENGTH LIMITS:
//     - strengths: Max 3 items, 2-3 words each
//     - weaknesses: Max 3 items, 2-3 words each  
//     - recommendations: Max 3 items, 5-8 words each
//     - careerSuggestions: Max 3 items, 2-3 words each
//     - marketReadiness: Single word only
//     - nextSteps: Max 3 items, 4-6 words each
    
//     Quality Standards:
//     - Be specific but concise
//     - Maintain encouraging but realistic tone
//     - Base conclusions on actual performance data
//     - NO lengthy explanations
    
//     Format: Return JSON object with:
//     - overallScore: Number (calculated average score)
//     - skillLevel: String (BEGINNER/INTERMEDIATE/ADVANCED/EXPERT)
//     - strengths: Array of strings (max 3, 2-3 words each)
//     - weaknesses: Array of strings (max 3, 2-3 words each)
//     - recommendations: Array of strings (max 3, 5-8 words each)
//     - careerSuggestions: Array of strings (max 3, 2-3 words each)
//     - marketReadiness: String (single word assessment)
//     - confidenceScore: Number (0-100, confidence in this assessment)
//     - nextSteps: Array of strings (max 3, 4-6 words each)
//   `,
  
//   // Additional prompt for skill recommendations API
//   SKILL_RECOMMENDATIONS: `
//     Generate CONCISE skill recommendations for candidate based on assessment history.
    
//     Candidate Context:
//     - Current Skills: {currentSkills}
//     - Assessment Results: {assessmentHistory}
//     - Experience Level: {experienceLevel}
//     - Career Goals: {careerGoals}
    
//     Requirements - Keep ALL responses SHORT:
//     - Max 5 skill recommendations
//     - Each reason: 5-8 words max
//     - Each description: 6-10 words max
//     - Learning time estimates: Simple format (e.g., "2-3 weeks")
    
//     STRICT LIMITS:
//     - skillName: 1-2 words
//     - reason: 5-8 words explaining why recommend this skill
//     - description: 6-10 words about skill benefits
//     - estimatedTime: Simple format (e.g., "2-3 weeks", "1 month")
//     - difficulty: BEGINNER/INTERMEDIATE/ADVANCED only
    
//     Format: Return JSON object with:
//     - recommendations: Array of objects with:
//       - skillName: String (1-2 words)
//       - priority: String ("HIGH", "MEDIUM", "LOW")
//       - reason: String (5-8 words max)
//       - description: String (6-10 words max)
//       - estimatedTime: String (simple format)
//       - difficulty: String (BEGINNER/INTERMEDIATE/ADVANCED)
//     - careerPaths: Array of strings (max 3, 2-3 words each)
//     - marketReadiness: String (single word)
//   `
// };


export const SKILL_ASSESSMENT_PROMPTS = {
  QUESTION_GENERATION: `
Generate {questionCount} {difficulty} level {skillCategory} questions.

Context: {experienceLevel} | Skills: {existingSkills} | Industry: {industry}

CRITICAL JSON RULES:
- Use ONLY double quotes
- NO single quotes in JSON
- NO nested quotes in option text
- Keep option text simple
- Avoid code syntax in options

Format (80% MCQ, 20% SHORT_ANSWER):
- MCQ: 4 simple options, 90s
- SHORT_ANSWER: Brief, 120s
- Real scenarios
- Clear questions
- Brief explanations (max 10 words)

Return JSON array:
[{
  "questionText": "clear question",
  "type": "MCQ",
  "options": ["option a", "option b", "option c", "option d"],
  "correctAnswer": "exact option text",
  "difficulty": "{difficulty}",
  "timeLimit": 90,
  "questionId": "q1",
  "explanation": "brief"
}]

IMPORTANT: Avoid code examples in options. Keep all text simple.
NO markdown, ONLY valid JSON array.
  `,
  
  ANSWER_EVALUATION: `
Evaluate {skillCategory} answer. Keep BRIEF.

Question: {question}
Expected: {expectedAnswer}
User: {userAnswer}

Scoring:
- MCQ: 100 correct, 0 wrong
- SHORT_ANSWER: 0-100
- CODE: Function + syntax

Return JSON:
{
  "score": 85,
  "feedback": "Brief max 12 words",
  "strengths": ["str1", "str2"],
  "improvements": ["imp1", "imp2"],
  "confidence": 90,
  "isCorrect": true
}
  `,
  
  DIFFICULTY_ADJUSTMENT: `
Recommend difficulty adjustment.

Current: {currentDifficulty}
Scores: {recentScores}
Avg Time: {avgTimePerQuestion}s

Return JSON:
{
  "recommendedDifficulty": "INTERMEDIATE",
  "reasoning": "Brief max 15 words",
  "confidence": 85,
  "adjustmentType": "MAINTAIN"
}
  `,
  
  COMPREHENSIVE_REPORT: `
Generate assessment report for {skillCategory}.

Data:
- Questions: {totalQuestions}
- Score: {overallScore}%
- Time: {totalTime} min

Return JSON:
{
  "overallScore": 85,
  "skillLevel": "INTERMEDIATE",
  "strengths": ["s1", "s2", "s3"],
  "weaknesses": ["w1", "w2", "w3"],
  "recommendations": ["r1", "r2", "r3"],
  "careerSuggestions": ["c1", "c2", "c3"],
  "marketReadiness": "Ready",
  "confidenceScore": 90,
  "nextSteps": ["n1", "n2", "n3"]
}
  `,
  
  SKILL_RECOMMENDATIONS: `
Generate skill recommendations.

Context:
- Skills: {currentSkills}
- History: {assessmentHistory}
- Experience: {experienceLevel}

Return JSON:
{
  "recommendations": [{
    "skillName": "React",
    "priority": "HIGH",
    "reason": "High demand",
    "description": "Frontend framework",
    "estimatedTime": "2-3 weeks",
    "difficulty": "INTERMEDIATE"
  }],
  "careerPaths": ["Frontend", "Full Stack"],
  "marketReadiness": "Ready"
}
  `
};

