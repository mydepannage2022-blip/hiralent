-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('DRAFT', 'ACTIVE', 'PAUSED', 'CLOSED', 'CANCELLED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "InsightType" AS ENUM ('recommendation', 'prediction', 'trend', 'alert', 'opportunity');

-- CreateEnum
CREATE TYPE "InsightCategory" AS ENUM ('hiring', 'performance', 'market', 'finance', 'growth', 'business_model');

-- CreateEnum
CREATE TYPE "VerificationSubjectType" AS ENUM ('COMPANY', 'AGENCY');

-- CreateEnum
CREATE TYPE "VerificationRunStatus" AS ENUM ('QUEUED', 'RUNNING', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "VerificationDecision" AS ENUM ('APPROVE', 'REJECT', 'MANUAL_REVIEW', 'NO_DECISION');

-- CreateEnum
CREATE TYPE "VerificationCaseStatus" AS ENUM ('DRAFT', 'PENDING_DOCUMENTS', 'IN_REVIEW', 'AUTO_APPROVED', 'AUTO_REJECTED', 'APPROVED', 'REJECTED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "AccessLevel" AS ENUM ('none', 'read', 'write', 'manage');

-- CreateEnum
CREATE TYPE "AssessmentType" AS ENUM ('QUICK_CHECK', 'COMPREHENSIVE', 'CERTIFICATION', 'COMPANY_SPECIFIC');

-- CreateEnum
CREATE TYPE "AssessmentStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "DifficultyLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED', 'EXPERT');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'CODING', 'ESSAY', 'TRUE_FALSE', 'SCENARIO', 'SHORT_ANSWER');

-- CreateEnum
CREATE TYPE "EmployerAssessmentStatus" AS ENUM ('DRAFT', 'PENDING_DOCUMENTS', 'IN_REVIEW', 'AUTO_APPROVED', 'AUTO_REJECTED', 'APPROVED', 'REJECTED', 'EXPIRED', 'ACTIVE', 'PAUSED', 'COMPLETED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "AssessmentCreationMethod" AS ENUM ('JOB_DESCRIPTION_PARSE', 'CHATBOT_GUIDED');

-- CreateTable
CREATE TABLE "Agency" (
    "agency_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billing_contact_email" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "approval_notes" TEXT,
    "approved_at" TIMESTAMP(3),
    "approved_by" TEXT,
    "logo_url" TEXT,
    "website" TEXT,
    "accreditations" TEXT[],
    "average_case_duration" INTEGER,
    "languages_supported" TEXT[],
    "license_expiry" TIMESTAMP(3),
    "license_number" TEXT,
    "operating_countries" TEXT[],
    "rating" DOUBLE PRECISION,
    "service_categories" TEXT[],
    "service_description" TEXT,
    "success_rate" DOUBLE PRECISION,
    "total_cases_handled" INTEGER,

    CONSTRAINT "Agency_pkey" PRIMARY KEY ("agency_id")
);

-- CreateTable
CREATE TABLE "User" (
    "user_id" TEXT NOT NULL,
    "agency_id" TEXT,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "is_email_verified" BOOLEAN NOT NULL,
    "phone_number" TEXT,
    "position" TEXT,
    "linkedin_url" TEXT,
    "company_role" TEXT,
    "branding_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),
    "mfa_secret" TEXT,
    "mfa_enabled" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "CompanyProfile" (
    "company_id" TEXT NOT NULL,
    "company_name" TEXT,
    "display_name" TEXT,
    "industry" TEXT,
    "company_size" TEXT,
    "website" TEXT,
    "headquarters" TEXT,
    "founded_year" INTEGER,
    "description" TEXT,
    "contact_number" TEXT,
    "linkedin_profile" TEXT,
    "twitter_handle" TEXT,
    "facebook_page" TEXT,
    "business_type" TEXT,
    "registration_number" TEXT,
    "tax_id" TEXT,
    "employee_count" INTEGER,
    "annual_revenue" TEXT,
    "full_address" TEXT,
    "verification_status" TEXT DEFAULT 'unverified',
    "verification_submitted_at" TIMESTAMP(3),
    "verification_notes" TEXT,
    "hiring_volume" TEXT,
    "typical_roles" TEXT[],
    "hiring_regions" TEXT[],
    "remote_policy" TEXT,
    "logo_url" TEXT,
    "banner_url" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_date" TIMESTAMP(3),
    "rating" DOUBLE PRECISION,
    "total_jobs_posted" INTEGER,
    "active_jobs_count" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyProfile_pkey" PRIMARY KEY ("company_id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "problemStatement" TEXT NOT NULL,
    "difficulty" TEXT NOT NULL,
    "skillTags" TEXT[],
    "type" TEXT NOT NULL,
    "canonicalSolution" TEXT NOT NULL,
    "testCases" JSONB NOT NULL,
    "status" TEXT NOT NULL,
    "createdBy" TEXT,
    "aiGenerated" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AgencyAdminProfile" (
    "admin_id" TEXT NOT NULL,
    "phone_number" TEXT,
    "position" TEXT,
    "linkedin_url" TEXT,
    "company_role" TEXT,
    "branding_notes" TEXT,
    "license_details" TEXT,
    "specialization" TEXT[],
    "languages" TEXT[],
    "years_experience" INTEGER,
    "certifications" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencyAdminProfile_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "CompanyJob" (
    "job_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "agency_id" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "salary_range" TEXT,
    "required_skills" TEXT[],
    "status" "JobStatus" NOT NULL DEFAULT 'DRAFT',
    "job_type" TEXT,
    "experience_level" TEXT,
    "education_level" TEXT,
    "remote_option" TEXT,
    "visa_sponsored" BOOLEAN,
    "relocation_assistance" BOOLEAN,
    "urgency_level" TEXT,
    "department" TEXT,
    "reporting_to" TEXT,
    "team_size" INTEGER,
    "application_deadline" TIMESTAMP(3),
    "max_applications" INTEGER,
    "auto_reject_after" INTEGER,
    "screening_questions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyJob_pkey" PRIMARY KEY ("job_id")
);

-- CreateTable
CREATE TABLE "JobApplication" (
    "application_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "cover_letter" TEXT,
    "applied_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "salary_expectation" DOUBLE PRECISION,
    "available_from" TIMESTAMP(3),
    "visa_status" TEXT,
    "willing_to_relocate" BOOLEAN,
    "current_location" TEXT,
    "screening_answers" JSONB,
    "assessment_score" DOUBLE PRECISION,
    "interview_feedback" TEXT,
    "rejection_reason" TEXT,

    CONSTRAINT "JobApplication_pkey" PRIMARY KEY ("application_id")
);

-- CreateTable
CREATE TABLE "CandidateProgressTracker" (
    "progress_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "stage" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "notes" TEXT,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateProgressTracker_pkey" PRIMARY KEY ("progress_id")
);

-- CreateTable
CREATE TABLE "AIInterviewResult" (
    "interview_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "interview_type" TEXT NOT NULL,
    "score" TEXT,
    "video_url" TEXT,
    "feedback" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "candidate_id" TEXT NOT NULL,

    CONSTRAINT "AIInterviewResult_pkey" PRIMARY KEY ("interview_id")
);

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
    "employer_assessment_id" TEXT,

    CONSTRAINT "skill_assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "relocation_cases" (
    "case_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT,
    "agency_id" TEXT NOT NULL,
    "case_number" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "priority_level" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "estimated_completion" TIMESTAMP(3),
    "actual_completion" TIMESTAMP(3),
    "origin_country" TEXT NOT NULL,
    "destination_country" TEXT NOT NULL,
    "destination_city" TEXT,
    "estimated_cost" DOUBLE PRECISION,
    "actual_cost" DOUBLE PRECISION,
    "payment_status" TEXT,
    "case_manager_id" TEXT,
    "notes" TEXT,
    "documents_required" TEXT[],
    "documents_received" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "relocation_cases_pkey" PRIMARY KEY ("case_id")
);

-- CreateTable
CREATE TABLE "case_assignments" (
    "assignment_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "agency_id" TEXT NOT NULL,

    CONSTRAINT "case_assignments_pkey" PRIMARY KEY ("assignment_id")
);

-- CreateTable
CREATE TABLE "case_progress_updates" (
    "update_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "updated_by" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "is_milestone" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_progress_updates_pkey" PRIMARY KEY ("update_id")
);

-- CreateTable
CREATE TABLE "case_documents" (
    "document_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "file_path" TEXT NOT NULL,
    "file_type" TEXT NOT NULL,
    "file_size" INTEGER NOT NULL,
    "document_type" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "case_documents_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "agency_reviews" (
    "review_id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "reviewer_id" TEXT NOT NULL,
    "case_id" TEXT,
    "rating" INTEGER NOT NULL,
    "review_text" TEXT,
    "service_type" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "agency_reviews_pkey" PRIMARY KEY ("review_id")
);

-- CreateTable
CREATE TABLE "company_agency_invitations" (
    "invitation_id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "inviter_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "position" TEXT,
    "invitation_type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_agency_invitations_pkey" PRIMARY KEY ("invitation_id")
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
CREATE TABLE "CandidateProfile" (
    "candidate_id" TEXT NOT NULL,
    "resume_url" TEXT,
    "video_intro_url" TEXT,
    "education" TEXT,
    "experience" TEXT,
    "preferred_locations" TEXT,
    "languages" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "location" TEXT,
    "minimum_salary_amount" DOUBLE PRECISION,
    "postal_code" INTEGER,
    "payment_period" TEXT,
    "profile_picture_url" TEXT,
    "headline" VARCHAR(120),
    "about_me" VARCHAR(500),
    "city" TEXT,
    "job_benefits" TEXT,
    "links" TEXT,
    "skills" TEXT[],
    "resume_application_url" TEXT,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("candidate_id")
);

-- CreateTable
CREATE TABLE "AdminAuditLog" (
    "log_id" TEXT NOT NULL,
    "admin_id" TEXT NOT NULL,
    "action_type" TEXT NOT NULL,
    "target_table" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "RolePermission" (
    "permission_id" TEXT NOT NULL,
    "role_name" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "access_level" "AccessLevel" NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "notification_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "sent_via" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("notification_id")
);

-- CreateTable
CREATE TABLE "SubscriptionPlan" (
    "plan_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "price_monthly_usd" DECIMAL(65,30) NOT NULL,
    "price_annually_usd" DECIMAL(65,30) NOT NULL,
    "job_post_limit" INTEGER NOT NULL,
    "ai_interview_limit" INTEGER NOT NULL,
    "features_included" TEXT NOT NULL,
    "is_publicly_available" BOOLEAN NOT NULL,
    "stripe_price_id_monthly" TEXT NOT NULL,
    "stripe_price_id_annually" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubscriptionPlan_pkey" PRIMARY KEY ("plan_id")
);

-- CreateTable
CREATE TABLE "AgencySubscription" (
    "agency_subscription_id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "plan_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "current_period_start" TIMESTAMP(3) NOT NULL,
    "current_period_end" TIMESTAMP(3) NOT NULL,
    "trial_ends_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AgencySubscription_pkey" PRIMARY KEY ("agency_subscription_id")
);

-- CreateTable
CREATE TABLE "WebhookEndpoint" (
    "webhook_id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "secret_key" TEXT NOT NULL,
    "subscribed_event_types" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "last_successful_delivery_at" TIMESTAMP(3),
    "last_failed_delivery_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebhookEndpoint_pkey" PRIMARY KEY ("webhook_id")
);

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
    "profile_picture_score" DOUBLE PRECISION NOT NULL,
    "headline_score" DOUBLE PRECISION NOT NULL DEFAULT 0.0,

    CONSTRAINT "ProfileCompleteness_pkey" PRIMARY KEY ("completeness_id")
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
CREATE TABLE "assessment_summaries" (
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

-- CreateTable
CREATE TABLE "interview_schedules" (
    "schedule_id" TEXT NOT NULL,
    "application_id" TEXT NOT NULL,
    "job_id" TEXT,
    "interview_type" TEXT NOT NULL,
    "scheduled_time" TIMESTAMP(3) NOT NULL,
    "timezone" TEXT NOT NULL,
    "duration_minutes" INTEGER NOT NULL DEFAULT 60,
    "status" TEXT NOT NULL,
    "ai_optimized" BOOLEAN NOT NULL DEFAULT false,
    "optimal_time_score" DOUBLE PRECISION,
    "reschedule_count" INTEGER NOT NULL DEFAULT 0,
    "auto_rescheduled" BOOLEAN NOT NULL DEFAULT false,
    "meeting_link" TEXT,
    "meeting_room" TEXT,
    "interviewer_ids" TEXT[],
    "preparation_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_sent" BOOLEAN NOT NULL DEFAULT false,
    "conducted_by" TEXT,
    "actual_duration" INTEGER,
    "interview_notes" TEXT,
    "outcome" TEXT,
    "next_round_scheduled" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "interview_schedules_pkey" PRIMARY KEY ("schedule_id")
);

-- CreateTable
CREATE TABLE "communication_logs" (
    "log_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "recipient_id" TEXT NOT NULL,
    "message_type" TEXT NOT NULL,
    "channel" TEXT,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "content_type" TEXT NOT NULL DEFAULT 'text',
    "ai_generated" BOOLEAN NOT NULL DEFAULT false,
    "ai_model_used" TEXT,
    "status" TEXT NOT NULL,
    "sent_at" TIMESTAMP(3),
    "delivered_at" TIMESTAMP(3),
    "read_at" TIMESTAMP(3),
    "failed_reason" TEXT,
    "related_entity_type" TEXT,
    "related_entity_id" TEXT,
    "campaign_id" TEXT,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "reply_received" BOOLEAN NOT NULL DEFAULT false,
    "unsubscribed" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "communication_logs_pkey" PRIMARY KEY ("log_id")
);

-- CreateTable
CREATE TABLE "hiring_analytics" (
    "analytics_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "metric_unit" TEXT,
    "period_type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "job_id" TEXT,
    "department" TEXT,
    "seniority_level" TEXT,
    "previous_period_value" DOUBLE PRECISION,
    "benchmark_value" DOUBLE PRECISION,
    "trend" TEXT,
    "ai_insights" JSONB,
    "recommendations" JSONB,
    "confidence_score" DOUBLE PRECISION,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hiring_analytics_pkey" PRIMARY KEY ("analytics_id")
);

-- CreateTable
CREATE TABLE "relocation_analytics" (
    "analytics_id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "metric_type" TEXT NOT NULL,
    "metric_value" DOUBLE PRECISION NOT NULL,
    "metric_unit" TEXT,
    "period_type" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "service_type" TEXT,
    "origin_country" TEXT,
    "destination_country" TEXT,
    "cases_completed" INTEGER,
    "cases_failed" INTEGER,
    "average_duration" DOUBLE PRECISION,
    "client_rating" DOUBLE PRECISION,
    "ai_insights" JSONB,
    "recommendations" JSONB,
    "market_trends" JSONB,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "relocation_analytics_pkey" PRIMARY KEY ("analytics_id")
);

-- CreateTable
CREATE TABLE "business_insights" (
    "insight_id" TEXT NOT NULL,
    "target_id" TEXT NOT NULL,
    "target_type" TEXT NOT NULL,
    "insight_type" "InsightType" NOT NULL,
    "category" "InsightCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detailed_analysis" TEXT,
    "ai_model" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION,
    "evidence" JSONB,
    "payload" JSONB,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "action_required" BOOLEAN NOT NULL DEFAULT false,
    "suggested_actions" TEXT[],
    "expected_impact" TEXT,
    "status" TEXT NOT NULL DEFAULT 'new',
    "viewed_at" TIMESTAMP(3),
    "acted_upon_at" TIMESTAMP(3),
    "feedback_rating" INTEGER,
    "feedback_text" TEXT,
    "expires_at" TIMESTAMP(3),
    "is_recurring" BOOLEAN NOT NULL DEFAULT false,
    "next_update" TIMESTAMP(3),
    "day_bucket" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_DATE,
    "dedupe_checksum" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "business_insights_pkey" PRIMARY KEY ("insight_id")
);

-- CreateTable
CREATE TABLE "generated_content" (
    "content_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "content_type" TEXT NOT NULL,
    "template_id" TEXT,
    "title" TEXT,
    "original_input" TEXT,
    "generated_content" TEXT NOT NULL,
    "ai_model" TEXT NOT NULL,
    "prompt_used" TEXT,
    "generation_time" INTEGER,
    "tokens_used" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "version" INTEGER NOT NULL DEFAULT 1,
    "parent_content_id" TEXT,
    "usage_count" INTEGER NOT NULL DEFAULT 0,
    "performance_score" DOUBLE PRECISION,
    "user_rating" INTEGER,
    "user_feedback" TEXT,
    "customizations" JSONB,
    "brand_guidelines" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "published_at" TIMESTAMP(3),

    CONSTRAINT "generated_content_pkey" PRIMARY KEY ("content_id")
);

-- CreateTable
CREATE TABLE "system_health" (
    "health_id" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "endpoint" TEXT,
    "status" TEXT NOT NULL,
    "response_time" DOUBLE PRECISION,
    "uptime_percentage" DOUBLE PRECISION,
    "error_count" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "error_details" JSONB,
    "cpu_usage" DOUBLE PRECISION,
    "memory_usage" DOUBLE PRECISION,
    "disk_usage" DOUBLE PRECISION,
    "network_latency" DOUBLE PRECISION,
    "check_interval" INTEGER NOT NULL DEFAULT 300,
    "timeout_seconds" INTEGER NOT NULL DEFAULT 30,
    "alerts_enabled" BOOLEAN NOT NULL DEFAULT true,
    "checked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "system_health_pkey" PRIMARY KEY ("health_id")
);

-- CreateTable
CREATE TABLE "usage_analytics" (
    "usage_id" TEXT NOT NULL,
    "user_id" TEXT,
    "session_id" TEXT,
    "action_type" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "page_url" TEXT,
    "user_agent" TEXT,
    "ip_address" TEXT,
    "country" TEXT,
    "city" TEXT,
    "device_type" TEXT,
    "browser" TEXT,
    "response_time" DOUBLE PRECISION,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "error_message" TEXT,
    "metadata" JSONB,
    "ab_test_variant" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usage_analytics_pkey" PRIMARY KEY ("usage_id")
);

-- CreateTable
CREATE TABLE "model_performance" (
    "performance_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "model_type" TEXT NOT NULL,
    "version" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "accuracy_score" DOUBLE PRECISION,
    "precision_score" DOUBLE PRECISION,
    "recall_score" DOUBLE PRECISION,
    "f1_score" DOUBLE PRECISION,
    "total_requests" INTEGER NOT NULL DEFAULT 0,
    "successful_requests" INTEGER NOT NULL DEFAULT 0,
    "failed_requests" INTEGER NOT NULL DEFAULT 0,
    "average_response_time" DOUBLE PRECISION,
    "user_satisfaction" DOUBLE PRECISION,
    "feedback_count" INTEGER NOT NULL DEFAULT 0,
    "positive_feedback" INTEGER NOT NULL DEFAULT 0,
    "negative_feedback" INTEGER NOT NULL DEFAULT 0,
    "total_cost" DOUBLE PRECISION,
    "cost_per_request" DOUBLE PRECISION,
    "tokens_used" INTEGER,
    "measurement_period" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "performance_trend" TEXT,
    "issues_identified" TEXT[],
    "recommendations" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "model_performance_pkey" PRIMARY KEY ("performance_id")
);

-- CreateTable
CREATE TABLE "ai_feedback" (
    "feedback_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "feature_type" TEXT NOT NULL,
    "feature_instance_id" TEXT,
    "rating" INTEGER NOT NULL,
    "feedback_text" TEXT,
    "improvement_suggestions" TEXT,
    "accuracy_rating" INTEGER,
    "usefulness_rating" INTEGER,
    "speed_rating" INTEGER,
    "user_experience_level" TEXT,
    "use_case" TEXT,
    "would_recommend" BOOLEAN,
    "would_use_again" BOOLEAN,
    "contact_for_followup" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_feedback_pkey" PRIMARY KEY ("feedback_id")
);

-- CreateTable
CREATE TABLE "ai_training_data" (
    "training_id" TEXT NOT NULL,
    "data_type" TEXT NOT NULL,
    "source_table" TEXT NOT NULL,
    "source_id" TEXT NOT NULL,
    "model_name" TEXT NOT NULL,
    "training_purpose" TEXT NOT NULL,
    "input_data" JSONB NOT NULL,
    "expected_output" JSONB,
    "actual_output" JSONB,
    "data_quality_score" DOUBLE PRECISION,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" TEXT,
    "used_in_training" BOOLEAN NOT NULL DEFAULT false,
    "training_session_id" TEXT,
    "contribution_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_training_data_pkey" PRIMARY KEY ("training_id")
);

-- CreateTable
CREATE TABLE "platform_evolution" (
    "evolution_id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "technical_details" TEXT,
    "business_impact" TEXT,
    "requested_by" TEXT,
    "affected_users" TEXT[],
    "user_pain_points" TEXT[],
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "assigned_to" TEXT,
    "estimated_effort" TEXT,
    "sprint_planned" TEXT,
    "ai_feasibility_score" DOUBLE PRECISION,
    "ai_impact_prediction" JSONB,
    "ai_similar_requests" TEXT[],
    "upvotes" INTEGER NOT NULL DEFAULT 0,
    "downvotes" INTEGER NOT NULL DEFAULT 0,
    "user_comments" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "completed_at" TIMESTAMP(3),

    CONSTRAINT "platform_evolution_pkey" PRIMARY KEY ("evolution_id")
);

-- CreateTable
CREATE TABLE "VerificationRun" (
    "run_id" TEXT NOT NULL,
    "subject_type" "VerificationSubjectType" NOT NULL,
    "subject_id" TEXT NOT NULL,
    "status" "VerificationRunStatus" NOT NULL,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ended_at" TIMESTAMP(3),
    "risk_score" DOUBLE PRECISION,
    "decision" "VerificationDecision",
    "reason_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "VerificationRun_pkey" PRIMARY KEY ("run_id")
);

-- CreateTable
CREATE TABLE "VerificationSignal" (
    "signal_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "signal_type" TEXT NOT NULL,
    "passed" BOOLEAN NOT NULL,
    "score" DOUBLE PRECISION,
    "explanation" TEXT,
    "raw_payload" JSONB,

    CONSTRAINT "VerificationSignal_pkey" PRIMARY KEY ("signal_id")
);

-- CreateTable
CREATE TABLE "VerificationSnapshot" (
    "snapshot_id" TEXT NOT NULL,
    "run_id" TEXT NOT NULL,
    "profile" JSONB NOT NULL,
    "documents" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VerificationSnapshot_pkey" PRIMARY KEY ("snapshot_id")
);

-- CreateTable
CREATE TABLE "CompanyVerification" (
    "verification_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "verified_by" TEXT,
    "verification_date" TIMESTAMP(3),
    "latest_run_id" TEXT,
    "reason_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risk_score" DOUBLE PRECISION,
    "status" "VerificationCaseStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "CompanyVerification_pkey" PRIMARY KEY ("verification_id")
);

-- CreateTable
CREATE TABLE "AgencyVerification" (
    "verification_id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "license_status" TEXT NOT NULL,
    "verification_documents" JSONB NOT NULL,
    "verified_by" TEXT,
    "verification_date" TIMESTAMP(3),
    "latest_run_id" TEXT,
    "reason_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "risk_score" DOUBLE PRECISION,
    "status" "VerificationCaseStatus" NOT NULL DEFAULT 'DRAFT',

    CONSTRAINT "AgencyVerification_pkey" PRIMARY KEY ("verification_id")
);

-- CreateTable
CREATE TABLE "SuperAdmin" (
    "admin_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "permissions" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SuperAdmin_pkey" PRIMARY KEY ("admin_id")
);

-- CreateTable
CREATE TABLE "UploadedDocument" (
    "document_id" TEXT NOT NULL,
    "uploaded_by" TEXT NOT NULL,
    "subject_type" TEXT NOT NULL,
    "subject_id" TEXT NOT NULL,
    "file_name" TEXT NOT NULL,
    "storage_key" TEXT NOT NULL,
    "url" TEXT,
    "mime_type" TEXT NOT NULL,
    "file_ext" TEXT,
    "file_size" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "document_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "preview_key" TEXT,
    "preview_ready" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UploadedDocument_pkey" PRIMARY KEY ("document_id")
);

-- CreateTable
CREATE TABLE "user_sessions" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_name" TEXT,
    "device_type" TEXT,
    "browser_name" TEXT,
    "browser_version" TEXT,
    "os_name" TEXT,
    "os_version" TEXT,
    "ip_address" TEXT NOT NULL,
    "location_country" TEXT,
    "location_city" TEXT,
    "location_region" TEXT,
    "jwt_token_hash" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "user_agent" TEXT NOT NULL,
    "screen_resolution" TEXT,
    "timezone" TEXT,
    "language" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "terminated_at" TIMESTAMP(3),
    "terminated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "jwt_blacklist" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "session_id" VARCHAR(255),
    "user_id" VARCHAR(255),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jwt_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employer_assessments" (
    "assessment_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "EmployerAssessmentStatus" NOT NULL,
    "assessment_type" "AssessmentType" NOT NULL,
    "skill_category" TEXT NOT NULL,
    "difficulty" "DifficultyLevel" NOT NULL,
    "time_limit" INTEGER NOT NULL DEFAULT 60,
    "total_questions" INTEGER NOT NULL DEFAULT 20,
    "passing_score" INTEGER DEFAULT 70,
    "question_ids" TEXT[],
    "settings" JSONB,
    "creation_method" "AssessmentCreationMethod" NOT NULL,
    "extracted_skills" TEXT[],
    "enhanced_data" JSONB,
    "auto_generated" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employer_assessments_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "compete_challenge" (
    "challenge_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "candidate_ids" TEXT[],
    "status" TEXT NOT NULL,
    "start_time" TIMESTAMP(3) NOT NULL,
    "end_time" TIMESTAMP(3) NOT NULL,
    "time_limit" INTEGER NOT NULL,
    "leaderboard" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compete_challenge_pkey" PRIMARY KEY ("challenge_id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "conversation_id" TEXT NOT NULL,
    "participant_1_id" TEXT NOT NULL,
    "participant_2_id" TEXT NOT NULL,
    "last_message_at" TIMESTAMP(3),
    "last_message_id" TEXT,
    "unread_count_p1" INTEGER NOT NULL DEFAULT 0,
    "unread_count_p2" INTEGER NOT NULL DEFAULT 0,
    "is_archived_p1" BOOLEAN NOT NULL DEFAULT false,
    "is_archived_p2" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("conversation_id")
);

-- CreateTable
CREATE TABLE "messages" (
    "message_id" TEXT NOT NULL,
    "conversation_id" TEXT NOT NULL,
    "sender_id" TEXT NOT NULL,
    "content" TEXT,
    "reply_to_id" TEXT,
    "message_type" TEXT NOT NULL DEFAULT 'text',
    "file_url" TEXT,
    "file_name" TEXT,
    "file_size" INTEGER,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "is_deleted" BOOLEAN NOT NULL DEFAULT false,
    "sent_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "messages_pkey" PRIMARY KEY ("message_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AIInterviewResult_application_id_key" ON "AIInterviewResult"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "relocation_cases_case_number_key" ON "relocation_cases"("case_number");

-- CreateIndex
CREATE UNIQUE INDEX "JobVector_job_id_key" ON "JobVector"("job_id");

-- CreateIndex
CREATE UNIQUE INDEX "AgencySubscription_agency_id_key" ON "AgencySubscription"("agency_id");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateVector_candidate_id_key" ON "CandidateVector"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "ProfileCompleteness_candidate_id_key" ON "ProfileCompleteness"("candidate_id");

-- CreateIndex
CREATE UNIQUE INDEX "assessment_summaries_assessment_id_key" ON "assessment_summaries"("assessment_id");

-- CreateIndex
CREATE INDEX "business_insights_target_type_target_id_idx" ON "business_insights"("target_type", "target_id");

-- CreateIndex
CREATE INDEX "business_insights_dedupe_checksum_idx" ON "business_insights"("dedupe_checksum");

-- CreateIndex
CREATE UNIQUE INDEX "insight_daily_unique" ON "business_insights"("target_type", "target_id", "category", "day_bucket");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationSnapshot_run_id_key" ON "VerificationSnapshot"("run_id");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyVerification_latest_run_id_key" ON "CompanyVerification"("latest_run_id");

-- CreateIndex
CREATE INDEX "CompanyVerification_company_id_idx" ON "CompanyVerification"("company_id");

-- CreateIndex
CREATE INDEX "CompanyVerification_status_idx" ON "CompanyVerification"("status");

-- CreateIndex
CREATE UNIQUE INDEX "AgencyVerification_latest_run_id_key" ON "AgencyVerification"("latest_run_id");

-- CreateIndex
CREATE INDEX "AgencyVerification_agency_id_idx" ON "AgencyVerification"("agency_id");

-- CreateIndex
CREATE INDEX "AgencyVerification_status_idx" ON "AgencyVerification"("status");

-- CreateIndex
CREATE INDEX "UploadedDocument_subject_type_subject_id_idx" ON "UploadedDocument"("subject_type", "subject_id");

-- CreateIndex
CREATE INDEX "UploadedDocument_uploaded_by_idx" ON "UploadedDocument"("uploaded_by");

-- CreateIndex
CREATE INDEX "UploadedDocument_document_type_idx" ON "UploadedDocument"("document_type");

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_jwt_token_hash_idx" ON "user_sessions"("jwt_token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_is_active_idx" ON "user_sessions"("is_active");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "user_sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "jwt_blacklist_token_hash_key" ON "jwt_blacklist"("token_hash");

-- CreateIndex
CREATE INDEX "jwt_blacklist_token_hash_idx" ON "jwt_blacklist"("token_hash");

-- CreateIndex
CREATE INDEX "jwt_blacklist_expires_at_idx" ON "jwt_blacklist"("expires_at");

-- CreateIndex
CREATE INDEX "employer_assessments_company_id_idx" ON "employer_assessments"("company_id");

-- CreateIndex
CREATE INDEX "employer_assessments_job_id_idx" ON "employer_assessments"("job_id");

-- CreateIndex
CREATE INDEX "employer_assessments_status_idx" ON "employer_assessments"("status");

-- CreateIndex
CREATE INDEX "compete_challenge_assessment_id_idx" ON "compete_challenge"("assessment_id");

-- CreateIndex
CREATE INDEX "compete_challenge_status_idx" ON "compete_challenge"("status");

-- CreateIndex
CREATE UNIQUE INDEX "conversations_participant_1_id_participant_2_id_key" ON "conversations"("participant_1_id", "participant_2_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyAdminProfile" ADD CONSTRAINT "AgencyAdminProfile_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyJob" ADD CONSTRAINT "CompanyJob_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyJob" ADD CONSTRAINT "CompanyJob_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewResult" ADD CONSTRAINT "AIInterviewResult_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewResult" ADD CONSTRAINT "AIInterviewResult_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_employer_assessment_id_fkey" FOREIGN KEY ("employer_assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_cases" ADD CONSTRAINT "relocation_cases_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_cases" ADD CONSTRAINT "relocation_cases_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_cases" ADD CONSTRAINT "relocation_cases_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_progress_updates" ADD CONSTRAINT "case_progress_updates_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_reviews" ADD CONSTRAINT "agency_reviews_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_reviews" ADD CONSTRAINT "agency_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_agency_invitations" ADD CONSTRAINT "company_agency_invitations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_agency_invitations" ADD CONSTRAINT "company_agency_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobVector" ADD CONSTRAINT "JobVector_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencySubscription" ADD CONSTRAINT "AgencySubscription_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencySubscription" ADD CONSTRAINT "AgencySubscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlan"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateDocument" ADD CONSTRAINT "CandidateDocument_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateSkill" ADD CONSTRAINT "CandidateSkill_source_document_id_fkey" FOREIGN KEY ("source_document_id") REFERENCES "CandidateDocument"("document_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillExtraction" ADD CONSTRAINT "SkillExtraction_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillExtraction" ADD CONSTRAINT "SkillExtraction_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "CandidateDocument"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CareerPrediction" ADD CONSTRAINT "CareerPrediction_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateVector" ADD CONSTRAINT "CandidateVector_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileCompleteness" ADD CONSTRAINT "ProfileCompleteness_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_results" ADD CONSTRAINT "assessment_results_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "skill_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_summaries" ADD CONSTRAINT "assessment_summaries_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "skill_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_schedules" ADD CONSTRAINT "interview_schedules_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_schedules" ADD CONSTRAINT "interview_schedules_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_analytics" ADD CONSTRAINT "hiring_analytics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_analytics" ADD CONSTRAINT "relocation_analytics_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_analytics" ADD CONSTRAINT "usage_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationSignal" ADD CONSTRAINT "VerificationSignal_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "VerificationRun"("run_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VerificationSnapshot" ADD CONSTRAINT "VerificationSnapshot_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "VerificationRun"("run_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyVerification" ADD CONSTRAINT "CompanyVerification_latest_run_id_fkey" FOREIGN KEY ("latest_run_id") REFERENCES "VerificationRun"("run_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencyVerification" ADD CONSTRAINT "AgencyVerification_latest_run_id_fkey" FOREIGN KEY ("latest_run_id") REFERENCES "VerificationRun"("run_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UploadedDocument" ADD CONSTRAINT "UploadedDocument_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_assessments" ADD CONSTRAINT "employer_assessments_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employer_assessments" ADD CONSTRAINT "employer_assessments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compete_challenge" ADD CONSTRAINT "compete_challenge_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_1_id_fkey" FOREIGN KEY ("participant_1_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_2_id_fkey" FOREIGN KEY ("participant_2_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "conversations"("conversation_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_reply_to_id_fkey" FOREIGN KEY ("reply_to_id") REFERENCES "messages"("message_id") ON DELETE SET NULL ON UPDATE CASCADE;
