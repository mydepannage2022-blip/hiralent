-- AlterTable: make password_hash nullable for OAuth users
ALTER TABLE "User" ALTER COLUMN "password_hash" DROP NOT NULL;

-- AlterTable: add google_id and auth_provider
ALTER TABLE "User" ADD COLUMN "google_id" TEXT;
ALTER TABLE "User" ADD COLUMN "auth_provider" TEXT NOT NULL DEFAULT 'local';

-- CreateIndex: google_id must be unique
CREATE UNIQUE INDEX "User_google_id_key" ON "User"("google_id");
