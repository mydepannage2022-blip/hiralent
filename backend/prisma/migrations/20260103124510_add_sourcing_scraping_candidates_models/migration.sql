-- CreateEnum
CREATE TYPE "SourcedCandidateStatus" AS ENUM ('NEW', 'ACTIVE', 'HIDDEN', 'CONVERTED');

-- CreateEnum
CREATE TYPE "SourcingRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateTable
CREATE TABLE "SourcedCandidate" (
    "sourced_candidate_id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "source_uid" TEXT,
    "source_profile_url" TEXT,
    "source_run_id" TEXT,
    "full_name" TEXT,
    "headline" TEXT,
    "about_me" VARCHAR(800),
    "location" TEXT,
    "city" TEXT,
    "skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "links" JSONB,
    "email" TEXT,
    "phone" TEXT,
    "linkedin_url" TEXT,
    "fingerprint" TEXT NOT NULL,
    "status" "SourcedCandidateStatus" NOT NULL DEFAULT 'NEW',
    "user_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SourcedCandidate_pkey" PRIMARY KEY ("sourced_candidate_id")
);

-- CreateTable
CREATE TABLE "SourcingRun" (
    "run_id" TEXT NOT NULL,
    "status" "SourcingRunStatus" NOT NULL DEFAULT 'QUEUED',
    "triggered_by_user_id" TEXT,
    "sources" TEXT[],
    "query" TEXT,
    "filters" JSONB,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "total_found" INTEGER NOT NULL DEFAULT 0,
    "total_saved" INTEGER NOT NULL DEFAULT 0,
    "total_skipped" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,

    CONSTRAINT "SourcingRun_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable
CREATE TABLE "SourcingRunItem" (
    "item_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "sourced_candidate_id" TEXT,
    "source" TEXT NOT NULL,
    "source_uid" TEXT,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "raw" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourcingRunItem_pkey" PRIMARY KEY ("item_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SourcedCandidate_fingerprint_key" ON "SourcedCandidate"("fingerprint");

-- CreateIndex
CREATE UNIQUE INDEX "SourcedCandidate_user_id_key" ON "SourcedCandidate"("user_id");

-- CreateIndex
CREATE INDEX "SourcedCandidate_source_idx" ON "SourcedCandidate"("source");

-- CreateIndex
CREATE INDEX "SourcedCandidate_email_idx" ON "SourcedCandidate"("email");

-- CreateIndex
CREATE INDEX "SourcedCandidate_linkedin_url_idx" ON "SourcedCandidate"("linkedin_url");

-- CreateIndex
CREATE INDEX "SourcingRun_status_idx" ON "SourcingRun"("status");

-- CreateIndex
CREATE INDEX "SourcingRunItem_run_id_idx" ON "SourcingRunItem"("run_id");

-- AddForeignKey
ALTER TABLE "SourcedCandidate" ADD CONSTRAINT "SourcedCandidate_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingRun" ADD CONSTRAINT "SourcingRun_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by_user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingRunItem" ADD CONSTRAINT "SourcingRunItem_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "SourcingRun"("run_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourcingRunItem" ADD CONSTRAINT "SourcingRunItem_sourced_candidate_id_fkey" FOREIGN KEY ("sourced_candidate_id") REFERENCES "SourcedCandidate"("sourced_candidate_id") ON DELETE SET NULL ON UPDATE CASCADE;
