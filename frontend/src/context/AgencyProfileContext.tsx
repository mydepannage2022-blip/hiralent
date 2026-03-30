"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { useAuth } from "./AuthContext";

export type AgencyType = "VISA" | "RELOCATION" | "INTEGRATION";

export interface AgencyProfile {
  agency_id?: string;
  name?: string;
  email?: string;
  phone_number?: string | null;
  type: AgencyType;
  [key: string]: unknown;
}

interface AgencyProfileContextValue {
  profile: AgencyProfile | null;
  agencyType: AgencyType | null;
  loading: boolean;
  refetch: () => Promise<void>;
}

const AgencyProfileContext = createContext<AgencyProfileContextValue | undefined>(undefined);

export function AgencyProfileProvider({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  const [profile, setProfile] = useState<AgencyProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  const refetch = useCallback(async () => {
    try {
      setLoading(true);
      const authToken = token ?? localStorage.getItem("authToken");

      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/agency/profile`, {
        headers: {
          Authorization: authToken ? `Bearer ${authToken}` : "",
          "Content-Type": "application/json",
        },
        cache: "no-store",
      });

      if (!res.ok) {
        setProfile(null);
        return;
      }

      const data = await res.json();
      const p = (data?.data ?? null) as AgencyProfile | null;

      if (p?.type === "VISA" || p?.type === "RELOCATION" || p?.type === "INTEGRATION") {
        setProfile(p);
      } else {
        setProfile(null);
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const value = useMemo<AgencyProfileContextValue>(() => {
    return {
      profile,
      agencyType: profile?.type ?? null,
      loading,
      refetch,
    };
  }, [profile, loading, refetch]);

  return <AgencyProfileContext.Provider value={value}>{children}</AgencyProfileContext.Provider>;
}

export function useAgencyProfile() {
  const ctx = useContext(AgencyProfileContext);
  if (!ctx) throw new Error("useAgencyProfile must be used within AgencyProfileProvider");
  return ctx;
}
