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
  updateSalaryHandler,
  uploadProfilePictureController,
  updateHeadlineController,
  getHeadlineController,
  getProfileController,
  getPublicProfileController,
} from '../controller/candidate.controller';

import {
  updateBasicInfoController,
  updateSkillsController,
  addSkillController,
  deleteSkillController,
  updateExperienceController,
  addExperienceController,
  updateEducationController,
  addEducationController,
  updateLinksController,
  addLinkController,
  deleteLinkController,
  updateJobBenefitsController,
  bulkUpdateProfileController,
  uploadApplicationResumeController
} from '../controller/candidate/profile.controller';

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
  getRecommendationsController,
} from '../controller/candidate/assessment.controller';
import {
  validateAssessmentOwnership,
  checkAssessmentStatus,
  validateQuestionSubmission,
  validateTimeLimit
} from '../middlewares/assessment.middleware';
import { 
  uploadImageMiddleware, 
  handleImageUploadError, 
  validateUploadedImage 
} from '../middlewares/uploadImage.middleware';

import { 
  updateLocationSchema, 
  updateSalarySchema, 
  updateHeadlineSchema,
  updateBasicInfoSchema,
  updateSkillsSchema,
  addSkillSchema,
  updateExperienceSchema,
  addExperienceSchema,
  updateEducationSchema,
  addEducationSchema,
  updateLinksSchema,
  socialLinkSchema,
  updateJobBenefitsSchema,
  bulkProfileUpdateSchema
} from '../validation/candidate.schema';
import { startAssessmentSchema } from '../validation/assessment.validation';

const router = Router();

router.get('/health', healthCheckController);
// public profile 
router.get('/public-profile/:candidateId', getPublicProfileController);

router.use(checkAuth);

router.post(
  '/profile-upload',
  uploadCVMiddleware,
  handleUploadError,
  uploadCVController
);

router.patch(
  '/update-location',
  (req, res, next) => {
    console.log("🟢 Raw Body Received:", req.body);
    next();
  },
  [checkAuth, validateBody(updateLocationSchema)],
  updateLocationHandler
);

router.patch(
  '/update-salary',
  [checkAuth, validateBody(updateSalarySchema)],
  updateSalaryHandler
);

router.post(
  '/profile-picture-upload',
  uploadImageMiddleware,
  handleImageUploadError,
  validateUploadedImage,
  uploadProfilePictureController
);

router.patch(
  '/update-headline',
  [checkAuth, validateBody(updateHeadlineSchema)],
  updateHeadlineController
);

router.get('/headline', getHeadlineController);

router.get('/headline/:candidateId', getHeadlineController);

router.get('/profile-summary', getProfileSummaryController);

router.get('/profile-summary/:candidateId', getProfileSummaryController);

router.get('/profile', checkAuth, getProfileController);

router.get('/completeness', getProfileCompletenessController);

router.get('/completeness/:candidateId', getProfileCompletenessController);

router.post('/generate-prediction', generateCareerPredictionController);

router.post('/generate-prediction/:candidateId', generateCareerPredictionController);

router.get('/skills', getExtractedSkillsController);

router.get('/skills/:candidateId', getExtractedSkillsController);


router.get('/match-jobs', getJobRecommendationsController);

router.get('/match-jobs/:candidateId', getJobRecommendationsController);

router.post('/update-vector', updateCandidateVectorController);

router.post('/update-vector/:candidateId', updateCandidateVectorController);

router.post('/start-assessment', [checkAuth, validateBody(startAssessmentSchema)], startAssessmentController);

router.get('/assessment/:assessmentId/question',
  checkAuth, 
  validateAssessmentOwnership, 
  checkAssessmentStatus,
  getQuestionController
);

router.post('/assessment/:assessmentId/answer', checkAuth, validateAssessmentOwnership, checkAssessmentStatus, validateQuestionSubmission, validateTimeLimit, submitAnswerController);

router.get('/assessment/:assessmentId/progress', checkAuth, validateAssessmentOwnership, getProgressController);

router.post('/assessment/:assessmentId/complete', checkAuth, validateAssessmentOwnership, checkAssessmentStatus, completeAssessmentController);

router.get('/assessment/:assessmentId/results', checkAuth, validateAssessmentOwnership, getResultsController);

router.get('/assessments/history', checkAuth, getHistoryController);

router.get('/skill-recommendations', checkAuth, getRecommendationsController);

router.get('/public-profile/:candidateId', getPublicProfileController);

router.put(
  '/profile/basic-info',
  [checkAuth, validateBody(updateBasicInfoSchema)],
  updateBasicInfoController
);

router.put(
  '/profile/skills',
  [checkAuth, validateBody(updateSkillsSchema)],
  updateSkillsController
);

router.post(
  '/profile/skills',
  [checkAuth, validateBody(addSkillSchema)],
  addSkillController
);

router.delete(
  '/profile/skills/:skillId',
  checkAuth,
  deleteSkillController
);

router.put(
  '/profile/experience',
  [checkAuth, validateBody(updateExperienceSchema)],
  updateExperienceController
);

router.post(
  '/profile/experience',
  [checkAuth, validateBody(addExperienceSchema)],
  addExperienceController
);

// Education Management
router.put(
  '/profile/education',
  [checkAuth, validateBody(updateEducationSchema)],
  updateEducationController
);

router.post(
  '/profile/education',
  [checkAuth, validateBody(addEducationSchema)],
  addEducationController
);

// Social Links Management
router.put(
  '/profile/links',
  [checkAuth, validateBody(updateLinksSchema)],
  updateLinksController
);

router.post(
  '/profile/links',
  [checkAuth, validateBody(socialLinkSchema)],
  addLinkController
);

router.delete(
  '/profile/links/:index',
  checkAuth,
  deleteLinkController
);

// Job Benefits Management
router.put(
  '/profile/job-benefits',
  [checkAuth, validateBody(updateJobBenefitsSchema)],
  updateJobBenefitsController
);

// Bulk Profile Update
router.put(
  '/profile/bulk',
  [checkAuth, validateBody(bulkProfileUpdateSchema)],
  bulkUpdateProfileController
);

router.post(
  '/application-resume',
  uploadCVMiddleware, // Uses same middleware as profile-upload (handles file validation)
  handleUploadError,  // Handles multer errors
  uploadApplicationResumeController
);


export default router;





/*
==================== COMPLETE API ENDPOINTS SUMMARY ====================

EXISTING CANDIDATE ROUTES (13):
GET    /health                     - Health check
POST   /profile-upload             - Upload CV/Resume  
PATCH  /update-location            - Update location
PATCH  /update-salary              - Update salary
POST   /profile-picture-upload     - Upload profile picture
PATCH  /update-headline            - Update headline
GET    /headline                   - Get headline
GET    /profile-summary            - Get profile summary
GET    /completeness               - Get profile completeness
POST   /generate-prediction        - Generate career prediction
GET    /skills                     - Get extracted skills
GET    /match-jobs                 - Get job recommendations
POST   /update-vector              - Update candidate vector

ASSESSMENT ROUTES (7):
POST   /start-assessment           - Start new assessment
GET    /assessment/:id/question    - Get next question
POST   /assessment/:id/answer      - Submit answer
GET    /assessment/:id/progress    - Get progress
POST   /assessment/:id/complete    - Complete assessment
GET    /assessment/:id/results     - Get results
GET    /assessments/history        - Get history
GET    /skill-recommendations      - Get recommendations

NEW PROFILE MANAGEMENT ROUTES (11):
PUT    /profile/basic-info         - Update basic info (name, phone, email, about_me, city)
PUT    /profile/skills             - Bulk update skills
POST   /profile/skills             - Add single skill
DELETE /profile/skills/:skillId    - Delete specific skill
PUT    /profile/experience         - Bulk update experience
POST   /profile/experience         - Add single experience
PUT    /profile/education          - Bulk update education
POST   /profile/education          - Add single education
PUT    /profile/links              - Bulk update social links
POST   /profile/links              - Add single social link
DELETE /profile/links/:index       - Delete link by index
PUT    /profile/job-benefits       - Update job benefits preferences
PUT    /profile/bulk               - Bulk update multiple sections

TOTAL: 31 API ENDPOINTS
*/
