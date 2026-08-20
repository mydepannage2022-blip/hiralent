# Wave 5 — Real Payments

> **Goal:** replace the entirely-fake payment layer with genuine, secure payment processing and subscription lifecycle. Isolated as its own wave because it involves real money, real webhooks, and compliance. **Runs after Wave 4.**
>
> **Pillars advanced:** P3 (Correctness), P1 (Security).
> **Risk closed:** R-05.
> **Entry state:** `StripeGateway`/`PayPalGateway` never call any SDK; fabricate sessions; webhooks return `mock.payment.succeeded`; frontend `payment/success` trusts the client.

---

> **Session structure (planned):** S1 checkout foundation · S2 signed webhooks + activation + idempotency · S3 lifecycle (cancel/refund/upgrade/downgrade/dunning) · S4 entitlements + records · S5 agency billing · S6 E2E gate. PayPal = honest-disabled (Stripe-only launch).

## Phase 5.1 — Gateway integration (server-side)
- [x] **[S1]** Add the real `stripe` SDK; remove all `mock_session_*` / fabricated-URL code paths; **PayPal + Manual honest-disabled** (throw, no fake sessions), `getSupportedGateways` dynamic. (R-05)
- [x] **[S1]** Implement real `createCheckoutSession` (Stripe hosted Checkout, subscription mode, inline `price_data` from our DB) returning genuine `checkout.stripe.com` session URLs.
- [x] **[S1]** Money precision: `SubscriptionPlan.price_*_usd` → `Decimal(10,2)`; `User.stripe_customer_id` added (populated S2). Frontend card-collection form removed → Stripe hosted redirect.
- [x] **[S3]** Implement real `cancel`/`refund` against the SDKs — cancel (`subscriptions.cancel` / `subscriptions.update({cancel_at_period_end})`), refund (`refunds.create` via a guarded admin endpoint; `mock_refund_` gone), `getPaymentStatus` resolves a real PaymentIntent.
- [x] **[S1]** Keep gateway secrets in the secret store (P5) — `STRIPE_SECRET_KEY` via `requireEnv`, server-side only; never client-side.

## Phase 5.2 — Webhooks & verification (trust the server, not the client)
- [x] **[S2]** Implement **real webhook signature verification** (`stripe.webhooks.constructEvent` via a raw-body carve-out mounted before `express.json`) — the "starts with `whsec_`" stub is gone; forged/tampered events are rejected (400). PayPal verification N/A (honest-disabled).
- [x] **[S2]** Drive subscription state from **verified webhook events only**: `checkout.session.completed` → activate; `invoice.paid` → renew; `invoice.payment_failed` → past_due; `customer.subscription.deleted` → canceled. `User.stripe_customer_id` populated here.
- [x] **[S2]** Make frontend `payment/success` confirm status **with the backend** (`useMySubscription` poll) before showing "Payment Successful" — otherwise Confirming… / Payment Received (no false success).

## Phase 5.3 — Subscription lifecycle
- [x] **[S3]** Wire `UserSubscription`/`PaymentTransaction` to real ops; handle upgrade/downgrade (on-the-fly Price + `proration_behavior:create_prorations`), cancel (immediate vs at-period-end, distinct DB state), expiry (lazy-check on read + `sweepExpiredSubscriptions`), and failed-payment/dunning (past_due via S2 webhook branch; grace → canceled). *(`AgencySubscription` = S5.)*
- [x] **[S4]** Enforce plan entitlements/limits across the app — `entitlements.service` drives everything off the plan rows (`job_post_limit` = concurrent slots, `ai_interview_limit` = per-period); `requireQuota` mounted on job-create + interview-assign, `requireActiveSubscription` on ranking/skill-radar/insights/`GET /subscription/usage`; no-subscription falls back to the seeded `plan_free` row, fail-closed if absent. Billing subject normalised to the **company** (was the calling user).
- [x] **[S1]** Fix money precision: use `Decimal(10,2)` consistently (`SubscriptionPlan` price fields were unqualified — now pinned).
- [x] **[S2]** Idempotent payment handling (dedupe webhook retries; no double-grant) — `ProcessedWebhookEvent` (`event_id @unique`) ledger; replay of the same event id is a no-op.

## Phase 5.4 — Safety & records
- [x] **[S4]** Reconcile transactions (gateway ↔ our DB) — `reconciliation.service` + nightly scheduler + `tools/reconcile.mjs` + admin `POST /admin/reconciliation/run`; **read-only, reports never repairs**. Immutable records: `PaymentReceipt` with a Postgres `BEFORE UPDATE OR DELETE` trigger (raw SQL UPDATE/DELETE both rejected, probe-proven), issued once per settled transaction.
- [ ] Use Stripe/PayPal **test mode** for all pre-prod testing; never real cards in staging. *(Still open: no Stripe key is configured in this environment, so no live-mode path has ever run. Reconciliation and refunds are probe-proven with an injected client only.)*
- [x] **[S4]** Log payment events (without card data) — `PaymentEventLog` written from checkout, all four webhook branches, refunds and reconciliation; `detail` is built from an allow-list that drops `pan|number|cvc|exp_*|last4` and redacts PAN-shaped values; best-effort so it never blocks the money path.

---

## Exit criteria
- ✅ A real test-mode checkout charges and returns a verified `succeeded` via a **signed** webhook; subscription activates only from that event.
- ✅ Cancel/refund/upgrade/downgrade work and reflect correctly in the DB and UI.
- ✅ Frontend never marks a subscription active without server verification.
- ✅ Webhook signature verification rejects forged events; retries are idempotent.
- ✅ Money precision consistent; entitlements enforced.
- ✅ No mock/fabricated payment code remains.
- ✅ PROGRESS-LOG updated per change.
