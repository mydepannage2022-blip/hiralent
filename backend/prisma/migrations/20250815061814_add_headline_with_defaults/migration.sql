-- AlterTable
ALTER TABLE "public"."CandidateProfile" ADD COLUMN     "headline" VARCHAR(120);

-- AlterTable
ALTER TABLE "public"."ProfileCompleteness" ADD COLUMN     "headline_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0;
