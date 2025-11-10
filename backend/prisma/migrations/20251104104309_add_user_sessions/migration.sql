-- DropForeignKey
ALTER TABLE "public"."CompanyProfile" DROP CONSTRAINT "CompanyProfile_company_id_fkey";

-- DropForeignKey
ALTER TABLE "public"."skill_assessments" DROP CONSTRAINT "skill_assessments_candidate_id_fkey";

-- AddForeignKey
ALTER TABLE "public"."CompanyProfile" ADD CONSTRAINT "CompanyProfile_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."skill_assessments" ADD CONSTRAINT "skill_assessments_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "public"."User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
