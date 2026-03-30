/*
  Warnings:

  - A unique constraint covering the columns `[application_id,assessment_id]` on the table `candidate_assessment_invites` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "candidate_assessment_invites_application_id_key";

-- DropIndex
DROP INDEX "uniq_assessment_invite_per_candidate";

-- CreateIndex
CREATE INDEX "candidate_assessment_invites_application_id_idx" ON "candidate_assessment_invites"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_invite_per_application_assessment" ON "candidate_assessment_invites"("application_id", "assessment_id");
