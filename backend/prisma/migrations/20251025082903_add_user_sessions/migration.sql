-- CreateTable
CREATE TABLE "public"."user_sessions" (
    "session_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "device_name" TEXT,
    "device_type" TEXT,
    "browser_name" TEXT,
    "browser_version" TEXT,
    "os_name" TEXT,
    "os_version" TEXT,
    "ip_address" TEXT NOT NULL,
    "location_country" TEXT,
    "location_city" TEXT,
    "location_region" TEXT,
    "jwt_token_hash" TEXT NOT NULL,
    "is_current" BOOLEAN NOT NULL DEFAULT false,
    "last_activity" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "login_time" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "user_agent" TEXT NOT NULL,
    "screen_resolution" TEXT,
    "timezone" TEXT,
    "language" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "terminated_at" TIMESTAMP(3),
    "terminated_by" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_sessions_pkey" PRIMARY KEY ("session_id")
);

-- CreateIndex
CREATE INDEX "user_sessions_user_id_idx" ON "public"."user_sessions"("user_id");

-- CreateIndex
CREATE INDEX "user_sessions_jwt_token_hash_idx" ON "public"."user_sessions"("jwt_token_hash");

-- CreateIndex
CREATE INDEX "user_sessions_is_active_idx" ON "public"."user_sessions"("is_active");

-- CreateIndex
CREATE INDEX "user_sessions_expires_at_idx" ON "public"."user_sessions"("expires_at");

-- AddForeignKey
ALTER TABLE "public"."user_sessions" ADD CONSTRAINT "user_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;
