"use client";

import React, { createContext, useState, useContext, useEffect, useRef, ReactNode } from "react";
import { refreshAccessToken, storeAuthTokens, clearAuthTokens, logoutBackend } from "../lib/auth/refresh";

/** Decode a JWT's `exp` (seconds since epoch) without verifying — client-side scheduling only. */
function getTokenExpMs(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1] || ""));
    return typeof payload?.exp === "number" ? payload.exp * 1000 : null;
  } catch {
    return null;
  }
}

interface User {
  user_id: string;
  email: string;
  is_email_verified: boolean;
  full_name: string;
  role: string;
  phone_number?: string;
  position?: string;
  linkedin_url?: string;
  agency_id?: string;
  agency?: any;
  mfa_enabled?: boolean;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, authToken: string, refreshToken?: string) => void;
  logout: () => void;
  updateUser: (userData: User) => void; // ✅ ADD THIS LINE
  isAuthenticated: boolean;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Load user and token from localStorage on mount
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("authUser");

    console.log("🔍 Loading from localStorage:");
    console.log("Stored Token:", storedToken);
    console.log("Stored User:", storedUser);

    try {
      if (storedToken && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        console.log("✅ Auth restored from localStorage");
      } else {
        console.log("⚠️ No stored auth found");
      }
    } catch (error) {
      console.error("❌ Failed to parse stored user:", error);
      // Clear invalid data
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
    } finally {
      // Auth-restore attempt finished — consumers can stop showing a loader.
      setLoading(false);
    }
  }, []);

  const login = (userData: User, authToken: string, refreshToken?: string) => {
    if (!authToken) {
      console.error("❌ ERROR: Token is missing in login!");
      return;
    }

    // Save to state
    setUser(userData);
    setToken(authToken);

    // Save to localStorage (access + refresh token so the app can silently rotate)
    storeAuthTokens(authToken, refreshToken);
    localStorage.setItem("authUser", JSON.stringify(userData));
  };

  //  ADD THIS NEW FUNCTION
  const updateUser = (userData: User) => {
    console.log("🔄 Updating user data:", userData);
    
    // Update state
    setUser(userData);
    
    // Update localStorage
    localStorage.setItem("authUser", JSON.stringify(userData));
    
    console.log("✅ User data updated in state and localStorage");
  };

  const logout = () => {
    // Revoke the session server-side FIRST (best-effort, non-blocking) — reads the
    // token before we wipe it — so logout actually invalidates the token, not just
    // the local copy.
    logoutBackend();

    localStorage.removeItem('profileData');
    localStorage.removeItem('profileCompleteness');

    // Clears authToken + refreshToken + authUser
    clearAuthTokens();

    // Clear in-memory state too
    setUser(null);
    setToken(null);
  };

  // Proactively rotate the short-lived access token shortly before it expires, so
  // the ~29 scattered API clients (which just read authToken from localStorage)
  // always send a valid token and rarely see a 401. Re-schedules after each refresh.
  const refreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (refreshTimer.current) {
      clearTimeout(refreshTimer.current);
      refreshTimer.current = null;
    }
    if (!token) return;

    const expMs = getTokenExpMs(token);
    const lead = 60 * 1000; // refresh 60s before expiry
    const delay = expMs ? Math.max(5000, expMs - Date.now() - lead) : 5 * 60 * 1000;

    refreshTimer.current = setTimeout(async () => {
      const newToken = await refreshAccessToken();
      if (newToken) {
        setToken(newToken); // re-runs this effect → schedules the next rotation
      } else {
        logout(); // refresh token missing/rejected → session is over
      }
    }, delay);

    return () => {
      if (refreshTimer.current) clearTimeout(refreshTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateUser, //  ADD THIS LINE
        isAuthenticated: !!user && !!token,
        loading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
};