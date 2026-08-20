import { Router } from 'express';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { requireQuota } from '../middlewares/entitlements.middleware';
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
  logViolationController,
  synthesizeTTSController,
  synthesizeTTSFallbackController,
  submitResponseStreamController,
} from '../controller/interview/aiInterview.controller';

const router = Router();

// All other routes require authentication via header
router.use(checkAuth);

// ==================== Recruiter Routes ====================
// Note: These routes must come BEFORE parameterized routes to avoid conflicts

// Text-to-speech proxy (returns audio/mpeg, used to mix AI voice into recording)
// POST /api/v1/interviews/tts
router.post('/tts', synthesizeTTSController);
// POST /api/v1/interviews/tts/fallback (Google Translate, used when Unreal Speech fails)
router.post('/tts/fallback', synthesizeTTSFallbackController);

// Assign an interview to a candidate (recruiter only)
// POST /api/v1/interviews/assign
router.post('/assign', requireQuota('ai_interviews'), assignInterviewController);

// Get all interviews for the company (recruiter view)
// GET /api/v1/interviews/company
router.get('/company', getCompanyInterviewsController);

// ==================== Candidate Routes ====================

// Get all my assigned interviews (candidate view)
// GET /api/v1/interviews/my
router.get('/my', getMyInterviewsController);

// Create a new AI interview (internal/legacy - prefer /assign for recruiter flow)
// POST /api/v1/interviews
// Deliberately NOT quota-gated: `createInterviewController` treats the CALLER as the candidate
// (`candidateId = req.user.user_id`), so the company allowance is not this caller's to spend and
// a candidate has no billing account to charge it to. The metered recruiter action is /assign.
router.post('/', createInterviewController);

// Start an interview (generates questions, returns first question)
// POST /api/v1/interviews/:interviewId/start
router.post('/:interviewId/start', startInterviewController);

// Submit a response to current question
// POST /api/v1/interviews/:interviewId/respond
router.post('/:interviewId/respond', submitResponseController);

// Submit a response with SSE streaming (streams next question text in real-time)
// POST /api/v1/interviews/:interviewId/respond-stream
router.post('/:interviewId/respond-stream', submitResponseStreamController);

// End the interview and get completion status
// POST /api/v1/interviews/:interviewId/end
router.post('/:interviewId/end', endInterviewController);

// Log a face detection violation (proctoring)
// POST /api/v1/interviews/:interviewId/log-violation
router.post('/:interviewId/log-violation', logViolationController);

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
