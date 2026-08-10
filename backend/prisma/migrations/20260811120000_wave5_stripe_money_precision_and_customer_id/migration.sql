-- Wave 5 / Session 1 — Real payments foundation.
--
-- 1) Money precision: SubscriptionPlan price columns were unqualified Decimal
--    (Postgres numeric(65,30)). Pin to numeric(10,2) so money is stored exactly.
--    Existing seed values are whole-dollar integers, so no rounding/data loss.
-- 2) Add User.stripe_customer_id (nullable) for the external gateway customer
--    handle. Populated from the verified checkout/subscription webhook (Wave 5 S2);
--    added now (nullable, additive) so a single migration covers it.

-- AlterTable
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "price_monthly_usd" SET DATA TYPE DECIMAL(10,2);
ALTER TABLE "SubscriptionPlan" ALTER COLUMN "price_annually_usd" SET DATA TYPE DECIMAL(10,2);

-- AlterTable
ALTER TABLE "User" ADD COLUMN "stripe_customer_id" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "User_stripe_customer_id_key" ON "User"("stripe_customer_id");
