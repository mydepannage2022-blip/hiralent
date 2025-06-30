-- CreateTable
CREATE TABLE "Agency" (
    "agency_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "billing_contact_email" TEXT NOT NULL,
    "owner_user_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "last_login_at" TIMESTAMP(3),

    CONSTRAINT "User_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "CandidateProfile" (
    "candidate_id" TEXT NOT NULL,
    "resume_url" TEXT,
    "video_intro_url" TEXT,
    "skills" TEXT,
    "education" TEXT,
    "experience" TEXT,
    "preferred_locations" TEXT,
    "languages" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CandidateProfile_pkey" PRIMARY KEY ("candidate_id")
);

-- CreateTable
CREATE TABLE "RecruiterProfile" (
    "recruiter_id" TEXT NOT NULL,
    "job_title" TEXT,
    "contact_number" TEXT,
    "linkedin_profile" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterProfile_pkey" PRIMARY KEY ("recruiter_id")
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
    "access_level" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "RecruiterJob" (
    "job_id" TEXT NOT NULL,
    "recruiter_id" TEXT NOT NULL,
    "agency_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "salary_range" TEXT,
    "required_skills" TEXT,
    "status" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecruiterJob_pkey" PRIMARY KEY ("job_id")
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
CREATE TABLE "SkillAssessment" (
    "assessment_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "job_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "score" TEXT,
    "status" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SkillAssessment_pkey" PRIMARY KEY ("assessment_id")
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

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "AIInterviewResult_application_id_key" ON "AIInterviewResult"("application_id");

-- CreateIndex
CREATE UNIQUE INDEX "AgencySubscription_agency_id_key" ON "AgencySubscription"("agency_id");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProfile" ADD CONSTRAINT "CandidateProfile_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterProfile" ADD CONSTRAINT "RecruiterProfile_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterJob" ADD CONSTRAINT "RecruiterJob_recruiter_id_fkey" FOREIGN KEY ("recruiter_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecruiterJob" ADD CONSTRAINT "RecruiterJob_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "RecruiterJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "RecruiterJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewResult" ADD CONSTRAINT "AIInterviewResult_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewResult" ADD CONSTRAINT "AIInterviewResult_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillAssessment" ADD CONSTRAINT "SkillAssessment_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillAssessment" ADD CONSTRAINT "SkillAssessment_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "RecruiterJob"("job_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencySubscription" ADD CONSTRAINT "AgencySubscription_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencySubscription" ADD CONSTRAINT "AgencySubscription_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "SubscriptionPlan"("plan_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE RESTRICT ON UPDATE CASCADE;
