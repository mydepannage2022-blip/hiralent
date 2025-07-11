// src/routes/agency.routes.ts

import { Router } from 'express';
import { AgencyController } from '../controller/agency.controller';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { checkRole } from '../middlewares/checkRole.middleware';
import { isEmailVerified } from '../middlewares/isEmailVerified.middleware';
import { validateBody } from '../middlewares/validateBody.middleware';
import { 
  updateAgencySchema, 
  teamQuerySchema 
} from '../validation/agency.schema';

const router = Router();
const agencyController = new AgencyController();

// Get agency dashboard (agency admin/recruiter)
router.get(
  '/dashboard',
  [
    checkAuth,
    checkRole('agency_admin', 'recruiter'),
    isEmailVerified
  ],
  agencyController.getDashboard
);

// Update agency information (agency admin only)
router.patch(
  '/update',
  [
    checkAuth,
    checkRole('agency_admin'),
    isEmailVerified,
    validateBody(updateAgencySchema)
  ],
  agencyController.updateAgency
);

// Get agency team (agency admin/recruiter)
router.get(
  '/team',
  [
    checkAuth,
    checkRole('agency_admin', 'recruiter'),
    isEmailVerified
  ],
  agencyController.getTeam
);

// Get agency subscription info (agency admin only)
router.get(
  '/subscription',
  [
    checkAuth,
    checkRole('agency_admin'),
    isEmailVerified
  ],
  agencyController.getSubscription
);

// Get agency by ID (super admin or agency members)
router.get(
  '/:agencyId',
  [
    checkAuth,
    checkRole('super_admin', 'agency_admin', 'recruiter'),
    isEmailVerified
  ],
  agencyController.getAgencyById
);

export default router;