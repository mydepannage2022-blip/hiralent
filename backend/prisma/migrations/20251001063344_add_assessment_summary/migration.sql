-- CreateTable
CREATE TABLE "public"."assessment_summaries" (
    "summary_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "skill_level" TEXT NOT NULL,
    "pass_status" TEXT NOT NULL,
    "correct_answers" INTEGER NOT NULL,
    "incorrect_answers" INTEGER NOT NULL,
    "partial_answers" INTEGER NOT NULL DEFAULT 0,
    "total_questions" INTEGER NOT NULL,
    "accuracy_rate" DOUBLE PRECISION NOT NULL,
    "total_time_spent" INTEGER NOT NULL,
    "avg_time_per_question" DOUBLE PRECISION NOT NULL,
    "category_scores" JSONB,
    "difficulty_scores" JSONB NOT NULL,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "recommendations" TEXT[],
    "next_steps" TEXT[],
    "ai_confidence" DOUBLE PRECISION NOT NULL,
    "achievements" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "badges_earned" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_summaries_pkey" PRIMARY KEY ("summary_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_summaries_assessment_id_key" ON "public"."assessment_summaries"("assessment_id");

-- AddForeignKey
ALTER TABLE "public"."assessment_summaries" ADD CONSTRAINT "assessment_summaries_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "public"."skill_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;
