/*
  Warnings:

  - The `skills` column on the `CandidateProfile` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "public"."CandidateProfile" DROP COLUMN "skills",
ADD COLUMN     "skills" TEXT[];
