-- AlterTable
ALTER TABLE "public"."CandidateProfile" ADD COLUMN     "about_me" VARCHAR(500),
ADD COLUMN     "city" TEXT,
ADD COLUMN     "job_benefits" TEXT,
ADD COLUMN     "links" TEXT;
