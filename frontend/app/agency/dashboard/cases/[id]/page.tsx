"use client";
import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import { AlertCircle, RefreshCw } from "lucide-react";
import { API_V1_BASE } from "@/src/lib/config/api";

import { useAuth } from "@/src/context/AuthContext";
import { useAgencyProfile } from "@/src/context/AgencyProfileContext";
import { Button } from "@/src/components/agency/ui/button";

import type { AgencyType, Case } from "./_components/types";
import IntegrationCaseDetail from "./_components/IntegrationCaseDetail";
import RelocationCaseDetail from "./_components/RelocationCaseDetail";
import VisaCaseDetail from "./_components/VisaCaseDetail";

export default function AgencyCaseDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;
  const { agencyType: viewerAgencyType } = useAgencyProfile();

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCase = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${API_V1_BASE}/agency/cases/${caseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to fetch case");
      }

      const data = await response.json();
      setCaseData(data.data);
    } catch (err) {
      console.error("Fetch case error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load case details"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (caseId && token) {
      fetchCase();
    }
  }, [caseId, token]);

  if (!token) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <p className="text-slate-700 font-semibold mb-1">Not authenticated</p>
          <p className="text-slate-600 mb-4">
            Please sign in again to view this case.
          </p>
          <Button onClick={() => router.push("/agency/login")}>
            Go to login
          </Button>
        </div>
      </div>
    );
  }

  if (loading && !caseData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading case details...</p>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">Case not found</p>
          <Button
            onClick={() => router.push("/agency/dashboard/cases")}
            variant="soft"
          >
            Back to Cases
          </Button>
        </div>
      </div>
    );
  }

  const viewingAgencyType: AgencyType | null =
    viewerAgencyType ??
    caseData.viewing_agency_type ??
    caseData.agency?.type ??
    null;

  if (viewingAgencyType === "RELOCATION") {
    return (
      <RelocationCaseDetail
        caseData={caseData}
        caseId={caseId}
        token={token}
        onRefresh={fetchCase}
      />
    );
  }

  if (viewingAgencyType === "INTEGRATION") {
    return (
      <IntegrationCaseDetail
        caseData={caseData}
        caseId={caseId}
        token={token}
        onRefresh={fetchCase}
      />
    );
  }

  return (
    <VisaCaseDetail
      caseData={caseData}
      caseId={caseId}
      token={token}
      onRefresh={fetchCase}
    />
  );
}
