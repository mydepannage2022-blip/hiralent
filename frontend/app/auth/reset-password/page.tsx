"use client";

import React, { useState, useEffect } from "react";
import { Lock, Eye, EyeOff, ArrowLeft } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useResetPassword } from "../../../src/lib/auth/auth.queries";
import AuthLayout from "../../../src/components/layout/AuthLayout";
import { getAuthPageConfig } from "../../../config/authPagesConfig";
import SmartLink from "@/src/components/layout/SmartLink";

const ResetPasswordPage = () => {
  const searchParams = useSearchParams();
  const resetPasswordMutation = useResetPassword();
  const pageConfig = getAuthPageConfig('login');

  const [token, setToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const tokenFromUrl = searchParams?.get('token') ?? null;
    setToken(tokenFromUrl);
  }, [searchParams]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !newPassword || newPassword !== confirmPassword) return;
    resetPasswordMutation.mutate({ token, newPassword });
  };

  if (!token) {
    return (
      <AuthLayout
        backgroundImage={pageConfig.backgroundImage}
        testimonials={pageConfig.testimonials}
        title="Invalid Reset Link"
        subtitle="The password reset link is invalid or has expired"
        showTabs={false}
      >
        <div className="text-center">
          <SmartLink href="/auth/forgot-password" className="inline-flex items-center text-[#1B73E8] hover:underline">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Request New Reset Link
          </SmartLink>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title="Reset Password"
      subtitle="Enter your new password below"
      showTabs={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full pl-10 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B73E8]"
              placeholder="Enter your new password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B73E8]"
              placeholder="Confirm your new password"
              required
            />
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-red-500 text-xs mt-1">Passwords do not match</p>
          )}
        </div>

        <button
          type="submit"
          disabled={resetPasswordMutation.isPending || newPassword !== confirmPassword}
          className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] disabled:opacity-50"
        >
          {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
        </button>

        <div className="text-center">
          <SmartLink href="/auth/login" className="inline-flex items-center text-[#1B73E8] hover:underline text-sm">
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Login
          </SmartLink>
        </div>
      </form>
    </AuthLayout>
  );
};

export default ResetPasswordPage;