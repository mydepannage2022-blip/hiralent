/*
  Warnings:

  - A unique constraint covering the columns `[candidate_id,job_id]` on the table `JobRecommendation` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "JobRecommendation" ADD COLUMN     "is_eligible" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "missing_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "reason_codes" TEXT[] DEFAULT ARRAY[]::TEXT[];

-- CreateIndex
CREATE UNIQUE INDEX "JobRecommendation_candidate_id_job_id_key" ON "JobRecommendation"("candidate_id", "job_id");
