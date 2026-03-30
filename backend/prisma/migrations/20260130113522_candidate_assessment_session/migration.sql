-- CreateEnum
CREATE TYPE "AssessmentSessionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'EXPIRED', 'ABANDONED');

-- CreateEnum
CREATE TYPE "CandidateAnswerState" AS ENUM ('DRAFT', 'FINAL');

-- CreateEnum
CREATE TYPE "TelemetryEventType" AS ENUM ('SESSION_START', 'SESSION_RESUME', 'QUESTION_VIEW', 'NAVIGATE', 'ANSWER_CHANGED', 'FLAG_TOGGLE', 'CODE_RUN', 'CODE_SUBMIT', 'FOCUS_LOST', 'COPY_PASTE', 'TAB_SWITCH', 'FULLSCREEN_EXIT', 'NETWORK_ISSUE', 'AUTO_SUBMIT', 'SUBMIT');

-- CreateTable
CREATE TABLE "candidate_assessment_sessions" (
    "session_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "status" "AssessmentSessionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_activity_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "expires_at" TIMESTAMP(3),
    "time_limit_min" INTEGER,
    "current_index" INTEGER NOT NULL DEFAULT 0,
    "flagged" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "progress" JSONB,
    "total_score" DOUBLE PRECISION,
    "passed" BOOLEAN,
    "result_summary" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_assessment_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateTable
CREATE TABLE "candidate_assessment_answers" (
    "answer_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "state" "CandidateAnswerState" NOT NULL DEFAULT 'DRAFT',
    "answer" JSONB,
    "time_spent_sec" INTEGER,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,
    "last_saved_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "latest_submission_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "candidate_assessment_answers_pkey" PRIMARY KEY ("answer_id")
);

-- CreateTable
CREATE TABLE "candidate_assessment_telemetry" (
    "event_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "type" "TelemetryEventType" NOT NULL,
    "payload" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_assessment_telemetry_pkey" PRIMARY KEY ("event_id")
);

-- CreateTable
CREATE TABLE "candidate_assessment_insights" (
    "insight_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "strengths" JSONB,
    "weaknesses" JSONB,
    "recommendations" JSONB,
    "risk_flags" JSONB,
    "evidence_by_skill" JSONB,
    "model_name" TEXT,
    "model_version" TEXT,
    "confidence" DOUBLE PRECISION,
    "generated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "candidate_assessment_insights_pkey" PRIMARY KEY ("insight_id")
);

-- CreateIndex
CREATE INDEX "candidate_assessment_sessions_candidate_id_status_idx" ON "candidate_assessment_sessions"("candidate_id", "status");

-- CreateIndex
CREATE INDEX "candidate_assessment_sessions_assessment_id_status_idx" ON "candidate_assessment_sessions"("assessment_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_candidate_session_per_assessment" ON "candidate_assessment_sessions"("assessment_id", "candidate_id");

-- CreateIndex
CREATE INDEX "candidate_assessment_answers_session_id_idx" ON "candidate_assessment_answers"("session_id");

-- CreateIndex
CREATE INDEX "candidate_assessment_answers_question_id_idx" ON "candidate_assessment_answers"("question_id");

-- CreateIndex
CREATE UNIQUE INDEX "uniq_answer_per_question_per_session" ON "candidate_assessment_answers"("session_id", "question_id");

-- CreateIndex
CREATE INDEX "candidate_assessment_telemetry_session_id_created_at_idx" ON "candidate_assessment_telemetry"("session_id", "created_at");

-- CreateIndex
CREATE INDEX "candidate_assessment_telemetry_candidate_id_created_at_idx" ON "candidate_assessment_telemetry"("candidate_id", "created_at");

-- CreateIndex
CREATE INDEX "candidate_assessment_telemetry_type_idx" ON "candidate_assessment_telemetry"("type");

-- CreateIndex
CREATE UNIQUE INDEX "candidate_assessment_insights_session_id_key" ON "candidate_assessment_insights"("session_id");

-- AddForeignKey
ALTER TABLE "candidate_assessment_sessions" ADD CONSTRAINT "candidate_assessment_sessions_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "employer_assessments"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_sessions" ADD CONSTRAINT "candidate_assessment_sessions_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_answers" ADD CONSTRAINT "candidate_assessment_answers_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "candidate_assessment_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_answers" ADD CONSTRAINT "candidate_assessment_answers_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_telemetry" ADD CONSTRAINT "candidate_assessment_telemetry_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "candidate_assessment_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_telemetry" ADD CONSTRAINT "candidate_assessment_telemetry_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "candidate_assessment_insights" ADD CONSTRAINT "candidate_assessment_insights_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "candidate_assessment_sessions"("session_id") ON DELETE CASCADE ON UPDATE CASCADE;
