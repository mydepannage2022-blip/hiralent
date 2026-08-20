-- CreateTable
CREATE TABLE "PaymentReceipt" (
    "receipt_id" TEXT NOT NULL,
    "receipt_number" TEXT NOT NULL,
    "transaction_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "status_at_issue" TEXT NOT NULL,
    "gateway" TEXT NOT NULL,
    "gateway_payment_id" TEXT,
    "plan_name" TEXT,
    "billing_cycle" TEXT,
    "period_start" TIMESTAMP(3),
    "period_end" TIMESTAMP(3),
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "PaymentReceipt_pkey" PRIMARY KEY ("receipt_id")
);

-- CreateTable
CREATE TABLE "PaymentEventLog" (
    "event_log_id" TEXT NOT NULL,
    "event_source" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "gateway_event_id" TEXT,
    "user_id" TEXT,
    "transaction_id" TEXT,
    "subscription_id" TEXT,
    "amount" DECIMAL(10,2),
    "currency" TEXT,
    "status" TEXT,
    "detail" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentEventLog_pkey" PRIMARY KEY ("event_log_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_receipt_number_key" ON "PaymentReceipt"("receipt_number");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentReceipt_transaction_id_key" ON "PaymentReceipt"("transaction_id");

-- CreateIndex
CREATE INDEX "PaymentReceipt_user_id_issued_at_idx" ON "PaymentReceipt"("user_id", "issued_at");

-- CreateIndex
CREATE INDEX "PaymentReceipt_issued_at_idx" ON "PaymentReceipt"("issued_at");

-- CreateIndex
CREATE INDEX "PaymentEventLog_user_id_created_at_idx" ON "PaymentEventLog"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "PaymentEventLog_event_type_created_at_idx" ON "PaymentEventLog"("event_type", "created_at");

-- CreateIndex
CREATE INDEX "PaymentEventLog_gateway_event_id_idx" ON "PaymentEventLog"("gateway_event_id");

-- CreateIndex
CREATE INDEX "PaymentEventLog_created_at_idx" ON "PaymentEventLog"("created_at");

-- CreateIndex
CREATE INDEX "AIInterviewResult_job_id_created_at_idx" ON "AIInterviewResult"("job_id", "created_at");

-- CreateIndex
CREATE INDEX "PaymentTransaction_created_at_idx" ON "PaymentTransaction"("created_at");

-- AddForeignKey
ALTER TABLE "PaymentReceipt" ADD CONSTRAINT "PaymentReceipt_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "PaymentTransaction"("transaction_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- Receipt immutability, enforced by the database rather than by convention.
--
-- A receipt is the record of money that actually moved. Application-level "we just never call
-- update" is not a guarantee: any other service, a migration script, or a psql session could
-- still rewrite history. This trigger refuses UPDATE and DELETE on PaymentReceipt outright, so
-- the only legal operations are INSERT and SELECT.
--
-- Corrections are made the way ledgers make them — by issuing a new row, never by editing an
-- old one.
-- ---------------------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION payment_receipt_immutable()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION
        'PaymentReceipt is append-only: % on receipt_id % is not permitted',
        TG_OP, COALESCE(OLD.receipt_id, '(unknown)')
        USING ERRCODE = 'restrict_violation';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER payment_receipt_no_update_or_delete
    BEFORE UPDATE OR DELETE ON "PaymentReceipt"
    FOR EACH ROW
    EXECUTE FUNCTION payment_receipt_immutable();
