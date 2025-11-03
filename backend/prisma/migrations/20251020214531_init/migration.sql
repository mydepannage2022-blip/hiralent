/*
  Warnings:

  - You are about to drop the column `verification_notes` on the `CompanyProfile` table. All the data in the column will be lost.
  - You are about to drop the column `verification_status` on the `CompanyProfile` table. All the data in the column will be lost.
  - You are about to drop the column `verification_submitted_at` on the `CompanyProfile` table. All the data in the column will be lost.
  - You are about to drop the `UploadedDocument` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "public"."SubmissionStatus" AS ENUM ('PENDING', 'RUNNING', 'PASSED', 'FAILED', 'ERROR');

-- DropForeignKey
ALTER TABLE "public"."UploadedDocument" DROP CONSTRAINT "UploadedDocument_uploaded_by_fkey";

-- AlterTable
ALTER TABLE "public"."CompanyProfile" DROP COLUMN "verification_notes",
DROP COLUMN "verification_status",
DROP COLUMN "verification_submitted_at";

-- DropTable
DROP TABLE "public"."UploadedDocument";

-- CreateTable
CREATE TABLE "public"."code_submissions" (
    "submission_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" "public"."SubmissionStatus" NOT NULL DEFAULT 'PENDING',
    "score" DOUBLE PRECISION,
    "runtime_ms" INTEGER,
    "memory_kb" INTEGER,
    "plagiarism_risk" DOUBLE PRECISION,
    "evidence" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_submissions_pkey" PRIMARY KEY ("submission_id")
);

-- AddForeignKey
ALTER TABLE "public"."code_submissions" ADD CONSTRAINT "code_submissions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."code_submissions" ADD CONSTRAINT "code_submissions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."skill_assessments"("assessment_id") ON DELETE RESTRICT ON UPDATE CASCADE;
