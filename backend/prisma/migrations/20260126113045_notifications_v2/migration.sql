/*
  Warnings:

  - You are about to drop the column `is_read` on the `Notification` table. All the data in the column will be lost.
  - You are about to drop the column `user_id` on the `Notification` table. All the data in the column will be lost.
  - Added the required column `recipient_id` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Added the required column `title` to the `Notification` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `type` on the `Notification` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "NotificationAudience" AS ENUM ('CANDIDATE', 'COMPANY', 'AGENCY', 'ADMIN');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPLICATION_CONFIRMED', 'APPLICATION_STATUS_CHANGED', 'ASSESSMENT_INVITE', 'INTERVIEW_INVITE', 'GENERIC');

-- DropForeignKey
ALTER TABLE "Notification" DROP CONSTRAINT "Notification_user_id_fkey";

-- AlterTable
ALTER TABLE "Notification" DROP COLUMN "is_read",
DROP COLUMN "user_id",
ADD COLUMN     "action_url" TEXT,
ADD COLUMN     "audience" "NotificationAudience" NOT NULL DEFAULT 'CANDIDATE',
ADD COLUMN     "data" JSONB,
ADD COLUMN     "read_at" TIMESTAMP(3),
ADD COLUMN     "recipient_id" TEXT NOT NULL,
ADD COLUMN     "title" TEXT NOT NULL,
DROP COLUMN "type",
ADD COLUMN     "type" "NotificationType" NOT NULL,
ALTER COLUMN "sent_via" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "Notification_recipient_id_audience_read_at_idx" ON "Notification"("recipient_id", "audience", "read_at");

-- CreateIndex
CREATE INDEX "Notification_created_at_idx" ON "Notification"("created_at");

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_recipient_id_fkey" FOREIGN KEY ("recipient_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
