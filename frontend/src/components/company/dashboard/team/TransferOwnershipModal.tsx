"use client";

import React, { useState } from "react";
import { X, AlertTriangle, ArrowRightLeft, Search } from "lucide-react";
import { useTeamList, useTransferOwnership } from "@/src/lib/company/team.queries";
import { ROLE_LABELS } from "@/src/types/team.types";

interface TransferOwnershipModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function TransferOwnershipModal({
  isOpen,
  onClose,
}: TransferOwnershipModalProps) {
  const [selectedMemberId, setSelectedMemberId] = useState<string>("");
  const [confirmText, setConfirmText] = useState("");
  const [search, setSearch] = useState("");
  const [step, setStep] = useState<1 | 2>(1);

  const { data: teamData } = useTeamList();
  const transferMutation = useTransferOwnership();

const members = (teamData?.members || []).filter(
  (m: any) => m.is_active && m.role !== "owner"
);

  const filtered = members.filter((m: any) => {
    if (!search.trim()) return true;
    const name =
      `${m.user?.first_name || ""} ${m.user?.last_name || ""}`.toLowerCase();
    const email = (m.user?.email || "").toLowerCase();
    return (
      name.includes(search.toLowerCase()) ||
      email.includes(search.toLowerCase())
    );
  });

  const selectedMember = members.find((m: any) => m.id === selectedMemberId);

  const handleNext = () => {
    if (!selectedMemberId) return;
    setStep(2);
  };

  const handleTransfer = () => {
    if (confirmText !== "TRANSFER") return;

    transferMutation.mutate(
      { new_owner_id: selectedMemberId },
      {
        onSuccess: () => {
          onClose();
          setStep(1);
          setSelectedMemberId("");
          setConfirmText("");
          setSearch("");
        },
      }
    );
  };

  const handleClose = () => {
    onClose();
    setStep(1);
    setSelectedMemberId("");
    setConfirmText("");
    setSearch("");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={handleClose}
      />
      <div className="relative bg-white rounded-xl w-full max-w-md mx-4 shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EDEDED]">
          <div className="flex items-center gap-2">
            <ArrowRightLeft size={18} color="#dc2626" />
            <h2 className="text-[16px] font-semibold text-[#1a1a1a]">
              Transfer Ownership
            </h2>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-[#F5F5F5] transition-colors"
          >
            <X size={18} color="#888" />
          </button>
        </div>

        {step === 1 && (
          <div className="px-5 py-4">
            {/* Warning */}
            <div className="flex gap-3 p-3 bg-[#FEF3C7] rounded-lg mb-4">
              <AlertTriangle
                size={18}
                color="#d97706"
                className="flex-shrink-0 mt-0.5"
              />
              <div>
                <p className="text-[13px] font-medium text-[#92400e]">
                  This action cannot be undone
                </p>
                <p className="text-[12px] text-[#a16207] mt-0.5">
                  You will lose owner privileges and become an admin. The
                  selected member will gain full control of this company
                  account.
                </p>
              </div>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search
                size={15}
                color="#999"
                className="absolute left-3 top-1/2 -translate-y-1/2"
              />
              <input
                type="text"
                placeholder="Search team members..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
              />
            </div>

            {/* Member list */}
            <div className="max-h-[240px] overflow-y-auto space-y-1">
              {filtered.length === 0 && (
                <p className="text-[13px] text-[#999] text-center py-6">
                  No eligible members found
                </p>
              )}
              {filtered.map((member: any) => {
                const isSelected = member.member_id === selectedMemberId;
                const name = member.full_name || "Unknown";
                const email = member.email || "";

                return (
                  <button
                    key={member.member_id}
                    type="button"
                    onClick={() => setSelectedMemberId(member.member_id)}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg text-left transition-colors
                      ${isSelected ? "bg-[#EFF5FF] border border-[#005DDC]" : "border border-transparent hover:bg-[#F9F9F9]"}
                    `}
                  >
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-[13px] font-semibold flex-shrink-0"
                      style={{ backgroundColor: "#005DDC" }}
                    >
                      {name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-medium text-[#333] truncate">
                        {name}
                      </p>
                      <p className="text-[11px] text-[#999] truncate">
                        {email}
                      </p>
                    </div>
                    <span className="text-[11px] text-[#888] bg-[#F0F0F0] px-2 py-0.5 rounded">
                      {ROLE_LABELS[member.role as keyof typeof ROLE_LABELS] ||
                        member.role}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-[#EDEDED]">
              <button
                onClick={handleClose}
                className="px-4 py-2 text-[13px] font-medium text-[#555] bg-[#F5F5F5] rounded-lg hover:bg-[#EBEBEB] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedMemberId}
                className="px-4 py-2 text-[13px] font-medium text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="px-5 py-4">
            {/* Confirmation */}
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-3">
                <AlertTriangle size={22} color="#dc2626" />
              </div>
              <p className="text-[14px] font-medium text-[#333]">
                Transfer ownership to{" "}
                <span className="text-[#005DDC]">
                  {selectedMember?.full_name}
                </span>
                ?
              </p>
              <p className="text-[12px] text-[#888] mt-1">
                {selectedMember?.email}
              </p>
            </div>

            <div className="bg-[#FEF2F2] rounded-lg p-3 mb-4">
              <p className="text-[12px] text-[#991b1b] leading-relaxed">
                After transfer, you will be downgraded to <strong>Admin</strong>{" "}
                role. The new owner will have full control including the ability
                to remove you from the team.
              </p>
            </div>

            <div className="mb-4">
              <label className="block text-[12px] font-medium text-[#555] mb-1.5">
                Type <span className="font-bold text-[#dc2626]">TRANSFER</span>{" "}
                to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="TRANSFER"
                className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#dc2626] transition-colors"
              />
            </div>

            {/* Footer */}
            <div className="flex justify-end gap-2 pt-2 border-t border-[#EDEDED]">
              <button
                onClick={() => {
                  setStep(1);
                  setConfirmText("");
                }}
                className="px-4 py-2 text-[13px] font-medium text-[#555] bg-[#F5F5F5] rounded-lg hover:bg-[#EBEBEB] transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleTransfer}
                disabled={
                  confirmText !== "TRANSFER" || transferMutation.isPending
                }
                className="px-4 py-2 text-[13px] font-medium text-white bg-[#dc2626] rounded-lg hover:bg-[#b91c1c] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {transferMutation.isPending
                  ? "Transferring..."
                  : "Transfer Ownership"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
