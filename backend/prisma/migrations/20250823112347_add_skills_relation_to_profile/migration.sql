/*
  Warnings:

  - You are about to drop the column `skills` on the `CandidateProfile` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "public"."CandidateProfile" DROP COLUMN "skills";

-- CreateTable
CREATE TABLE "public"."_ProfileSkills" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProfileSkills_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "_ProfileSkills_B_index" ON "public"."_ProfileSkills"("B");

-- AddForeignKey
ALTER TABLE "public"."_ProfileSkills" ADD CONSTRAINT "_ProfileSkills_A_fkey" FOREIGN KEY ("A") REFERENCES "public"."CandidateProfile"("candidate_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."_ProfileSkills" ADD CONSTRAINT "_ProfileSkills_B_fkey" FOREIGN KEY ("B") REFERENCES "public"."CandidateSkill"("skill_id") ON DELETE CASCADE ON UPDATE CASCADE;
