import { Router } from 'express';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import {
  createInterviewController,
  assignInterviewController,
  startInterviewController,
  submitResponseController,
  endInterviewController,
  getInterviewController,
  getInterviewDetailsController,
  getCompanyInterviewsController,
  getMyInterviewsController,
} from '../controller/interview/aiInterview.controller';

const router = Router();

// All routes require authentication
router.use(checkAuth);

// ==================== Recruiter Routes ====================
// Note: These routes must come BEFORE parameterized routes to avoid conflicts

// Assign an interview to a candidate (recruiter only)
// POST /api/v1/interviews/assign
router.post('/assign', assignInterviewController);

// Get all interviews for the company (recruiter view)
// GET /api/v1/interviews/company
router.get('/company', getCompanyInterviewsController);

// ==================== Candidate Routes ====================

// Get all my assigned interviews (candidate view)
// GET /api/v1/interviews/my
router.get('/my', getMyInterviewsController);

// Create a new AI interview (internal/legacy - prefer /assign for recruiter flow)
// POST /api/v1/interviews
router.post('/', createInterviewController);

// Start an interview (generates questions, returns first question)
// POST /api/v1/interviews/:interviewId/start
router.post('/:interviewId/start', startInterviewController);

// Submit a response to current question
// POST /api/v1/interviews/:interviewId/respond
router.post('/:interviewId/respond', submitResponseController);

// End the interview and get completion status
// POST /api/v1/interviews/:interviewId/end
router.post('/:interviewId/end', endInterviewController);

// Get interview status (limited info for candidates)
// GET /api/v1/interviews/:interviewId
router.get('/:interviewId', getInterviewController);

// ==================== Admin/Recruiter Routes ====================

// Get full interview details (scores, analysis, etc.)
// GET /api/v1/interviews/:interviewId/details
// Note: Access restricted to admins/recruiters in controller
router.get('/:interviewId/details', getInterviewDetailsController);

export default router;
