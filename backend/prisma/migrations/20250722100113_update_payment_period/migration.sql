/*
  Warnings:

  - The `payment_period` column on the `CandidateProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "CandidateProfile" DROP COLUMN "payment_period",
ADD COLUMN     "payment_period" TEXT;

-- DropEnum
DROP TYPE "PaymentPeriod";
