/*
  Warnings:

  - You are about to drop the column `embeddingHash` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `vectorId` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `vectorStored` on the `questions` table. All the data in the column will be lost.
  - You are about to drop the column `employer_assessment_id` on the `skill_assessments` table. All the data in the column will be lost.
  - You are about to drop the `compete_challenge` table. If the table is not empty, all the data it contains will be lost.

*/
-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "VerificationCaseStatus" ADD VALUE 'ACTIVE';
ALTER TYPE "VerificationCaseStatus" ADD VALUE 'PAUSED';
ALTER TYPE "VerificationCaseStatus" ADD VALUE 'COMPLETED';
ALTER TYPE "VerificationCaseStatus" ADD VALUE 'ARCHIVED';

-- DropForeignKey
ALTER TABLE "compete_challenge" DROP CONSTRAINT "compete_challenge_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "skill_assessments" DROP CONSTRAINT "skill_assessments_employer_assessment_id_fkey";

-- AlterTable
ALTER TABLE "questions" DROP COLUMN "embeddingHash",
DROP COLUMN "vectorId",
DROP COLUMN "vectorStored";

-- AlterTable
ALTER TABLE "skill_assessments" DROP COLUMN "employer_assessment_id";

-- DropTable
DROP TABLE "compete_challenge";

-- CreateTable
CREATE TABLE "compete_challenges" (
    "challenge_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,

    CONSTRAINT "compete_challenges_pkey" PRIMARY KEY ("challenge_id")
);

-- CreateTable
CREATE TABLE "code_submissions" (
    "submission_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "language" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "score" DOUBLE PRECISION,
    "runtime_ms" INTEGER,
    "memory_kb" INTEGER,
    "plagiarism_risk" DOUBLE PRECISION,
    "evidence" JSONB,
    "result" JSONB,
    "error" TEXT,
    "started_at" TIMESTAMP(3),
    "ended_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "code_submissions_pkey" PRIMARY KEY ("submission_id")
);

-- AddForeignKey
ALTER TABLE "compete_challenges" ADD CONSTRAINT "compete_challenges_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE RESTRICT ON UPDATE CASCADE;
