import { Router } from 'express';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { uploadVideo } from '../middlewares/uploadVideo.middleware';
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
  uploadVideoController,
  getVideoUrlController,
  streamVideoController,
} from '../controller/interview/aiInterview.controller';

const router = Router();

// All other routes require authentication via header
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

// Upload interview video recording (candidate)
// POST /api/v1/interviews/:interviewId/upload-video
router.post('/:interviewId/upload-video', uploadVideo.single('video'), uploadVideoController);

// Get signed URL for video playback (recruiter only)
// GET /api/v1/interviews/:interviewId/video-url
router.get('/:interviewId/video-url', getVideoUrlController);

// Get interview status (limited info for candidates)
// GET /api/v1/interviews/:interviewId
router.get('/:interviewId', getInterviewController);

// ==================== Admin/Recruiter Routes ====================

// Get full interview details (scores, analysis, etc.)
// GET /api/v1/interviews/:interviewId/details
// Note: Access restricted to admins/recruiters in controller
router.get('/:interviewId/details', getInterviewDetailsController);

// Stream video - with checkAuth middleware (uses Authorization header)
// GET /api/v1/interviews/:interviewId/video-stream
router.get('/:interviewId/video-stream', streamVideoController);

export default router;
