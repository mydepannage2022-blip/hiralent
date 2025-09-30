"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const candidate_controller_1 = require("../controller/candidate.controller");
// Profile Management Controllers
const profile_controller_1 = require("../controller/candidate/profile.controller");
const uploadCV_middleware_1 = require("../middlewares/uploadCV.middleware");
const checkAuth_middleware_1 = require("../middlewares/checkAuth.middleware");
const validateBody_middleware_1 = require("../middlewares/validateBody.middleware");
const assessment_controller_1 = require("../controller/candidate/assessment.controller");
const assessment_middleware_1 = require("../middlewares/assessment.middleware");
const uploadImage_middleware_1 = require("../middlewares/uploadImage.middleware");
// Validation Schemas
const candidate_schema_1 = require("../validation/candidate.schema");
const assessment_validation_1 = require("../validation/assessment.validation");
const router = (0, express_1.Router)();
// Health check (no auth required)
router.get('/health', candidate_controller_1.healthCheckController);
// All routes below require authentication
router.use(checkAuth_middleware_1.checkAuth);
// ==================== EXISTING CANDIDATE ROUTES ====================
router.post('/profile-upload', uploadCV_middleware_1.uploadCVMiddleware, uploadCV_middleware_1.handleUploadError, candidate_controller_1.uploadCVController);
router.patch('/update-location', (req, res, next) => {
    console.log("🟢 Raw Body Received:", req.body);
    next();
}, [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.updateLocationSchema)], candidate_controller_1.updateLocationHandler);
router.patch('/update-salary', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.updateSalarySchema)], candidate_controller_1.updateSalaryHandler);
router.post('/profile-picture-upload', uploadImage_middleware_1.uploadImageMiddleware, uploadImage_middleware_1.handleImageUploadError, uploadImage_middleware_1.validateUploadedImage, candidate_controller_1.uploadProfilePictureController);
router.patch('/update-headline', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.updateHeadlineSchema)], candidate_controller_1.updateHeadlineController);
// Get candidate headline
router.get('/headline', candidate_controller_1.getHeadlineController);
// Get headline for specific candidate (admin/company use)
router.get('/headline/:candidateId', candidate_controller_1.getHeadlineController);
router.get('/profile-summary', candidate_controller_1.getProfileSummaryController);
router.get('/profile-summary/:candidateId', candidate_controller_1.getProfileSummaryController);
router.get('/profile', checkAuth_middleware_1.checkAuth, candidate_controller_1.getProfileController);
router.get('/completeness', candidate_controller_1.getProfileCompletenessController);
router.get('/completeness/:candidateId', candidate_controller_1.getProfileCompletenessController);
router.post('/generate-prediction', candidate_controller_1.generateCareerPredictionController);
router.post('/generate-prediction/:candidateId', candidate_controller_1.generateCareerPredictionController);
router.get('/skills', candidate_controller_1.getExtractedSkillsController);
router.get('/skills/:candidateId', candidate_controller_1.getExtractedSkillsController);
router.get('/match-jobs', candidate_controller_1.getJobRecommendationsController);
router.get('/match-jobs/:candidateId', candidate_controller_1.getJobRecommendationsController);
router.post('/update-vector', candidate_controller_1.updateCandidateVectorController);
router.post('/update-vector/:candidateId', candidate_controller_1.updateCandidateVectorController);
// ==================== ASSESSMENT ROUTES ====================
router.post('/start-assessment', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(assessment_validation_1.startAssessmentSchema)], assessment_controller_1.startAssessmentController);
// router.get('/assessment/:assessmentId/question', checkAuth, validateAssessmentOwnership, checkAssessmentStatus, getQuestionController);
router.get('/assessment/:assessmentId/question', checkAuth_middleware_1.checkAuth, assessment_middleware_1.validateAssessmentOwnership, assessment_middleware_1.checkAssessmentStatus, assessment_controller_1.getQuestionController);
router.post('/assessment/:assessmentId/answer', checkAuth_middleware_1.checkAuth, assessment_middleware_1.validateAssessmentOwnership, assessment_middleware_1.checkAssessmentStatus, assessment_middleware_1.validateQuestionSubmission, assessment_middleware_1.validateTimeLimit, assessment_controller_1.submitAnswerController);
router.get('/assessment/:assessmentId/progress', assessment_middleware_1.validateAssessmentOwnership, assessment_controller_1.getProgressController);
router.post('/assessment/:assessmentId/complete', assessment_middleware_1.validateAssessmentOwnership, assessment_middleware_1.checkAssessmentStatus, assessment_controller_1.completeAssessmentController);
router.get('/assessment/:assessmentId/results', assessment_middleware_1.validateAssessmentOwnership, assessment_controller_1.getResultsController);
router.get('/assessments/history', assessment_controller_1.getHistoryController);
router.get('/skill-recommendations', assessment_controller_1.getRecommendationsController);
router.put('/profile/basic-info', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.updateBasicInfoSchema)], profile_controller_1.updateBasicInfoController);
router.put('/profile/skills', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.updateSkillsSchema)], profile_controller_1.updateSkillsController);
router.post('/profile/skills', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.addSkillSchema)], profile_controller_1.addSkillController);
router.delete('/profile/skills/:skillId', checkAuth_middleware_1.checkAuth, profile_controller_1.deleteSkillController);
router.put('/profile/experience', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.updateExperienceSchema)], profile_controller_1.updateExperienceController);
router.post('/profile/experience', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.addExperienceSchema)], profile_controller_1.addExperienceController);
// Education Management
router.put('/profile/education', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.updateEducationSchema)], profile_controller_1.updateEducationController);
router.post('/profile/education', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.addEducationSchema)], profile_controller_1.addEducationController);
// Social Links Management
router.put('/profile/links', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.updateLinksSchema)], profile_controller_1.updateLinksController);
router.post('/profile/links', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.socialLinkSchema)], profile_controller_1.addLinkController);
router.delete('/profile/links/:index', checkAuth_middleware_1.checkAuth, profile_controller_1.deleteLinkController);
// Job Benefits Management
router.put('/profile/job-benefits', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.updateJobBenefitsSchema)], profile_controller_1.updateJobBenefitsController);
// Bulk Profile Update
router.put('/profile/bulk', [checkAuth_middleware_1.checkAuth, (0, validateBody_middleware_1.validateBody)(candidate_schema_1.bulkProfileUpdateSchema)], profile_controller_1.bulkUpdateProfileController);
router.post('/application-resume', uploadCV_middleware_1.uploadCVMiddleware, // Uses same middleware as profile-upload (handles file validation)
uploadCV_middleware_1.handleUploadError, // Handles multer errors
profile_controller_1.uploadApplicationResumeController);
exports.default = router;
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
