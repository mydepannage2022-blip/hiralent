import { Router } from "express";
import { applyAsAgency, getApplicationStatus } from "../controller/agency/agency.controller";
import { getDashboardStats, getRecentActivities, getAnalytics } from "../controller/agency/agency.dashboard.controller";
import { checkAuth } from "../middlewares/checkAuth.middleware"; 
import { createCase, listCases, getCaseById, getClients, updateCase } from "../controller/agency/agency.case.controller";
import { getProfile, updateProfile } from "../controller/agency/agency.profile.controller";
import { 
  changePassword, 
  toggle2FA, 
  updateNotifications, 
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

const router = Router();

// Public routes (no auth required)
router.post("/apply", applyAsAgency);
router.get("/application/:id", getApplicationStatus);

// Protected routes (require auth)
router.get("/dashboard/stats", checkAuth, getDashboardStats);
router.get("/dashboard/activities", checkAuth, getRecentActivities);
router.get("/dashboard/analytics", checkAuth, getAnalytics);

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
router.put("/settings/notifications", checkAuth, updateNotifications);
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

export default router;