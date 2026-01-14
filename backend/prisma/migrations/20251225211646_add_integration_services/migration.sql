-- AlterTable
ALTER TABLE "relocation_cases" ADD COLUMN     "integration_agency_id" TEXT;

-- CreateTable
CREATE TABLE "integration_services" (
    "service_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "service_type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "service_date" TIMESTAMP(3),
    "proof_document" TEXT,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_services_pkey" PRIMARY KEY ("service_id")
);

-- CreateIndex
CREATE INDEX "integration_services_case_id_idx" ON "integration_services"("case_id");

-- CreateIndex
CREATE INDEX "integration_services_service_type_idx" ON "integration_services"("service_type");

-- CreateIndex
CREATE INDEX "integration_services_status_idx" ON "integration_services"("status");

-- AddForeignKey
ALTER TABLE "relocation_cases" ADD CONSTRAINT "relocation_cases_integration_agency_id_fkey" FOREIGN KEY ("integration_agency_id") REFERENCES "Agency"("agency_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "integration_services" ADD CONSTRAINT "integration_services_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;
