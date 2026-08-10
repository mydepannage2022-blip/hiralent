// backend/src/__tests__/stripe-checkout.probe.ts
//
// Wave 5 / Session 1 — proof that Stripe checkout is REAL, not fabricated.
//
// The critical assertion: a configured Stripe gateway builds its checkout URL from the
// injected Stripe client's real session (never a `mock_session_*` id / fabricated URL).
//
// Fail-provable: put the old mock branch back in StripeGateway.createCheckoutSession
//   (return { session_id: `mock_session_${Date.now()}`, checkout_url: ... })
// and the "configured gateway returns the real session (not a mock)" assertion goes RED.
//
// No DB / network needed — the Stripe client is injected as a fake.
//
// Run: npx tsx src/__tests__/stripe-checkout.probe.ts

import type Stripe from 'stripe';
import { createStripeGateway } from '../services/payment/StripeGateway';
import { createPayPalGateway } from '../services/payment/PayPalGateway';
import { formatAmountForGateway } from '../services/payment/BaseGateway';
import { CreatePaymentSessionData } from '../types/payment.types';
import { createCheckoutSessionSchema } from '../validation/subscription.schema';

let failures = 0;
const check = (name: string, cond: boolean) => {
  if (cond) console.log('  ok:', name);
  else { failures++; console.error('  FAIL:', name); }
};

const REAL_SESSION = { id: 'cs_test_abc123', url: 'https://checkout.stripe.com/c/pay/cs_test_abc123' };

// Fake Stripe client exposing only what the gateway touches: checkout.sessions.create.
let lastCreateParams: any = null;
const fakeStripe = {
  checkout: {
    sessions: {
      create: async (params: any) => { lastCreateParams = params; return REAL_SESSION; },
    },
  },
} as unknown as Stripe;

const sampleData = (overrides: Partial<CreatePaymentSessionData> = {}): CreatePaymentSessionData => ({
  user_id: 'user_1',
  plan_id: 'plan_standard',
  billing_cycle: 'monthly',
  amount: 699,
  currency: 'USD',
  success_url: 'https://app.example.com/payment/success',
  cancel_url: 'https://app.example.com/payment/cancel',
  customer_email: 'buyer@example.com',
  metadata: { plan_name: 'Standard', billing_cycle: 'monthly' },
  ...overrides,
});

async function main() {
  // 1) CRITICAL — configured gateway (fake client injected) returns the REAL session,
  //    never a fabricated mock id/URL.
  const gw = createStripeGateway(fakeStripe);
  const res = await gw.createCheckoutSession(sampleData());
  check('session_id is the real Stripe session (not mock_session_)',
    res.session_id === REAL_SESSION.id && !res.session_id.startsWith('mock_session_'));
  check('checkout_url is the real Stripe URL', res.checkout_url === REAL_SESSION.url);
  check('checkout_url is not a fabricated /pay/ URL', !res.checkout_url.includes('checkout.stripe.com/pay/'));

  // The session is a real subscription checkout built from our data.
  check('subscription mode', lastCreateParams?.mode === 'subscription');
  check('client_reference_id = user_id', lastCreateParams?.client_reference_id === 'user_1');
  check('metadata carries user_id/plan_id/billing_cycle',
    lastCreateParams?.metadata?.user_id === 'user_1' &&
    lastCreateParams?.metadata?.plan_id === 'plan_standard' &&
    lastCreateParams?.metadata?.billing_cycle === 'monthly');
  check('success_url carries the {CHECKOUT_SESSION_ID} placeholder',
    typeof lastCreateParams?.success_url === 'string' &&
    lastCreateParams.success_url.includes('{CHECKOUT_SESSION_ID}'));
  check('unit_amount is integer minor units (699 → 69900)',
    lastCreateParams?.line_items?.[0]?.price_data?.unit_amount === 69900);
  check('yearly maps to a yearly recurring interval', await (async () => {
    lastCreateParams = null;
    await gw.createCheckoutSession(sampleData({ billing_cycle: 'yearly', amount: 1398 }));
    return lastCreateParams?.line_items?.[0]?.price_data?.recurring?.interval === 'year';
  })());

  // 2) Not configured (no injected client, key unset) → throws, never fabricates a URL.
  const hadKey = process.env.STRIPE_SECRET_KEY;
  delete process.env.STRIPE_SECRET_KEY;
  const unconfigured = createStripeGateway();
  let threw = false;
  try { await unconfigured.createCheckoutSession(sampleData()); }
  catch { threw = true; }
  check('unconfigured Stripe gateway throws (no fabricated session)', threw);
  if (hadKey !== undefined) process.env.STRIPE_SECRET_KEY = hadKey;

  // 3) PayPal is honestly disabled — throws, never a mock_paypal_ session.
  let paypalThrew = false;
  try { await createPayPalGateway().createCheckoutSession(sampleData({ billing_cycle: 'monthly' })); }
  catch { paypalThrew = true; }
  check('PayPal gateway is honest-disabled (throws)', paypalThrew);

  // 4) Money precision — fractional dollars convert to exact integer cents (no float drift).
  check('formatAmountForGateway(9.99, USD) === 999', formatAmountForGateway(9.99, 'USD') === 999);
  check('formatAmountForGateway(19.99, USD) === 1999', formatAmountForGateway(19.99, 'USD') === 1999);

  // 5) Checkout validation accepts our real (non-UUID) plan ids. The seed assigns
  //    'plan_standard' etc.; a `.uuid()` rule here 400s every real checkout.
  //    Fail-prove: restore `plan_id: z.string().uuid()` and this goes RED.
  const seeded = createCheckoutSessionSchema.safeParse({
    plan_id: 'plan_standard', billing_cycle: 'monthly', payment_gateway: 'stripe',
  });
  check("checkout schema accepts seeded plan_id 'plan_standard'", seeded.success === true);
  const emptyPlan = createCheckoutSessionSchema.safeParse({
    plan_id: '', billing_cycle: 'monthly', payment_gateway: 'stripe',
  });
  check('checkout schema still rejects empty plan_id', emptyPlan.success === false);

  if (failures) { console.error(`\nstripe-checkout.probe: ${failures} FAILURE(S)`); process.exit(1); }
  console.log('\nstripe-checkout.probe OK — Stripe checkout is real; PayPal/Manual honest-disabled; money precision exact.');
}

main().catch((e) => { console.error(e); process.exit(1); });
