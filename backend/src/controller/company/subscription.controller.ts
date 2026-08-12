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
  checkFeatureLimit,
  getUserPlanFeatures
} from '../../services/subscription/feature-access.service';
import { getPaymentGateway } from '../../services/payment/PaymentGatewayFactory';
import { PaymentGatewayType } from '../../types/payment.types';

export const createCheckout = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const result = await createCheckoutSession(userId, req.body);
    
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
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const subscription = await getUserSubscription(userId);
    
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
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { cancel_immediately } = req.body;
    
    const result = await cancelUserSubscription(userId, cancel_immediately);
    
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
    const userId = req.user?.user_id;

    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { plan_id, billing_cycle } = req.body;

    const result = await changeUserPlan(userId, plan_id, billing_cycle as BillingCycle | undefined);

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
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { feature_name } = req.body;
    
    const access = await checkFeatureAccess(userId, feature_name);
    
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

export const getMyFeatures = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.user_id;
    
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const features = await getUserPlanFeatures(userId);
    
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
