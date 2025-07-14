export const SKILL_ASSESSMENT_PROMPTS = {
  QUESTION_GENERATION: `
    Generate {questionCount} {difficulty} level questions for {skillCategory} skill assessment.
    
    Candidate Context:
    - Experience Level: {experienceLevel}
    - Previous Skills: {existingSkills}
    - Industry: {industry}
    
    Requirements:
    - Mix of practical and theoretical questions
    - Include real-world scenarios
    - Ensure questions are measurable
    - Provide clear evaluation criteria
    
    Format: JSON array with questionText, type, options, correctAnswer, explanation
  `,
  
  ANSWER_EVALUATION: `
    Evaluate this candidate's answer for a {skillCategory} assessment:
    
    Question: {question}
    Expected Answer: {expectedAnswer}
    User Answer: {userAnswer}
    
    Provide:
    1. Correctness score (0-100)
    2. Detailed feedback
    3. Strengths identified
    4. Areas for improvement
    5. Confidence level in evaluation
    
    Format: JSON with score, feedback, strengths, improvements, confidence
  `,
  
  DIFFICULTY_ADJUSTMENT: `
    Analyze candidate performance and recommend difficulty adjustment:
    
    Current Difficulty: {currentDifficulty}
    Recent Performance: {recentScores}
    Time Taken: {avgTimePerQuestion}
    
    Recommend:
    1. New difficulty level
    2. Reasoning for adjustment
    3. Confidence in recommendation
    
    Format: JSON with recommendedDifficulty, reasoning, confidence
  `,
  
  COMPREHENSIVE_REPORT: `
    Generate comprehensive skill assessment report:
    
    Assessment Details:
    - Skill Category: {skillCategory}
    - Questions Answered: {totalQuestions}
    - Overall Score: {overallScore}
    - Time Taken: {totalTime}
    
    Performance Data: {performanceData}
    
    Provide:
    1. Skill level classification
    2. Top 3 strengths
    3. Top 3 areas for improvement
    4. Specific learning recommendations
    5. Career path suggestions
    6. Market readiness assessment
    
    Format: JSON with skillLevel, strengths, weaknesses, recommendations, careerSuggestions, marketReadiness
  `
};