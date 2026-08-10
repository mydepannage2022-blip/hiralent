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
- [ ] Implement real `cancel`/`refund` against the SDKs. → **S3**
- [x] **[S1]** Keep gateway secrets in the secret store (P5) — `STRIPE_SECRET_KEY` via `requireEnv`, server-side only; never client-side.

## Phase 5.2 — Webhooks & verification (trust the server, not the client)
- [ ] Implement **real webhook signature verification** (`stripe.webhooks.constructEvent`, PayPal verification) — replace the "starts with `whsec_`" stub.
- [ ] Drive subscription state from **verified webhook events only** (checkout completed, payment succeeded/failed, subscription updated/cancelled).
- [ ] Make frontend `payment/success` confirm status **with the backend** before showing "active" (currently trusts the URL). 

## Phase 5.3 — Subscription lifecycle
- [ ] Wire `UserSubscription`/`AgencySubscription`/`PaymentTransaction` to real events; handle upgrade/downgrade/cancel/expiry, proration, and failed-payment/dunning.
- [ ] Enforce plan entitlements/limits across the app (gate features by active subscription).
- [x] **[S1]** Fix money precision: use `Decimal(10,2)` consistently (`SubscriptionPlan` price fields were unqualified — now pinned).
- [ ] Idempotent payment handling (dedupe webhook retries; no double-charge/double-grant).

## Phase 5.4 — Safety & records
- [ ] Reconcile transactions (gateway ↔ our DB); store immutable payment records/receipts.
- [ ] Use Stripe/PayPal **test mode** for all pre-prod testing; never real cards in staging.
- [ ] Log payment events (without card data) for support/audit.

---

## Exit criteria
- ✅ A real test-mode checkout charges and returns a verified `succeeded` via a **signed** webhook; subscription activates only from that event.
- ✅ Cancel/refund/upgrade/downgrade work and reflect correctly in the DB and UI.
- ✅ Frontend never marks a subscription active without server verification.
- ✅ Webhook signature verification rejects forged events; retries are idempotent.
- ✅ Money precision consistent; entitlements enforced.
- ✅ No mock/fabricated payment code remains.
- ✅ PROGRESS-LOG updated per change.
