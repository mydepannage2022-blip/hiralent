-- CreateTable
CREATE TABLE "embassy_submissions" (
    "submission_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "embassy_name" TEXT NOT NULL,
    "embassy_location" TEXT NOT NULL,
    "submission_date" TIMESTAMP(3) NOT NULL,
    "tracking_number" TEXT,
    "expected_response" TIMESTAMP(3),
    "receipt_url" TEXT,
    "status" TEXT NOT NULL DEFAULT 'submitted',
    "interview_date" TIMESTAMP(3),
    "interview_location" TEXT,
    "interview_notes" TEXT,
    "decision_date" TIMESTAMP(3),
    "decision_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "embassy_submissions_pkey" PRIMARY KEY ("submission_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "embassy_submissions_case_id_key" ON "embassy_submissions"("case_id");

-- AddForeignKey
ALTER TABLE "embassy_submissions" ADD CONSTRAINT "embassy_submissions_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE RESTRICT ON UPDATE CASCADE;
