// TODO: Import types from assessment.types and openai.ts
import { SKILL_ASSESSMENT_PROMPTS } from './skillAssessment.prompts';
import { generateGeminiJSON } from '../lib/openai';

export const generateQuestions = async (params: any): Promise<any[]> => {
  const prompt = SKILL_ASSESSMENT_PROMPTS.QUESTION_GENERATION
    .replace('{questionCount}', params.questionCount)
    .replace('{difficulty}', params.difficulty)
    .replace('{skillCategory}', params.skillCategory)
    .replace('{experienceLevel}', params.candidateProfile?.experienceLevel || '')
    .replace('{existingSkills}', params.candidateProfile?.existingSkills?.join(', ') || '')
    .replace('{industry}', params.candidateProfile?.industry || '');
  return await generateGeminiJSON('You are an expert skill assessment AI.', prompt);
};

export const evaluateAnswer = async (params: any): Promise<any> => {
  const prompt = SKILL_ASSESSMENT_PROMPTS.ANSWER_EVALUATION
    .replace('{skillCategory}', params.skillCategory)
    .replace('{question}', params.question)
    .replace('{expectedAnswer}', params.expectedAnswer || '')
    .replace('{userAnswer}', params.userAnswer);
  return await generateGeminiJSON('You are an expert skill assessment AI.', prompt);
};

export const adjustDifficulty = async (params: any): Promise<any> => {
  const prompt = SKILL_ASSESSMENT_PROMPTS.DIFFICULTY_ADJUSTMENT
    .replace('{currentDifficulty}', params.currentDifficulty)
    .replace('{recentScores}', params.recentAnswers?.map((a: any) => a.partialScore || a.score || 0).join(', ') || '')
    .replace('{avgTimePerQuestion}', params.avgTimePerQuestion?.toString() || '');
  return await generateGeminiJSON('You are an expert skill assessment AI.', prompt);
};

export const generateReport = async (params: any): Promise<any> => {
  const prompt = SKILL_ASSESSMENT_PROMPTS.COMPREHENSIVE_REPORT
    .replace('{skillCategory}', params.assessment.skill_category)
    .replace('{totalQuestions}', params.assessment.total_questions?.toString() || '')
    .replace('{overallScore}', params.assessment.overall_score?.toString() || '')
    .replace('{totalTime}', params.totalTime?.toString() || '')
    .replace('{performanceData}', JSON.stringify(params.results || []));
  return await generateGeminiJSON('You are an expert skill assessment AI.', prompt);
};