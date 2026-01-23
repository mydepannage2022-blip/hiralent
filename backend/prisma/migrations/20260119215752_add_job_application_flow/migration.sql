-- CreateEnum
CREATE TYPE "JobApplicationEventType" AS ENUM ('APPLIED_CREATED', 'ASSESSMENT_REQUIRED', 'INTERVIEW_REQUIRED', 'STATUS_UPDATED');

-- CreateEnum
CREATE TYPE "JobApplicationEventStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "recommendation_id" TEXT,
ADD COLUMN     "relevance_score" DOUBLE PRECISION,
ADD COLUMN     "score_version" TEXT,
ADD COLUMN     "scored_at" TIMESTAMP(3),
ADD COLUMN     "trigger" TEXT,
ADD COLUMN     "vector_score" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "JobApplicationScoreHistory" (
    "history_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "relevance_score" DOUBLE PRECISION NOT NULL,
    "vector_score" DOUBLE PRECISION,
    "trigger" TEXT,
    "reason_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "missing_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "breakdown" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by" TEXT,
    "source" TEXT,

    CONSTRAINT "JobApplicationScoreHistory_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "JobApplicationEventOutbox" (
    "event_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "type" "JobApplicationEventType" NOT NULL,
    "payload" JSONB,
    "status" "JobApplicationEventStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "dedupe_key" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobApplicationEventOutbox_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "CandidateGlobalScore" (
    "candidate_id" TEXT NOT NULL,
    "total_score" DOUBLE PRECISION NOT NULL,
    "components" JSONB,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateGlobalScore_pkey" PRIMARY KEY ("candidate_id")
);

-- CreateTable
CREATE TABLE "CandidateGlobalScoreHistory" (
    "history_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "total_score" DOUBLE PRECISION NOT NULL,
    "components" JSONB,
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateGlobalScoreHistory_pkey" PRIMARY KEY ("history_id")
);

-- CreateIndex
CREATE INDEX "JobApplicationScoreHistory_application_id_idx" ON "JobApplicationScoreHistory"("application_id");

-- CreateIndex
CREATE INDEX "JobApplicationScoreHistory_created_at_idx" ON "JobApplicationScoreHistory"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "JobApplicationEventOutbox_dedupe_key_key" ON "JobApplicationEventOutbox"("dedupe_key");

-- CreateIndex
CREATE INDEX "JobApplicationEventOutbox_status_idx" ON "JobApplicationEventOutbox"("status");

-- CreateIndex
CREATE INDEX "JobApplicationEventOutbox_application_id_idx" ON "JobApplicationEventOutbox"("application_id");

-- CreateIndex
CREATE INDEX "JobApplicationEventOutbox_type_idx" ON "JobApplicationEventOutbox"("type");

-- CreateIndex
CREATE INDEX "CandidateGlobalScoreHistory_candidate_id_idx" ON "CandidateGlobalScoreHistory"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateGlobalScoreHistory_created_at_idx" ON "CandidateGlobalScoreHistory"("created_at");

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_recommendation_id_fkey" FOREIGN KEY ("recommendation_id") REFERENCES "JobRecommendation"("recommendation_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationScoreHistory" ADD CONSTRAINT "JobApplicationScoreHistory_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplicationEventOutbox" ADD CONSTRAINT "JobApplicationEventOutbox_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateGlobalScore" ADD CONSTRAINT "CandidateGlobalScore_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateGlobalScoreHistory" ADD CONSTRAINT "CandidateGlobalScoreHistory_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
