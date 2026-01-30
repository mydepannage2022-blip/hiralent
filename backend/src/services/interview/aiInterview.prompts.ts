export const AI_INTERVIEW_PROMPTS = {

  GENERATE_INTERVIEW_QUESTIONS: `
Generate {questionCount} interview questions for a {interviewType} interview.

Role: {jobTitle}
Required Skills: {requiredSkills}
Experience Level: {experienceLevel}
Job Description: {jobDescription}

Candidate Background (if available):
- Skills: {candidateSkills}
- Experience: {candidateExperience}

IMPORTANT - Question Distribution (70% Soft Skills, 30% Technical):
- 35% Behavioral (past experiences, STAR method) - SOFT SKILLS
- 20% Situational (hypothetical scenarios) - SOFT SKILLS
- 15% Competency (soft skills verification: communication, teamwork, leadership) - SOFT SKILLS
- 30% Technical (role-specific skills and knowledge)

Soft Skills Categories to Cover:
- Communication: How they express ideas, listen, and articulate
- Problem Solving: How they approach and resolve challenges
- Leadership: Initiative, influence, decision-making
- Teamwork: Collaboration, conflict resolution, supporting others
- Adaptability: Handling change, learning new things
- Critical Thinking: Analysis, evaluation, judgment

Requirements:
- Focus heavily on soft skills assessment (70% of questions)
- Technical questions should still relate to the job
- Use STAR method prompts for behavioral questions
- Vary difficulty appropriately for experience level
- Make questions specific to the role

CRITICAL FORMAT REQUIREMENTS:
1. Start your response with the character: [
2. End your response with the character: ]
3. Each question must be a complete JSON object
4. Separate questions with commas
5. NO explanations before or after the JSON array
6. NO markdown code blocks
7. NO triple backticks

Return EXACTLY this format:
[
  {
    "questionId": "q1",
    "questionText": "Tell me about a time when...",
    "type": "behavioral",
    "category": "communication",
    "expectedTopics": ["clarity", "active listening", "persuasion"],
    "order": 1
  },
  {
    "questionId": "q2",
    "questionText": "...",
    "type": "technical",
    "category": "technical_skills",
    "expectedTopics": ["..."],
    "order": 2
  }
]

Your response MUST start with [ and end with ]
  `,

  ANALYZE_RESPONSE: `
Analyze this interview response with sentiment analysis.

Question: {question}
Question Type: {questionType}
Category: {category}
Expected Topics: {expectedTopics}

Candidate Response: {response}

Job Context:
- Role: {jobTitle}
- Required Skills: {requiredSkills}

Evaluate the response on:
1. Relevance (0-100): Does it answer the question?
2. Completeness (0-100): Did they cover expected topics?
3. Clarity (0-100): How clear was the communication?
4. Key points: Main takeaways
5. Strengths: What they did well
6. Concerns: Any red flags

SENTIMENT ANALYSIS (Critical):
- Confidence: high/medium/low (based on language certainty, hedging words)
- Tone: enthusiastic/confident/neutral/nervous/hesitant/uncertain
- Engagement: highly_engaged/moderately_engaged/disengaged
- Clarity: clear/somewhat_clear/unclear

Return JSON:
{
  "relevanceScore": 85,
  "completenessScore": 75,
  "clarityScore": 80,
  "topicsCovered": ["topic1", "topic2"],
  "keyPoints": ["point1", "point2"],
  "strengths": ["strength1", "strength2"],
  "concerns": ["concern1"],
  "sentiment": {
    "confidence": "medium",
    "tone": "confident",
    "engagement": "highly_engaged",
    "clarity": "clear",
    "notes": "Candidate showed strong enthusiasm when discussing leadership"
  }
}

IMPORTANT: Be objective and fair. NO markdown, ONLY valid JSON.
  `,

  GENERATE_FOLLOWUP: `
Generate a follow-up question based on the candidate's response.

Original Question: {originalQuestion}
Candidate Response: {response}

Analysis of Response:
- Topics Covered: {topicsCovered}
- Topics Missing: {topicsMissing}
- Key Points: {keyPoints}
- Concerns: {concerns}

Generate a follow-up that:
1. Probes deeper into their answer
2. Clarifies any vague points
3. Explores areas they didn't cover
4. OR moves naturally to related topic

Return JSON:
{
  "questionId": "q1_followup",
  "questionText": "You mentioned X, can you elaborate on...",
  "type": "followup",
  "category": "{originalCategory}",
  "expectedTopics": ["topic1", "topic2"],
  "followUpTo": "{originalQuestionId}",
  "reason": "Clarifying their approach to conflict resolution"
}

Keep follow-up natural and conversational.
NO markdown, ONLY valid JSON.
  `,

  ANALYZE_SOFT_SKILLS: `
Analyze soft skills demonstrated across all interview responses.

Interview Transcript:
{transcript}

Questions Asked: {questionsCount}
Response Summaries: {responseSummaries}

Evaluate these soft skills (0-100 scale):

1. COMMUNICATION
   - Clarity of expression
   - Articulation
   - Active listening indicators
   - Professional language

2. PROBLEM SOLVING
   - Analytical approach
   - Creative solutions
   - Logical reasoning
   - Handling complexity

3. LEADERSHIP
   - Initiative
   - Influence
   - Decision making
   - Accountability

4. TEAMWORK
   - Collaboration examples
   - Conflict resolution
   - Supporting others
   - Team orientation

5. ADAPTABILITY
   - Handling change
   - Learning agility
   - Flexibility
   - Resilience

6. CRITICAL THINKING
   - Analysis depth
   - Evaluation quality
   - Objective reasoning
   - Judgment

Return JSON:
{
  "communication": {
    "skill": "communication",
    "score": 85,
    "evidence": ["Clear explanation of project approach", "Used specific examples"],
    "confidence": "high"
  },
  "problemSolving": {
    "skill": "problemSolving",
    "score": 78,
    "evidence": ["Described systematic debugging process"],
    "confidence": "medium"
  },
  "leadership": {
    "skill": "leadership",
    "score": 72,
    "evidence": ["Led team of 3 on project"],
    "confidence": "medium"
  },
  "teamwork": {
    "skill": "teamwork",
    "score": 80,
    "evidence": ["Emphasized collaboration multiple times"],
    "confidence": "high"
  },
  "adaptability": {
    "skill": "adaptability",
    "score": 70,
    "evidence": ["Handled scope change positively"],
    "confidence": "medium"
  },
  "criticalThinking": {
    "skill": "criticalThinking",
    "score": 75,
    "evidence": ["Weighed pros and cons before decisions"],
    "confidence": "medium"
  },
  "overall": 77
}

Be fair and evidence-based.
NO markdown, ONLY valid JSON.
  `,

  FINAL_EVALUATION: `
Generate final interview evaluation.

Job Context:
- Role: {jobTitle}
- Required Skills: {requiredSkills}
- Job Description: {jobDescription}

Interview Summary:
- Total Questions: {totalQuestions}
- Duration: {durationMinutes} minutes
- Questions & Responses: {questionsAndResponses}

Soft Skills Analysis: {softSkillsAnalysis}
Sentiment Analysis: {sentimentAnalysis}

Evaluation Criteria:
1. Technical/Role Fit: Does candidate have required skills?
2. Cultural Fit: Would they work well in the team?
3. Growth Potential: Can they develop in this role?
4. Red Flags: Any serious concerns?
5. Strengths: What makes them stand out?

Qualification Decision:
- QUALIFIED: Strong fit, recommend advancing
- NOT_QUALIFIED: Does not meet requirements
- PENDING_REVIEW: Borderline, needs human review

Return JSON:
{
  "qualification": "QUALIFIED",
  "overallScore": 82,
  "recommendation": "Strong candidate with excellent communication skills and relevant experience. Recommend advancing to next round.",
  "strengths": [
    "Clear communication style",
    "Relevant technical experience",
    "Strong problem-solving approach"
  ],
  "areasForImprovement": [
    "Could strengthen leadership examples",
    "Limited experience with specific technology X"
  ],
  "fitScore": 85,
  "redFlags": [],
  "confidenceInAssessment": "high",
  "detailedNotes": "Candidate demonstrated genuine enthusiasm for the role..."
}

Be objective, fair, and thorough.
NO markdown, ONLY valid JSON.
  `,

  OVERALL_SENTIMENT_SUMMARY: `
Summarize overall sentiment across the entire interview.

Per-Response Sentiment Data: {perResponseSentiment}
Total Responses: {totalResponses}
Interview Duration: {durationMinutes} minutes

Analyze:
1. Overall confidence level
2. Predominant tone
3. Engagement throughout
4. Consistency: Did sentiment change during interview?
   - consistent: Maintained same energy
   - variable: Some fluctuation
   - declining: Energy dropped over time

Return JSON:
{
  "overall": {
    "confidence": "medium",
    "tone": "confident",
    "engagement": "highly_engaged",
    "consistency": "consistent"
  },
  "summary": "Candidate maintained professional confidence throughout with high engagement levels."
}

NO markdown, ONLY valid JSON.
  `
};
