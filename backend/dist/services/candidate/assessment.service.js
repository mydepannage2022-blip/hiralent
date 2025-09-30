"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendations = exports.getAssessmentHistory = exports.getAssessmentResults = exports.completeAssessment = exports.getProgress = exports.submitAnswer = exports.getNextQuestion = exports.startAssessment = void 0;
const prisma_1 = __importDefault(require("../../lib/prisma"));
const aiAssessment = __importStar(require("./aiAssessment.service"));
const assessment_types_1 = require("../../types/assessment.types");
const startAssessment = async (params) => {
    try {
        const { candidateId, skillCategory, assessmentType, difficulty } = params;
        console.log('Starting assessment with params:', params);
        // Get candidate profile WITH skills (populated)
        let candidateWithProfile;
        try {
            candidateWithProfile = await prisma_1.default.user.findUnique({
                where: { user_id: candidateId },
                include: {
                    candidateProfile: true,
                    candidateSkills: true // Get actual skills instead of IDs
                }
            });
        }
        catch (dbError) {
            console.error('Database error in startAssessment:', dbError);
            throw new Error('Database connection failed. Please try again later.');
        }
        if (!candidateWithProfile?.candidateProfile) {
            throw new Error('Candidate profile not found. Please complete your profile first.');
        }
        const candidateProfile = candidateWithProfile.candidateProfile;
        const candidateSkills = candidateWithProfile.candidateSkills;
        // Build AI profile with actual skills data
        const aiProfile = {
            experienceLevel: candidateProfile.experience || '',
            // Use actual skill names from CandidateSkill table instead of JSON parsing
            existingSkills: candidateSkills.map(skill => skill.skill_name),
            industry: '',
        };
        const questionCount = 5;
        let questions;
        try {
            questions = await aiAssessment.generateQuestions({
                skillCategory,
                difficulty,
                questionCount,
                candidateProfile: aiProfile,
            });
        }
        catch (aiError) {
            console.error('AI service error in startAssessment:', aiError);
            // Fallback: Use basic questions if AI fails
            questions = getFallbackQuestions(skillCategory, difficulty, questionCount);
            console.warn(`Using fallback questions for ${skillCategory} due to AI service failure`);
        }
        if (!questions || questions.length === 0) {
            throw new Error(`Unable to generate questions for ${skillCategory}. Please try a different skill category.`);
        }
        let assessment;
        try {
            assessment = await prisma_1.default.skillAssessment.create({
                data: {
                    candidate_id: candidateId,
                    assessment_type: assessmentType,
                    provider: "AI_GEMINI",
                    skill_category: skillCategory,
                    difficulty: difficulty,
                    total_questions: questionCount,
                    time_limit: 30,
                    status: 'PENDING',
                    current_question: 0,
                    questions: questions,
                    answers: [],
                    started_at: new Date(), // Add started_at for time tracking
                },
            });
        }
        catch (dbError) {
            console.error('Database error creating assessment:', dbError);
            throw new Error('Failed to create assessment. Please try again.');
        }
        const firstQuestion = questions[0] ? {
            questionId: questions[0].questionId || 'q1',
            questionText: questions[0].questionText,
            type: questions[0].type,
            options: questions[0].options || [],
            timeLimit: questions[0].timeLimit || 90,
        } : null;
        return {
            success: true,
            data: {
                assessmentId: assessment.assessment_id,
                totalQuestions: assessment.total_questions,
                timeLimit: assessment.time_limit,
                status: assessment.status,
                firstQuestion,
            },
        };
    }
    catch (error) {
        console.error('Error in startAssessment:', error);
        throw new Error(error.message || 'Failed to start assessment. Please try again.');
    }
};
exports.startAssessment = startAssessment;
const getNextQuestion = async (assessmentId) => {
    try {
        if (!assessmentId) {
            throw new Error('Assessment ID is required');
        }
        let assessment;
        try {
            assessment = await prisma_1.default.skillAssessment.findUnique({
                where: { assessment_id: assessmentId },
            });
        }
        catch (dbError) {
            console.error('Database error in getNextQuestion:', dbError);
            throw new Error('Database connection failed. Please try again later.');
        }
        if (!assessment) {
            throw new Error('Assessment not found');
        }
        if (assessment.status !== 'IN_PROGRESS' && assessment.status !== 'PENDING') {
            throw new Error(`Assessment is ${assessment.status.toLowerCase()}. Cannot get questions.`);
        }
        const questions = Array.isArray(assessment.questions)
            ? assessment.questions
            : [];
        if (!questions || questions.length === 0) {
            throw new Error('No questions found for this assessment');
        }
        const idx = assessment.current_question;
        if (idx >= questions.length) {
            throw new Error('No more questions available. Assessment should be completed.');
        }
        const q = questions[idx];
        if (!q) {
            throw new Error('Question not found at current index');
        }
        // Update status to IN_PROGRESS if it was PENDING
        if (assessment.status === 'PENDING') {
            try {
                await prisma_1.default.skillAssessment.update({
                    where: { assessment_id: assessmentId },
                    data: {
                        status: 'IN_PROGRESS',
                        started_at: new Date()
                    },
                });
            }
            catch (dbError) {
                console.warn('Failed to update assessment status to IN_PROGRESS:', dbError);
                // Continue anyway, this is not critical
            }
        }
        return {
            questionId: q.questionId || `q${idx + 1}`,
            questionText: q.questionText,
            type: q.type,
            options: q.options || [],
            difficulty: q.difficulty,
            timeLimit: q.timeLimit || 90,
            aiGenerated: true,
            adaptedReason: '',
        };
    }
    catch (error) {
        console.error('Error in getNextQuestion:', error);
        throw new Error(error.message || 'Failed to get next question');
    }
};
exports.getNextQuestion = getNextQuestion;
const submitAnswer = async (params) => {
    try {
        const { assessmentId, questionId, answer, timeTaken } = params;
        // Validate input
        if (!assessmentId || !questionId || answer === undefined || timeTaken < 0) {
            throw new Error('Missing or invalid required parameters');
        }
        let assessment;
        try {
            assessment = await prisma_1.default.skillAssessment.findUnique({
                where: { assessment_id: assessmentId },
            });
        }
        catch (dbError) {
            console.error('Database error in submitAnswer:', dbError);
            throw new Error('Database connection failed. Please try again later.');
        }
        if (!assessment) {
            throw new Error('Assessment not found');
        }
        if (assessment.status !== 'IN_PROGRESS' && assessment.status !== 'PENDING') {
            throw new Error(`Cannot submit answer. Assessment is ${assessment.status.toLowerCase()}.`);
        }
        const questions = Array.isArray(assessment.questions)
            ? assessment.questions
            : [];
        if (!questions || questions.length === 0) {
            throw new Error('No questions found for this assessment');
        }
        const idx = assessment.current_question;
        if (idx >= questions.length) {
            throw new Error('No more questions to answer');
        }
        const currentQ = questions[idx];
        if (!currentQ) {
            throw new Error('Current question not found');
        }
        // Validate question ID
        if (currentQ.questionId !== questionId && `q${idx + 1}` !== questionId) {
            throw new Error('Invalid question ID or answers submitted out of sequence');
        }
        // AI Evaluation with error handling
        let aiEval;
        try {
            aiEval = await aiAssessment.evaluateAnswer({
                question: currentQ.questionText,
                userAnswer: answer,
                expectedAnswer: currentQ.correctAnswer,
                questionType: currentQ.type,
                skillCategory: assessment.skill_category,
            });
        }
        catch (aiError) {
            console.error('AI evaluation error:', aiError);
            // Fallback: Basic evaluation if AI fails
            aiEval = getFallbackEvaluation(currentQ, answer);
            console.warn('Using fallback evaluation due to AI service failure');
        }
        const answers = Array.isArray(assessment.answers) ? [...assessment.answers] : [];
        answers.push({
            questionId,
            userAnswer: answer,
            timeTaken,
            aiEvaluation: aiEval,
            answeredAt: new Date().toISOString(),
        });
        const isLastQuestion = idx + 1 >= questions.length;
        let updated;
        try {
            updated = await prisma_1.default.skillAssessment.update({
                where: { assessment_id: assessmentId },
                data: {
                    answers: answers,
                    current_question: idx + 1,
                    status: isLastQuestion ? 'COMPLETED' : 'IN_PROGRESS',
                },
            });
        }
        catch (dbError) {
            console.error('Database error updating assessment:', dbError);
            throw new Error('Failed to save answer. Please try again.');
        }
        const nextQ = isLastQuestion ? null : questions[idx + 1];
        return {
            success: true,
            data: {
                isCorrect: aiEval.isCorrect,
                score: aiEval.score,
                feedback: aiEval.feedback,
                nextQuestion: nextQ
                    ? {
                        questionId: nextQ.questionId || `q${idx + 2}`,
                        questionText: nextQ.questionText,
                        type: nextQ.type,
                        timeLimit: nextQ.timeLimit || 90,
                    }
                    : null,
                completed: isLastQuestion,
            },
        };
    }
    catch (error) {
        console.error('Error in submitAnswer:', error);
        throw new Error(error.message || 'Failed to submit answer');
    }
};
exports.submitAnswer = submitAnswer;
const getProgress = async (assessmentId) => {
    try {
        if (!assessmentId) {
            throw new Error('Assessment ID is required');
        }
        let assessment;
        try {
            assessment = await prisma_1.default.skillAssessment.findUnique({
                where: { assessment_id: assessmentId },
            });
        }
        catch (dbError) {
            console.error('Database error in getProgress:', dbError);
            throw new Error('Database connection failed. Please try again later.');
        }
        if (!assessment) {
            throw new Error('Assessment not found');
        }
        const totalQuestions = assessment.total_questions;
        const currentQuestion = assessment.current_question;
        const answers = Array.isArray(assessment.answers) ? assessment.answers : [];
        const progressPercentage = Math.round((currentQuestion / totalQuestions) * 100);
        const scores = answers.map((a) => a.aiEvaluation?.score || 0);
        const currentScore = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
        let timeRemaining = null;
        if (assessment.started_at && assessment.time_limit) {
            const elapsed = (Date.now() - new Date(assessment.started_at).getTime()) / 1000;
            timeRemaining = Math.max(0, assessment.time_limit * 60 - elapsed);
        }
        const questions = Array.isArray(assessment.questions)
            ? assessment.questions
            : [];
        const difficultyCurve = questions.slice(0, currentQuestion).map(q => q.difficulty || 'BEGINNER');
        return {
            success: true,
            data: {
                assessmentId: assessment.assessment_id,
                currentQuestion: assessment.current_question,
                totalQuestions,
                progressPercentage,
                currentScore,
                timeRemaining,
                difficultyCurve,
            },
        };
    }
    catch (error) {
        console.error('Error in getProgress:', error);
        throw new Error(error.message || 'Failed to get progress');
    }
};
exports.getProgress = getProgress;
const completeAssessment = async (assessmentId) => {
    try {
        if (!assessmentId) {
            throw new Error('Assessment ID is required');
        }
        let assessment;
        try {
            assessment = await prisma_1.default.skillAssessment.findUnique({
                where: { assessment_id: assessmentId },
            });
        }
        catch (dbError) {
            console.error('Database error in completeAssessment:', dbError);
            throw new Error('Database connection failed. Please try again later.');
        }
        if (!assessment) {
            throw new Error('Assessment not found');
        }
        if (assessment.status === 'COMPLETED') {
            return {
                success: true,
                data: {
                    assessmentId: assessment.assessment_id,
                    status: 'COMPLETED',
                    message: 'Assessment already completed'
                }
            };
        }
        const results = Array.isArray(assessment.answers) ? assessment.answers : [];
        // Generate AI report with error handling
        let report;
        try {
            report = await aiAssessment.generateReport({
                assessment,
                results,
                totalTime: null,
            });
        }
        catch (aiError) {
            console.error('AI report generation error:', aiError);
            // Fallback: Generate basic report
            report = generateFallbackReport(assessment, results);
            console.warn('Using fallback report due to AI service failure');
        }
        let updated;
        try {
            updated = await prisma_1.default.skillAssessment.update({
                where: { assessment_id: assessmentId },
                data: {
                    status: 'COMPLETED',
                    completed_at: new Date(),
                    overall_score: report?.overallScore || calculateBasicScore(results),
                    skill_level_result: report?.skillLevel || 'INTERMEDIATE',
                    strengths: report?.strengths || ['Assessment completed'],
                    weaknesses: report?.weaknesses || ['Review recommended'],
                    recommendations: report?.recommendations || ['Continue practicing'],
                    ai_analysis: report || {},
                    confidence_score: report?.confidenceScore || 75,
                },
            });
        }
        catch (dbError) {
            console.error('Database error completing assessment:', dbError);
            throw new Error('Failed to complete assessment. Please try again.');
        }
        return {
            success: true,
            data: {
                assessmentId: updated.assessment_id,
                status: updated.status,
                overallScore: updated.overall_score,
                skillLevel: updated.skill_level_result,
                completedAt: updated.completed_at,
                nextSteps: {
                    jobMatching: '/api/v1/candidates/match-jobs',
                    detailedResults: `/api/v1/candidates/assessment/${updated.assessment_id}/results`,
                },
            },
        };
    }
    catch (error) {
        console.error('Error in completeAssessment:', error);
        throw new Error(error.message || 'Failed to complete assessment');
    }
};
exports.completeAssessment = completeAssessment;
const getAssessmentResults = async (assessmentId) => {
    try {
        if (!assessmentId) {
            throw new Error('Assessment ID is required');
        }
        let assessment;
        try {
            assessment = await prisma_1.default.skillAssessment.findUnique({
                where: { assessment_id: assessmentId },
            });
        }
        catch (dbError) {
            console.error('Database error in getAssessmentResults:', dbError);
            throw new Error('Database connection failed. Please try again later.');
        }
        if (!assessment) {
            throw new Error('Assessment not found');
        }
        if (assessment.status !== 'COMPLETED') {
            throw new Error('Assessment not completed yet. Complete the assessment first.');
        }
        const questions = Array.isArray(assessment.questions)
            ? assessment.questions
            : [];
        const answers = Array.isArray(assessment.answers) ? assessment.answers : [];
        const aiAnalysis = assessment.ai_analysis || {};
        const questionBreakdown = answers.map((a, idx) => ({
            questionId: a.questionId || `q${idx + 1}`,
            score: a.aiEvaluation?.score || 0,
            difficulty: questions[idx]?.difficulty || 'BEGINNER',
            timeTaken: a.timeTaken,
            feedback: a.aiEvaluation?.feedback || '',
        }));
        return {
            success: true,
            data: {
                assessmentId: assessment.assessment_id,
                skillCategory: assessment.skill_category,
                overallScore: assessment.overall_score,
                skillLevel: assessment.skill_level_result,
                strengths: assessment.strengths || [],
                weaknesses: assessment.weaknesses || [],
                recommendations: assessment.recommendations || [],
                aiAnalysis,
                questionBreakdown,
            },
        };
    }
    catch (error) {
        console.error('Error in getAssessmentResults:', error);
        throw new Error(error.message || 'Failed to get assessment results');
    }
};
exports.getAssessmentResults = getAssessmentResults;
const getAssessmentHistory = async (candidateId) => {
    try {
        if (!candidateId) {
            throw new Error('Candidate ID is required');
        }
        let assessments;
        try {
            assessments = await prisma_1.default.skillAssessment.findMany({
                where: { candidate_id: candidateId, status: 'COMPLETED' },
                orderBy: { completed_at: 'desc' },
            });
        }
        catch (dbError) {
            console.error('Database error in getAssessmentHistory:', dbError);
            throw new Error('Database connection failed. Please try again later.');
        }
        const history = assessments.map((a, idx) => {
            let improvement = undefined;
            if (idx < assessments.length - 1) {
                const diff = (a.overall_score || 0) - (assessments[idx + 1].overall_score || 0);
                improvement = diff > 0 ? `+${diff.toFixed(1)} points from last attempt` : `${diff.toFixed(1)} points from last attempt`;
            }
            return {
                assessmentId: a.assessment_id,
                skillCategory: a.skill_category,
                overallScore: a.overall_score,
                skillLevel: a.skill_level_result,
                completedAt: a.completed_at,
                improvement,
            };
        });
        const skillProgress = {};
        for (const a of assessments) {
            const cat = a.skill_category;
            if (!skillProgress[cat]) {
                skillProgress[cat] = {
                    currentLevel: a.skill_level_result,
                    trend: 'STABLE',
                    lastScore: a.overall_score,
                    previousScore: undefined,
                };
            }
            else {
                skillProgress[cat].previousScore = a.overall_score;
                skillProgress[cat].trend = (a.overall_score || 0) > (skillProgress[cat].lastScore || 0) ? 'IMPROVING' : 'DECLINING';
            }
        }
        return {
            success: true,
            data: {
                assessments: history,
                skillProgress,
            },
        };
    }
    catch (error) {
        console.error('Error in getAssessmentHistory:', error);
        throw new Error(error.message || 'Failed to get assessment history');
    }
};
exports.getAssessmentHistory = getAssessmentHistory;
const getRecommendations = async (candidateId) => {
    try {
        if (!candidateId) {
            throw new Error('Candidate ID is required');
        }
        // This could be enhanced with AI-based recommendations
        return {
            success: true,
            data: {
                recommendations: [
                    {
                        skillCategory: 'React',
                        reason: 'High demand in your job preferences',
                        difficulty: 'INTERMEDIATE',
                        estimatedTime: '2-3 weeks',
                        marketValue: '15% salary increase potential',
                    },
                ],
                learningPath: [
                    {
                        step: 1,
                        skill: 'Advanced JavaScript',
                        duration: '1 week',
                        resources: ['MDN Documentation', "You Don't Know JS"],
                    },
                ],
            },
        };
    }
    catch (error) {
        console.error('Error in getRecommendations:', error);
        throw new Error(error.message || 'Failed to get recommendations');
    }
};
exports.getRecommendations = getRecommendations;
// ==================== FALLBACK FUNCTIONS ====================
const getFallbackQuestions = (skillCategory, difficulty, count) => {
    // Basic fallback questions when AI service fails
    const fallbackQuestions = [
        {
            questionId: 'fallback_1',
            questionText: `What is your experience level with ${skillCategory}?`,
            type: assessment_types_1.QuestionType.MCQ,
            options: ['Beginner', 'Intermediate', 'Advanced', 'Expert'],
            correctAnswer: 'Intermediate',
            difficulty: difficulty,
            timeLimit: 90,
            aiGenerated: false,
            adaptedReason: 'Fallback question due to AI service unavailability'
        }
    ];
    return Array(count).fill(0).map((_, idx) => ({
        ...fallbackQuestions[0],
        questionId: `fallback_${idx + 1}`,
        questionText: `Question ${idx + 1}: Basic ${skillCategory} knowledge check`
    }));
};
const getFallbackEvaluation = (question, answer) => {
    // Basic evaluation when AI service fails
    return {
        score: 70, // Average score
        feedback: 'Answer recorded. Detailed evaluation unavailable due to service limitations.',
        strengths: ['Answer provided'],
        improvements: ['Detailed analysis pending'],
        confidence: 50,
        isCorrect: true
    };
};
const generateFallbackReport = (assessment, results) => {
    const avgScore = results.length > 0
        ? results.reduce((sum, r) => sum + (r.aiEvaluation?.score || 0), 0) / results.length
        : 70;
    return {
        overallScore: avgScore,
        skillLevel: avgScore >= 80 ? 'ADVANCED' : avgScore >= 60 ? 'INTERMEDIATE' : 'BEGINNER',
        strengths: ['Assessment completed', 'Consistent performance'],
        weaknesses: ['Detailed analysis pending'],
        recommendations: ['Continue practicing', 'Review fundamentals'],
        confidenceScore: 75
    };
};
const calculateBasicScore = (results) => {
    if (results.length === 0)
        return 0;
    return results.reduce((sum, r) => sum + (r.aiEvaluation?.score || 0), 0) / results.length;
};
