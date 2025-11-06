"use client";

import React, { useState } from "react";
import { Mail, ArrowLeft } from "lucide-react";
import { useForgotPassword } from "../../../src/lib/auth/auth.queries";
import AuthLayout from "../../../src/components/layout/AuthLayout";
import { getAuthPageConfig } from "../../../config/authPagesConfig";
import SmartLink from "@/src/components/layout/SmartLink";

const ForgotPasswordPage = () => {
  const forgotPasswordMutation = useForgotPassword();
  const pageConfig = getAuthPageConfig('login');
  const [email, setEmail] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    forgotPasswordMutation.mutate({ email });
  };

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title="Forgot Password?"
      subtitle="Enter your email address and we'll send you a link to reset your password"
      showTabs={false}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B73E8] focus:border-transparent"
              placeholder="Enter your email address"
              required
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={forgotPasswordMutation.isPending}
          className="w-full bg-[#1B73E8] text-white py-3 px-4 rounded-lg font-medium hover:bg-[#1557B0] disabled:opacity-50"
        >
          {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
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

export default ForgotPasswordPage;