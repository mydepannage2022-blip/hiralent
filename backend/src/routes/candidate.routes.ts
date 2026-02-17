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
  uploadApplicationResumeController,
  updateProjectsController,
  getLanguagesController,
  updateLanguagesController,
  addLanguageController,
  deleteLanguageController,
  updateLanguageAtIndexController,
} from '../controller/candidate/profile.controller';
import { bulkCertificationsSchema, addCertificationSchema } from "../validation/certification.schema";

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
  bulkProfileUpdateSchema,
  updateProjectsSchema,
  updateLanguagesSchema,
  addLanguageSchema,
  updateLanguageAtIndexSchema,

} from '../validation/candidate.schema';
import { startAssessmentSchema } from '../validation/assessment.validation';

import {
  getCandidateCases,
  getCaseById,
  uploadCaseDocument,
  getCaseDocuments,
  deleteCaseDocument,
  confirmDocumentReplacement,  
  cancelDocumentReplacement,
} from '../controller/candidate/candidate.case.controller';
import { uploadDocumentMiddleware, handleDocumentUploadError } from '../middlewares/upload.middleware';

import {
  browseAgenciesController,
  assignAgencyToCase,
  browseIntegrationAgenciesController,      
  assignIntegrationAgencyToCase,             
  getIntegrationServicesController
} from '../controller/candidate/candidate.agency.controller';

// scoring / badges / certifications / autofill controllers
import {
  calculateScoreController,
  getScoreController,
  getScoreHistoryController,
} from '../controller/candidate/profile/scoring.controller';

import {
  evaluateBadgesController,
  listBadgesController,
  debugBadgeCriteriaController
} from '../controller/candidate/profile/badge.controller';

import {
  addCertificationController,
  listCertificationsController,
  deleteCertificationController,
  bulkUpsertCertificationsController,
} from '../controller/candidate/profile/certification.controller';

import {
  createAutofillPreviewController,
  confirmAutofillMappingController,
  applyAutofillController,
} from '../controller/candidate/profile/autofill.controller';
import {
  createConversationController,
  listConversationsController,
  listConversationMessagesController,
  renameConversationController,
  sendChatMessageController,
  getSuggestedQuestionsController,
} from "../controller/candidate/ai-chatbot.controller";
import { sendMessageSchema } from '../validation/chatbot.schema';

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

//Projects data
router.put(
  '/profile/projects',
  [checkAuth, validateBody(updateProjectsSchema)],
  updateProjectsController
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
router.get('/profile/badges/debug', checkAuth, debugBadgeCriteriaController);

// View all cases for candidate
router.get('/cases', checkAuth, getCandidateCases);

// View single case details
router.get('/cases/:caseId', checkAuth, getCaseById);

// Upload document for a case
router.post(
  '/cases/:caseId/documents',
  checkAuth,
  uploadDocumentMiddleware,
  handleDocumentUploadError,
  uploadCaseDocument
);

// Get all documents for a case
router.get('/cases/:caseId/documents', checkAuth, getCaseDocuments);

// Delete a document
router.delete('/cases/:caseId/documents/:documentId', checkAuth, deleteCaseDocument);

router.post(
  '/cases/:caseId/documents/confirm-replacement',
  checkAuth,
  confirmDocumentReplacement
);

// Cancel document replacement (delete new document)
router.delete(
  '/cases/:caseId/documents/:documentId/cancel',
  checkAuth,
  cancelDocumentReplacement
);

// Browse available agencies for selection
router.get(
  '/agencies/browse',
  checkAuth,
  browseAgenciesController
);

// Assign housing agency to case (candidate selection)
router.post(
  '/cases/:caseId/assign-agency',
  checkAuth,
  assignAgencyToCase
);

// Assign integration agency to case
router.post(
  '/cases/:caseId/assign-integration-agency',
  checkAuth,
  assignIntegrationAgencyToCase
);

// Get integration services for a case
router.get(
  '/cases/:caseId/integration-services',
  checkAuth,
  getIntegrationServicesController
);



// ============================
// PROFILE SCORING ROUTES
// ============================

// Get current score (cached)
router.get('/profile/score', checkAuth, getScoreController);

// Recalculate score now
router.post('/profile/score/recalculate', checkAuth, calculateScoreController);

// Score history
router.get('/profile/score/history', checkAuth, getScoreHistoryController);

// ============================
// BADGES ROUTES
// ============================

// List all badges + earned status
router.get('/profile/badges', checkAuth, listBadgesController);

// Force evaluate + award/revoke badges
router.post('/profile/badges/evaluate', checkAuth, evaluateBadgesController);

// ============================
// CERTIFICATIONS ROUTES
// ============================

// List
router.get("/profile/certifications", checkAuth, listCertificationsController);

// Add single
router.post(
  "/profile/certifications",
  checkAuth,
  validateBody(addCertificationSchema),
  addCertificationController
);

// ✅ Bulk save (matches your UI Save button)
router.put(
  "/profile/certifications",
  checkAuth,
  validateBody(bulkCertificationsSchema),
  bulkUpsertCertificationsController
);

// Delete
router.delete("/profile/certifications/:certificationId", checkAuth, deleteCertificationController);

// ============================
// AUTOFILL ROUTES
// ============================

// Create autofill preview session (requires document_id in body)
router.post('/profile/autofill/preview', checkAuth, createAutofillPreviewController);

// Confirm mapping (session_id + mapping_id + confirmed_value?)
router.post('/profile/autofill/confirm', checkAuth, confirmAutofillMappingController);

// Apply confirmed fields (session_id)
router.post('/profile/autofill/apply', checkAuth, applyAutofillController);



// ============================
// LANGUAGES ROUTES
// ============================

router.get("/profile/languages", checkAuth, getLanguagesController);

router.put(
  "/profile/languages",
  [checkAuth, validateBody(updateLanguagesSchema)],
  updateLanguagesController
);

router.post(
  "/profile/languages",
  [checkAuth, validateBody(addLanguageSchema)],
  addLanguageController
);

router.delete("/profile/languages/:index", checkAuth, deleteLanguageController);

// optional PATCH
router.patch(
  "/profile/languages/:index",
  [checkAuth, validateBody(updateLanguageAtIndexSchema)],
  updateLanguageAtIndexController
);


// ============================
// AI CHATBOT ROUTES
// ============================

// Create new conversation (New chat)
router.post("/chatbot/conversations", checkAuth, createConversationController);

// List conversations (History list)
router.get("/chatbot/conversations", checkAuth, listConversationsController);

// List messages of one conversation
router.get(
  "/chatbot/conversations/:conversationId/messages",
  checkAuth,
  listConversationMessagesController
);

// Optional rename
router.patch(
  "/chatbot/conversations/:conversationId",
  checkAuth,
  renameConversationController
);

// Send message (requires conversation_id)
router.post(
  "/chatbot/message",
  [checkAuth, validateBody(sendMessageSchema)],
  sendChatMessageController
);

// Suggestions
router.get("/chatbot/suggestions", checkAuth, getSuggestedQuestionsController);



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



PROFILE INTELLIGENCE ROUTES (10):
GET    /profile/score                    - Get current candidate score
POST   /profile/score/recalculate        - Calculate + persist candidate score
GET    /profile/score/history            - Get score history
GET    /profile/badges                   - List badges + earned status
POST   /profile/badges/evaluate          - Evaluate + award/revoke badges
GET    /profile/certifications           - List certifications
POST   /profile/certifications           - Add certification
DELETE /profile/certifications/:id       - Delete certification
POST   /profile/autofill/preview         - Create autofill preview session
POST   /profile/autofill/confirm         - Confirm a mapping field
POST   /profile/autofill/apply           - Apply confirmed fields to profile

TOTAL: 31 API ENDPOINTS
*/
