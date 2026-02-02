-- CreateEnum
CREATE TYPE "AssessmentTemplateStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentTemplateProvider" AS ENUM ('INTERNAL', 'HACKERRANK', 'CUSTOM');

-- AlterTable
ALTER TABLE "employer_assessments" ADD COLUMN     "template_id" TEXT;

-- CreateTable
CREATE TABLE "assessment_templates" (
    "template_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "assessment_type" "AssessmentType" NOT NULL,
    "skill_category" TEXT NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "time_limit" INTEGER NOT NULL DEFAULT 60,
    "total_questions" INTEGER NOT NULL DEFAULT 20,
    "passing_score" INTEGER DEFAULT 70,
    "extracted_skills" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "settings" JSONB,
    "enhanced_data" JSONB,
    "provider" "AssessmentTemplateProvider" NOT NULL DEFAULT 'INTERNAL',
    "status" "AssessmentTemplateStatus" NOT NULL DEFAULT 'DRAFT',
    "created_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "assessment_templates_pkey" PRIMARY KEY ("template_id")
);

-- CreateTable
CREATE TABLE "assessment_template_questions" (
    "id" TEXT NOT NULL,
    "template_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "order" INTEGER,
    "points" INTEGER NOT NULL DEFAULT 1,
    "section" TEXT,
    "isReserve" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "assessment_template_questions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "assessment_templates_status_idx" ON "assessment_templates"("status");

-- CreateIndex
CREATE INDEX "assessment_templates_provider_idx" ON "assessment_templates"("provider");

-- CreateIndex
CREATE INDEX "assessment_templates_difficulty_idx" ON "assessment_templates"("difficulty");

-- CreateIndex
CREATE INDEX "assessment_template_questions_template_id_idx" ON "assessment_template_questions"("template_id");

-- CreateIndex
CREATE INDEX "assessment_template_questions_question_id_idx" ON "assessment_template_questions"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_template_questions_template_id_question_id_key" ON "assessment_template_questions"("template_id", "question_id");

-- CreateIndex
CREATE INDEX "employer_assessments_template_id_idx" ON "employer_assessments"("template_id");

-- AddForeignKey
ALTER TABLE "employer_assessments" ADD CONSTRAINT "employer_assessments_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "assessment_templates"("template_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_templates" ADD CONSTRAINT "assessment_templates_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_template_questions" ADD CONSTRAINT "assessment_template_questions_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "assessment_templates"("template_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_template_questions" ADD CONSTRAINT "assessment_template_questions_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
