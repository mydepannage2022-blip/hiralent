"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { useRemoveTeamMember } from "@/src/lib/company/team.queries";
import type { TeamMember } from "@/src/types/team.types";

interface RemoveMemberDialogProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
}

const RemoveMemberDialog: React.FC<RemoveMemberDialogProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const removeMutation = useRemoveTeamMember();

  const handleConfirm = async () => {
    if (!member) return;

    try {
      await removeMutation.mutateAsync(member.member_id);
      onClose();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-sm mx-4 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-red-50 rounded-lg">
            <AlertTriangle size={20} className="text-red-600" />
          </div>
          <h2 className="text-lg font-semibold">Remove Member</h2>
        </div>

        <p className="text-sm text-gray-600 mb-5">
          Are you sure you want to remove{" "}
          <span className="font-medium text-black">{member.full_name}</span>{" "}
          from the team? They will lose access to all company data.
        </p>

        <div className="flex items-center gap-3">
          <button
            onClick={handleConfirm}
            disabled={removeMutation.isPending}
            className="bg-red-600 text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {removeMutation.isPending ? "Removing..." : "Remove"}
          </button>
          <button
            onClick={onClose}
            className="text-[#515151] px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-100 cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default RemoveMemberDialog;
