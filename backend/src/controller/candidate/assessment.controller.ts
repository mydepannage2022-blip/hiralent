import { Request, Response } from 'express';
import {
  startAssessment,
  getNextQuestion,
  submitAnswer,
  getProgress,
  completeAssessment,
  getAssessmentResults,
  getAssessmentHistory,
  getRecommendations
} from '../../services/candidate/assessment.service';
import { startAssessmentSchema } from '../../validation/assessment.validation';
import { submitAnswerSchema } from '../../validation/assessment.validation';

// Start a new assessment
export const startAssessmentController = async (req: Request, res: Response) => {
  try {
    // Validate input
    const parsed = startAssessmentSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors });
    }
    // Get candidateId from auth
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    // Call service with all required fields explicitly
    const result = await startAssessment({
      candidateId,
      skillCategory: parsed.data.skillCategory,
      assessmentType: parsed.data.assessmentType,
      difficulty: parsed.data.difficulty,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// Get the next question
export const getQuestionController = async (req: Request, res: Response) => {
  const assessmentId = req.params.assessmentId;
  console.log('🔍 Service: getNextQuestion called with ID:', assessmentId);
  try {    
    if (!assessmentId) {
      return res.status(400).json({ success: false, error: 'Missing assessmentId' });
    }
    const question = await getNextQuestion(assessmentId);
    if (!question) {
      return res.status(404).json({ success: false, error: 'No more questions or assessment complete' });
    }
    return res.json({ success: true, data: question });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// Submit an answer
export const submitAnswerController = async (req: Request, res: Response) => {
  try {
    // Validate input
    const parsed = submitAnswerSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ success: false, error: parsed.error.errors });
    }
    const assessmentId = req.params.assessmentId;
    if (!assessmentId) {
      return res.status(400).json({ success: false, error: 'Missing assessmentId' });
    }
    // Call service with all required fields explicitly
    const result = await submitAnswer({
      assessmentId,
      questionId: parsed.data.questionId,
      answer: parsed.data.answer,
      timeTaken: parsed.data.timeTaken,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// Get assessment progress
export const getProgressController = async (req: Request, res: Response) => {
  try {
    const assessmentId = req.params.assessmentId;
    if (!assessmentId) {
      return res.status(400).json({ success: false, error: 'Missing assessmentId' });
    }
    const result = await getProgress(assessmentId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// Complete the assessment
export const completeAssessmentController = async (req: Request, res: Response) => {
  try {
    const assessmentId = req.params.assessmentId;
    if (!assessmentId) {
      return res.status(400).json({ success: false, error: 'Missing assessmentId' });
    }
    const result = await completeAssessment(assessmentId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// Get assessment results
export const getResultsController = async (req: Request, res: Response) => {
  try {
    const assessmentId = req.params.assessmentId;
    if (!assessmentId) {
      return res.status(400).json({ success: false, error: 'Missing assessmentId' });
    }
    const result = await getAssessmentResults(assessmentId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// Get assessment history
export const getHistoryController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = await getAssessmentHistory(candidateId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// Get skill recommendations
export const getRecommendationsController = async (req: Request, res: Response) => {
  try {
    const candidateId = req.user?.user_id;
    if (!candidateId) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }
    const result = await getRecommendations(candidateId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};
