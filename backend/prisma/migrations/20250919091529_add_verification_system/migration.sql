/*
  Warnings:

  - The `status` column on the `CompanyVerification` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - A unique constraint covering the columns `[latest_run_id]` on the table `AgencyVerification` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[latest_run_id]` on the table `CompanyVerification` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "public"."VerificationSubjectType" AS ENUM ('COMPANY', 'AGENCY');

-- CreateEnum
CREATE TYPE "public"."VerificationRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "public"."VerificationDecision" AS ENUM ('APPROVE', 'REJECT', 'MANUAL_REVIEW', 'NO_DECISION');

-- CreateEnum
CREATE TYPE "public"."VerificationCaseStatus" AS ENUM ('DRAFT', 'PENDING_DOCUMENTS', 'IN_REVIEW', 'AUTO_APPROVED', 'AUTO_REJECTED', 'APPROVED', 'REJECTED', 'EXPIRED');

-- AlterTable
ALTER TABLE "public"."AgencyVerification" ADD COLUMN     "latest_run_id" TEXT,
ADD COLUMN     "reason_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "risk_score" DOUBLE PRECISION,
ADD COLUMN     "status" "public"."VerificationCaseStatus" NOT NULL DEFAULT 'DRAFT';

-- AlterTable
ALTER TABLE "public"."CompanyVerification" ADD COLUMN     "latest_run_id" TEXT,
ADD COLUMN     "reason_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "risk_score" DOUBLE PRECISION,
DROP COLUMN "status",
ADD COLUMN     "status" "public"."VerificationCaseStatus" NOT NULL DEFAULT 'DRAFT';

-- CreateTable
CREATE TABLE "public"."VerificationRun" (
    "run_id" TEXT NOT NULL,
    "subject_type" "public"."VerificationSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "status" "public"."VerificationRunStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "risk_score" DOUBLE PRECISION,
    "decision" "public"."VerificationDecision",
    "reason_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "VerificationRun_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable
CREATE TABLE "public"."VerificationSignal" (
    "signal_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION,
    "explanation" TEXT,
    "raw_payload" JSONB,

    CONSTRAINT "VerificationSignal_pkey" PRIMARY KEY ("signal_id")
);

-- CreateTable
CREATE TABLE "public"."VerificationSnapshot" (
    "snapshot_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "profile" JSONB NOT NULL,
    "documents" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationSnapshot_pkey" PRIMARY KEY ("snapshot_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "VerificationSnapshot_run_id_key" ON "public"."VerificationSnapshot"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyVerification_latest_run_id_key" ON "public"."AgencyVerification"("latest_run_id");

-- CreateIndex
CREATE INDEX "AgencyVerification_agency_id_idx" ON "public"."AgencyVerification"("agency_id");

-- CreateIndex
CREATE INDEX "AgencyVerification_status_idx" ON "public"."AgencyVerification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyVerification_latest_run_id_key" ON "public"."CompanyVerification"("latest_run_id");

-- CreateIndex
CREATE INDEX "CompanyVerification_company_id_idx" ON "public"."CompanyVerification"("company_id");

-- CreateIndex
CREATE INDEX "CompanyVerification_status_idx" ON "public"."CompanyVerification"("status");

-- AddForeignKey
ALTER TABLE "public"."VerificationSignal" ADD CONSTRAINT "VerificationSignal_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."VerificationRun"("run_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VerificationSnapshot" ADD CONSTRAINT "VerificationSnapshot_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "public"."VerificationRun"("run_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyVerification" ADD CONSTRAINT "CompanyVerification_latest_run_id_fkey" FOREIGN KEY ("latest_run_id") REFERENCES "public"."VerificationRun"("run_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgencyVerification" ADD CONSTRAINT "AgencyVerification_latest_run_id_fkey" FOREIGN KEY ("latest_run_id") REFERENCES "public"."VerificationRun"("run_id") ON DELETE SET NULL ON UPDATE CASCADE;
