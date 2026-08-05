-- Session 6 / Phase 2.5 (R-35): coherent onDelete policy so hard user-delete (GDPR
-- right-to-erasure) succeeds for every role without orphaning PII.
-- 23 required FKs RESTRICT->CASCADE (owned/dependent data dies with parent);
-- 2 audit FKs RESTRICT->SET NULL + made nullable (row survives, actor de-identified).
-- Optional-SetNull and catalog-Restrict relations already matched the DB default (no-op).

-- DropForeignKey
ALTER TABLE "AIInterviewResult" DROP CONSTRAINT "AIInterviewResult_application_id_fkey";

-- DropForeignKey
ALTER TABLE "AgencySubscription" DROP CONSTRAINT "AgencySubscription_agency_id_fkey";

-- DropForeignKey
ALTER TABLE "CandidateProgressTracker" DROP CONSTRAINT "CandidateProgressTracker_job_id_fkey";

-- DropForeignKey
ALTER TABLE "CompanyActivityLog" DROP CONSTRAINT "CompanyActivityLog_user_id_fkey";

-- DropForeignKey
ALTER TABLE "CompanyProfile" DROP CONSTRAINT "CompanyProfile_company_id_fkey";

-- DropForeignKey
ALTER TABLE "CompanyTeamInvitation" DROP CONSTRAINT "CompanyTeamInvitation_invited_by_fkey";

-- DropForeignKey
ALTER TABLE "JobApplication" DROP CONSTRAINT "JobApplication_job_id_fkey";

-- DropForeignKey
ALTER TABLE "JobRecommendation" DROP CONSTRAINT "JobRecommendation_job_id_fkey";

-- DropForeignKey
ALTER TABLE "ResumeAutofillSession" DROP CONSTRAINT "ResumeAutofillSession_document_id_fkey";

-- DropForeignKey
ALTER TABLE "SkillExtraction" DROP CONSTRAINT "SkillExtraction_document_id_fkey";

-- DropForeignKey
ALTER TABLE "WebhookEndpoint" DROP CONSTRAINT "WebhookEndpoint_agency_id_fkey";

-- DropForeignKey
ALTER TABLE "agency_reviews" DROP CONSTRAINT "agency_reviews_agency_id_fkey";

-- DropForeignKey
ALTER TABLE "case_assignments" DROP CONSTRAINT "case_assignments_agency_id_fkey";

-- DropForeignKey
ALTER TABLE "case_assignments" DROP CONSTRAINT "case_assignments_case_id_fkey";

-- DropForeignKey
ALTER TABLE "case_documents" DROP CONSTRAINT "case_documents_case_id_fkey";

-- DropForeignKey
ALTER TABLE "case_progress_updates" DROP CONSTRAINT "case_progress_updates_case_id_fkey";

-- DropForeignKey
ALTER TABLE "company_agency_invitations" DROP CONSTRAINT "company_agency_invitations_agency_id_fkey";

-- DropForeignKey
ALTER TABLE "compete_challenges" DROP CONSTRAINT "compete_challenges_assessment_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_participant_1_id_fkey";

-- DropForeignKey
ALTER TABLE "conversations" DROP CONSTRAINT "conversations_participant_2_id_fkey";

-- DropForeignKey
ALTER TABLE "embassy_submissions" DROP CONSTRAINT "embassy_submissions_case_id_fkey";

-- DropForeignKey
ALTER TABLE "interview_schedules" DROP CONSTRAINT "interview_schedules_application_id_fkey";

-- DropForeignKey
ALTER TABLE "messages" DROP CONSTRAINT "messages_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "relocation_analytics" DROP CONSTRAINT "relocation_analytics_agency_id_fkey";

-- DropForeignKey
ALTER TABLE "relocation_cases" DROP CONSTRAINT "relocation_cases_agency_id_fkey";

-- AlterTable
ALTER TABLE "CompanyActivityLog" ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "CompanyTeamInvitation" ALTER COLUMN "invited_by" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "CompanyProfile" ADD CONSTRAINT "CompanyProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobApplication" ADD CONSTRAINT "JobApplication_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AIInterviewResult" ADD CONSTRAINT "AIInterviewResult_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_cases" ADD CONSTRAINT "relocation_cases_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_assignments" ADD CONSTRAINT "case_assignments_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_progress_updates" ADD CONSTRAINT "case_progress_updates_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "case_documents" ADD CONSTRAINT "case_documents_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "agency_reviews" ADD CONSTRAINT "agency_reviews_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_agency_invitations" ADD CONSTRAINT "company_agency_invitations_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "JobRecommendation" ADD CONSTRAINT "JobRecommendation_job_id_fkey" FOREIGN KEY ("job_id") REFERENCES "CompanyJob"("job_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AgencySubscription" ADD CONSTRAINT "AgencySubscription_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WebhookEndpoint" ADD CONSTRAINT "WebhookEndpoint_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SkillExtraction" ADD CONSTRAINT "SkillExtraction_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "CandidateDocument"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interview_schedules" ADD CONSTRAINT "interview_schedules_application_id_fkey" FOREIGN KEY ("application_id") REFERENCES "JobApplication"("application_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "relocation_analytics" ADD CONSTRAINT "relocation_analytics_agency_id_fkey" FOREIGN KEY ("agency_id") REFERENCES "Agency"("agency_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compete_challenges" ADD CONSTRAINT "compete_challenges_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_1_id_fkey" FOREIGN KEY ("participant_1_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_participant_2_id_fkey" FOREIGN KEY ("participant_2_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "embassy_submissions" ADD CONSTRAINT "embassy_submissions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAutofillSession" ADD CONSTRAINT "ResumeAutofillSession_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "CandidateDocument"("document_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamInvitation" ADD CONSTRAINT "CompanyTeamInvitation_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyActivityLog" ADD CONSTRAINT "CompanyActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
