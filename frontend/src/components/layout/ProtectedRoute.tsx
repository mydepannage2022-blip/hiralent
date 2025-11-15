"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Loader from "./Loader";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathnameRaw = usePathname();
  const pathname = pathnameRaw ?? '/';

  useEffect(() => {
    if (!loading && !user) {
      // Small debounce: allow a short window for auth persistence (httpOnly cookie flows)
      // to finish (interceptor/login) before we redirect to the login page.
      localStorage.setItem("redirectAfterLogin", pathname);
      const t = setTimeout(() => router.replace("/auth/login"), 200);
      return () => clearTimeout(t);
    }
  }, [user, loading, pathname, router]);

  if (loading) return <Loader/>; 
  if (!user) return null; 

  return <>{children}</>;
}
