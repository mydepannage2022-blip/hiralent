/*
  Warnings:

  - A unique constraint covering the columns `[email]` on the table `Agency` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "AgencyType" AS ENUM ('VISA', 'RELOCATION', 'INTEGRATION');

-- AlterTable
ALTER TABLE "Agency" ADD COLUMN     "email" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "type" "AgencyType";

-- CreateIndex
CREATE UNIQUE INDEX "Agency_email_key" ON "Agency"("email");
