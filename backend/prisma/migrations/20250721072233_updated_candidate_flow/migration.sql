-- CreateEnum
CREATE TYPE "PaymentPeriod" AS ENUM ('HOURLY', 'MONTHLY', 'ANNUALLY');

-- AlterTable
ALTER TABLE "CandidateProfile" ADD COLUMN     "location" TEXT,
ADD COLUMN     "minimum_salary_amount" DOUBLE PRECISION,
ADD COLUMN     "payment_period" "PaymentPeriod",
ADD COLUMN     "postal_code" INTEGER;
