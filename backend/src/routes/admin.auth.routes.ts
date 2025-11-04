import express from 'express';
import {
  adminLoginController,
  setupMFAController,
  verifyMFAController
} from '../controller/superadmin/admin.auth.controller';

const router = express.Router();

// Step 1: Login with email/password
router.post('/auth/login', adminLoginController);

// Step 2: Setup 2FA (first time)
router.post('/auth/setup-mfa', setupMFAController);

// Step 3: Verify 2FA code
router.post('/auth/verify-mfa', verifyMFAController);

export default router;
