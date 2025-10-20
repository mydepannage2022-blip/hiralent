/*
  Warnings:

  - A unique constraint covering the columns `[target_type,target_id,category,day_bucket]` on the table `business_insights` will be added. If there are existing duplicate values, this will fail.
  - Changed the type of `insight_type` on the `business_insights` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Changed the type of `category` on the `business_insights` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "public"."InsightType" AS ENUM ('recommendation', 'prediction', 'trend', 'alert', 'opportunity');

-- CreateEnum
CREATE TYPE "public"."InsightCategory" AS ENUM ('hiring', 'performance', 'market', 'finance', 'growth', 'business_model');

-- AlterTable
ALTER TABLE "public"."business_insights" ADD COLUMN     "day_bucket" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_DATE,
ADD COLUMN     "dedupe_checksum" TEXT,
DROP COLUMN "insight_type",
ADD COLUMN     "insight_type" "public"."InsightType" NOT NULL,
DROP COLUMN "category",
ADD COLUMN     "category" "public"."InsightCategory" NOT NULL,
ALTER COLUMN "confidence" DROP NOT NULL,
ALTER COLUMN "priority" SET DEFAULT 'medium';

-- CreateIndex
CREATE INDEX "business_insights_dedupe_checksum_idx" ON "public"."business_insights"("dedupe_checksum");

-- CreateIndex
CREATE UNIQUE INDEX "business_insights_target_type_target_id_category_day_bucket_key" ON "public"."business_insights"("target_type", "target_id", "category", "day_bucket");
