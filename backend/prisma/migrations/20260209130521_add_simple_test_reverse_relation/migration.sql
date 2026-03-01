/*
  Warnings:

  - You are about to drop the column `content` on the `job_simple_tests` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "SimpleTestQuestionKind" AS ENUM ('MCQ', 'CODING');

-- AlterTable
ALTER TABLE "job_simple_tests" DROP COLUMN "content",
ADD COLUMN     "is_system" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1;

-- CreateTable
CREATE TABLE "job_simple_test_questions" (
    "id" TEXT NOT NULL,
    "test_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "kind" "SimpleTestQuestionKind" NOT NULL,
    "order" INTEGER,

    CONSTRAINT "job_simple_test_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "job_simple_test_questions_test_id_idx" ON "job_simple_test_questions"("test_id");

-- CreateIndex
CREATE INDEX "job_simple_test_questions_question_id_idx" ON "job_simple_test_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "job_simple_test_questions_test_id_question_id_key" ON "job_simple_test_questions"("test_id", "question_id");

-- CreateIndex
CREATE INDEX "candidate_job_simple_test_attempts_job_id_idx" ON "candidate_job_simple_test_attempts"("job_id");

-- CreateIndex
CREATE INDEX "candidate_job_simple_test_invites_job_id_idx" ON "candidate_job_simple_test_invites"("job_id");

-- AddForeignKey
ALTER TABLE "job_simple_test_questions" ADD CONSTRAINT "job_simple_test_questions_test_id_fkey" FOREIGN KEY ("test_id") REFERENCES "job_simple_tests"("test_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_simple_test_questions" ADD CONSTRAINT "job_simple_test_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_invites" ADD CONSTRAINT "candidate_job_simple_test_invites_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_job_simple_test_attempts" ADD CONSTRAINT "candidate_job_simple_test_attempts_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;
