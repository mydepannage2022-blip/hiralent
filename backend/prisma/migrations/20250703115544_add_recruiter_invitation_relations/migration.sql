/*
  Warnings:

  - Changed the type of `access_level` on the `RolePermission` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('none', 'read', 'write', 'manage');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "approval_notes" TEXT,
ADD COLUMN     "approved_at" TIMESTAMP(3),
ADD COLUMN     "approved_by" TEXT,
ADD COLUMN     "logo_url" TEXT,
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "RolePermission" DROP COLUMN "access_level",
ADD COLUMN     "access_level" "AccessLevel" NOT NULL;

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "branding_notes" TEXT,
ADD COLUMN     "company_role" TEXT,
ADD COLUMN     "linkedin_url" TEXT,
ADD COLUMN     "phone_number" TEXT,
ADD COLUMN     "position" TEXT;

-- CreateTable
CREATE TABLE "AgencyAdminProfile" (
    "admin_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "position" TEXT,
    "linkedin_url" TEXT,
    "company_role" TEXT,
    "branding_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyAdminProfile_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "RecruiterInvitation" (
    "invitation_id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "position" TEXT,
    "status" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterInvitation_pkey" PRIMARY KEY ("invitation_id")
);

-- AddForeignKey
ALTER TABLE "AgencyAdminProfile" ADD CONSTRAINT "AgencyAdminProfile_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterInvitation" ADD CONSTRAINT "RecruiterInvitation_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterInvitation" ADD CONSTRAINT "RecruiterInvitation_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
