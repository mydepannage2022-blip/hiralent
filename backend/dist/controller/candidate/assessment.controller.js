"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRecommendationsController = exports.getHistoryController = exports.getResultsController = exports.completeAssessmentController = exports.getProgressController = exports.submitAnswerController = exports.getQuestionController = exports.startAssessmentController = void 0;
const assessment_service_1 = require("../../services/candidate/assessment.service");
const assessment_validation_1 = require("../../validation/assessment.validation");
const assessment_validation_2 = require("../../validation/assessment.validation");
// Start a new assessment
const startAssessmentController = async (req, res) => {
    try {
        // Validate input
        const parsed = assessment_validation_1.startAssessmentSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors });
        }
        // Get candidateId from auth
        const candidateId = req.user?.user_id;
        if (!candidateId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        // Call service with all required fields explicitly
        const result = await (0, assessment_service_1.startAssessment)({
            candidateId,
            skillCategory: parsed.data.skillCategory,
            assessmentType: parsed.data.assessmentType,
            difficulty: parsed.data.difficulty,
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
};
exports.startAssessmentController = startAssessmentController;
// Get the next question
const getQuestionController = async (req, res) => {
    const assessmentId = req.params.assessmentId;
    console.log('🔍 Service: getNextQuestion called with ID:', assessmentId);
    try {
        if (!assessmentId) {
            return res.status(400).json({ success: false, error: 'Missing assessmentId' });
        }
        const question = await (0, assessment_service_1.getNextQuestion)(assessmentId);
        if (!question) {
            return res.status(404).json({ success: false, error: 'No more questions or assessment complete' });
        }
        return res.json({ success: true, data: question });
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
};
exports.getQuestionController = getQuestionController;
// Submit an answer
const submitAnswerController = async (req, res) => {
    try {
        // Validate input
        const parsed = assessment_validation_2.submitAnswerSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({ success: false, error: parsed.error.errors });
        }
        const assessmentId = req.params.assessmentId;
        if (!assessmentId) {
            return res.status(400).json({ success: false, error: 'Missing assessmentId' });
        }
        // Call service with all required fields explicitly
        const result = await (0, assessment_service_1.submitAnswer)({
            assessmentId,
            questionId: parsed.data.questionId,
            answer: parsed.data.answer,
            timeTaken: parsed.data.timeTaken,
        });
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
};
exports.submitAnswerController = submitAnswerController;
// Get assessment progress
const getProgressController = async (req, res) => {
    try {
        const assessmentId = req.params.assessmentId;
        if (!assessmentId) {
            return res.status(400).json({ success: false, error: 'Missing assessmentId' });
        }
        const result = await (0, assessment_service_1.getProgress)(assessmentId);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
};
exports.getProgressController = getProgressController;
// Complete the assessment
const completeAssessmentController = async (req, res) => {
    try {
        const assessmentId = req.params.assessmentId;
        if (!assessmentId) {
            return res.status(400).json({ success: false, error: 'Missing assessmentId' });
        }
        const result = await (0, assessment_service_1.completeAssessment)(assessmentId);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
};
exports.completeAssessmentController = completeAssessmentController;
// Get assessment results
const getResultsController = async (req, res) => {
    try {
        const assessmentId = req.params.assessmentId;
        if (!assessmentId) {
            return res.status(400).json({ success: false, error: 'Missing assessmentId' });
        }
        const result = await (0, assessment_service_1.getAssessmentResults)(assessmentId);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
};
exports.getResultsController = getResultsController;
// Get assessment history
const getHistoryController = async (req, res) => {
    try {
        const candidateId = req.user?.user_id;
        if (!candidateId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const result = await (0, assessment_service_1.getAssessmentHistory)(candidateId);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
};
exports.getHistoryController = getHistoryController;
// Get skill recommendations
const getRecommendationsController = async (req, res) => {
    try {
        const candidateId = req.user?.user_id;
        if (!candidateId) {
            return res.status(401).json({ success: false, error: 'Unauthorized' });
        }
        const result = await (0, assessment_service_1.getRecommendations)(candidateId);
        return res.json(result);
    }
    catch (err) {
        return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
    }
};
exports.getRecommendationsController = getRecommendationsController;
