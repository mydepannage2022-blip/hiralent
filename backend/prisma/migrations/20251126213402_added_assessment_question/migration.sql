-- CreateTable
CREATE TABLE "assessment_questions" (
    "id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 1,
    "section" TEXT,
    "isReserve" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "assessment_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_questions_assessment_id_idx" ON "assessment_questions"("assessment_id");

-- CreateIndex
CREATE INDEX "assessment_questions_question_id_idx" ON "assessment_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_questions_assessment_id_question_id_key" ON "assessment_questions"("assessment_id", "question_id");

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_questions" ADD CONSTRAINT "assessment_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
