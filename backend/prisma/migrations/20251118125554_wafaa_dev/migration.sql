-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "correctAnswer" TEXT,
ADD COLUMN     "explanation" TEXT,
ADD COLUMN     "options" JSONB;
