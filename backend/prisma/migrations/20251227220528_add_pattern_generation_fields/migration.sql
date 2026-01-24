/*
  Warnings:

  - A unique constraint covering the columns `[patternKey,patternDifficultyVariant]` on the table `questions` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "questions_patternKey_patternDifficultyVariant_key" ON "questions"("patternKey", "patternDifficultyVariant");
