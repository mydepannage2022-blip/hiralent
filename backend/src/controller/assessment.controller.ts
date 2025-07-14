import { Request, Response } from 'express';
import { AssessmentService } from '../services/assessment.service';
import { startAssessmentSchema } from '../validation/assessment.validation';
import { submitAnswerSchema } from '../validation/assessment.validation';

const assessmentService = new AssessmentService();

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
    const result = await assessmentService.startAssessment({
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
  try {
    const assessmentId = req.params.assessmentId;
    if (!assessmentId) {
      return res.status(400).json({ success: false, error: 'Missing assessmentId' });
    }
    const question = await assessmentService.getNextQuestion(assessmentId);
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
    const result = await assessmentService.submitAnswer({
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
    const result = await assessmentService.getProgress(assessmentId);
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
    const result = await assessmentService.completeAssessment(assessmentId);
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
    const result = await assessmentService.getAssessmentResults(assessmentId);
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
    const result = await assessmentService.getAssessmentHistory(candidateId);
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
    const result = await assessmentService.getRecommendations(candidateId);
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};