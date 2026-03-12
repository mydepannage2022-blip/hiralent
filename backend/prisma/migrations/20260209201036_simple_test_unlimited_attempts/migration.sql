/*
  Warnings:

  - The values [SIMPLE_TEST_RESULT_READY] on the enum `NotificationType` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `passed` on the `candidate_job_simple_test_attempts` table. All the data in the column will be lost.
  - You are about to drop the column `passing_score` on the `job_simple_tests` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[application_id,attempt_no]` on the table `candidate_job_simple_test_attempts` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "NotificationType_new" AS ENUM ('APPLICATION_CONFIRMED', 'APPLICATION_STATUS_CHANGED', 'ASSESSMENT_INVITE', 'INTERVIEW_INVITE', 'GENERIC', 'JOB_APPLICATION_RECEIVED', 'JOB_APPLICATION_REJECTED', 'SIMPLE_TEST_INVITE', 'ASSESSMENT_INVITE_ACCEPTED', 'ASSESSMENT_EXPIRED');
ALTER TABLE "Notification" ALTER COLUMN "type" TYPE "NotificationType_new" USING ("type"::text::"NotificationType_new");
ALTER TYPE "NotificationType" RENAME TO "NotificationType_old";
ALTER TYPE "NotificationType_new" RENAME TO "NotificationType";
DROP TYPE "public"."NotificationType_old";
COMMIT;

-- DropIndex
DROP INDEX "candidate_job_simple_test_attempts_application_id_key";

-- DropIndex
DROP INDEX "candidate_job_simple_test_attempts_invite_id_key";

-- AlterTable
ALTER TABLE "candidate_job_simple_test_attempts" DROP COLUMN "passed",
ADD COLUMN     "attempt_no" INTEGER NOT NULL DEFAULT 1;

-- AlterTable
ALTER TABLE "job_simple_tests" DROP COLUMN "passing_score";

-- CreateIndex
CREATE INDEX "candidate_job_simple_test_attempts_invite_id_idx" ON "candidate_job_simple_test_attempts"("invite_id");

-- CreateIndex
CREATE INDEX "candidate_job_simple_test_attempts_application_id_idx" ON "candidate_job_simple_test_attempts"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_attempt_no_per_application" ON "candidate_job_simple_test_attempts"("application_id", "attempt_no");
