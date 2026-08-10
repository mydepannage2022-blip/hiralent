#!/usr/bin/env node
/**
 * verify-stripe-checkout.mjs — Wave 5 / Session 1 gate.
 *
 * Proves the payment layer's checkout is REAL and non-Stripe is honestly disabled:
 *  - the payment services fabricate no mock session / checkout URL,
 *  - StripeGateway uses the real `stripe` SDK (checkout.sessions.create),
 *  - PayPal + Manual gateways are honest-disabled (throw, not fake),
 *  - money precision is pinned (SubscriptionPlan.price_* → Decimal(10,2)),
 *  - User.stripe_customer_id exists,
 *  - STRIPE_SECRET_KEY is documented (.env.example + env-var-matrix).
 *
 * Optional live smoke (only when STRIPE_SECRET_KEY is set): creates a real test-mode
 * Checkout Session via the installed SDK and asserts a genuine hosted URL comes back.
 * Skipped-with-note otherwise — the gateway wrapper's logic is covered fail-provably by
 * backend/src/__tests__/stripe-checkout.probe.ts and by the browser verify.
 *
 * Node built-ins only. Windows-safe. Exit 0 = pass.
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const backend = path.join(repoRoot, 'backend');
const payDir = path.join(backend, 'src', 'services', 'payment');

let failures = 0;
const check = (name, cond) => {
  if (cond) console.log('  ok:', name);
  else { failures++; console.error('  FAIL:', name); }
};
const read = (p) => fs.readFileSync(p, 'utf8');

// ── 1) No fabricated checkout across the payment services ──────────────────────
// Scoped to the payment dir and to checkout-specific tokens only. `mock_payment_` /
// `whsec_` stubs live in the webhook/refund paths that Wave 5 S2/S3 own — NOT targeted
// here so this gate doesn't force later-session work into S1.
const FORBIDDEN = ['mock_session_', 'mock_paypal_', 'manual_${Date', 'checkout.stripe.com/pay/'];
for (const f of ['StripeGateway.ts', 'PayPalGateway.ts', 'PaymentGatewayFactory.ts']) {
  const src = read(path.join(payDir, f));
  for (const tok of FORBIDDEN) {
    check(`${f}: no "${tok}"`, !src.includes(tok));
  }
}

// ── 2) StripeGateway uses the real SDK ─────────────────────────────────────────
const stripeSrc = read(path.join(payDir, 'StripeGateway.ts'));
check('StripeGateway imports the stripe SDK', /from ['"]stripe['"]/.test(stripeSrc));
check('StripeGateway calls checkout.sessions.create', stripeSrc.includes('checkout.sessions.create'));
check('StripeGateway throws when not configured (honest-disable)',
  /not configured/i.test(stripeSrc));

// ── 3) PayPal + Manual honest-disabled ─────────────────────────────────────────
const paypalSrc = read(path.join(payDir, 'PayPalGateway.ts'));
check('PayPalGateway is honest-disabled (throws not-available)', /not available/i.test(paypalSrc));
const factorySrc = read(path.join(payDir, 'PaymentGatewayFactory.ts'));
check('Manual gateway is honest-disabled (throws not-available)', /not available/i.test(factorySrc));
check('getSupportedGateways filters by isGatewayConfigured', factorySrc.includes('.filter(isGatewayConfigured)'));

// ── 4) Schema: money precision + stripe_customer_id ────────────────────────────
const schema = read(path.join(backend, 'prisma', 'schema.prisma'));
check('price_monthly_usd is Decimal(10,2)', /price_monthly_usd\s+Decimal\s+@db\.Decimal\(10,\s*2\)/.test(schema));
check('price_annually_usd is Decimal(10,2)', /price_annually_usd\s+Decimal\s+@db\.Decimal\(10,\s*2\)/.test(schema));
check('User.stripe_customer_id exists', /stripe_customer_id\s+String\?/.test(schema));

// ── 5) STRIPE_SECRET_KEY documented ────────────────────────────────────────────
const envExample = read(path.join(backend, '.env.example'));
check('.env.example documents STRIPE_SECRET_KEY', envExample.includes('STRIPE_SECRET_KEY'));
const matrix = read(path.join(repoRoot, 'hiralent-master-plan', 'matrices', 'env-var-matrix.md'));
check('env-var-matrix documents STRIPE_SECRET_KEY', matrix.includes('STRIPE_SECRET_KEY'));

// ── 6) Optional live smoke (needs STRIPE_SECRET_KEY + network) ──────────────────
async function liveSmoke() {
  if (!process.env.STRIPE_SECRET_KEY) {
    console.log('\n  note: STRIPE_SECRET_KEY unset — skipping live Checkout smoke (logic covered by stripe-checkout.probe.ts + browser verify).');
    return;
  }
  try {
    const require = createRequire(path.join(backend, 'package.json'));
    const Stripe = require('stripe');
    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      line_items: [{
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: 69900,
          recurring: { interval: 'month' },
          product_data: { name: 'Wave5 verify smoke' },
        },
      }],
      success_url: 'https://example.com/success?session_id={CHECKOUT_SESSION_ID}',
      cancel_url: 'https://example.com/cancel',
    });
    check('live: real Checkout Session returns a hosted checkout.stripe.com URL',
      typeof session.url === 'string' && session.url.startsWith('https://checkout.stripe.com/c/'));
  } catch (e) {
    failures++;
    console.error('  FAIL: live Checkout smoke errored —', (e?.message || e));
  }
}

await liveSmoke();

if (failures) {
  console.error(`\nverify-stripe-checkout: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('\n✅ verify-stripe-checkout: Stripe checkout real; PayPal/Manual honest-disabled; money precision + env documented.');
process.exit(0);
