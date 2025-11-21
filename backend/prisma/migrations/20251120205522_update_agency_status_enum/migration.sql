/*
  Warnings:

  - The `status` column on the `Agency` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AgencyStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "business_license_url" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ALTER COLUMN "billing_contact_email" DROP NOT NULL,
ALTER COLUMN "owner_user_id" DROP NOT NULL,
DROP COLUMN "status",
ADD COLUMN     "status" "AgencyStatus" NOT NULL DEFAULT 'PENDING';
