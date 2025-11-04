import express from 'express';
import { adminSecurityStack } from '../middlewares/adminAuth.middleware';
import {
  getPendingVerificationsController,
  getVerificationStatsController,
  getCompanyVerificationDetailsController,
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

// Approve company verification
router.post('/verifications/approve/:company_id', approveVerificationController);

// Reject company verification (send back for re-submission)
router.post('/verifications/reject/:company_id', rejectVerificationController);

export default router;
