import { Request, Response } from 'express';
import {
  createCheckoutSession,
  getUserSubscription,
  cancelUserSubscription,
  changeUserPlan,
  getAllPlans,
  getPlanById,
  processStripeSubscriptionEvent
} from '../../services/subscription/subscription.service';
import { BillingCycle } from '../../types/subscription.types';
import {
  checkFeatureAccess,
  getUserPlanFeatures
} from '../../services/subscription/feature-access.service';
import { getEntitlementSummary } from '../../services/subscription/entitlements.service';
import { resolveBillingAccountId, billingAccountError } from '../../services/subscription/billingAccount';
import { getPaymentGateway } from '../../services/payment/PaymentGatewayFactory';
import { PaymentGatewayType } from '../../types/payment.types';

export const createCheckout = async (req: Request, res: Response) => {
  try {
    const accountId = resolveBillingAccountId(req.user);

    if (!accountId) {
      return res.status(req.user ? 400 : 401).json({
        success: false,
        error: billingAccountError(req.user)
      });
    }

    const result = await createCheckoutSession(accountId, req.body);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const getMySubscription = async (req: Request, res: Response) => {
  try {
    const accountId = resolveBillingAccountId(req.user);

    if (!accountId) {
      return res.status(req.user ? 400 : 401).json({
        success: false,
        error: billingAccountError(req.user)
      });
    }

    const subscription = await getUserSubscription(accountId);
    
    if (!subscription) {
      return res.status(200).json({
        success: true,
        data: null,
        message: 'No active subscription'
      });
    }

    res.status(200).json({
      success: true,
      data: subscription
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const cancelSubscription = async (req: Request, res: Response) => {
  try {
    const accountId = resolveBillingAccountId(req.user);

    if (!accountId) {
      return res.status(req.user ? 400 : 401).json({
        success: false,
        error: billingAccountError(req.user)
      });
    }

    const { cancel_immediately } = req.body;
    
    const result = await cancelUserSubscription(accountId, cancel_immediately);
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(400).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const changePlan = async (req: Request, res: Response) => {
  try {
    const accountId = resolveBillingAccountId(req.user);

    if (!accountId) {
      return res.status(req.user ? 400 : 401).json({
        success: false,
        error: billingAccountError(req.user)
      });
    }

    const { plan_id, billing_cycle } = req.body;

    const result = await changeUserPlan(accountId, plan_id, billing_cycle as BillingCycle | undefined);

    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error: any) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

export const getPlans = async (req: Request, res: Response) => {
  try {
    const plans = await getAllPlans();
    
    res.status(200).json({
      success: true,
      data: plans
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const getPlan = async (req: Request, res: Response) => {
  try {
    const { planId } = req.params;
    
    const plan = await getPlanById(planId);
    
    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found'
      });
    }

    res.status(200).json({
      success: true,
      data: plan
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const checkFeature = async (req: Request, res: Response) => {
  try {
    const accountId = resolveBillingAccountId(req.user);

    if (!accountId) {
      return res.status(req.user ? 400 : 401).json({
        success: false,
        error: billingAccountError(req.user)
      });
    }

    const { feature_name } = req.body;
    
    const access = await checkFeatureAccess(accountId, feature_name);
    
    res.status(200).json({
      success: true,
      data: access
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

// GET /api/v1/subscription/usage
// Plan limits alongside what the company has actually consumed, so the billing screen and the
// job/interview forms can warn before the server refuses the action.
export const getUsageSummary = async (req: Request, res: Response) => {
  try {
    const accountId = resolveBillingAccountId(req.user);

    if (!accountId) {
      return res.status(req.user ? 400 : 401).json({
        success: false,
        error: billingAccountError(req.user)
      });
    }

    const summary = await getEntitlementSummary(accountId);

    res.status(200).json({
      success: true,
      data: summary
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

export const getMyFeatures = async (req: Request, res: Response) => {
  try {
    const accountId = resolveBillingAccountId(req.user);

    if (!accountId) {
      return res.status(req.user ? 400 : 401).json({
        success: false,
        error: billingAccountError(req.user)
      });
    }

    const features = await getUserPlanFeatures(accountId);
    
    res.status(200).json({
      success: true,
      data: features
    });
  } catch (error: any) {
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
};

export const handleWebhook = async (req: Request, res: Response) => {
  try {
    const { gateway } = req.params;
    const signature = req.headers['stripe-signature'] || req.headers['paypal-auth-algo'];

    // `req.body` here is the RAW Buffer (express.raw is mounted for this path before the
    // global express.json — see app.ts), which is what signature verification needs.
    const paymentGateway = getPaymentGateway(gateway as PaymentGatewayType);
    const result = await paymentGateway.handleWebhook(req.body, signature as string);

    // Signature is verified inside handleWebhook; the router applies the state change
    // idempotently (a Stripe retry of the same event id is a no-op).
    const { duplicate } = await processStripeSubscriptionEvent(result);

    res.status(200).json({ received: true, duplicate });
  } catch (error: any) {
    // A bad/forged signature or an unconfigured gateway throws above → 400, so Stripe
    // does not treat the delivery as accepted.
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};
