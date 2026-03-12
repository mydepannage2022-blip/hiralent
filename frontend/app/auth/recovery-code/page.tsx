"use client";

import React, { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { Key, Loader2, AlertTriangle, ShieldOff } from "lucide-react";
import { useVerifyRecoveryCode } from "../../../src/lib/auth/auth.queries";
import SmartLink from "@/src/components/layout/SmartLink";
import AuthLayout from "@/src/components/layout/AuthLayout";
import { getAuthPageConfig } from "../../../config/authPagesConfig";

// Detect if the error means codes were never set up (vs wrong code)
const isNoCodesError = (msg: string) =>
  msg.toLowerCase().includes("no recovery codes") ||
  msg.toLowerCase().includes("not set up");

function RecoveryCodeForm() {
  const searchParams = useSearchParams();
  const tempToken = searchParams.get("token") ?? "";
  const verifyMutation = useVerifyRecoveryCode();
  const pageConfig = getAuthPageConfig("recoveryCode");

  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [noCodesSetup, setNoCodesSetup] = useState(false);

  const handleCodeChange = (raw: string) => {
    const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 50);
    setCode(clean);
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (code.length < 10) {
      setError("Please enter your recovery code.");
      return;
    }
    if (!tempToken) {
      setError("Session expired. Please log in again.");
      return;
    }
    verifyMutation.mutate(
      { tempToken, recoveryCode: code },
      {
        onError: (err: any) => {
          const msg = err?.response?.data?.message || err.message || "Invalid recovery code.";
          if (isNoCodesError(msg)) {
            setNoCodesSetup(true);
          } else {
            setError(msg);
          }
        },
      }
    );
  };

  return (
    <AuthLayout
      backgroundImage={pageConfig.backgroundImage}
      testimonials={pageConfig.testimonials}
      title={pageConfig.title}
      subtitle={pageConfig.subtitle}
      showTabs={false}
      activeTab="candidate"
    >
      <AnimatePresence mode="wait">

        {/* ── No codes set up yet ── */}
        {noCodesSetup ? (
          <motion.div
            key="no-codes"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.22 }}
            className="space-y-5"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-orange-50 rounded-2xl flex items-center justify-center mx-auto">
                <ShieldOff size={28} className="text-orange-400" />
              </div>
              <h2 className="text-base font-semibold text-gray-800">Recovery Codes Not Available</h2>
              <p className="text-xs text-gray-500">
                Recovery codes were not set up for your account yet. They are generated automatically the first time you successfully log in with your authenticator app.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
              <p className="text-xs font-semibold text-blue-700">How to get recovery codes:</p>
              <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
                <li>Go back to login and enter your email & password</li>
                <li>Enter the 6-digit code from your authenticator app</li>
                <li>Your recovery codes will be generated and shown</li>
                <li>Save them somewhere safe</li>
              </ol>
            </div>

            <div className="space-y-2 text-center">
              <SmartLink
                href="/auth/login"
                className="block w-full bg-[#1B73E8] text-white py-3 rounded-lg font-medium hover:bg-[#1557B0] transition-colors text-sm text-center"
              >
                Back to Login
              </SmartLink>
              <p className="text-xs text-gray-400">
                Lost access to your authenticator app?{" "}
                <SmartLink href="/auth/forgot-password" className="text-[#1B73E8] hover:underline">
                  Reset your password
                </SmartLink>
              </p>
            </div>
          </motion.div>
        ) : (

          /* ── Normal recovery code form ── */
          <motion.div
            key="recovery-form"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.22 }}
            className="space-y-6"
          >
            <div className="text-center space-y-2">
              <div className="w-14 h-14 bg-amber-50 rounded-2xl flex items-center justify-center mx-auto">
                <Key size={28} className="text-amber-500" />
              </div>
              <h2 className="text-base font-semibold text-gray-800">Enter Recovery Code</h2>
              <p className="text-xs text-gray-500">
                Enter one of the backup codes you saved when you first set up two-factor authentication.
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 flex gap-2">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Recovery codes are <strong>different</strong> from your 6-digit authenticator code.
                They are long codes you saved after setting up 2FA.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[#222] font-medium text-xs mb-1">Recovery Code</label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => handleCodeChange(e.target.value)}
                  placeholder="Paste your recovery code here"
                  autoFocus
                  autoComplete="off"
                  spellCheck={false}
                  className={`w-full text-xs font-mono tracking-wider border rounded-lg px-4 py-3 focus:outline-none transition-colors ${
                    error
                      ? "border-red-500 focus:ring-2 focus:ring-red-500"
                      : "border-gray-300 focus:ring-2 focus:ring-[#063B82] focus:border-transparent"
                  }`}
                />
                {error && <p className="text-red-500 text-xs mt-1">{error}</p>}
              </div>

              <motion.button
                type="submit"
                disabled={verifyMutation.isPending || code.length < 10}
                className="w-full bg-[#1B73E8] text-white py-3 rounded-lg font-medium hover:bg-[#1557B0] transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                whileHover={{ scale: verifyMutation.isPending ? 1 : 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {verifyMutation.isPending
                  ? <><Loader2 size={15} className="animate-spin" /> Verifying...</>
                  : "Verify Recovery Code"}
              </motion.button>
            </form>

            <div className="space-y-2 text-center">
              <SmartLink
                href="/auth/login"
                className="block text-sm text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back to login
              </SmartLink>
              <p className="text-xs text-gray-400">
                Lost all recovery codes?{" "}
                <SmartLink href="/auth/forgot-password" className="text-[#1B73E8] hover:underline">
                  Reset your password
                </SmartLink>
              </p>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </AuthLayout>
  );
}

export default function RecoveryCodePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1B73E8]" />
      </div>
    }>
      <RecoveryCodeForm />
    </Suspense>
  );
}
