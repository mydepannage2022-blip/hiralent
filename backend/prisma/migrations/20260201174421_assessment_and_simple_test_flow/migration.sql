-- CreateEnum
CREATE TYPE "SimpleTestInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "SimpleTestAttemptStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'SUBMITTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "CandidateAssessmentInviteStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED', 'EXPIRED');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'JOB_APPLICATION_RECEIVED';
ALTER TYPE "NotificationType" ADD VALUE 'JOB_APPLICATION_REJECTED';
ALTER TYPE "NotificationType" ADD VALUE 'SIMPLE_TEST_INVITE';
ALTER TYPE "NotificationType" ADD VALUE 'SIMPLE_TEST_RESULT_READY';
ALTER TYPE "NotificationType" ADD VALUE 'ASSESSMENT_INVITE_ACCEPTED';
ALTER TYPE "NotificationType" ADD VALUE 'ASSESSMENT_EXPIRED';

-- CreateTable
CREATE TABLE "job_simple_tests" (
    "test_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "time_limit_min" INTEGER NOT NULL DEFAULT 10,
    "passing_score" INTEGER DEFAULT 60,
    "content" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_simple_tests_pkey" PRIMARY KEY ("test_id")
);

-- CreateTable
CREATE TABLE "candidate_job_simple_test_invites" (
    "invite_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" "SimpleTestInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_job_simple_test_invites_pkey" PRIMARY KEY ("invite_id")
);

-- CreateTable
CREATE TABLE "candidate_job_simple_test_attempts" (
    "attempt_id" TEXT NOT NULL,
    "invite_id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "status" "SimpleTestAttemptStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "started_at" TIMESTAMP(3),
    "submitted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "answers" JSONB,
    "score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "result_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_job_simple_test_attempts_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "candidate_assessment_invites" (
    "invite_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "status" "CandidateAssessmentInviteStatus" NOT NULL DEFAULT 'PENDING',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "declined_at" TIMESTAMP(3),
    "session_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_assessment_invites_pkey" PRIMARY KEY ("invite_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "job_simple_tests_job_id_key" ON "job_simple_tests"("job_id");

-- CreateIndex
CREATE INDEX "job_simple_tests_company_id_idx" ON "job_simple_tests"("company_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_job_simple_test_invites_application_id_key" ON "candidate_job_simple_test_invites"("application_id");

-- CreateIndex
CREATE INDEX "candidate_job_simple_test_invites_candidate_id_status_idx" ON "candidate_job_simple_test_invites"("candidate_id", "status");

-- CreateIndex
CREATE INDEX "candidate_job_simple_test_invites_company_id_status_idx" ON "candidate_job_simple_test_invites"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_simple_test_invite_per_candidate" ON "candidate_job_simple_test_invites"("test_id", "candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_job_simple_test_attempts_invite_id_key" ON "candidate_job_simple_test_attempts"("invite_id");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_job_simple_test_attempts_application_id_key" ON "candidate_job_simple_test_attempts"("application_id");

-- CreateIndex
CREATE INDEX "candidate_job_simple_test_attempts_candidate_id_status_idx" ON "candidate_job_simple_test_attempts"("candidate_id", "status");

-- CreateIndex
CREATE INDEX "candidate_job_simple_test_attempts_test_id_status_idx" ON "candidate_job_simple_test_attempts"("test_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_assessment_invites_application_id_key" ON "candidate_assessment_invites"("application_id");

-- CreateIndex
CREATE INDEX "candidate_assessment_invites_candidate_id_status_idx" ON "candidate_assessment_invites"("candidate_id", "status");

-- CreateIndex
CREATE INDEX "candidate_assessment_invites_company_id_status_idx" ON "candidate_assessment_invites"("company_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_assessment_invite_per_candidate" ON "candidate_assessment_invites"("assessment_id", "candidate_id");

-- AddForeignKey
ALTER TABLE "job_simple_tests" ADD CONSTRAINT "job_simple_tests_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_simple_tests" ADD CONSTRAINT "job_simple_tests_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_invites" ADD CONSTRAINT "candidate_job_simple_test_invites_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "job_simple_tests"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_invites" ADD CONSTRAINT "candidate_job_simple_test_invites_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_invites" ADD CONSTRAINT "candidate_job_simple_test_invites_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_invites" ADD CONSTRAINT "candidate_job_simple_test_invites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_attempts" ADD CONSTRAINT "candidate_job_simple_test_attempts_invite_id_fkey" FOREIGN KEY ("invite_id") REFERENCES "candidate_job_simple_test_invites"("invite_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_attempts" ADD CONSTRAINT "candidate_job_simple_test_attempts_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "job_simple_tests"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_attempts" ADD CONSTRAINT "candidate_job_simple_test_attempts_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_attempts" ADD CONSTRAINT "candidate_job_simple_test_attempts_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_invites" ADD CONSTRAINT "candidate_assessment_invites_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_invites" ADD CONSTRAINT "candidate_assessment_invites_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_invites" ADD CONSTRAINT "candidate_assessment_invites_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_invites" ADD CONSTRAINT "candidate_assessment_invites_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
