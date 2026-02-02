/*
  Warnings:

  - The `status` column on the `JobApplication` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[candidate_id,job_id]` on the table `JobApplication` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "JobApplicationStatus" AS ENUM ('APPLIED', 'ASSESSMENT_REQUIRED', 'INTERVIEW_REQUIRED', 'SCREENING', 'SHORTLISTED', 'OFFERED', 'HIRED', 'REJECTED');

-- AlterTable
ALTER TABLE "CompanyJob" ADD COLUMN     "min_profile_score" DOUBLE PRECISION,
ADD COLUMN     "required_fields" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- AlterTable
ALTER TABLE "JobApplication" DROP COLUMN "status",
ADD COLUMN     "status" "JobApplicationStatus" NOT NULL DEFAULT 'APPLIED';

-- CreateIndex
CREATE INDEX "CompanyJob_status_idx" ON "CompanyJob"("status");

-- CreateIndex
CREATE INDEX "CompanyJob_experience_level_idx" ON "CompanyJob"("experience_level");

-- CreateIndex
CREATE INDEX "CompanyJob_created_at_idx" ON "CompanyJob"("created_at");

-- CreateIndex
CREATE INDEX "JobApplication_candidate_id_idx" ON "JobApplication"("candidate_id");

-- CreateIndex
CREATE INDEX "JobApplication_job_id_idx" ON "JobApplication"("job_id");

-- CreateIndex
CREATE INDEX "JobApplication_status_idx" ON "JobApplication"("status");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplication_candidate_id_job_id_key" ON "JobApplication"("candidate_id", "job_id");
