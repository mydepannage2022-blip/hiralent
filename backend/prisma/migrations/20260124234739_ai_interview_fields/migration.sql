/*
  Warnings:

  - You are about to drop the column `ai_confidence_score` on the `case_documents` table. All the data in the column will be lost.
  - You are about to drop the column `ai_extracted_data` on the `case_documents` table. All the data in the column will be lost.
  - You are about to drop the column `ai_validated_at` on the `case_documents` table. All the data in the column will be lost.
  - You are about to drop the column `ai_validation_issues` on the `case_documents` table. All the data in the column will be lost.
  - You are about to drop the column `ai_validation_job_id` on the `case_documents` table. All the data in the column will be lost.
  - You are about to drop the column `ai_validation_signals` on the `case_documents` table. All the data in the column will be lost.
  - You are about to drop the column `ai_validation_status` on the `case_documents` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "AIInterviewStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AIQualification" AS ENUM ('QUALIFIED', 'NOT_QUALIFIED', 'PENDING_REVIEW');

-- AlterTable
ALTER TABLE "AIInterviewResult" ADD COLUMN     "completed_at" TIMESTAMP(3),
ADD COLUMN     "duration_seconds" INTEGER,
ADD COLUMN     "job_id" TEXT,
ADD COLUMN     "qualification" "AIQualification",
ADD COLUMN     "questions_asked" JSONB,
ADD COLUMN     "responses" JSONB,
ADD COLUMN     "sentiment_analysis" JSONB,
ADD COLUMN     "soft_skills" JSONB,
ADD COLUMN     "started_at" TIMESTAMP(3),
ADD COLUMN     "status" "AIInterviewStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "total_questions" INTEGER,
ADD COLUMN     "transcript" JSONB;

-- AlterTable
ALTER TABLE "case_documents" DROP COLUMN "ai_confidence_score",
DROP COLUMN "ai_extracted_data",
DROP COLUMN "ai_validated_at",
DROP COLUMN "ai_validation_issues",
DROP COLUMN "ai_validation_job_id",
DROP COLUMN "ai_validation_signals",
DROP COLUMN "ai_validation_status";
