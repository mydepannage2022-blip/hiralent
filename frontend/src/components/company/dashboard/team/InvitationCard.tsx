"use client";

import React from "react";
import { RotateCw, X, Clock } from "lucide-react";
import type { TeamInvitation } from "@/src/types/team.types";
import RoleBadge from "./RoleBadge";

interface InvitationCardProps {
  invitation: TeamInvitation;
  onResend: (id: string) => void;
  onCancel: (id: string) => void;
  isResending: boolean;
  isCancelling: boolean;
}

const InvitationCard: React.FC<InvitationCardProps> = ({
  invitation,
  onResend,
  onCancel,
  isResending,
  isCancelling,
}) => {
  const expiresAt = new Date(invitation.expires_at);
  const now = new Date();
  const daysLeft = Math.ceil(
    (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );
  const isExpiringSoon = daysLeft <= 2;

  return (
    <div className="bg-white rounded-xl border border-dashed border-[#A5A5A5] p-4">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-black">{invitation.email}</p>
          <div className="flex items-center gap-2 mt-1">
            <RoleBadge role={invitation.role} />
            {invitation.job_title && (
              <span className="text-xs text-gray-500">
                {invitation.job_title}
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => onResend(invitation.invitation_id)}
            disabled={isResending}
            className="p-1.5 rounded-md hover:bg-gray-100 cursor-pointer disabled:opacity-50"
            title="Resend"
          >
            <RotateCw
              size={14}
              className={`text-[#005DDC] ${isResending ? "animate-spin" : ""}`}
            />
          </button>
          <button
            onClick={() => onCancel(invitation.invitation_id)}
            disabled={isCancelling}
            className="p-1.5 rounded-md hover:bg-red-50 cursor-pointer disabled:opacity-50"
            title="Cancel"
          >
            <X size={14} className="text-red-500" />
          </button>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-[#EDEDED] flex items-center justify-between">
        <span className="text-xs text-gray-400">
          Invited by {invitation.invited_by.full_name}
        </span>
        <span
          className={`flex items-center gap-1 text-xs ${
            isExpiringSoon ? "text-red-500" : "text-gray-400"
          }`}
        >
          <Clock size={12} />
          {daysLeft > 0 ? `${daysLeft}d left` : "Expired"}
        </span>
      </div>
    </div>
  );
};

export default InvitationCard;
