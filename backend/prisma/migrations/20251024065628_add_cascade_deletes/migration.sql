-- DropForeignKey
ALTER TABLE "public"."AIInterviewResult" DROP CONSTRAINT "AIInterviewResult_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."AdminAuditLog" DROP CONSTRAINT "AdminAuditLog_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."AgencyAdminProfile" DROP CONSTRAINT "AgencyAdminProfile_admin_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CandidateDocument" DROP CONSTRAINT "CandidateDocument_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CandidateProfile" DROP CONSTRAINT "CandidateProfile_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CandidateProgressTracker" DROP CONSTRAINT "CandidateProgressTracker_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CandidateProgressTracker" DROP CONSTRAINT "CandidateProgressTracker_updated_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."CandidateSkill" DROP CONSTRAINT "CandidateSkill_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CandidateVector" DROP CONSTRAINT "CandidateVector_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CareerPrediction" DROP CONSTRAINT "CareerPrediction_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CompanyJob" DROP CONSTRAINT "CompanyJob_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."CompanyProfile" DROP CONSTRAINT "CompanyProfile_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."JobApplication" DROP CONSTRAINT "JobApplication_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."JobRecommendation" DROP CONSTRAINT "JobRecommendation_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."Notification" DROP CONSTRAINT "Notification_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProfileCompleteness" DROP CONSTRAINT "ProfileCompleteness_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."SkillExtraction" DROP CONSTRAINT "SkillExtraction_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."UploadedDocument" DROP CONSTRAINT "UploadedDocument_uploaded_by_fkey";

-- DropForeignKey
ALTER TABLE "public"."agency_reviews" DROP CONSTRAINT "agency_reviews_reviewer_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."ai_feedback" DROP CONSTRAINT "ai_feedback_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."case_assignments" DROP CONSTRAINT "case_assignments_agent_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."communication_logs" DROP CONSTRAINT "communication_logs_recipient_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."communication_logs" DROP CONSTRAINT "communication_logs_sender_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."company_agency_invitations" DROP CONSTRAINT "company_agency_invitations_inviter_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."generated_content" DROP CONSTRAINT "generated_content_user_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."hiring_analytics" DROP CONSTRAINT "hiring_analytics_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."relocation_cases" DROP CONSTRAINT "relocation_cases_candidate_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."skill_assessments" DROP CONSTRAINT "skill_assessments_candidate_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."CompanyProfile" ADD CONSTRAINT "CompanyProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AgencyAdminProfile" ADD CONSTRAINT "AgencyAdminProfile_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CompanyJob" ADD CONSTRAINT "CompanyJob_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobApplication" ADD CONSTRAINT "JobApplication_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateProgressTracker" ADD CONSTRAINT "CandidateProgressTracker_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AIInterviewResult" ADD CONSTRAINT "AIInterviewResult_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skill_assessments" ADD CONSTRAINT "skill_assessments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."relocation_cases" ADD CONSTRAINT "relocation_cases_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."case_assignments" ADD CONSTRAINT "case_assignments_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."agency_reviews" ADD CONSTRAINT "agency_reviews_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."company_agency_invitations" ADD CONSTRAINT "company_agency_invitations_inviter_id_fkey" FOREIGN KEY ("inviter_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."JobRecommendation" ADD CONSTRAINT "JobRecommendation_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateProfile" ADD CONSTRAINT "CandidateProfile_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."AdminAuditLog" ADD CONSTRAINT "AdminAuditLog_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."Notification" ADD CONSTRAINT "Notification_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateDocument" ADD CONSTRAINT "CandidateDocument_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateSkill" ADD CONSTRAINT "CandidateSkill_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SkillExtraction" ADD CONSTRAINT "SkillExtraction_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CareerPrediction" ADD CONSTRAINT "CareerPrediction_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."CandidateVector" ADD CONSTRAINT "CandidateVector_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProfileCompleteness" ADD CONSTRAINT "ProfileCompleteness_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communication_logs" ADD CONSTRAINT "communication_logs_sender_id_fkey" FOREIGN KEY ("sender_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."communication_logs" ADD CONSTRAINT "communication_logs_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."hiring_analytics" ADD CONSTRAINT "hiring_analytics_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."generated_content" ADD CONSTRAINT "generated_content_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ai_feedback" ADD CONSTRAINT "ai_feedback_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."UploadedDocument" ADD CONSTRAINT "UploadedDocument_uploaded_by_fkey" FOREIGN KEY ("uploaded_by") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
