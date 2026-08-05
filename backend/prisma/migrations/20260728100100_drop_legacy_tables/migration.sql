-- Session 6 / Phase 2.6 (R-37): drop confirmed-dead tables.
-- question_bank & chat_history: 0 reads / 0 writes (superseded by `questions` and
-- ChatConversation/ChatMessage respectively). CandidateGlobalScore(+History):
-- write-only (upsert + history insert), never read — writer code removed in the same change.

-- DropForeignKey
ALTER TABLE "CandidateGlobalScore" DROP CONSTRAINT "CandidateGlobalScore_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "CandidateGlobalScoreHistory" DROP CONSTRAINT "CandidateGlobalScoreHistory_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "chat_history" DROP CONSTRAINT "chat_history_candidate_id_fkey";

-- DropTable
DROP TABLE "CandidateGlobalScore";

-- DropTable
DROP TABLE "CandidateGlobalScoreHistory";

-- DropTable
DROP TABLE "chat_history";

-- DropTable
DROP TABLE "question_bank";
