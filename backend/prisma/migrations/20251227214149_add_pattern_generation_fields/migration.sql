-- AlterTable
ALTER TABLE "AlgorithmPattern" ADD COLUMN     "questionsGenerated" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "questions" ADD COLUMN     "generatedFromPattern" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "patternDifficultyVariant" TEXT,
ADD COLUMN     "patternKey" TEXT;
