import { Router } from 'express';
import {
  getDashboardController,
  updateAgencyController,
  getTeamController,
  getSubscriptionController,
  getAgencyByIdController
} from '../controller/agency.controller';

import { checkAuth } from '../middlewares/checkAuth.middleware';
import { checkRole } from '../middlewares/checkRole.middleware';
import { isEmailVerified } from '../middlewares/isEmailVerified.middleware';
import { validateBody } from '../middlewares/validateBody.middleware';
import {
  updateAgencySchema,
  teamQuerySchema
} from '../validation/agency.schema';

const router = Router();

/**
 * 📊 Get agency dashboard
 * Roles allowed: agency_admin, recruiter
 */
router.get(
  '/dashboard',
  checkAuth,
  checkRole('agency_admin', 'recruiter'),
  isEmailVerified,
  getDashboardController
);

/**
 * 🛠️ Update agency information
 * Roles allowed: agency_admin
 */
router.patch(
  '/update',
  checkAuth,
  checkRole('agency_admin'),
  isEmailVerified,
  validateBody(updateAgencySchema),
  updateAgencyController
);

/**
 * 👥 Get agency team list
 * Roles allowed: agency_admin, recruiter
 */
router.get(
  '/team',
  checkAuth,
  checkRole('agency_admin', 'recruiter'),
  isEmailVerified,
  getTeamController
);

/**
 * 💳 Get agency subscription info
 * Roles allowed: agency_admin
 */
router.get(
  '/subscription',
  checkAuth,
  checkRole('agency_admin'),
  isEmailVerified,
  getSubscriptionController
);

/**
 * 🔍 Get agency by ID
 * Roles allowed: super_admin, agency_admin, recruiter
 */
router.get(
  '/:agencyId',
  checkAuth,
  checkRole('super_admin', 'agency_admin', 'recruiter'),
  isEmailVerified,
  getAgencyByIdController
);

export default router;
