-- Wave 5 / Session 2 — Webhook idempotency ledger.
--
-- Stripe retries a webhook until it receives a 2xx, so the same event id can be delivered
-- multiple times. ProcessedWebhookEvent records every event we have acted on; the UNIQUE
-- index on event_id lets the router treat a replay as a no-op, guaranteeing exactly-once
-- subscription activation. Additive, no data touched.

-- CreateTable
CREATE TABLE "ProcessedWebhookEvent" (
    "id" TEXT NOT NULL,
    "event_id" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "processed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProcessedWebhookEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProcessedWebhookEvent_event_id_key" ON "ProcessedWebhookEvent"("event_id");

-- CreateIndex
CREATE INDEX "ProcessedWebhookEvent_gateway_idx" ON "ProcessedWebhookEvent"("gateway");
