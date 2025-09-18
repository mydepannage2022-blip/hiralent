/*
  Warnings:

  - You are about to drop the `RecruiterInvitation` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecruiterJob` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `RecruiterProfile` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "CandidateProgressTracker" DROP CONSTRAINT "CandidateProgressTracker_job_id_fkey";

-- DropForeignKey
ALTER TABLE "JobApplication" DROP CONSTRAINT "JobApplication_job_id_fkey";

-- DropForeignKey
ALTER TABLE "JobRecommendation" DROP CONSTRAINT "JobRecommendation_job_id_fkey";

-- DropForeignKey
ALTER TABLE "JobVector" DROP CONSTRAINT "JobVector_job_id_fkey";

-- DropForeignKey
ALTER TABLE "RecruiterInvitation" DROP CONSTRAINT "RecruiterInvitation_agency_id_fkey";

-- DropForeignKey
ALTER TABLE "RecruiterInvitation" DROP CONSTRAINT "RecruiterInvitation_inviter_id_fkey";

-- DropForeignKey
ALTER TABLE "RecruiterJob" DROP CONSTRAINT "RecruiterJob_agency_id_fkey";

-- DropForeignKey
ALTER TABLE "RecruiterJob" DROP CONSTRAINT "RecruiterJob_recruiter_id_fkey";

-- DropForeignKey
ALTER TABLE "RecruiterProfile" DROP CONSTRAINT "RecruiterProfile_recruiter_id_fkey";

-- DropForeignKey
ALTER TABLE "skill_assessments" DROP CONSTRAINT "skill_assessments_job_id_fkey";

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "accreditations" TEXT[],
ADD COLUMN     "average_case_duration" INTEGER,
ADD COLUMN     "languages_supported" TEXT[],
ADD COLUMN     "license_expiry" TIMESTAMP(3),
ADD COLUMN     "license_number" TEXT,
ADD COLUMN     "operating_countries" TEXT[],
ADD COLUMN     "rating" DOUBLE PRECISION,
ADD COLUMN     "service_categories" TEXT[],
ADD COLUMN     "service_description" TEXT,
ADD COLUMN     "success_rate" DOUBLE PRECISION,
ADD COLUMN     "total_cases_handled" INTEGER;

-- AlterTable
ALTER TABLE "AgencyAdminProfile" ADD COLUMN     "certifications" TEXT[],
ADD COLUMN     "languages" TEXT[],
ADD COLUMN     "license_details" TEXT,
ADD COLUMN     "specialization" TEXT[],
ADD COLUMN     "years_experience" INTEGER;

-- AlterTable
ALTER TABLE "JobApplication" ADD COLUMN     "assessment_score" DOUBLE PRECISION,
ADD COLUMN     "available_from" TIMESTAMP(3),
ADD COLUMN     "current_location" TEXT,
ADD COLUMN     "interview_feedback" TEXT,
ADD COLUMN     "rejection_reason" TEXT,
ADD COLUMN     "salary_expectation" DOUBLE PRECISION,
ADD COLUMN     "screening_answers" JSONB,
ADD COLUMN     "visa_status" TEXT,
ADD COLUMN     "willing_to_relocate" BOOLEAN;

-- DropTable
DROP TABLE "RecruiterInvitation";

-- DropTable
DROP TABLE "RecruiterJob";

-- DropTable
DROP TABLE "RecruiterProfile";

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
CREATE TABLE "CompanyJob" (
    "job_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "agency_id" TEXT,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "salary_range" TEXT,
    "required_skills" TEXT,
    "status" TEXT NOT NULL,
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
    "insight_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "detailed_analysis" TEXT,
    "ai_model" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "evidence" JSONB,
    "priority" TEXT NOT NULL,
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
CREATE TABLE "CompanyVerification" (
    "verification_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "documents" JSONB NOT NULL,
    "verified_by" TEXT,
    "verification_date" TIMESTAMP(3),

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

-- CreateIndex
CREATE UNIQUE INDEX "relocation_cases_case_number_key" ON "relocation_cases"("case_number");

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyJob" ADD CONSTRAINT "CompanyJob_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyJob" ADD CONSTRAINT "CompanyJob_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "skill_assessments" ADD CONSTRAINT "skill_assessments_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_cases" ADD CONSTRAINT "relocation_cases_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_cases" ADD CONSTRAINT "relocation_cases_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_cases" ADD CONSTRAINT "relocation_cases_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_progress_updates" ADD CONSTRAINT "case_progress_updates_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_reviews" ADD CONSTRAINT "agency_reviews_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_reviews" ADD CONSTRAINT "agency_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_agency_invitations" ADD CONSTRAINT "company_agency_invitations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_agency_invitations" ADD CONSTRAINT "company_agency_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobVector" ADD CONSTRAINT "JobVector_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_schedules" ADD CONSTRAINT "interview_schedules_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_schedules" ADD CONSTRAINT "interview_schedules_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "communication_logs" ADD CONSTRAINT "communication_logs_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hiring_analytics" ADD CONSTRAINT "hiring_analytics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_analytics" ADD CONSTRAINT "relocation_analytics_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "generated_content" ADD CONSTRAINT "generated_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "usage_analytics" ADD CONSTRAINT "usage_analytics_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
