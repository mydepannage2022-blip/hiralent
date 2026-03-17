-- AlterTable
ALTER TABLE "case_documents" ADD COLUMN     "ai_confidence_score" DOUBLE PRECISION,
ADD COLUMN     "ai_extracted_data" JSONB,
ADD COLUMN     "ai_validated_at" TIMESTAMP(3),
ADD COLUMN     "ai_validation_issues" JSONB,
ADD COLUMN     "ai_validation_job_id" TEXT,
ADD COLUMN     "ai_validation_signals" JSONB,
ADD COLUMN     "ai_validation_status" TEXT;
