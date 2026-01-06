/*
  Warnings:

  - You are about to drop the column `agency_fee_amount` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `airport_pickup_required` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `arrival_date` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `arrival_notes` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `flight_number` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `housing_address` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `housing_contract_url` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `housing_type` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `lease_end_date` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `lease_start_date` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `monthly_rent_mad` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `utility_electricity` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `utility_internet` on the `relocation_cases` table. All the data in the column will be lost.
  - You are about to drop the column `utility_water` on the `relocation_cases` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "relocation_cases" DROP COLUMN "agency_fee_amount",
DROP COLUMN "airport_pickup_required",
DROP COLUMN "arrival_date",
DROP COLUMN "arrival_notes",
DROP COLUMN "flight_number",
DROP COLUMN "housing_address",
DROP COLUMN "housing_contract_url",
DROP COLUMN "housing_type",
DROP COLUMN "lease_end_date",
DROP COLUMN "lease_start_date",
DROP COLUMN "monthly_rent_mad",
DROP COLUMN "utility_electricity",
DROP COLUMN "utility_internet",
DROP COLUMN "utility_water",
ADD COLUMN     "housing_agency_id" TEXT;

-- CreateTable
CREATE TABLE "housing_arrangements" (
    "housing_id" TEXT NOT NULL,
    "case_id" TEXT NOT NULL,
    "housing_type" TEXT,
    "housing_address" TEXT,
    "monthly_rent_mad" DOUBLE PRECISION,
    "agency_fee_amount" DOUBLE PRECISION,
    "lease_start_date" TIMESTAMP(3),
    "lease_end_date" TIMESTAMP(3),
    "housing_contract_url" TEXT,
    "utility_water" TEXT DEFAULT 'pending',
    "utility_electricity" TEXT DEFAULT 'pending',
    "utility_internet" TEXT DEFAULT 'pending',
    "arrival_date" TIMESTAMP(3),
    "flight_number" TEXT,
    "airport_pickup_required" BOOLEAN DEFAULT false,
    "arrival_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "housing_arrangements_pkey" PRIMARY KEY ("housing_id")
);

-- CreateIndex
CREATE UNIQUE INDEX "housing_arrangements_case_id_key" ON "housing_arrangements"("case_id");

-- AddForeignKey
ALTER TABLE "relocation_cases" ADD CONSTRAINT "relocation_cases_housing_agency_id_fkey" FOREIGN KEY ("housing_agency_id") REFERENCES "Agency"("agency_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "housing_arrangements" ADD CONSTRAINT "housing_arrangements_case_id_fkey" FOREIGN KEY ("case_id") REFERENCES "relocation_cases"("case_id") ON DELETE CASCADE ON UPDATE CASCADE;
