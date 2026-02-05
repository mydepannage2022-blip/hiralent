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
