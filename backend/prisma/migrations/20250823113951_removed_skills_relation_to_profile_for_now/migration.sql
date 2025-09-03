/*
  Warnings:

  - You are about to drop the `_ProfileSkills` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."_ProfileSkills" DROP CONSTRAINT "_ProfileSkills_A_fkey";

-- DropForeignKey
ALTER TABLE "public"."_ProfileSkills" DROP CONSTRAINT "_ProfileSkills_B_fkey";

-- AlterTable
ALTER TABLE "public"."CandidateProfile" ADD COLUMN     "skills" TEXT;

-- DropTable
DROP TABLE "public"."_ProfileSkills";
