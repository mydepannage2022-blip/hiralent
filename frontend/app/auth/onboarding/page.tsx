"use client";

import React, { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2, ArrowRight, Loader2, Check, Search,
} from "lucide-react";
import Image from "next/image";
import { API_HOST } from "@/src/lib/config/api";

const API_BASE = API_HOST;

type Role = "candidate" | "company_admin";

const ROLES = [
  {
    id: "candidate" as Role,
    icon: Search,
    title: "I'm looking for a job",
    subtitle: "Find your next opportunity",
    perks: ["Access thousands of jobs", "AI-powered matching", "Skills assessment"],
    color: "#1B73E8",
    bg: "#EEF4FF",
  },
  {
    id: "company_admin" as Role,
    icon: Building2,
    title: "I'm hiring talent",
    subtitle: "Find the right candidates",
    perks: ["Post unlimited jobs", "AI candidate screening", "Team collaboration"],
    color: "#059669",
    bg: "#ECFDF5",
  },
];

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams?.get("token") ?? "";

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleContinue = async () => {
    if (!selectedRole) return;
    if (!token) {
      setError("Session expired. Please sign in again.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch(`${API_BASE}/api/v1/auth/google/complete`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: selectedRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || data.message || "Setup failed");

      // Tolerant of both the response envelope ({ data:{ token } }) and legacy top-level.
      const payload = data?.data ?? data;
      localStorage.setItem("authToken", payload.token);
      if (payload.refreshToken) localStorage.setItem("refreshToken", payload.refreshToken);

      // Fetch and store user profile so AuthContext is populated (/auth/me is enveloped)
      try {
        const meRes = await fetch(`${API_BASE}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${payload.token}` },
        });
        const meData = await meRes.json();
        const meUser = (meData?.data ?? meData)?.user;
        if (meUser) {
          localStorage.setItem("authUser", JSON.stringify(meUser));
        }
      } catch {
        // Non-fatal
      }

      // Continue through the same onboarding steps as normal signup
      const dest =
        selectedRole === "company_admin"
          ? "/auth/companyRegister/info"
          : "/auth/signup/location";
      router.replace(dest);
    } catch (err: any) {
      setError(err.message || "Something went wrong. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex flex-col items-center justify-center px-4 py-12">

      {/* Logo */}
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-10"
      >
        <Image src="/images/logo.png" alt="Hiralent" width={140} height={40} className="h-9 w-auto" />
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28 }}
        className="w-full max-w-2xl"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2" style={{ letterSpacing: "-0.02em" }}>
            Welcome to Hiralent!
          </h1>
          <p className="text-gray-500 text-sm">
            Tell us how you'll be using Hiralent so we can personalise your experience.
          </p>
        </div>

        {/* Role cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {ROLES.map((r, i) => {
            const Icon = r.icon;
            const isSelected = selectedRole === r.id;
            return (
              <motion.button
                key={r.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => setSelectedRole(r.id)}
                whileHover={{ y: -3 }}
                whileTap={{ scale: 0.98 }}
                className="relative text-left p-6 rounded-2xl border-2 transition-all duration-200 focus:outline-none"
                style={{
                  borderColor: isSelected ? r.color : "#E2E8F0",
                  background: isSelected ? r.bg : "#ffffff",
                  boxShadow: isSelected
                    ? `0 8px 24px -8px ${r.color}40`
                    : "0 1px 4px rgba(0,0,0,0.06)",
                }}
              >
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="absolute top-4 right-4 w-6 h-6 rounded-full flex items-center justify-center"
                      style={{ background: r.color }}
                    >
                      <Check size={13} color="#fff" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>

                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: isSelected ? `${r.color}18` : "#F8FAFC" }}
                >
                  <Icon size={22} style={{ color: isSelected ? r.color : "#94A3B8" }} />
                </div>

                <h3 className="text-sm text-gray-900 mb-1 font-bold">
                  {r.title}
                </h3>
                <p className="text-xs text-gray-400 mb-4">{r.subtitle}</p>

                <ul className="space-y-1.5">
                  {r.perks.map(perk => (
                    <li key={perk} className="flex items-center gap-2 text-xs text-gray-500">
                      <div
                        className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{ background: isSelected ? `${r.color}18` : "#F1F5F9" }}
                      >
                        <Check size={9} style={{ color: isSelected ? r.color : "#94A3B8" }} strokeWidth={3} />
                      </div>
                      {perk}
                    </li>
                  ))}
                </ul>
              </motion.button>
            );
          })}
        </div>

        {/* Continue button */}
        <motion.button
          onClick={handleContinue}
          disabled={!selectedRole || isSubmitting}
          whileHover={selectedRole ? { scale: 1.02 } : {}}
          whileTap={selectedRole ? { scale: 0.98 } : {}}
          className="w-full py-3.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all duration-200"
          style={{
            background: selectedRole ? "#1B73E8" : "#E2E8F0",
            color: selectedRole ? "#fff" : "#94A3B8",
            cursor: selectedRole ? "pointer" : "default",
            boxShadow: selectedRole ? "0 4px 14px -4px rgba(27,115,232,0.45)" : "none",
          }}
        >
          {isSubmitting ? (
            <><Loader2 size={15} className="animate-spin" /> Setting up your account…</>
          ) : (
            <>Continue <ArrowRight size={15} /></>
          )}
        </motion.button>

        {error && (
          <p className="text-center text-xs text-red-500 mt-3">{error}</p>
        )}
      </motion.div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1B73E8]" />
      </div>
    }>
      <OnboardingInner />
    </Suspense>
  );
}
