-- CreateTable
CREATE TABLE "CandidateDocument" (
    "document_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "upload_status" TEXT NOT NULL,
    "extraction_status" TEXT,
    "processed_text" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateDocument_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "CandidateSkill" (
    "skill_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "skill_name" TEXT NOT NULL,
    "skill_category" TEXT,
    "proficiency" TEXT,
    "years_experience" INTEGER,
    "confidence_score" DOUBLE PRECISION,
    "source_type" TEXT NOT NULL,
    "source_document_id" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateSkill_pkey" PRIMARY KEY ("skill_id")
);

-- CreateTable
CREATE TABLE "SkillExtraction" (
    "extraction_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "ai_provider" TEXT NOT NULL,
    "prompt_used" TEXT,
    "raw_response" TEXT,
    "extracted_skills" JSONB,
    "processing_time" INTEGER,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillExtraction_pkey" PRIMARY KEY ("extraction_id")
);

-- CreateTable
CREATE TABLE "CareerPrediction" (
    "prediction_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "current_role" TEXT,
    "predicted_roles" JSONB NOT NULL,
    "career_path" JSONB NOT NULL,
    "skill_gaps" JSONB NOT NULL,
    "salary_prediction" JSONB NOT NULL,
    "confidence_score" DOUBLE PRECISION NOT NULL,
    "ai_model_version" TEXT NOT NULL,
    "input_data_summary" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CareerPrediction_pkey" PRIMARY KEY ("prediction_id")
);

-- CreateTable
CREATE TABLE "JobRecommendation" (
    "recommendation_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "match_score" DOUBLE PRECISION NOT NULL,
    "skill_match" JSONB NOT NULL,
    "salary_match" DOUBLE PRECISION,
    "location_match" DOUBLE PRECISION,
    "experience_match" DOUBLE PRECISION,
    "ai_reasoning" TEXT,
    "is_viewed" BOOLEAN NOT NULL DEFAULT false,
    "is_applied" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "JobRecommendation_pkey" PRIMARY KEY ("recommendation_id")
);

-- CreateTable
CREATE TABLE "CandidateVector" (
    "vector_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "skill_vector" JSONB NOT NULL,
    "experience_vector" JSONB NOT NULL,
    "education_vector" JSONB NOT NULL,
    "combined_vector" JSONB NOT NULL,
    "vector_version" TEXT NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateVector_pkey" PRIMARY KEY ("vector_id")
);

-- CreateTable
CREATE TABLE "JobVector" (
    "vector_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "requirements_vector" JSONB NOT NULL,
    "skills_vector" JSONB NOT NULL,
    "combined_vector" JSONB NOT NULL,
    "vector_version" TEXT NOT NULL,
    "last_updated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JobVector_pkey" PRIMARY KEY ("vector_id")
);

-- CreateTable
CREATE TABLE "ProfileCompleteness" (
    "completeness_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "overall_score" DOUBLE PRECISION NOT NULL,
    "basic_info_score" DOUBLE PRECISION NOT NULL,
    "skills_score" DOUBLE PRECISION NOT NULL,
    "experience_score" DOUBLE PRECISION NOT NULL,
    "education_score" DOUBLE PRECISION NOT NULL,
    "document_score" DOUBLE PRECISION NOT NULL,
    "missing_fields" JSONB NOT NULL,
    "suggestions" JSONB NOT NULL,
    "last_calculated" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileCompleteness_pkey" PRIMARY KEY ("completeness_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CandidateVector_candidate_id_key" ON "CandidateVector"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "JobVector_job_id_key" ON "JobVector"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileCompleteness_candidate_id_key" ON "ProfileCompleteness"("candidate_id");

-- AddForeignKey
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "CandidateDocument"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillExtraction" ADD CONSTRAINT "SkillExtraction_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "CandidateDocument"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillExtraction" ADD CONSTRAINT "SkillExtraction_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPrediction" ADD CONSTRAINT "CareerPrediction_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "RecruiterJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateVector" ADD CONSTRAINT "CandidateVector_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobVector" ADD CONSTRAINT "JobVector_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "RecruiterJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileCompleteness" ADD CONSTRAINT "ProfileCompleteness_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
