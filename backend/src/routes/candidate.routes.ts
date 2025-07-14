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


router.post(
  '/profile-upload',
  uploadCVMiddleware,
  handleUploadError,
  uploadCVController
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

// ==================== WEEK 3 APIs: AI Skill Assessment (Optional) ====================

router.post('/assess-skill', (req, res) => {
  res.status(501).json({
    success: false,
    message: 'Skill assessment not implemented yet. Coming in Week 3!'
  });
});

export default router;