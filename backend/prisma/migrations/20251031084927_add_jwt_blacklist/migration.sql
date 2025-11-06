-- CreateTable
CREATE TABLE "public"."jwt_blacklist" (
    "id" SERIAL NOT NULL,
    "token_hash" VARCHAR(255) NOT NULL,
    "session_id" VARCHAR(255),
    "user_id" VARCHAR(255),
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "jwt_blacklist_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "jwt_blacklist_token_hash_key" ON "public"."jwt_blacklist"("token_hash");

-- CreateIndex
CREATE INDEX "jwt_blacklist_token_hash_idx" ON "public"."jwt_blacklist"("token_hash");

-- CreateIndex
CREATE INDEX "jwt_blacklist_expires_at_idx" ON "public"."jwt_blacklist"("expires_at");
