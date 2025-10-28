-- AlterTable
ALTER TABLE "public"."CompanyProfile" ADD COLUMN     "full_address" TEXT,
ADD COLUMN     "verification_notes" TEXT,
ADD COLUMN     "verification_status" TEXT DEFAULT 'unverified',
ADD COLUMN     "verification_submitted_at" TIMESTAMP(3);
