"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams.get("token");
    const role = searchParams.get("role");
    const error = searchParams.get("error");

    if (error || !token) {
      const msg =
        error === "oauth_cancelled"
          ? "Sign-in was cancelled."
          : "Google sign-in failed. Please try again.";
      router.replace(`/auth/login?oauth_error=${encodeURIComponent(msg)}`);
      return;
    }

    // Store token first, then fetch user profile to populate authUser
    localStorage.setItem("authToken", token);

    fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.user) {
          localStorage.setItem("authUser", JSON.stringify(data.user));
        }
      })
      .catch(() => {
        // Non-fatal: AuthContext will still try localStorage on next load
      })
      .finally(() => {
        const destinations: Record<string, string> = {
          candidate: "/candidate/dashboard",
          company_admin: "/company/dashboard",
          agency_admin: "/agency/dashboard",
        };
        router.replace(destinations[role ?? ""] ?? "/");
      });
  }, [router, searchParams]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-white">
      <Loader2 size={32} className="animate-spin text-[#1B73E8]" />
      <p className="text-sm text-gray-500">Signing you in…</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-[#1B73E8]" />
      </div>
    }>
      <GoogleCallbackInner />
    </Suspense>
  );
}
