# Wave 5 — Real Payments

> **Goal:** replace the entirely-fake payment layer with genuine, secure payment processing and subscription lifecycle. Isolated as its own wave because it involves real money, real webhooks, and compliance. **Runs after Wave 4.**
>
> **Pillars advanced:** P3 (Correctness), P1 (Security).
> **Risk closed:** R-05.
> **Entry state:** `StripeGateway`/`PayPalGateway` never call any SDK; fabricate sessions; webhooks return `mock.payment.succeeded`; frontend `payment/success` trusts the client.

---

## Phase 5.1 — Gateway integration (server-side)
- [ ] Add the real SDKs (`stripe`, PayPal SDK); remove all `mock_session_*` / fabricated-URL code paths. (R-05)
- [ ] Implement real `createCheckoutSession` (Stripe Checkout / PaymentIntents; PayPal orders) returning genuine session URLs.
- [ ] Implement real `cancel`/`refund` against the SDKs.
- [ ] Keep gateway secrets in the secret store (P5); never client-side.

## Phase 5.2 — Webhooks & verification (trust the server, not the client)
- [ ] Implement **real webhook signature verification** (`stripe.webhooks.constructEvent`, PayPal verification) — replace the "starts with `whsec_`" stub.
- [ ] Drive subscription state from **verified webhook events only** (checkout completed, payment succeeded/failed, subscription updated/cancelled).
- [ ] Make frontend `payment/success` confirm status **with the backend** before showing "active" (currently trusts the URL). 

## Phase 5.3 — Subscription lifecycle
- [ ] Wire `UserSubscription`/`AgencySubscription`/`PaymentTransaction` to real events; handle upgrade/downgrade/cancel/expiry, proration, and failed-payment/dunning.
- [ ] Enforce plan entitlements/limits across the app (gate features by active subscription).
- [ ] Fix money precision: use `Decimal(10,2)` consistently (`SubscriptionPlan` price fields currently unqualified).
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
