"use client";

import React from "react";
import { MoreVertical, Pencil, Trash2, Shield } from "lucide-react";
import { useState } from "react";
import type { TeamMember } from "@/src/types/team.types";
import RoleBadge from "./RoleBadge";

interface TeamMemberCardProps {
  member: TeamMember;
  onEdit: (member: TeamMember) => void;
  onRemove: (member: TeamMember) => void;
  onPermissions: (member: TeamMember) => void;
  canManage: boolean;
}

const TeamMemberCard: React.FC<TeamMemberCardProps> = ({
  member,
  onEdit,
  onRemove,
  onPermissions,
  canManage,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const isOwner = member.role === "owner";

  const initials = member.full_name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const lastActive = member.last_login_at
    ? new Date(member.last_login_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Never";

  return (
    <div className="bg-white rounded-xl border border-[#EDEDED] p-4 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#EFF5FF] text-[#005DDC] flex items-center justify-center text-sm font-semibold">
            {initials}
          </div>
          <div>
            <p className="text-sm font-medium text-black">{member.full_name}</p>
            <p className="text-xs text-gray-500">{member.email}</p>
          </div>
        </div>

        {canManage && !isOwner && (
          <div className="relative">
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-1 rounded-md hover:bg-gray-100 cursor-pointer"
            >
              <MoreVertical size={16} className="text-gray-400" />
            </button>

            {menuOpen && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setMenuOpen(false)}
                />
                <div className="absolute right-0 top-8 z-20 w-40 bg-white rounded-lg shadow-lg border border-[#EDEDED] py-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onEdit(member);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <Pencil size={14} />
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onPermissions(member);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    <Shield size={14} />
                    Permissions
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      onRemove(member);
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                  >
                    <Trash2 size={14} />
                    Remove
                  </button>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <RoleBadge role={member.role} />
        {member.job_title && (
          <span className="text-xs text-gray-500">{member.job_title}</span>
        )}
      </div>

      {member.department && (
        <p className="mt-2 text-xs text-gray-400">{member.department}</p>
      )}

      <div className="mt-3 pt-3 border-t border-[#EDEDED] flex items-center justify-between">
        <span className="text-xs text-gray-400">Last active: {lastActive}</span>
        {!member.is_active && (
          <span className="text-xs text-red-500 font-medium">Inactive</span>
        )}
      </div>
    </div>
  );
};

export default TeamMemberCard;
