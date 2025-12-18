-- AlterTable
ALTER TABLE "case_documents" ADD COLUMN     "review_feedback" TEXT,
ADD COLUMN     "reviewed_at" TIMESTAMP(3),
ADD COLUMN     "reviewed_by" TEXT;
