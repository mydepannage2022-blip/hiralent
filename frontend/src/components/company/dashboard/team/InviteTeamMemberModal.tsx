"use client";

import React, { useState } from "react";
import { X } from "lucide-react";
import { useInviteTeamMember } from "@/src/lib/company/team.queries";
import type { TeamRole } from "@/src/types/team.types";

interface InviteTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ROLES: { value: TeamRole; label: string; desc: string }[] = [
  { value: "admin", label: "Admin", desc: "Full access, can manage team" },
  { value: "hr_manager", label: "HR Manager", desc: "Jobs, candidates, assessments" },
  { value: "recruiter", label: "Recruiter", desc: "View candidates, send messages" },
  { value: "viewer", label: "Viewer", desc: "Read-only access" },
];

const InviteTeamMemberModal: React.FC<InviteTeamMemberModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<TeamRole>("recruiter");
  const [jobTitle, setJobTitle] = useState("");
  const [department, setDepartment] = useState("");
  const [error, setError] = useState("");

  const inviteMutation = useInviteTeamMember();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!email.trim()) {
      setError("Email is required");
      return;
    }

    try {
      await inviteMutation.mutateAsync({
        email: email.trim().toLowerCase(),
        role,
        job_title: jobTitle.trim() || undefined,
        department: department.trim() || undefined,
      });

      // Reset form
      setEmail("");
      setRole("recruiter");
      setJobTitle("");
      setDepartment("");
      onClose();
    } catch (err: any) {
      setError(err.message || "Failed to send invitation");
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-xl w-full max-w-md mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-semibold">Invite Team Member</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-md hover:bg-gray-100 cursor-pointer"
          >
            <X size={18} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          {/* Email */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="hr@company.com"
              className="w-full border border-[#A5A5A5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DDC]"
              required
            />
          </div>

          {/* Role */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Role</label>
            <div className="space-y-2">
              {ROLES.map((r) => (
                <label
                  key={r.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    role === r.value
                      ? "border-[#005DDC] bg-[#EFF5FF]"
                      : "border-[#EDEDED] hover:border-gray-300"
                  }`}
                >
                  <input
                    type="radio"
                    name="role"
                    value={r.value}
                    checked={role === r.value}
                    onChange={() => setRole(r.value)}
                    className="accent-[#005DDC]"
                  />
                  <div>
                    <p className="text-sm font-medium">{r.label}</p>
                    <p className="text-xs text-gray-500">{r.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Job Title */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">
              Job Title <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={jobTitle}
              onChange={(e) => setJobTitle(e.target.value)}
              placeholder="e.g. Senior Recruiter"
              className="w-full border border-[#A5A5A5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DDC]"
            />
          </div>

          {/* Department */}
          <div className="mb-5">
            <label className="block text-sm font-medium mb-1">
              Department <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="text"
              value={department}
              onChange={(e) => setDepartment(e.target.value)}
              placeholder="e.g. Human Resources"
              className="w-full border border-[#A5A5A5] rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#005DDC]"
            />
          </div>

          {/* Error */}
          {error && (
            <p className="text-sm text-red-500 mb-3">{error}</p>
          )}

          {/* Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={inviteMutation.isPending}
              className="bg-[#005DDC] text-white px-5 py-2 rounded-md text-sm font-medium hover:bg-[#0046B3] transition-colors disabled:opacity-50 cursor-pointer"
            >
              {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
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

export default InviteTeamMemberModal;
