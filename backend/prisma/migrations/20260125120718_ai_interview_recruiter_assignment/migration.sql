-- AlterTable
ALTER TABLE "AIInterviewResult" ADD COLUMN     "assigned_at" TIMESTAMP(3),
ADD COLUMN     "assigned_by" TEXT,
ADD COLUMN     "scheduled_date" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "AIInterviewResult" ADD CONSTRAINT "AIInterviewResult_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;
