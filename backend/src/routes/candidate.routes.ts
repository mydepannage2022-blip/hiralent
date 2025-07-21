import { Router } from 'express';
import { 
  uploadCVController,
  getProfileSummaryController,
  getProfileCompletenessController,
  generateCareerPredictionController,
  getJobRecommendationsController,
  updateCandidateVectorController,
  getExtractedSkillsController,
  healthCheckController,
  updateLocationHandler,
  updateSalaryHandler
} from '../controller/candidate.controller';
import { uploadCVMiddleware, handleUploadError } from '../middlewares/uploadCV.middleware';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { validateBody } from '../middlewares/validateBody.middleware';
import {
  startAssessmentController,
  getQuestionController,
  submitAnswerController,
  getProgressController,
  completeAssessmentController,
  getResultsController,
  getHistoryController,
  getRecommendationsController
} from '../controller/assessment.controller';
import {
  validateAssessmentOwnership,
  checkAssessmentStatus,
  validateQuestionSubmission,
  validateTimeLimit
} from '../middlewares/assessment.middleware';
import { updateLocationSchema, updateSalarySchema } from '../validation/candidate.schema';
const router = Router();

// Health check (no auth required)
router.get('/health', healthCheckController);

// All routes below require authentication
router.use(checkAuth);


router.post(
  '/profile-upload',
  uploadCVMiddleware,
  handleUploadError,
  uploadCVController
);

router.patch(
  '/update-location',
  [checkAuth, validateBody(updateLocationSchema)],
  updateLocationHandler
);

router.patch(
  '/update-salary',
  [checkAuth, validateBody(updateSalarySchema)],
  updateSalaryHandler
);
router.get('/profile-summary', getProfileSummaryController);

router.get('/profile-summary/:candidateId', getProfileSummaryController);

router.get('/completeness', getProfileCompletenessController);

router.get('/completeness/:candidateId', getProfileCompletenessController);

router.post('/generate-prediction', generateCareerPredictionController);

router.post('/generate-prediction/:candidateId', generateCareerPredictionController);

router.get('/skills', getExtractedSkillsController);

router.get('/skills/:candidateId', getExtractedSkillsController);

// ==================== WEEK 2 APIs: AI Job Matching Engine ====================

router.get('/match-jobs', getJobRecommendationsController);

router.get('/match-jobs/:candidateId', getJobRecommendationsController);

router.post('/update-vector', updateCandidateVectorController);

router.post('/update-vector/:candidateId', updateCandidateVectorController);

// ==================== WEEK 3 APIs: AI Skill Assessment ====================

// Start a new assessment
router.post('/start-assessment', startAssessmentController);

// Get next question (adaptive)
router.get('/assessment/:assessmentId/question', validateAssessmentOwnership, checkAssessmentStatus, getQuestionController);

// Submit answer
router.post('/assessment/:assessmentId/answer', validateAssessmentOwnership, checkAssessmentStatus, validateQuestionSubmission, validateTimeLimit, submitAnswerController);

// Get assessment progress
router.get('/assessment/:assessmentId/progress', validateAssessmentOwnership, getProgressController);

// Complete assessment
router.post('/assessment/:assessmentId/complete', validateAssessmentOwnership, checkAssessmentStatus, completeAssessmentController);

// Get assessment results
router.get('/assessment/:assessmentId/results', validateAssessmentOwnership, getResultsController);

// Get assessment history
router.get('/assessments/history', getHistoryController);

// Get skill recommendations
router.get('/skill-recommendations', getRecommendationsController);

export default router;