"use client";

import React, { useState } from "react";
import { Users, Mail, Clock, Plus, ArrowRightLeft } from "lucide-react";
import { useTeamList, useMyPermissions, useResendInvitation, useCancelInvitation } from "@/src/lib/company/team.queries";
import TeamStats from "./TeamStats";
import TeamMemberCard from "./TeamMemberCard";
import InvitationCard from "./InvitationCard";
import InviteTeamMemberModal from "./InviteTeamMemberModal";
import EditMemberModal from "./EditMemberModal";
import RemoveMemberDialog from "./RemoveMemberDialog";
import TransferOwnershipModal from "./TransferOwnershipModal";
import ActivityLog from "./ActivityLog";


type Tab = "members" | "invitations" | "activity";

export default function TeamPage() {
  const [activeTab, setActiveTab] = useState<Tab>("members");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [transferOpen, setTransferOpen] = useState(false);
  const [editMember, setEditMember] = useState<any>(null);
  const [removeMember, setRemoveMember] = useState<any>(null);

    const resendMutation = useResendInvitation();
  const cancelMutation = useCancelInvitation();
  const { data: teamData, isLoading } = useTeamList();
  const { data: myPerms } = useMyPermissions();

  const members = teamData?.members || [];
  const invitations = teamData?.invitations || [];

  const activeMembers = members.filter((m) => m.is_active);
  const pendingInvitations = invitations.filter(
    (inv) => inv.status === "pending"
  );

  const isOwner = myPerms?.role === "owner" || myPerms?.is_owner === true;
  const canManageTeam =
    isOwner ||
    (myPerms?.permissions?.some(
      (p) => p.module === "team" && p.can_manage
    ) ?? false);
  const canInvite =
    isOwner ||
    (myPerms?.permissions?.some(
      (p) => p.module === "team" && p.can_create
    ) ?? false);

  const tabs = [
    {
      key: "members" as Tab,
      label: "Members",
      icon: Users,
      count: members.length,
    },
    {
      key: "invitations" as Tab,
      label: "Invitations",
      icon: Mail,
      count: pendingInvitations.length,
    },
    {
      key: "activity" as Tab,
      label: "Activity",
      icon: Clock,
    },
  ];

  return (
    <div className="mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-2">
          {isOwner && (
            <button
              onClick={() => setTransferOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#555] bg-white border border-[#EDEDED] rounded-lg hover:bg-[#F9F9F9] transition-colors"
            >
              <ArrowRightLeft size={14} />
              Transfer
            </button>
          )}
          {canInvite && (
            <button
              onClick={() => setInviteOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors"
            >
              <Plus size={15} />
              Invite Member
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <TeamStats
        totalMembers={teamData?.total_members || 0}
        pendingInvitations={teamData?.total_pending_invitations || 0}
        activeMembers={activeMembers.length}
        seatsLimit={teamData?.seats_limit ?? null}
      />

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-[#EDEDED] mt-6 mb-5">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`
                flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium
                border-b-2 transition-colors -mb-px
                ${
                  isActive
                    ? "border-[#005DDC] text-[#005DDC]"
                    : "border-transparent text-[#888] hover:text-[#555]"
                }
              `}
            >
              <Icon size={15} />
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={`
                    text-[11px] px-1.5 py-0.5 rounded-full ml-1
                    ${
                      isActive
                        ? "bg-[#EFF5FF] text-[#005DDC]"
                        : "bg-[#F0F0F0] text-[#888]"
                    }
                  `}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {isLoading && (
        <div className="py-16 text-center">
          <div className="w-7 h-7 border-2 border-[#005DDC] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-[13px] text-[#888] mt-3">Loading team...</p>
        </div>
      )}

      {!isLoading && activeTab === "members" && (
        <div>
          {members.length === 0 ? (
            <div className="py-16 text-center">
              <Users size={36} color="#ccc" className="mx-auto mb-3" />
              <p className="text-[15px] font-medium text-[#888]">
                No team members yet
              </p>
              <p className="text-[12px] text-[#aaa] mt-1">
                Invite your first team member to get started
              </p>
              {canInvite && (
                <button
                  onClick={() => setInviteOpen(true)}
                  className="mt-4 px-4 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors"
                >
                  Invite Member
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {members.map((member) => (
                <TeamMemberCard
                  key={member.member_id}
                  member={member}
                  canManage={canManageTeam}
                  onEdit={() => setEditMember(member)}
                  onRemove={() => setRemoveMember(member)}
                  onPermissions={() => setEditMember(member)}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === "invitations" && (
        <div>
          {pendingInvitations.length === 0 ? (
            <div className="py-16 text-center">
              <Mail size={36} color="#ccc" className="mx-auto mb-3" />
              <p className="text-[15px] font-medium text-[#888]">
                No pending invitations
              </p>
              <p className="text-[12px] text-[#aaa] mt-1">
                All invitations have been accepted or expired
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {pendingInvitations.map((invitation) => (
                <InvitationCard
                  key={invitation.invitation_id}
                  invitation={invitation}
                  onResend={(id) => resendMutation.mutate(id)}
                  onCancel={(id) => cancelMutation.mutate(id)}
                  isResending={resendMutation.isPending}
                  isCancelling={cancelMutation.isPending}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {!isLoading && activeTab === "activity" && <ActivityLog />}

      {/* Modals */}
      <InviteTeamMemberModal
        isOpen={inviteOpen}
        onClose={() => setInviteOpen(false)}
      />

      {editMember && (
        <EditMemberModal
          isOpen={!!editMember}
          member={editMember}
          onClose={() => setEditMember(null)}
        />
      )}

      {removeMember && (
        <RemoveMemberDialog
          isOpen={!!removeMember}
          member={removeMember}
          onClose={() => setRemoveMember(null)}
        />
      )}

      <TransferOwnershipModal
        isOpen={transferOpen}
        onClose={() => setTransferOpen(false)}
      />
    </div>
  );
}
