-- Wave 1 / Phase 1.2 — refresh-token rotation.
-- Adds a nullable hashed refresh token to each session so /auth/refresh can
-- look up the owning session by sha256(refreshToken) and rotate it.

-- AlterTable
ALTER TABLE "user_sessions" ADD COLUMN "refresh_token_hash" TEXT;

-- CreateIndex
CREATE INDEX "user_sessions_refresh_token_hash_idx" ON "user_sessions"("refresh_token_hash");
