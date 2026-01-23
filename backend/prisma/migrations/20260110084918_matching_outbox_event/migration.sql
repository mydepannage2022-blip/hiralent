/*
  Warnings:

  - You are about to drop the column `combined_vector` on the `CandidateVector` table. All the data in the column will be lost.
  - You are about to drop the column `education_vector` on the `CandidateVector` table. All the data in the column will be lost.
  - You are about to drop the column `experience_vector` on the `CandidateVector` table. All the data in the column will be lost.
  - You are about to drop the column `last_updated` on the `CandidateVector` table. All the data in the column will be lost.
  - You are about to drop the column `skill_vector` on the `CandidateVector` table. All the data in the column will be lost.
  - You are about to drop the column `combined_vector` on the `JobVector` table. All the data in the column will be lost.
  - You are about to drop the column `last_updated` on the `JobVector` table. All the data in the column will be lost.
  - You are about to drop the column `requirements_vector` on the `JobVector` table. All the data in the column will be lost.
  - You are about to drop the column `skills_vector` on the `JobVector` table. All the data in the column will be lost.
  - Added the required column `updated_at` to the `CandidateVector` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updated_at` to the `JobVector` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "VectorIndexStatus" AS ENUM ('PENDING', 'INDEXED', 'FAILED');

-- CreateEnum
CREATE TYPE "OutboxStatus" AS ENUM ('PENDING', 'SENT', 'FAILED');

-- CreateEnum
CREATE TYPE "MatchingEventType" AS ENUM ('JOB_UPDATED', 'CANDIDATE_UPDATED');

-- CreateEnum
CREATE TYPE "MatchingEntityType" AS ENUM ('JOB', 'CANDIDATE');

-- DropForeignKey
ALTER TABLE "JobVector" DROP CONSTRAINT "JobVector_job_id_fkey";

-- AlterTable
ALTER TABLE "CandidateVector" DROP COLUMN "combined_vector",
DROP COLUMN "education_vector",
DROP COLUMN "experience_vector",
DROP COLUMN "last_updated",
DROP COLUMN "skill_vector",
ADD COLUMN     "embedding_hash" TEXT,
ADD COLUMN     "indexed_at" TIMESTAMP(3),
ADD COLUMN     "last_attempt_at" TIMESTAMP(3),
ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "qdrant_point_id" TEXT,
ADD COLUMN     "status" "VectorIndexStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "vector_version" SET DEFAULT 'v1';

-- AlterTable
ALTER TABLE "JobRecommendation" ADD COLUMN     "candidate_embedding_hash" TEXT,
ADD COLUMN     "job_embedding_hash" TEXT,
ADD COLUMN     "trigger" TEXT,
ADD COLUMN     "vector_score" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "JobVector" DROP COLUMN "combined_vector",
DROP COLUMN "last_updated",
DROP COLUMN "requirements_vector",
DROP COLUMN "skills_vector",
ADD COLUMN     "embedding_hash" TEXT,
ADD COLUMN     "indexed_at" TIMESTAMP(3),
ADD COLUMN     "last_attempt_at" TIMESTAMP(3),
ADD COLUMN     "last_error" TEXT,
ADD COLUMN     "provider" TEXT,
ADD COLUMN     "qdrant_point_id" TEXT,
ADD COLUMN     "status" "VectorIndexStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "vector_version" SET DEFAULT 'v1';

-- CreateTable
CREATE TABLE "MatchingOutboxEvent" (
    "event_id" TEXT NOT NULL,
    "event_type" "MatchingEventType" NOT NULL,
    "entity_id" TEXT NOT NULL,
    "entity_type" "MatchingEntityType" NOT NULL,
    "payload" JSONB,
    "status" "OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "dedupe_key" TEXT,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MatchingOutboxEvent_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MatchingOutboxEvent_dedupe_key_key" ON "MatchingOutboxEvent"("dedupe_key");

-- CreateIndex
CREATE INDEX "MatchingOutboxEvent_status_idx" ON "MatchingOutboxEvent"("status");

-- CreateIndex
CREATE INDEX "MatchingOutboxEvent_entity_id_idx" ON "MatchingOutboxEvent"("entity_id");

-- CreateIndex
CREATE INDEX "CandidateVector_status_idx" ON "CandidateVector"("status");

-- CreateIndex
CREATE INDEX "CandidateVector_embedding_hash_idx" ON "CandidateVector"("embedding_hash");

-- CreateIndex
CREATE INDEX "JobVector_status_idx" ON "JobVector"("status");

-- CreateIndex
CREATE INDEX "JobVector_embedding_hash_idx" ON "JobVector"("embedding_hash");

-- AddForeignKey
ALTER TABLE "JobVector" ADD CONSTRAINT "JobVector_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;
