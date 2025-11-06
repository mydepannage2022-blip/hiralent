/*
  Warnings:

  - Added the required column `creation_method` to the `employer_assessments` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "AssessmentCreationMethod" AS ENUM ('JOB_DESCRIPTION_PARSE', 'CHATBOT_GUIDED');

-- AlterTable
ALTER TABLE "employer_assessments" ADD COLUMN     "auto_generated" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "creation_method" "AssessmentCreationMethod" NOT NULL,
ADD COLUMN     "enhanced_data" JSONB,
ADD COLUMN     "extracted_skills" TEXT[];
