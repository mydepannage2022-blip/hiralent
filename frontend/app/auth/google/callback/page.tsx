"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { API_HOST } from "@/src/lib/config/api";

const API_BASE = API_HOST;

function GoogleCallbackInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    handled.current = true;

    const token = searchParams?.get("token");
    const refreshToken = searchParams?.get("refreshToken");
    const role = searchParams?.get("role");
    const error = searchParams?.get("error");

    if (error || !token) {
      const msg =
        error === "oauth_cancelled"
          ? "Sign-in was cancelled."
          : "Google sign-in failed. Please try again.";
      router.replace(`/auth/login?oauth_error=${encodeURIComponent(msg)}`);
      return;
    }

    // Store tokens first, then fetch user profile to populate authUser
    localStorage.setItem("authToken", token);
    if (refreshToken) localStorage.setItem("refreshToken", refreshToken);

    fetch(`${API_BASE}/api/v1/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => res.json())
      .then((body) => {
        // /auth/me is enveloped ({ data:{ user } }); tolerate legacy top-level too.
        const meUser = (body?.data ?? body)?.user;
        if (meUser) {
          localStorage.setItem("authUser", JSON.stringify(meUser));
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
