-- AlterTable
ALTER TABLE "case_documents" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "replaces_document_id" TEXT,
ADD COLUMN     "review_feedback" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT;

-- AlterTable
ALTER TABLE "skill_assessments" ADD COLUMN     "employer_assessment_id" TEXT;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_employer_assessment_id_fkey" FOREIGN KEY ("employer_assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE SET NULL ON UPDATE CASCADE;
