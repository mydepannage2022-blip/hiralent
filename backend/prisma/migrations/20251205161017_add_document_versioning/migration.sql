-- AlterTable
ALTER TABLE "case_documents" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "replaces_document_id" TEXT;
