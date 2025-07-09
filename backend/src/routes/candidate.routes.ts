import { Router } from 'express';
import { 
  uploadCVController,
  getProfileSummaryController,
  getProfileCompletenessController,
  generateCareerPredictionController,
  getJobRecommendationsController,
  updateCandidateVectorController,
  getExtractedSkillsController,
  healthCheckController
} from '../controller/candidate.controller';
import { uploadCVMiddleware, handleUploadError } from '../middlewares/uploadCV.middleware';
import { checkAuth } from '../middlewares/checkAuth.middleware';

const router = Router();

// Health check (no auth required)
router.get('/health', healthCheckController);

// All routes below require authentication
router.use(checkAuth);

// ==================== WEEK 1 APIs: AI Profile Builder ====================

/**
 * @route POST /api/v1/candidates/profile-upload
 * @description Upload CV/Resume and trigger AI processing
 * @access Private (Candidate only)
 */
router.post(
  '/profile-upload',
  uploadCVMiddleware,
  handleUploadError,
  uploadCVController
);

/**
 * @route GET /api/v1/candidates/profile-summary
 * @description Get complete candidate profile summary
 * @access Private (Candidate only)
 */
router.get('/profile-summary', getProfileSummaryController);

/**
 * @route GET /api/v1/candidates/profile-summary/:candidateId
 * @description Get specific candidate profile summary (for admin/recruiter)
 * @access Private
 */
router.get('/profile-summary/:candidateId', getProfileSummaryController);

/**
 * @route GET /api/v1/candidates/profile-completeness
 * @description Get profile completeness score and suggestions
 * @access Private (Candidate only)
 */
router.get('/completeness', getProfileCompletenessController);

/**
 * @route GET /api/v1/candidates/completeness/:candidateId
 * @description Get specific candidate profile completeness
 * @access Private
 */
router.get('/completeness/:candidateId', getProfileCompletenessController);

/**
 * @route POST /api/v1/candidates/generate-prediction
 * @description Generate/regenerate AI career prediction
 * @access Private (Candidate only)
 */
router.post('/generate-prediction', generateCareerPredictionController);

/**
 * @route POST /api/v1/candidates/generate-prediction/:candidateId
 * @description Generate career prediction for specific candidate
 * @access Private
 */
router.post('/generate-prediction/:candidateId', generateCareerPredictionController);

/**
 * @route GET /api/v1/candidates/skills
 * @description Get extracted skills from CV
 * @access Private (Candidate only)
 */
router.get('/skills', getExtractedSkillsController);

/**
 * @route GET /api/v1/candidates/skills/:candidateId
 * @description Get extracted skills for specific candidate
 * @access Private
 */
router.get('/skills/:candidateId', getExtractedSkillsController);

// ==================== WEEK 2 APIs: AI Job Matching Engine ====================

/**
 * @route GET /api/v1/candidates/match-jobs
 * @description Get AI-powered job recommendations
 * @access Private (Candidate only)
 * @query limit - Number of recommendations (default: 20)
 */
router.get('/match-jobs', getJobRecommendationsController);

/**
 * @route GET /api/v1/candidates/match-jobs/:candidateId
 * @description Get job recommendations for specific candidate
 * @access Private
 */
router.get('/match-jobs/:candidateId', getJobRecommendationsController);

/**
 * @route POST /api/v1/candidates/update-vector
 * @description Update candidate vector for improved matching
 * @access Private (Candidate only)
 */
router.post('/update-vector', updateCandidateVectorController);

/**
 * @route POST /api/v1/candidates/update-vector/:candidateId
 * @description Update vector for specific candidate
 * @access Private
 */
router.post('/update-vector/:candidateId', updateCandidateVectorController);

// ==================== WEEK 3 APIs: AI Skill Assessment (Optional) ====================

/**
 * @route POST /api/v1/candidates/assess-skill
 * @description Start AI skill assessment
 * @access Private (Candidate only)
 * @todo Implement in Week 3
 */
router.post('/assess-skill', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Skill assessment not implemented yet. Coming in Week 3!'
  });
});

export default router;