-- CreateTable
CREATE TABLE "chat_history" (
    "chat_id" TEXT NOT NULL,
    "candidate_id" TEXT NOT NULL,
    "user_message" TEXT NOT NULL,
    "bot_response" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chat_history_pkey" PRIMARY KEY ("chat_id")
);

-- CreateIndex
CREATE INDEX "chat_history_candidate_id_idx" ON "chat_history"("candidate_id");

-- CreateIndex
CREATE INDEX "chat_history_created_at_idx" ON "chat_history"("created_at");

-- AddForeignKey
ALTER TABLE "chat_history" ADD CONSTRAINT "chat_history_candidate_id_fkey" FOREIGN KEY ("candidate_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
