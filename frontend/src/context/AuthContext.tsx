"use client";

import React, { createContext, useState, useContext, useEffect, ReactNode } from "react";

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
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (userData: User, authToken: string) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Load user and token from localStorage on mount
    const storedToken = localStorage.getItem("authToken");
    const storedUser = localStorage.getItem("authUser");

    console.log("🔍 Loading from localStorage:");
    console.log("Stored Token:", storedToken);
    console.log("Stored User:", storedUser);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setToken(storedToken);
        setUser(parsedUser);
        console.log("✅ Auth restored from localStorage");
      } catch (error) {
        console.error("❌ Failed to parse stored user:", error);
        // Clear invalid data
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
      }
    } else {
      console.log("⚠️ No stored auth found");
    }
  }, []);

  const login = (userData: User, authToken: string) => {
    console.log("🔐 Login called with:");
    console.log("User:", userData);
    console.log("Token:", authToken);

    if (!authToken) {
      console.error("❌ ERROR: Token is missing in login!");
      return;
    }

    // Save to state
    setUser(userData);
    setToken(authToken);

    // Save to localStorage
    localStorage.setItem("authToken", authToken);
    localStorage.setItem("authUser", JSON.stringify(userData));

    console.log("✅ Token saved to localStorage:", authToken.substring(0, 20) + "...");
    console.log("✅ User saved to localStorage:", userData.email);
    
    // Verify it was saved
    const verify = localStorage.getItem("authToken");
    console.log("✅ Verification - Token in localStorage:", verify ? "YES" : "NO");
  };

const logout = () => {
  console.log("🚪 Logout called");
  
  localStorage.removeItem('profileData');
  localStorage.removeItem('profileCompleteness');
  
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");

  // ✅ Clear in-memory state too
  setUser(null);
  setToken(null);

  console.log("✅ Auth cleared from localStorage and state");
};


  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!user && !!token,
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