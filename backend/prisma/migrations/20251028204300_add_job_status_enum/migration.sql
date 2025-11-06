/*
  Warnings:

  - The `required_skills` column on the `CompanyJob` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - The `status` column on the `CompanyJob` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "CompanyJob" DROP COLUMN "required_skills",
ADD COLUMN     "required_skills" TEXT[],
DROP COLUMN "status",
ADD COLUMN     "status" "JobStatus" NOT NULL DEFAULT 'DRAFT';
