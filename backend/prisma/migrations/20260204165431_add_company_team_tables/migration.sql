-- CreateEnum
CREATE TYPE "CompanyTeamRole" AS ENUM ('owner', 'admin', 'hr_manager', 'recruiter', 'viewer');

-- CreateEnum
CREATE TYPE "InvitationStatus" AS ENUM ('pending', 'accepted', 'expired', 'cancelled');

-- CreateEnum
CREATE TYPE "CompanyModule" AS ENUM ('dashboard', 'jobs', 'candidates', 'assessments', 'questions', 'messages', 'settings', 'team', 'analytics', 'billing');

-- CreateTable
CREATE TABLE "CompanyTeamMember" (
    "member_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "role" "CompanyTeamRole" NOT NULL DEFAULT 'recruiter',
    "job_title" TEXT,
    "department" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "invited_by" TEXT,
    "joined_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyTeamMember_pkey" PRIMARY KEY ("member_id")
);

-- CreateTable
CREATE TABLE "CompanyTeamInvitation" (
    "invitation_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "CompanyTeamRole" NOT NULL DEFAULT 'recruiter',
    "job_title" TEXT,
    "department" TEXT,
    "token" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "status" "InvitationStatus" NOT NULL DEFAULT 'pending',
    "invited_by" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "cancelled_at" TIMESTAMP(3),
    "custom_permissions" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyTeamInvitation_pkey" PRIMARY KEY ("invitation_id")
);

-- CreateTable
CREATE TABLE "CompanyMemberPermission" (
    "permission_id" TEXT NOT NULL,
    "member_id" TEXT NOT NULL,
    "module" "CompanyModule" NOT NULL,
    "can_view" BOOLEAN NOT NULL DEFAULT false,
    "can_create" BOOLEAN NOT NULL DEFAULT false,
    "can_edit" BOOLEAN NOT NULL DEFAULT false,
    "can_delete" BOOLEAN NOT NULL DEFAULT false,
    "can_manage" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CompanyMemberPermission_pkey" PRIMARY KEY ("permission_id")
);

-- CreateTable
CREATE TABLE "CompanyActivityLog" (
    "log_id" TEXT NOT NULL,
    "company_id" TEXT NOT NULL,
    "member_id" TEXT,
    "user_id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "action_category" TEXT NOT NULL,
    "resource_type" TEXT,
    "resource_id" TEXT,
    "resource_name" TEXT,
    "details" JSONB,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CompanyActivityLog_pkey" PRIMARY KEY ("log_id")
);

-- CreateIndex
CREATE INDEX "CompanyTeamMember_company_id_idx" ON "CompanyTeamMember"("company_id");

-- CreateIndex
CREATE INDEX "CompanyTeamMember_user_id_idx" ON "CompanyTeamMember"("user_id");

-- CreateIndex
CREATE INDEX "CompanyTeamMember_role_idx" ON "CompanyTeamMember"("role");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyTeamMember_company_id_user_id_key" ON "CompanyTeamMember"("company_id", "user_id");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyTeamInvitation_token_key" ON "CompanyTeamInvitation"("token");

-- CreateIndex
CREATE INDEX "CompanyTeamInvitation_company_id_idx" ON "CompanyTeamInvitation"("company_id");

-- CreateIndex
CREATE INDEX "CompanyTeamInvitation_email_idx" ON "CompanyTeamInvitation"("email");

-- CreateIndex
CREATE INDEX "CompanyTeamInvitation_token_idx" ON "CompanyTeamInvitation"("token");

-- CreateIndex
CREATE INDEX "CompanyTeamInvitation_status_idx" ON "CompanyTeamInvitation"("status");

-- CreateIndex
CREATE INDEX "CompanyMemberPermission_member_id_idx" ON "CompanyMemberPermission"("member_id");

-- CreateIndex
CREATE INDEX "CompanyMemberPermission_module_idx" ON "CompanyMemberPermission"("module");

-- CreateIndex
CREATE UNIQUE INDEX "CompanyMemberPermission_member_id_module_key" ON "CompanyMemberPermission"("member_id", "module");

-- CreateIndex
CREATE INDEX "CompanyActivityLog_company_id_idx" ON "CompanyActivityLog"("company_id");

-- CreateIndex
CREATE INDEX "CompanyActivityLog_member_id_idx" ON "CompanyActivityLog"("member_id");

-- CreateIndex
CREATE INDEX "CompanyActivityLog_user_id_idx" ON "CompanyActivityLog"("user_id");

-- CreateIndex
CREATE INDEX "CompanyActivityLog_action_idx" ON "CompanyActivityLog"("action");

-- CreateIndex
CREATE INDEX "CompanyActivityLog_action_category_idx" ON "CompanyActivityLog"("action_category");

-- CreateIndex
CREATE INDEX "CompanyActivityLog_created_at_idx" ON "CompanyActivityLog"("created_at");

-- AddForeignKey
ALTER TABLE "CompanyTeamMember" ADD CONSTRAINT "CompanyTeamMember_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamMember" ADD CONSTRAINT "CompanyTeamMember_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamMember" ADD CONSTRAINT "CompanyTeamMember_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("user_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamInvitation" ADD CONSTRAINT "CompanyTeamInvitation_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyTeamInvitation" ADD CONSTRAINT "CompanyTeamInvitation_invited_by_fkey" FOREIGN KEY ("invited_by") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyMemberPermission" ADD CONSTRAINT "CompanyMemberPermission_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "CompanyTeamMember"("member_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyActivityLog" ADD CONSTRAINT "CompanyActivityLog_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "User"("user_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyActivityLog" ADD CONSTRAINT "CompanyActivityLog_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "CompanyTeamMember"("member_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CompanyActivityLog" ADD CONSTRAINT "CompanyActivityLog_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("user_id") ON DELETE RESTRICT ON UPDATE CASCADE;
