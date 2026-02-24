"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  Users,
  Mail,
  Shield,
  Loader2,
} from "lucide-react";
import {
  useInvitationDetails,
  useAcceptInvitation,
} from "@/src/lib/company/team.queries";
import { ROLE_LABELS } from "@/src/types/team.types";

export default function AcceptInvitationPage() {
const params = useParams() as { token: string };
const router = useRouter();
const token = params.token;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");

  const {
    data: invitation,
    isLoading,
    isError,
    error: fetchError,
  } = useInvitationDetails(token);

  const acceptMutation = useAcceptInvitation();

const invData = invitation?.invitation;
  const isExpired = invData?.status === "expired";
  const isCancelled = invData?.status === "cancelled";
  const isAccepted = invData?.status === "accepted";
  const isValid = invData?.status === "pending";

  // Check if user already exists (has account)
  const existingUser = invData?.existing_user;

  const handleAccept = () => {
    setError("");

    if (!existingUser) {
      if (!password.trim()) {
        setError("Password is required");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match");
        return;
      }
    }

    acceptMutation.mutate(
      {
        token,
        data: {
          full_name: invData?.email?.split("@")[0] || "",
          password: existingUser ? "" : password,
        },
      },
      {
        onSuccess: () => {
          // Redirect to login or dashboard after short delay
          setTimeout(() => {
            router.push("/auth/login");
          }, 3000);
        },
        onError: (err: any) => {
          setError(
            err?.response?.data?.message ||
              err?.message ||
              "Failed to accept invitation"
          );
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center">
        <div className="text-center">
          <Loader2
            size={32}
            color="#005DDC"
            className="animate-spin mx-auto"
          />
          <p className="text-[14px] text-[#888] mt-3">
            Verifying invitation...
          </p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#EDEDED] p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} color="#dc2626" />
          </div>
          <h1 className="text-[18px] font-bold text-[#1a1a1a] mb-2">
            Invalid Invitation
          </h1>
          <p className="text-[13px] text-[#888]">
            This invitation link is invalid or has expired. Please contact the
            person who invited you for a new link.
          </p>
          <button
            onClick={() => router.push("/auth/login")}
            className="mt-6 px-5 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isAccepted) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#EDEDED] p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} color="#16a34a" />
          </div>
          <h1 className="text-[18px] font-bold text-[#1a1a1a] mb-2">
            Already Accepted
          </h1>
          <p className="text-[13px] text-[#888]">
            This invitation has already been accepted. You can log in to access
            the team dashboard.
          </p>
          <button
            onClick={() => router.push("/auth/login")}
            className="mt-6 px-5 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (isExpired || isCancelled) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#EDEDED] p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#FEE2E2] flex items-center justify-center mx-auto mb-4">
            <XCircle size={28} color="#dc2626" />
          </div>
          <h1 className="text-[18px] font-bold text-[#1a1a1a] mb-2">
            Invitation {isExpired ? "Expired" : "Cancelled"}
          </h1>
          <p className="text-[13px] text-[#888]">
            This invitation has been {isExpired ? "expired" : "cancelled"}.
            Please contact the team admin for a new invitation.
          </p>
          <button
            onClick={() => router.push("/auth/login")}
            className="mt-6 px-5 py-2 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  if (acceptMutation.isSuccess) {
    return (
      <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
        <div className="bg-white rounded-xl shadow-sm border border-[#EDEDED] p-8 max-w-md w-full text-center">
          <div className="w-14 h-14 rounded-full bg-[#DCFCE7] flex items-center justify-center mx-auto mb-4">
            <CheckCircle size={28} color="#16a34a" />
          </div>
          <h1 className="text-[18px] font-bold text-[#1a1a1a] mb-2">
            Welcome to the team!
          </h1>
          <p className="text-[13px] text-[#888]">
            Your invitation has been accepted. Redirecting you to login...
          </p>
          <div className="mt-4">
            <Loader2
              size={20}
              color="#005DDC"
              className="animate-spin mx-auto"
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F9] flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-sm border border-[#EDEDED] max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#EDEDED] text-center">
          <div className="w-12 h-12 rounded-full bg-[#EFF5FF] flex items-center justify-center mx-auto mb-3">
            <Users size={22} color="#005DDC" />
          </div>
          <h1 className="text-[20px] font-bold text-[#1a1a1a]">
            You&apos;re Invited
          </h1>
          <p className="text-[13px] text-[#888] mt-1">
            Join the team on HiRalent
          </p>
        </div>

        {/* Invitation details */}
        <div className="px-6 py-4">
          <div className="bg-[#F9F9F9] rounded-lg p-4 space-y-3 mb-5">
            <div className="flex items-center gap-3">
              <Mail size={15} color="#888" className="flex-shrink-0" />
              <div>
                <p className="text-[11px] text-[#999] uppercase tracking-wide">
                  Email
                </p>
                <p className="text-[13px] text-[#333] font-medium">
                  {invData?.email}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield size={15} color="#888" className="flex-shrink-0" />
              <div>
                <p className="text-[11px] text-[#999] uppercase tracking-wide">
                  Role
                </p>
                <p className="text-[13px] text-[#333] font-medium">
                  {ROLE_LABELS[
                    invData?.role as keyof typeof ROLE_LABELS
                  ] || invData?.role}
                </p>
              </div>
            </div>
            {invData?.company_name && (
              <div className="flex items-center gap-3">
                <Users size={15} color="#888" className="flex-shrink-0" />
                <div>
                  <p className="text-[11px] text-[#999] uppercase tracking-wide">
                    Company
                  </p>
                  <p className="text-[13px] text-[#333] font-medium">
                    {invData.company_name}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Password fields for new users */}
          {!existingUser && (
            <div className="space-y-3 mb-5">
              <p className="text-[12px] text-[#888]">
                Create a password to set up your account
              </p>
              <div>
                <label className="block text-[12px] font-medium text-[#555] mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 8 characters"
                  className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
                />
              </div>
              <div>
                <label className="block text-[12px] font-medium text-[#555] mb-1">
                  Confirm Password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your password"
                  className="w-full px-3 py-2 text-[13px] border border-[#EDEDED] rounded-lg outline-none focus:border-[#005DDC] transition-colors"
                />
              </div>
            </div>
          )}

          {existingUser && (
            <div className="bg-[#EFF5FF] rounded-lg p-3 mb-5">
              <p className="text-[12px] text-[#005DDC]">
                Your existing account will be linked to this team. No new
                password needed.
              </p>
            </div>
          )}

          {error && (
            <div className="bg-[#FEF2F2] rounded-lg p-3 mb-4">
              <p className="text-[12px] text-[#dc2626]">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push("/auth/login")}
              className="flex-1 px-4 py-2.5 text-[13px] font-medium text-[#555] bg-[#F5F5F5] rounded-lg hover:bg-[#EBEBEB] transition-colors"
            >
              Decline
            </button>
            <button
              onClick={handleAccept}
              disabled={acceptMutation.isPending}
              className="flex-1 px-4 py-2.5 text-[13px] font-medium text-white bg-[#005DDC] rounded-lg hover:bg-[#0046B3] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {acceptMutation.isPending ? "Accepting..." : "Accept Invitation"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
