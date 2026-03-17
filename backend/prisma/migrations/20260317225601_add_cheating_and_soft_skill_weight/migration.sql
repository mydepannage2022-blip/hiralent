-- AlterTable
ALTER TABLE "AIInterviewResult" ADD COLUMN     "cheating_events" JSONB,
ADD COLUMN     "soft_skill_weight" INTEGER DEFAULT 70;
