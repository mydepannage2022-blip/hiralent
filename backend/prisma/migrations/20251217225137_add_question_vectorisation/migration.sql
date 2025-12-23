-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "embeddingHash" TEXT,
ADD COLUMN     "vectorId" TEXT,
ADD COLUMN     "vectorStored" BOOLEAN NOT NULL DEFAULT false;
