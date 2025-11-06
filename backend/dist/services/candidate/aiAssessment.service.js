"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRecommendations = exports.generateReport = exports.adjustDifficulty = exports.evaluateAnswer = exports.generateQuestions = void 0;
const skillAssessment_prompts_1 = require("./skillAssessment.prompts");
const openai_1 = require("../../lib/openai");
const generateQuestions = async (params) => {
    const totalYears = params.candidateProfile?.experienceLevel
        ? JSON.parse(params.candidateProfile.experienceLevel).reduce((sum, job) => sum + (job.years || 0), 0)
        : 0;
    const experienceSummary = `${totalYears}+ years experience`;
    const topSkills = params.candidateProfile?.existingSkills?.slice(0, 15).join(', ') || 'N/A';
    const prompt = skillAssessment_prompts_1.SKILL_ASSESSMENT_PROMPTS.QUESTION_GENERATION
        .replace('{questionCount}', params.questionCount)
        .replace('{difficulty}', params.difficulty)
        .replace('{skillCategory}', params.skillCategory)
        .replace('{experienceLevel}', experienceSummary)
        .replace('{existingSkills}', topSkills)
        .replace('{industry}', params.candidateProfile?.industry || 'Tech');
    return await (0, openai_1.generateSkillsAssessmentJSON)('You are an expert skill assessment AI.', prompt, 'questions');
};
exports.generateQuestions = generateQuestions;
const evaluateAnswer = async (params) => {
    const prompt = skillAssessment_prompts_1.SKILL_ASSESSMENT_PROMPTS.ANSWER_EVALUATION
        .replace('{skillCategory}', params.skillCategory)
        .replace('{question}', params.question)
        .replace('{expectedAnswer}', params.expectedAnswer || '')
        .replace('{userAnswer}', params.userAnswer);
    return await (0, openai_1.generateSkillsAssessmentJSON)('You are an expert skill assessment AI.', prompt, 'evaluation');
};
exports.evaluateAnswer = evaluateAnswer;
const adjustDifficulty = async (params) => {
    const prompt = skillAssessment_prompts_1.SKILL_ASSESSMENT_PROMPTS.DIFFICULTY_ADJUSTMENT
        .replace('{currentDifficulty}', params.currentDifficulty)
        .replace('{recentScores}', params.recentAnswers?.map((a) => a.partialScore || a.score || 0).join(', ') || '')
        .replace('{avgTimePerQuestion}', params.avgTimePerQuestion?.toString() || '');
    return await (0, openai_1.generateSkillsAssessmentJSON)('You are an expert skill assessment AI.', prompt, 'difficulty');
};
exports.adjustDifficulty = adjustDifficulty;
const generateReport = async (params) => {
    const prompt = skillAssessment_prompts_1.SKILL_ASSESSMENT_PROMPTS.COMPREHENSIVE_REPORT
        .replace('{skillCategory}', params.assessment.skillCategory)
        .replace('{totalQuestions}', params.assessment.totalQuestions?.toString() || '')
        .replace('{overallScore}', params.assessment.overall_score?.toString() || '')
        .replace('{totalTime}', params.totalTime?.toString() || '')
        .replace('{performanceData}', JSON.stringify(params.results || []));
    return await (0, openai_1.generateSkillsAssessmentJSON)('You are an expert skill assessment AI.', prompt, 'report');
};
exports.generateReport = generateReport;
const generateRecommendations = async (params) => {
    const prompt = skillAssessment_prompts_1.SKILL_ASSESSMENT_PROMPTS.SKILL_RECOMMENDATIONS
        .replace('{currentSkills}', params.currentSkills?.join(', ') || 'N/A')
        .replace('{assessmentHistory}', JSON.stringify(params.assessmentHistory || []))
        .replace('{experienceLevel}', params.experienceLevel || 'Intermediate')
        .replace('{careerGoals}', params.careerGoals || 'N/A');
    return await (0, openai_1.generateSkillsAssessmentJSON)('You are an expert career advisor AI.', prompt, 'recommendations');
};
exports.generateRecommendations = generateRecommendations;
