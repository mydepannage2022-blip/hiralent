-- CreateEnum
CREATE TYPE "EmployerAssessmentStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- AlterTable
ALTER TABLE "skill_assessments" ADD COLUMN     "employer_assessment_id" TEXT;

-- CreateTable
CREATE TABLE "employer_assessments" (
    "assessment_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "EmployerAssessmentStatus" NOT NULL,
    "assessment_type" "AssessmentType" NOT NULL,
    "skill_category" TEXT NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "time_limit" INTEGER NOT NULL DEFAULT 60,
    "total_questions" INTEGER NOT NULL DEFAULT 20,
    "passing_score" INTEGER DEFAULT 70,
    "question_ids" TEXT[],
    "settings" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "compete_challenge" (
    "challenge_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "candidate_ids" TEXT[],
    "status" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "leaderboard" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compete_challenge_pkey" PRIMARY KEY ("challenge_id")
);

-- CreateIndex
CREATE INDEX "employer_assessments_company_id_idx" ON "employer_assessments"("company_id");

-- CreateIndex
CREATE INDEX "employer_assessments_job_id_idx" ON "employer_assessments"("job_id");

-- CreateIndex
CREATE INDEX "employer_assessments_status_idx" ON "employer_assessments"("status");

-- CreateIndex
CREATE INDEX "compete_challenge_assessment_id_idx" ON "compete_challenge"("assessment_id");

-- CreateIndex
CREATE INDEX "compete_challenge_status_idx" ON "compete_challenge"("status");

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_employer_assessment_id_fkey" FOREIGN KEY ("employer_assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_assessments" ADD CONSTRAINT "employer_assessments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_assessments" ADD CONSTRAINT "employer_assessments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compete_challenge" ADD CONSTRAINT "compete_challenge_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;
