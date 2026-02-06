"use client";

import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import { useUpdateTeamMember } from "@/src/lib/company/team.queries";
import type { TeamMember, TeamRole } from "@/src/types/team.types";

interface EditMemberModalProps {
  member: TeamMember | null;
  isOpen: boolean;
  onClose: () => void;
}

const ROLES: { value: TeamRole; label: string }[] = [
  { value: "admin", label: "Admin" },
  { value: "hr_manager", label: "HR Manager" },
  { value: "recruiter", label: "Recruiter" },
  { value: "viewer", label: "Viewer" },
];

const EditMemberModal: React.FC<EditMemberModalProps> = ({
  member,
  isOpen,
  onClose,
}) => {
  const [role, setRole] = useState<TeamRole>("recruiter");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState("");

  const updateMutation = useUpdateTeamMember();

  useEffect(() => {
    if (member) {
      setRole(member.role);
      setJobTitle(member.job_title || "");
      setDepartment(member.department || "");
      setIsActive(member.is_active);
      setError("");
    }
  }, [member]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!member) return;
    setError("");

    try {
      await updateMutation.mutateAsync({
        memberId: member.member_id,
        data: {
          role,
          job_title: jobTitle.trim() || undefined,
          department: department.trim() || undefined,
          is_active: isActive,
        },
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to update member");
    }
  };

  if (!isOpen || !member) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Edit Member</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 cursor-pointer"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Member Info */}
        <div className="mb-5 p-3 bg-[#F9F9F9] rounded-lg">
          <p className="text-sm font-medium">{member.full_name}</p>
          <p className="text-xs text-gray-500">{member.email}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Role */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as TeamRole)}
              className="w-full border border-[#A5A5A5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DDC]"
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          {/* Job Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Job Title</label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Recruiter"
              className="w-full border border-[#A5A5A5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DDC]"
            />
          </div>

          {/* Department */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Department</label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Human Resources"
              className="w-full border border-[#A5A5A5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DDC]"
            />
          </div>

          {/* Active Toggle */}
          <div className="mb-5 flex items-center justify-between">
            <span className="text-sm font-medium">Active</span>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative w-10 h-5 rounded-full transition-colors cursor-pointer ${
                isActive ? "bg-[#005DDC]" : "bg-gray-300"
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                  isActive ? "translate-x-5" : ""
                }`}
              />
            </button>
          </div>

          {error && <p className="text-sm text-red-500 mb-3">{error}</p>}

          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={updateMutation.isPending}
              className="bg-[#005DDC] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#0046B3] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-[#515151] px-5 py-2 rounded-md text-sm font-medium hover:bg-gray-100 cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditMemberModal;
