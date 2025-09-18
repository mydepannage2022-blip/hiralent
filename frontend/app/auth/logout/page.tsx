"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../src/context/AuthContext";
import { useProfile } from "../../../src/context/ProfileContext"; // ADD KARO

export default function Logout() {
  const { logout } = useAuth();
  const { clearProfile } = useProfile(); // ADD KARO
  const router = useRouter();

  useEffect(() => {
    console.log('Logout process starting...');
    
    // PROFILE CLEAR KARO PEHLE
    clearProfile();
    
    // AUTH CLEAR KARO
    logout();
    
    // EXTRA SAFETY - MANUAL CLEAR
    if (typeof window !== 'undefined') {
      localStorage.clear();
      sessionStorage.clear();
    }
    
    console.log('Logout completed');
    
    // REDIRECT
    router.push("/auth/login");
  }, [logout, clearProfile, router]);

  return (
    <div>
      <p>Logging out...</p>
    </div>
  );
}