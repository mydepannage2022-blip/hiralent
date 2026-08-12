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
  handleWebhook
} from '../controller/company/subscription.controller';
import { checkAuth } from '../middlewares/checkAuth.middleware';
import { validateBody } from '../middlewares/validateBody.middleware';
import {
  createCheckoutSessionSchema,
  cancelSubscriptionSchema,
  changePlanSchema,
  checkFeatureAccessSchema
} from '../validation/subscription.schema';

const router = Router();

router.post(
  '/checkout',
  checkAuth,
  validateBody(createCheckoutSessionSchema),
  createCheckout
);

router.get('/my-subscription', checkAuth, getMySubscription);

router.post(
  '/cancel',
  checkAuth,
  validateBody(cancelSubscriptionSchema),
  cancelSubscription
);

router.post(
  '/change-plan',
  checkAuth,
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

router.post('/webhook/:gateway', handleWebhook);

export default router;
