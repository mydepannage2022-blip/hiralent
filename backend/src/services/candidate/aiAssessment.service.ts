import { SKILL_ASSESSMENT_PROMPTS } from './skillAssessment.prompts';
import { generateSkillsAssessmentJSON } from '../../lib/openai';

export const generateQuestions = async (params: any): Promise<any[]> => {
  const totalYears = params.candidateProfile?.experienceLevel 
    ? JSON.parse(params.candidateProfile.experienceLevel).reduce((sum: number, job: any) => sum + (job.years || 0), 0)
    : 0;
  
  const experienceSummary = `${totalYears}+ years experience`;
  
  const topSkills = params.candidateProfile?.existingSkills?.slice(0, 15).join(', ') || 'N/A';
  
  const prompt = SKILL_ASSESSMENT_PROMPTS.QUESTION_GENERATION
    .replace('{questionCount}', params.questionCount)
    .replace('{difficulty}', params.difficulty)
    .replace('{skillCategory}', params.skillCategory)
    .replace('{experienceLevel}', experienceSummary)
    .replace('{existingSkills}', topSkills)
    .replace('{industry}', params.candidateProfile?.industry || 'Tech');
  
  return await generateSkillsAssessmentJSON('You are an expert skill assessment AI.', prompt, 'questions');
};

export const evaluateAnswer = async (params: any): Promise<any> => {
  const prompt = SKILL_ASSESSMENT_PROMPTS.ANSWER_EVALUATION
    .replace('{skillCategory}', params.skillCategory)
    .replace('{question}', params.question)
    .replace('{expectedAnswer}', params.expectedAnswer || '')
    .replace('{userAnswer}', params.userAnswer);
  
  return await generateSkillsAssessmentJSON(
    'You are an expert skill assessment AI.', 
    prompt, 
    'evaluation'  
  );
};

export const adjustDifficulty = async (params: any): Promise<any> => {
  const prompt = SKILL_ASSESSMENT_PROMPTS.DIFFICULTY_ADJUSTMENT
    .replace('{currentDifficulty}', params.currentDifficulty)
    .replace('{recentScores}', params.recentAnswers?.map((a: any) => a.partialScore || a.score || 0).join(', ') || '')
    .replace('{avgTimePerQuestion}', params.avgTimePerQuestion?.toString() || '');
  return await generateSkillsAssessmentJSON('You are an expert skill assessment AI.', prompt , 'difficulty');
};

export const generateReport = async (params: any): Promise<any> => {
  const prompt = SKILL_ASSESSMENT_PROMPTS.COMPREHENSIVE_REPORT
    .replace('{skillCategory}', params.assessment.skillCategory)
    .replace('{totalQuestions}', params.assessment.totalQuestions?.toString() || '')
    .replace('{overallScore}', params.assessment.overall_score?.toString() || '')
    .replace('{totalTime}', params.totalTime?.toString() || '')
    .replace('{performanceData}', JSON.stringify(params.results || []));
  return await generateSkillsAssessmentJSON('You are an expert skill assessment AI.', prompt , 'report');
};

export const generateRecommendations = async (params: any): Promise<any> => {
  const prompt = SKILL_ASSESSMENT_PROMPTS.SKILL_RECOMMENDATIONS
    .replace('{currentSkills}', params.currentSkills?.join(', ') || 'N/A')
    .replace('{assessmentHistory}', JSON.stringify(params.assessmentHistory || []))
    .replace('{experienceLevel}', params.experienceLevel || 'Intermediate')
    .replace('{careerGoals}', params.careerGoals || 'N/A');
  
  return await generateSkillsAssessmentJSON(
    'You are an expert career advisor AI.',
    prompt,
    'recommendations'
  );
};
