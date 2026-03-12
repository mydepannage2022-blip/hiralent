-- AlterTable
ALTER TABLE "candidate_assessment_insights" ADD COLUMN     "kpis" JSONB,
ADD COLUMN     "radar_ai" JSONB,
ADD COLUMN     "summary" TEXT;
