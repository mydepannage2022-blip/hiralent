// backend/src/routes/admin.routes.ts
import express from 'express';
import { adminSecurityStack } from '../middlewares/adminAuth.middleware';
import {
  getPendingVerificationsController,
  getVerificationStatsController,
  getCompanyVerificationDetailsController,
  getPresignedDocumentUrlController, // ✅ NEW
  approveVerificationController,
  rejectVerificationController
} from '../controller/superadmin/admin.verification.controller';

const router = express.Router();

// All routes are protected by admin authentication
router.use(adminSecurityStack);

// Get verification statistics
router.get('/verifications/stats', getVerificationStatsController);

// Get all pending verifications
router.get('/verifications/pending', getPendingVerificationsController);

// Get detailed info for specific company
router.get('/verifications/:company_id', getCompanyVerificationDetailsController);

// ✅ NEW: Get presigned URL for a document
router.get('/verifications/:company_id/documents/:document_id/url', getPresignedDocumentUrlController);

// Approve company verification
router.post('/verifications/approve/:company_id', approveVerificationController);

// Reject company verification (send back for re-submission)
router.post('/verifications/reject/:company_id', rejectVerificationController);

export default router;