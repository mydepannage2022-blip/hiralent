-- AlterTable
ALTER TABLE "public"."business_insights" ADD COLUMN     "payload" JSONB;

-- CreateIndex
CREATE INDEX "business_insights_target_type_target_id_idx" ON "public"."business_insights"("target_type", "target_id");
