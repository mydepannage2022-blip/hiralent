import { Request, Response } from 'express';
import { AssessmentService } from '../services/assessment.service';
import { startAssessmentSchema } from '../validation/assessment.validation';

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
    // Call service
    const result = await assessmentService.startAssessment({
      ...parsed.data,
      candidateId,
    });
    return res.json(result);
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Internal server error' });
  }
};

// Get the next question
export const getQuestionController = async (req: Request, res: Response) => {
  // TODO: Validate input, call assessmentService.getNextQuestion, return response
};

// Submit an answer
export const submitAnswerController = async (req: Request, res: Response) => {
  // TODO: Validate input, call assessmentService.submitAnswer, return response
};

// Get assessment progress
export const getProgressController = async (req: Request, res: Response) => {
  // TODO: Fetch and return assessment progress
};

// Complete the assessment
export const completeAssessmentController = async (req: Request, res: Response) => {
  // TODO: Mark assessment as completed, return summary
};

// Get assessment results
export const getResultsController = async (req: Request, res: Response) => {
  // TODO: Fetch and return assessment results
};

// Get assessment history
export const getHistoryController = async (req: Request, res: Response) => {
  // TODO: Fetch and return assessment history
};

// Get skill recommendations
export const getRecommendationsController = async (req: Request, res: Response) => {
  // TODO: Fetch and return skill recommendations
};