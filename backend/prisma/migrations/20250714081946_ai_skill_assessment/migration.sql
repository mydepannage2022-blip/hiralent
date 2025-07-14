/*
  Warnings:

  - You are about to drop the `SkillAssessment` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('QUICK_CHECK', 'COMPREHENSIVE', 'CERTIFICATION', 'COMPANY_SPECIFIC');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'CODING', 'ESSAY', 'TRUE_FALSE', 'SCENARIO');

-- DropForeignKey
ALTER TABLE "SkillAssessment" DROP CONSTRAINT "SkillAssessment_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "SkillAssessment" DROP CONSTRAINT "SkillAssessment_job_id_fkey";

-- DropTable
DROP TABLE "SkillAssessment";

-- CreateTable
CREATE TABLE "skill_assessments" (
    "assessment_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT,
    "provider" TEXT NOT NULL,
    "score" TEXT,
    "status" "AssessmentStatus" NOT NULL DEFAULT 'PENDING',
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "assessment_type" "AssessmentType" NOT NULL DEFAULT 'COMPREHENSIVE',
    "skill_category" TEXT NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL DEFAULT 'BEGINNER',
    "total_questions" INTEGER NOT NULL DEFAULT 20,
    "time_limit" INTEGER NOT NULL DEFAULT 30,
    "current_question" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3),
    "questions" JSONB NOT NULL,
    "answers" JSONB NOT NULL,
    "overall_score" DOUBLE PRECISION,
    "skill_level_result" TEXT,
    "strengths" TEXT[],
    "weaknesses" TEXT[],
    "recommendations" TEXT[],
    "ai_analysis" JSONB,
    "confidence_score" DOUBLE PRECISION,

    CONSTRAINT "skill_assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "assessment_results" (
    "result_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "expected_answer" TEXT,
    "user_answer" TEXT NOT NULL,
    "is_correct" BOOLEAN,
    "partial_score" DOUBLE PRECISION,
    "time_taken" INTEGER NOT NULL,
    "ai_evaluation" JSONB,
    "feedback" TEXT,
    "answered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_results_pkey" PRIMARY KEY ("result_id")
);

-- CreateTable
CREATE TABLE "question_bank" (
    "question_id" TEXT NOT NULL,
    "question_text" TEXT NOT NULL,
    "question_type" "QuestionType" NOT NULL,
    "skill_category" TEXT NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "options" JSONB,
    "correct_answer" TEXT,
    "explanation" TEXT,
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "generated_by" TEXT,
    "times_used" INTEGER NOT NULL DEFAULT 0,
    "avg_score" DOUBLE PRECISION,
    "difficulty_index" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "question_bank_pkey" PRIMARY KEY ("question_id")
);

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "RecruiterJob"("job_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "skill_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;
