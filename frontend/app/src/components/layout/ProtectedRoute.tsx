"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Loader from "./Loader";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { token, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && !token) {
      localStorage.setItem("redirectAfterLogin", pathname); // Save attempted path
      router.replace("/auth/login");
    }
  }, [token, loading, pathname, router]);

  if (loading) return <Loader/>; // Wait for auth check
  if (!token) return null; // Prevent flash

  return <>{children}</>;
}
