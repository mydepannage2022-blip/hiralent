-- CreateTable
CREATE TABLE "ResumeAutofillSession" (
    "session_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "document_id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "parsed_data" JSONB NOT NULL,
    "confirmed_fields" JSONB,
    "rejected_fields" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ResumeAutofillSession_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "AutofillFieldMapping" (
    "mapping_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "field_name" TEXT NOT NULL,
    "extracted_value" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL,
    "is_confirmed" BOOLEAN NOT NULL DEFAULT false,
    "confirmed_value" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AutofillFieldMapping_pkey" PRIMARY KEY ("mapping_id")
);

-- CreateTable
CREATE TABLE "CandidateScore" (
    "score_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "total_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "skills_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "experience_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "education_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completeness_score" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "last_calculated" TIMESTAMP(3) NOT NULL,
    "calculation_method" TEXT NOT NULL DEFAULT 'v1',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CandidateScore_pkey" PRIMARY KEY ("score_id")
);

-- CreateTable
CREATE TABLE "ScoreHistory" (
    "history_id" TEXT NOT NULL,
    "score_id" TEXT NOT NULL,
    "score_value" DOUBLE PRECISION NOT NULL,
    "trigger_event" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ScoreHistory_pkey" PRIMARY KEY ("history_id")
);

-- CreateTable
CREATE TABLE "Badge" (
    "badge_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "icon" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "rule_id" TEXT NOT NULL,
    "criteria" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Badge_pkey" PRIMARY KEY ("badge_id")
);

-- CreateTable
CREATE TABLE "BadgeAward" (
    "award_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "badge_id" TEXT NOT NULL,
    "awarded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "BadgeAward_pkey" PRIMARY KEY ("award_id")
);

-- CreateTable
CREATE TABLE "Certification" (
    "certification_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "issuer" TEXT NOT NULL,
    "issue_date" TIMESTAMP(3) NOT NULL,
    "expiry_date" TIMESTAMP(3),
    "credential_id" TEXT,
    "credential_url" TEXT,
    "is_verified" BOOLEAN NOT NULL DEFAULT false,
    "verification_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Certification_pkey" PRIMARY KEY ("certification_id")
);

-- CreateTable
CREATE TABLE "ProfileEvent" (
    "event_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "event_type" TEXT NOT NULL,
    "event_data" JSONB NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProfileEvent_pkey" PRIMARY KEY ("event_id")
);

-- CreateIndex
CREATE INDEX "ResumeAutofillSession_candidate_id_idx" ON "ResumeAutofillSession"("candidate_id");

-- CreateIndex
CREATE INDEX "ResumeAutofillSession_status_idx" ON "ResumeAutofillSession"("status");

-- CreateIndex
CREATE UNIQUE INDEX "CandidateScore_candidate_id_key" ON "CandidateScore"("candidate_id");

-- CreateIndex
CREATE INDEX "CandidateScore_total_score_idx" ON "CandidateScore"("total_score");

-- CreateIndex
CREATE INDEX "ScoreHistory_score_id_idx" ON "ScoreHistory"("score_id");

-- CreateIndex
CREATE INDEX "ScoreHistory_timestamp_idx" ON "ScoreHistory"("timestamp");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_name_key" ON "Badge"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Badge_rule_id_key" ON "Badge"("rule_id");

-- CreateIndex
CREATE INDEX "BadgeAward_candidate_id_idx" ON "BadgeAward"("candidate_id");

-- CreateIndex
CREATE INDEX "BadgeAward_is_active_idx" ON "BadgeAward"("is_active");

-- CreateIndex
CREATE UNIQUE INDEX "BadgeAward_candidate_id_badge_id_key" ON "BadgeAward"("candidate_id", "badge_id");

-- CreateIndex
CREATE INDEX "Certification_candidate_id_idx" ON "Certification"("candidate_id");

-- CreateIndex
CREATE INDEX "Certification_expiry_date_idx" ON "Certification"("expiry_date");

-- CreateIndex
CREATE INDEX "ProfileEvent_candidate_id_idx" ON "ProfileEvent"("candidate_id");

-- CreateIndex
CREATE INDEX "ProfileEvent_event_type_idx" ON "ProfileEvent"("event_type");

-- CreateIndex
CREATE INDEX "ProfileEvent_timestamp_idx" ON "ProfileEvent"("timestamp");

-- AddForeignKey
ALTER TABLE "ResumeAutofillSession" ADD CONSTRAINT "ResumeAutofillSession_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResumeAutofillSession" ADD CONSTRAINT "ResumeAutofillSession_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "CandidateDocument"("document_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutofillFieldMapping" ADD CONSTRAINT "AutofillFieldMapping_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "ResumeAutofillSession"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CandidateScore" ADD CONSTRAINT "CandidateScore_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ScoreHistory" ADD CONSTRAINT "ScoreHistory_score_id_fkey" FOREIGN KEY ("score_id") REFERENCES "CandidateScore"("score_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BadgeAward" ADD CONSTRAINT "BadgeAward_badge_id_fkey" FOREIGN KEY ("badge_id") REFERENCES "Badge"("badge_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Certification" ADD CONSTRAINT "Certification_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProfileEvent" ADD CONSTRAINT "ProfileEvent_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
