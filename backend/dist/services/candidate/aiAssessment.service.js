"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateReport = exports.adjustDifficulty = exports.evaluateAnswer = exports.generateQuestions = void 0;
// TODO: Import types from assessment.types and openai.ts
const skillAssessment_prompts_1 = require("./skillAssessment.prompts");
const openai_1 = require("../../lib/openai");
const generateQuestions = async (params) => {
    const prompt = skillAssessment_prompts_1.SKILL_ASSESSMENT_PROMPTS.QUESTION_GENERATION
        .replace('{questionCount}', params.questionCount)
        .replace('{difficulty}', params.difficulty)
        .replace('{skillCategory}', params.skillCategory)
        .replace('{experienceLevel}', params.candidateProfile?.experienceLevel || '')
        .replace('{existingSkills}', params.candidateProfile?.existingSkills?.join(', ') || '')
        .replace('{industry}', params.candidateProfile?.industry || '');
    console.log('Generated Prompt:', prompt);
    return await (0, openai_1.generateSkillsAssessmentJSON)('You are an expert skill assessment AI.', prompt, 'questions');
};
exports.generateQuestions = generateQuestions;
const evaluateAnswer = async (params) => {
    const prompt = skillAssessment_prompts_1.SKILL_ASSESSMENT_PROMPTS.ANSWER_EVALUATION
        .replace('{skillCategory}', params.skillCategory)
        .replace('{question}', params.question)
        .replace('{expectedAnswer}', params.expectedAnswer || '')
        .replace('{userAnswer}', params.userAnswer);
    // ✅ ADD assessmentType parameter for evaluation
    return await (0, openai_1.generateSkillsAssessmentJSON)('You are an expert skill assessment AI.', prompt, 'evaluation' // ← ADD THIS LINE
    );
};
exports.evaluateAnswer = evaluateAnswer;
const adjustDifficulty = async (params) => {
    const prompt = skillAssessment_prompts_1.SKILL_ASSESSMENT_PROMPTS.DIFFICULTY_ADJUSTMENT
        .replace('{currentDifficulty}', params.currentDifficulty)
        .replace('{recentScores}', params.recentAnswers?.map((a) => a.partialScore || a.score || 0).join(', ') || '')
        .replace('{avgTimePerQuestion}', params.avgTimePerQuestion?.toString() || '');
    return await (0, openai_1.generateSkillsAssessmentJSON)('You are an expert skill assessment AI.', prompt);
};
exports.adjustDifficulty = adjustDifficulty;
const generateReport = async (params) => {
    const prompt = skillAssessment_prompts_1.SKILL_ASSESSMENT_PROMPTS.COMPREHENSIVE_REPORT
        .replace('{skillCategory}', params.assessment.skillCategory)
        .replace('{totalQuestions}', params.assessment.totalQuestions?.toString() || '')
        .replace('{overallScore}', params.assessment.overall_score?.toString() || '')
        .replace('{totalTime}', params.totalTime?.toString() || '')
        .replace('{performanceData}', JSON.stringify(params.results || []));
    return await (0, openai_1.generateSkillsAssessmentJSON)('You are an expert skill assessment AI.', prompt);
};
exports.generateReport = generateReport;
