import { Router } from 'express';
import {
  createCheckout,
  getMySubscription,
  cancelSubscription,
  changePlan,
  getPlans,
  getPlan,
  checkFeature,
  getMyFeatures,
  getUsageSummary,
  handleWebhook
} from '../controller/company/subscription.controller';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { checkRole } from '../middlewares/checkRole.middleware';
import { requireActiveSubscription } from '../middlewares/checkSubscription.middleware';
import { validateBody } from '../middlewares/validateBody.middleware';
import {
  createCheckoutSessionSchema,
  cancelSubscriptionSchema,
  changePlanSchema,
  checkFeatureAccessSchema
} from '../validation/subscription.schema';

const router = Router();

// UserSubscription is the *company* product (agency billing is AgencySubscription, Wave 5 S5;
// candidates have no plan). Reads stay open to any authenticated user — they only ever return
// the caller's own row — but every money-moving action is restricted to the company roles so a
// candidate/agency token cannot open a checkout, switch a plan, or cancel one.
const BILLING_ROLES = ['company_admin', 'company_member', 'recruiter'] as const;
const requireBillingRole = checkRole(...BILLING_ROLES);

router.post(
  '/checkout',
  checkAuth,
  requireBillingRole,
  validateBody(createCheckoutSessionSchema),
  createCheckout
);

router.get('/my-subscription', checkAuth, getMySubscription);

router.post(
  '/cancel',
  checkAuth,
  requireBillingRole,
  validateBody(cancelSubscriptionSchema),
  cancelSubscription
);

router.post(
  '/change-plan',
  checkAuth,
  requireBillingRole,
  validateBody(changePlanSchema),
  changePlan
);

router.get('/plans', getPlans);

router.get('/plans/:planId', getPlan);

router.post(
  '/check-feature',
  checkAuth,
  validateBody(checkFeatureAccessSchema),
  checkFeature
);

router.get('/my-features', checkAuth, getMyFeatures);

// Paid-only: usage reporting is part of the subscribed product, and it doubles as the
// live proof that the premium gate rejects a lapsed subscription.
router.get('/usage', checkAuth, requireActiveSubscription, getUsageSummary);

router.post('/webhook/:gateway', handleWebhook);

export default router;
