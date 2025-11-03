import { Router } from 'express';
import {
  createProfileController,
  getProfileController,
  updateProfileController,
  getCompanyStatsController,
  uploadDocumentsRedirectController,
} from '../controller/company.controller';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { validateBody } from '../middlewares/validateBody.middleware';
import {
  createCompanyProfileSchema,
  updateCompanyProfileSchema,
} from '../validation/company.schema';

const router = Router();

// Health check (no auth)
router.get('/health', (_req, res) => {
  res.json({ message: 'Company routes working', timestamp: new Date().toISOString() });
});

// From here down, auth required
router.use(checkAuth);

// Create company profile
router.post('/create-profile', validateBody(createCompanyProfileSchema), createProfileController);

// Get profile
router.get('/profile', getProfileController);

// Update profile
router.patch('/profile', validateBody(updateCompanyProfileSchema), updateProfileController);

// Stats
router.get('/stats', getCompanyStatsController);

// Legacy redirect (kept short path for email links)
router.get('/upload', uploadDocumentsRedirectController);

export default router;
