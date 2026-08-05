-- CreateIndex
CREATE INDEX "AIInterviewResult_candidate_id_created_at_idx" ON "AIInterviewResult"("candidate_id", "created_at");

-- CreateIndex
CREATE INDEX "AIInterviewResult_status_idx" ON "AIInterviewResult"("status");

-- CreateIndex
CREATE INDEX "AdminAuditLog_admin_id_created_at_idx" ON "AdminAuditLog"("admin_id", "created_at");

-- CreateIndex
CREATE INDEX "AdminAuditLog_target_table_target_id_idx" ON "AdminAuditLog"("target_table", "target_id");

-- CreateIndex
CREATE INDEX "AdminAuditLog_created_at_idx" ON "AdminAuditLog"("created_at");

-- CreateIndex
CREATE INDEX "CandidateDocument_candidate_id_created_at_idx" ON "CandidateDocument"("candidate_id", "created_at");

-- CreateIndex
CREATE INDEX "CandidateGlobalScore_created_at_idx" ON "CandidateGlobalScore"("created_at");

-- CreateIndex
CREATE INDEX "CandidateSkill_candidate_id_idx" ON "CandidateSkill"("candidate_id");

-- CreateIndex
CREATE INDEX "CareerPrediction_candidate_id_idx" ON "CareerPrediction"("candidate_id");

-- CreateIndex
CREATE INDEX "JobApplicationEventOutbox_created_at_idx" ON "JobApplicationEventOutbox"("created_at");

-- CreateIndex
CREATE INDEX "MatchingOutboxEvent_created_at_idx" ON "MatchingOutboxEvent"("created_at");

-- CreateIndex
CREATE INDEX "SkillExtraction_candidate_id_status_idx" ON "SkillExtraction"("candidate_id", "status");

-- CreateIndex
CREATE INDEX "SourcedCandidate_status_created_at_idx" ON "SourcedCandidate"("status", "created_at");

-- CreateIndex
CREATE INDEX "case_assignments_agency_id_status_idx" ON "case_assignments"("agency_id", "status");

-- CreateIndex
CREATE INDEX "code_submissions_assessment_id_candidate_id_created_at_idx" ON "code_submissions"("assessment_id", "candidate_id", "created_at");

-- CreateIndex
CREATE INDEX "code_submissions_candidate_id_idx" ON "code_submissions"("candidate_id");

-- CreateIndex
CREATE INDEX "code_submissions_question_id_idx" ON "code_submissions"("question_id");

-- CreateIndex
CREATE INDEX "code_submissions_status_idx" ON "code_submissions"("status");

-- CreateIndex
CREATE INDEX "communication_logs_recipient_id_created_at_idx" ON "communication_logs"("recipient_id", "created_at");

-- CreateIndex
CREATE INDEX "communication_logs_sender_id_created_at_idx" ON "communication_logs"("sender_id", "created_at");

-- CreateIndex
CREATE INDEX "communication_logs_status_idx" ON "communication_logs"("status");

-- CreateIndex
CREATE INDEX "communication_logs_campaign_id_idx" ON "communication_logs"("campaign_id");

-- CreateIndex
CREATE INDEX "company_agency_invitations_agency_id_status_idx" ON "company_agency_invitations"("agency_id", "status");

-- CreateIndex
CREATE INDEX "embassy_submissions_status_created_at_idx" ON "embassy_submissions"("status", "created_at");

-- CreateIndex
CREATE INDEX "hiring_analytics_company_id_created_at_idx" ON "hiring_analytics"("company_id", "created_at");

-- CreateIndex
CREATE INDEX "interview_schedules_status_created_at_idx" ON "interview_schedules"("status", "created_at");

-- CreateIndex
CREATE INDEX "messages_conversation_id_sent_at_idx" ON "messages"("conversation_id", "sent_at");

-- CreateIndex
CREATE INDEX "messages_sender_id_idx" ON "messages"("sender_id");

-- CreateIndex
CREATE INDEX "relocation_analytics_agency_id_created_at_idx" ON "relocation_analytics"("agency_id", "created_at");

-- CreateIndex
CREATE INDEX "relocation_cases_candidate_id_idx" ON "relocation_cases"("candidate_id");

-- CreateIndex
CREATE INDEX "relocation_cases_agency_id_status_idx" ON "relocation_cases"("agency_id", "status");

-- CreateIndex
CREATE INDEX "skill_assessments_candidate_id_created_at_idx" ON "skill_assessments"("candidate_id", "created_at");

-- CreateIndex
CREATE INDEX "skill_assessments_status_idx" ON "skill_assessments"("status");

-- CreateIndex
CREATE INDEX "usage_analytics_user_id_timestamp_idx" ON "usage_analytics"("user_id", "timestamp");

-- CreateIndex
CREATE INDEX "usage_analytics_action_type_timestamp_idx" ON "usage_analytics"("action_type", "timestamp");

-- CreateIndex
CREATE INDEX "usage_analytics_timestamp_idx" ON "usage_analytics"("timestamp");
