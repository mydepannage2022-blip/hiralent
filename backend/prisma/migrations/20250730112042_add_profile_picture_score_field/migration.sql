/*
  Warnings:

  - Added the required column `profile_picture_score` to the `ProfileCompleteness` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ProfileCompleteness" ADD COLUMN     "profile_picture_score" DOUBLE PRECISION NOT NULL;
