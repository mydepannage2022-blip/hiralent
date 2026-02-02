-- AlterEnum
ALTER TYPE "AssessmentCreationMethod" ADD VALUE 'TEMPLATE';

-- AlterTable
ALTER TABLE "employer_assessments" ALTER COLUMN "question_ids" SET DEFAULT ARRAY[]::TEXT[],
ALTER COLUMN "extracted_skills" SET DEFAULT ARRAY[]::TEXT[];
