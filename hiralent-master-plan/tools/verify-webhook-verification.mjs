#!/usr/bin/env node
/**
 * verify-webhook-verification.mjs — Wave 5 / Session 2 gate.
 *
 * Proves inbound Stripe webhooks are SIGNATURE-VERIFIED and drive idempotent subscription
 * activation (the pre-Wave-5 stubs fabricated success and never activated anything):
 *  - StripeGateway verifies with the real SDK `constructEvent` + STRIPE_WEBHOOK_SECRET, and
 *    the `startsWith('whsec_')` stub / `mock_payment_` fabrication are GONE,
 *  - the webhook path gets a RAW body (express.raw) mounted BEFORE the global express.json,
 *  - a ProcessedWebhookEvent idempotency ledger exists (event_id @unique) + its migration,
 *  - the controller routes verified events through the idempotent service router,
 *  - the success page confirms activation with the backend (no bare console.log),
 *  - STRIPE_WEBHOOK_SECRET is documented (.env.example + env-var-matrix).
 *
 * Plus an always-on OFFLINE SDK smoke: sign a payload with the installed `stripe` SDK and
 * verify it round-trips through constructEvent (pure HMAC — no key/network). The full
 * activation + idempotency behaviour is covered fail-provably by
 * backend/src/__tests__/stripe-webhook.probe.ts.
 *
 * Node built-ins only (+ the repo's stripe SDK for the offline smoke). Windows-safe.
 * Exit 0 = pass.
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

// ── 1) StripeGateway: real signature verify, stubs gone ────────────────────────
const stripeSrc = read(path.join(payDir, 'StripeGateway.ts'));
check('StripeGateway calls stripe.webhooks.constructEvent', stripeSrc.includes('constructEvent('));
check('StripeGateway verifies against STRIPE_WEBHOOK_SECRET', stripeSrc.includes('STRIPE_WEBHOOK_SECRET'));
check("StripeGateway no longer has the startsWith('whsec_') stub", !stripeSrc.includes("startsWith('whsec_')"));
check('StripeGateway webhook no longer fabricates a mock payment', !stripeSrc.includes('mock_payment_'));
check('StripeGateway webhook no longer emits mock.payment.succeeded', !stripeSrc.includes('mock.payment'));

// ── 2) Raw body mounted BEFORE the global JSON parser ──────────────────────────
const appSrc = read(path.join(backend, 'src', 'app.ts'));
// Match the actual app.use(...) mounts (not comment prose that may mention express.json()).
const rawIdx = appSrc.search(/app\.use\(\s*['"]\/api\/v1\/subscription\/webhook['"]\s*,\s*express\.raw\(/);
const jsonIdx = appSrc.search(/app\.use\(\s*express\.json\(/);
check('app.ts mounts express.raw for the webhook path', rawIdx > -1);
check('app.ts raw parser is BEFORE the global express.json', rawIdx > -1 && jsonIdx > -1 && rawIdx < jsonIdx);

// ── 3) Idempotency ledger model + migration ────────────────────────────────────
const schema = read(path.join(backend, 'prisma', 'schema.prisma'));
check('schema has model ProcessedWebhookEvent', /model\s+ProcessedWebhookEvent\s*\{/.test(schema));
check('ProcessedWebhookEvent.event_id is @unique', /event_id\s+String\s+@unique/.test(schema));
const migRoot = path.join(backend, 'prisma', 'migrations');
const hasMig = fs.readdirSync(migRoot).some((d) => /processed_webhook_event/i.test(d));
check('migration exists for processed_webhook_event', hasMig);

// ── 4) Controller + service wire verified events through the idempotent router ──
const ctrlSrc = read(path.join(backend, 'src', 'controller', 'company', 'subscription.controller.ts'));
check('controller routes events through processStripeSubscriptionEvent',
  ctrlSrc.includes('processStripeSubscriptionEvent'));
const svcSrc = read(path.join(backend, 'src', 'services', 'subscription', 'subscription.service.ts'));
check('service defines processStripeSubscriptionEvent', svcSrc.includes('export const processStripeSubscriptionEvent'));
check('service dedups on processedWebhookEvent (findUnique + create)',
  svcSrc.includes('processedWebhookEvent.findUnique') && svcSrc.includes('processedWebhookEvent.create'));
check('service activates via createOrUpdateSubscription', svcSrc.includes('createOrUpdateSubscription('));

// ── 5) Success page confirms with backend (no bare console.log) ────────────────
const successSrc = read(path.join(repoRoot, 'frontend', 'app', 'payment', 'success', 'page.tsx'));
check('success page no longer has a bare console.log', !successSrc.includes('console.log('));
check('success page confirms activation via useMySubscription', successSrc.includes('useMySubscription'));

// ── 6) STRIPE_WEBHOOK_SECRET documented ────────────────────────────────────────
const envExample = read(path.join(backend, '.env.example'));
check('.env.example documents STRIPE_WEBHOOK_SECRET', envExample.includes('STRIPE_WEBHOOK_SECRET'));
const matrix = read(path.join(repoRoot, 'hiralent-master-plan', 'matrices', 'env-var-matrix.md'));
check('env-var-matrix documents STRIPE_WEBHOOK_SECRET', matrix.includes('STRIPE_WEBHOOK_SECRET'));

// ── 7) Offline SDK smoke — sign + verify round-trip (no key/network) ───────────
function offlineSmoke() {
  try {
    const require = createRequire(path.join(backend, 'package.json'));
    const Stripe = require('stripe');
    const stripe = new Stripe('sk_test_offline_smoke');
    const secret = 'whsec_offline_smoke';
    const payload = JSON.stringify({ id: 'evt_smoke_1', object: 'event', type: 'checkout.session.completed', data: { object: {} } });
    const header = stripe.webhooks.generateTestHeaderString({ payload, secret });
    const event = stripe.webhooks.constructEvent(payload, header, secret);
    check('offline: SDK constructEvent verifies a self-signed payload', event.id === 'evt_smoke_1');
    let rejected = false;
    try { stripe.webhooks.constructEvent(payload, 'bad', secret); } catch { rejected = true; }
    check('offline: SDK constructEvent rejects a bad signature', rejected);
  } catch (e) {
    failures++;
    console.error('  FAIL: offline SDK smoke errored —', (e?.message || e));
  }
}

offlineSmoke();

if (failures) {
  console.error(`\nverify-webhook-verification: ${failures} FAILURE(S)`);
  process.exit(1);
}
console.log('\n✅ verify-webhook-verification: webhooks signature-verified; raw-body before JSON; idempotent activation wired; success page backend-confirmed.');
process.exit(0);
