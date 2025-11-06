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
Generate COMPLETE assessment report for {skillCategory}.

Assessment Data:
- Total Questions: {totalQuestions}
- Overall Score: {overallScore}%
- Total Time: {totalTime} minutes
- Performance Details: {performanceData}

YOU MUST GENERATE ALL OF THESE FIELDS (REQUIRED):

1. Strengths (3-5 items):
   - Identify specific strong areas demonstrated in the assessment
   - Base on actual correct answers and performance patterns
   - Be specific and encouraging
   - Example: "Strong understanding of React Hooks", "Excellent problem-solving approach"

2. Weaknesses (3-5 items):
   - Identify areas needing improvement
   - Base on incorrect or partial answers
   - Be constructive and specific
   - Example: "Redux state management needs more practice", "Error handling concepts require review"

3. Recommendations (3-5 items):
   - Provide actionable learning suggestions
   - Suggest specific resources, topics, or methods to study
   - Make them practical and achievable
   - Example: "Practice building custom React hooks", "Complete Redux Toolkit official tutorial"

4. Next Steps (3-5 items):
   - List immediate action items for career/skill progression
   - Include both learning and application activities
   - Be specific and time-bound when possible
   - Example: "Build 2-3 portfolio projects using React", "Apply for junior React developer positions"

Return COMPLETE JSON with ALL required fields:
{
  "overallScore": 85,
  "skillLevel": "INTERMEDIATE",
  "strengths": ["strength1", "strength2", "strength3"],
  "weaknesses": ["weakness1", "weakness2", "weakness3"],
  "recommendations": ["rec1", "rec2", "rec3"],
  "nextSteps": ["step1", "step2", "step3"],
  "confidenceScore": 90
}

CRITICAL REQUIREMENTS:
- ALL arrays MUST contain 3-5 items (never empty)
- Each item should be a complete, specific sentence
- Base all insights on the actual performance data provided
- Maintain an encouraging but realistic tone
- Focus on actionable and practical advice
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

