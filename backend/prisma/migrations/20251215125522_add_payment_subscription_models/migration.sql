-- AlterTable
ALTER TABLE "skill_assessments" ADD COLUMN     "employer_assessment_id" TEXT;

-- CreateTable
CREATE TABLE "UserSubscription" (
    "subscription_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "payment_gateway" TEXT NOT NULL,
    "gateway_subscription_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "billing_cycle" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "cancel_at_period_end" BOOLEAN NOT NULL DEFAULT false,
    "canceled_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserSubscription_pkey" PRIMARY KEY ("subscription_id")
);

-- CreateTable
CREATE TABLE "PaymentTransaction" (
    "transaction_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "subscription_id" TEXT,
    "amount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "payment_gateway" TEXT NOT NULL,
    "gateway_payment_id" TEXT,
    "gateway_customer_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "payment_method" TEXT,
    "failure_reason" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentTransaction_pkey" PRIMARY KEY ("transaction_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "UserSubscription_user_id_key" ON "UserSubscription"("user_id");

-- CreateIndex
CREATE INDEX "UserSubscription_user_id_idx" ON "UserSubscription"("user_id");

-- CreateIndex
CREATE INDEX "UserSubscription_status_idx" ON "UserSubscription"("status");

-- CreateIndex
CREATE INDEX "UserSubscription_current_period_end_idx" ON "UserSubscription"("current_period_end");

-- CreateIndex
CREATE INDEX "PaymentTransaction_user_id_idx" ON "PaymentTransaction"("user_id");

-- CreateIndex
CREATE INDEX "PaymentTransaction_subscription_id_idx" ON "PaymentTransaction"("subscription_id");

-- CreateIndex
CREATE INDEX "PaymentTransaction_status_idx" ON "PaymentTransaction"("status");

-- CreateIndex
CREATE INDEX "PaymentTransaction_gateway_payment_id_idx" ON "PaymentTransaction"("gateway_payment_id");

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_employer_assessment_id_fkey" FOREIGN KEY ("employer_assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserSubscription" ADD CONSTRAINT "UserSubscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlan"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentTransaction" ADD CONSTRAINT "PaymentTransaction_subscription_id_fkey" FOREIGN KEY ("subscription_id") REFERENCES "UserSubscription"("subscription_id") ON DELETE SET NULL ON UPDATE CASCADE;
