"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { ArrowLeft, FileText, RefreshCw } from "lucide-react";
import { Button } from "@/src/components/agency/ui/button";
import type { Case, IntegrationService } from "./types";
import { API_V1_BASE } from "@/src/lib/config/api";

type IntegrationProps = {
  caseData: Case;
  caseId: string;
  token: string;
  onRefresh: () => void | Promise<void>;
};

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
];

const API_BASE = API_V1_BASE;

const SERVICE_TYPE_ORDER = [
  "healthcare",
  "banking",
  "tax_id",
  "telecom",
  "transport",
  "integration_program",
] as const;

const formatServiceType = (serviceType: string) => {
  const map: Record<string, string> = {
    healthcare: "Healthcare",
    banking: "Banking",
    tax_id: "Tax ID",
    telecom: "Telecom",
    transport: "Transport",
    integration_program: "Integration program",
  };
  return map[serviceType] ?? serviceType.replace(/_/g, " ");
};

const getServiceDescription = (serviceType: string) => {
  const map: Record<string, string> = {
    healthcare: "Help the candidate access healthcare coverage.",
    banking: "Support bank account setup and local banking access.",
    tax_id: "Assist with tax ID / residency paperwork steps.",
    telecom: "Get phone plan and connectivity set up.",
    transport: "Support local transport options and onboarding.",
    integration_program: "Guide enrollment into integration programs.",
  };
  return map[serviceType] ?? "Track progress for this integration service.";
};

const getStatusBadgeClassName = (status: string) => {
  switch (status) {
    case "completed":
      return "border-emerald-200/70 bg-emerald-50 text-emerald-800";
    case "in_progress":
      return "border-amber-200/70 bg-amber-50 text-amber-800";
    case "cancelled":
      return "border-rose-200/70 bg-rose-50 text-rose-800";
    case "pending":
    default:
      return "border-slate-200 bg-slate-50 text-slate-700";
  }
};

export default function IntegrationCaseDetail({
  caseData,
  caseId,
  token,
  onRefresh,
}: IntegrationProps) {
  const router = useRouter();

  const [services, setServices] = useState<IntegrationService[]>(
    caseData.integrationServices ?? []
  );
  const [loadingServices, setLoadingServices] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [savingByServiceId, setSavingByServiceId] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (caseData.integrationServices) {
      setServices(caseData.integrationServices);
    }
  }, [caseData.integrationServices]);

  const fetchServices = async () => {
    try {
      setLoadingServices(true);
      const response = await fetch(
        `${API_BASE}/agency/cases/${caseId}/integration-services`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to fetch integration services");
      }

      const data = await response.json();
      setServices(data.data ?? []);
    } catch (err) {
      console.error("Fetch integration services error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to load integration services"
      );
    } finally {
      setLoadingServices(false);
    }
  };

  useEffect(() => {
    if (caseId && token) {
      fetchServices();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId, token]);

  const sortedServices = useMemo(() => {
    const orderIndex = (serviceType: string) => {
      const index = SERVICE_TYPE_ORDER.indexOf(serviceType as any);
      return index === -1 ? Number.MAX_SAFE_INTEGER : index;
    };

    return [...services].sort((a, b) => {
      const typeOrder = orderIndex(a.service_type) - orderIndex(b.service_type);
      if (typeOrder !== 0) return typeOrder;
      return a.created_at.localeCompare(b.created_at);
    });
  }, [services]);

  const integrationProgress = useMemo(() => {
    const totalSteps = sortedServices.length;
    const completedSteps = sortedServices.filter(
      (service) => (service.status ?? "pending").toLowerCase() === "completed"
    ).length;
    const percentage = totalSteps === 0 ? 0 : Math.round((completedSteps / totalSteps) * 100);

    return {
      totalSteps,
      completedSteps,
      percentage,
    };
  }, [sortedServices]);

  const handleBootstrap = async () => {
    try {
      setBootstrapping(true);
      const response = await fetch(
        `${API_BASE}/agency/cases/${caseId}/integration-services/bootstrap`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to create checklist");
      }

      const data = await response.json();
      setServices(data.data ?? []);
      toast.success(data.message || "Integration checklist ready");
      onRefresh();
    } catch (err) {
      console.error("Bootstrap integration services error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to create checklist");
    } finally {
      setBootstrapping(false);
    }
  };

  const handleUpdateServiceStatus = async (serviceId: string, nextStatus: string) => {
    const previous = services.find((s) => s.service_id === serviceId);
    try {
      setSavingByServiceId((prev) => ({ ...prev, [serviceId]: true }));
      setServices((prev) =>
        prev.map((s) => (s.service_id === serviceId ? { ...s, status: nextStatus } : s))
      );

      const response = await fetch(
        `${API_BASE}/agency/cases/${caseId}/integration-services/${serviceId}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: nextStatus,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.message || "Failed to update service");
      }

      toast.success("Status updated");
      await fetchServices();
      onRefresh();
    } catch (err) {
      console.error("Update integration service error:", err);
      toast.error(err instanceof Error ? err.message : "Failed to update service");

      // revert optimistic update if we can, then sync from server
      if (previous) {
        setServices((prev) =>
          prev.map((s) => (s.service_id === serviceId ? { ...s, status: previous.status } : s))
        );
      }

      await fetchServices();
    } finally {
      setSavingByServiceId((prev) => ({ ...prev, [serviceId]: false }));
    }
  };

  return (
    <div className="w-full">
      <div className="mb-6">
        <Button
          onClick={() => router.push("/agency/dashboard/cases")}
          variant="outline"
          size="sm"
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </Button>

        <div className="bg-white rounded-2xl p-6 border-2 border-slate-200 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-slate-100 rounded-xl">
              <FileText className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Case ID
              </p>
              <h1 className="text-lg font-bold text-slate-900 mb-1">
                {caseData.case_number}
              </h1>
              <p className="text-sm text-slate-600">
                Integration Case • Status: {caseData.statusForAgency ?? caseData.status}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-sm overflow-hidden">
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Integration Services</h2>
            <p className="text-sm text-slate-600">
              Update each service as you progress.
            </p>
          </div>
          <Button
            onClick={fetchServices}
            variant="outline"
            size="sm"
            className="gap-2"
            disabled={loadingServices}
          >
            <RefreshCw className={loadingServices ? "h-4 w-4 animate-spin" : "h-4 w-4"} />
            Refresh
          </Button>
        </div>

        {loadingServices && sortedServices.length === 0 ? (
          <div className="p-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Loading services...
            </div>
          </div>
        ) : sortedServices.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-700 font-semibold mb-1">
              No integration checklist yet
            </p>
            <p className="text-sm text-slate-600 mb-4">
              Create the default checklist to start tracking services.
            </p>
            <Button onClick={handleBootstrap} disabled={bootstrapping}>
              {bootstrapping ? "Creating..." : "Create checklist"}
            </Button>
          </div>
        ) : (
          <div className="p-6">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {sortedServices.map((service) => {
                const saving = !!savingByServiceId[service.service_id];
                const currentStatus = service.status ?? "pending";

                return (
                  <div
                    key={service.service_id}
                    className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          {formatServiceType(service.service_type)}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {getServiceDescription(service.service_type)}
                        </p>
                      </div>

                      <span
                        className={`shrink-0 inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClassName(
                          currentStatus
                        )}`}
                      >
                        {currentStatus
                          .replace(/_/g, " ")
                          .replace(/\b\w/g, (m) => m.toUpperCase())}
                      </span>
                    </div>

                    <div className="flex items-center justify-end gap-2">
                      <details
                        className={`relative ${saving ? "pointer-events-none opacity-60" : ""}`}
                      >
                        <Button asChild variant="soft" size="sm">
                          <summary className="list-none cursor-pointer select-none [&::-webkit-details-marker]:hidden">
                            Change
                          </summary>
                        </Button>

                        <div className="absolute right-0 top-full z-50 mt-2 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                          <div className="p-1">
                            {STATUS_OPTIONS.map((opt) => (
                              <Button
                                key={opt.value}
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start"
                                disabled={saving || opt.value === currentStatus}
                                onClick={(e) => {
                                  const details = e.currentTarget.closest(
                                    "details"
                                  ) as HTMLDetailsElement | null;
                                  if (details) details.open = false;
                                  handleUpdateServiceStatus(service.service_id, opt.value);
                                }}
                              >
                                {opt.label}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </details>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-2xl border-2 border-emerald-200/70 bg-linear-to-br from-emerald-50/70 to-white p-6 shadow-sm">
              <h3 className="text-lg font-bold text-slate-900">Completion</h3>
              <p className="mt-1 text-sm text-slate-600">
                {integrationProgress.completedSteps} of {integrationProgress.totalSteps} steps.
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-600">Overall</span>
                  <span className="font-bold text-emerald-700">
                    {integrationProgress.percentage}%
                  </span>
                </div>
                <div className="mt-2 h-2.5 w-full rounded-full bg-emerald-200">
                  <div
                    className="h-2.5 rounded-full bg-emerald-600 transition-all duration-500"
                    style={{ width: `${integrationProgress.percentage}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
