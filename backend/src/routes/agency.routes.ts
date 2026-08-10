import { Router } from "express";
import { applyAsAgency, getApplicationStatus } from "../controller/agency/agency.controller";
import { getDashboardStats, getRecentActivities, getAnalytics } from "../controller/agency/agency.dashboard.controller";
import { checkAuth } from "../middlewares/checkAuth.middleware"; 
import { createCase, listCases, getCaseById, getClients, updateCase } from "../controller/agency/agency.case.controller";
import { getProfile, updateProfile } from "../controller/agency/agency.profile.controller";
import {
  changePassword,
  toggle2FA,
  getNotifications,
  exportData,
  getSettings
} from "../controller/agency/agency.settings.controller";
import { reviewDocument, getCaseDocuments } from "../controller/agency/agency.document.controller";
import {
  submitToEmbassy,
  updateEmbassyStatus,
  scheduleInterview,
  getEmbassySubmission,
} from "../controller/agency/agency.embassy.controller";
import {
  updateHousingDetails,
  updateUtilityStatus,
  updateArrivalDetails,
  markReadyForArrival,
} from "../controller/agency/agency.housing.controller";
import { searchCandidatesController } from "../controller/agency/agency.candidate.controller";
import {
  bootstrapIntegrationServices,
  getIntegrationServicesForCase,
  updateIntegrationService,
} from "../controller/agency/agency.integration.controller";

const router = Router();

// Public routes (no auth required)
router.post("/apply", applyAsAgency);
router.get("/application/:id", getApplicationStatus);

// Protected routes (require auth)
router.get("/dashboard/stats", checkAuth, getDashboardStats);
router.get("/dashboard/activities", checkAuth, getRecentActivities);
router.get("/dashboard/analytics", checkAuth, getAnalytics);

// Candidate Search Route 
router.get("/candidates/search", checkAuth, searchCandidatesController);

// Case Management Routes
router.post("/cases", checkAuth, createCase);
router.get("/cases", checkAuth, listCases);
router.get("/cases/:id", checkAuth, getCaseById);
router.put("/cases/:id", checkAuth, updateCase);
router.get("/clients", checkAuth, getClients);

// Profile Routes
router.get("/profile", checkAuth, getProfile);
router.put("/profile", checkAuth, updateProfile);

// Settings Routes
router.get("/settings", checkAuth, getSettings);
router.put("/settings/password", checkAuth, changePassword);
router.put("/settings/2fa", checkAuth, toggle2FA);
router.get("/settings/notifications", checkAuth, getNotifications);
// Notification-preference persistence moved to the role-neutral
// PUT /api/v1/notification-preferences (see notificationPreferences.routes).
router.get("/settings/export-data", checkAuth, exportData);

// Document Review Routes
router.get("/cases/:id/documents", checkAuth, getCaseDocuments);
router.put("/cases/:id/documents/:documentId/review", checkAuth, reviewDocument);

// ==================== EMBASSY SUBMISSION ROUTES ====================
// Submit case to embassy
router.post("/cases/:id/embassy/submit", checkAuth, submitToEmbassy);
// Get embassy submission details
router.get("/cases/:id/embassy", checkAuth, getEmbassySubmission);
// Update embassy status
router.put("/cases/:id/embassy/status", checkAuth, updateEmbassyStatus);
// Schedule interview
router.post("/cases/:id/embassy/interview", checkAuth, scheduleInterview);

// Housing management routes
router.put("/cases/:caseId/housing", checkAuth, updateHousingDetails);
router.put("/cases/:caseId/utilities", checkAuth, updateUtilityStatus);
router.put("/cases/:caseId/arrival", checkAuth, updateArrivalDetails);
router.put("/cases/:caseId/ready-for-arrival", checkAuth, markReadyForArrival);

// Integration services (integration agency)
router.get("/cases/:caseId/integration-services", checkAuth, getIntegrationServicesForCase);
router.post("/cases/:caseId/integration-services/bootstrap", checkAuth, bootstrapIntegrationServices);
router.put(
  "/cases/:caseId/integration-services/:serviceId",
  checkAuth,
  updateIntegrationService
);

export default router;