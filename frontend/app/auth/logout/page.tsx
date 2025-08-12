"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../src/context/AuthContext";

export default function Logout() {
  const { logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    logout();
    router.push("/auth/login"); // ya home "/"
  }, [logout, router]);

  return null;
}