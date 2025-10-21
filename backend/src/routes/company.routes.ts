// backend/src/routes/company.routes.ts
import { Router } from 'express';
import { 
  createProfileController,
  getProfileController,
  updateProfileController,
  getCompanyStatsController
} from '../controller/company/profile.controller';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { validateBody } from '../middlewares/validateBody.middleware';
import { 
  createCompanyProfileSchema,
  updateCompanyProfileSchema 
} from '../validation/company.schema';

const router = Router();

// Health check (no auth required)
router.get('/health', (req, res) => {
  res.json({ message: 'Company routes working', timestamp: new Date().toISOString() });
});

// All routes below require authentication
router.use(checkAuth);

// ==================== COMPANY PROFILE ROUTES ====================

// Create company profile (Step 2 of registration)
router.post(
  '/create-profile',
  checkAuth,
  validateBody(createCompanyProfileSchema),
  createProfileController
);

// // Get company profile
router.get('/profile', getProfileController);

// Update company profile
router.patch(
  '/profile',
  validateBody(updateCompanyProfileSchema),
  updateProfileController
);

// Get company stats/analytics
router.get('/stats', getCompanyStatsController);

export default router;