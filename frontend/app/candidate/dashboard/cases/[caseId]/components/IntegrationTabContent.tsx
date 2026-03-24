"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Users,
  CheckCircle,
  Building2,
  Mail,
  Phone,
  RefreshCw,
} from "lucide-react";

import { Button } from "@/src/components/agency/ui/button";

interface IntegrationService {
  service_id: string;
  case_id: string;
  service_type: string;
  status: string;
  service_date?: string;
  proof_document?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface IntegrationAgency {
  agency_id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Case {
  case_id: string;
  status: string;
  integration_agency_id?: string;
  integrationAgency?: IntegrationAgency;
  integrationServices?: IntegrationService[];
}

interface IntegrationTabContentProps {
  caseData: Case;
  formatDate: (date: string) => string;
  setShowIntegrationAgencyBrowser: (show: boolean) => void;
  fetchCase: () => void;
}

export default function IntegrationTabContent({
  caseData,
  formatDate,
  setShowIntegrationAgencyBrowser,
  fetchCase,
}: IntegrationTabContentProps) {
  const integrationChosen = Boolean(caseData.integration_agency_id);
  const canChooseIntegrationAgency =
    caseData.status === "ready_for_arrival" && !integrationChosen;

  // Service labels
  const serviceLabels: Record<string, string> = {
    healthcare: "Healthcare Registration",
    banking: "Banking Setup",
    tax_id: "Tax ID / National Number",
    telecom: "Telecom & Internet",
    transport: "Transport Registration",
    integration_program: "Integration Programs",
  };

  // Status colors
  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700 border-green-200";
      case "in_progress":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      default:
        return "bg-slate-100 text-slate-600 border-slate-200";
    }
  };

  const getStatusDotColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-emerald-500";
      case "in_progress":
        return "bg-amber-500";
      default:
        return "bg-slate-300";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "completed":
        return "Completed";
      case "in_progress":
        return "In progress";
      default:
        return "Pending";
    }
  };

  // Calculate completion
  const services = caseData.integrationServices || [];

  const sortedServices = useMemo(() => {
    const SERVICE_TYPE_ORDER = [
      "healthcare",
      "banking",
      "tax_id",
      "telecom",
      "transport",
      "integration_program",
    ] as const;

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

  if (!integrationChosen) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
            <Building2 className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Choose an Integration Agency
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Select an agency to help with post-arrival services like healthcare registration, banking, telecom, and transport.
          </p>

          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="soft"
              className="justify-center gap-2"
              onClick={() => setShowIntegrationAgencyBrowser(true)}
              disabled={!canChooseIntegrationAgency}
            >
              <Building2 className="h-4 w-4" />
              Choose Integration Agency
            </Button>
          </div>

          {!canChooseIntegrationAgency && (
            <p className="mx-auto mt-3 max-w-xl text-xs text-slate-500">
              This becomes available once your housing agency marks you ready for arrival.
            </p>
          )}
        </div>
      </motion.div>
    );
  }

  if (services.length === 0) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
            <Users className="h-6 w-6 text-blue-600" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            Integration in progress
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
            Your integration agency has been selected. This tab will update once they create your service checklist.
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="outline"
              className="justify-center gap-2"
              onClick={fetchCase}
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Left Column - Integration Services (2/3 width) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Integration Services Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Users className="h-4 w-4 text-blue-600" />
            Integration Services
          </h3>
          <div className="mt-4 border-t border-slate-100" />

          <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
            {sortedServices.map((service) => {
              const label =
                serviceLabels[service.service_type] || service.service_type;

              const descriptions: Record<string, string> = {
                healthcare: "Register with the national health system",
                banking: "Open a local bank account",
                tax_id: "Obtain your tax/national identification",
                telecom: "Set up phone and internet",
                transport: "Register local transport/driver details",
                integration_program: "Enroll in language & integration programs",
              };
              const description = descriptions[service.service_type];

              return (
                <div
                  key={service.service_id}
                  className="rounded-2xl border border-slate-200/70 bg-white p-5 transition-colors hover:border-blue-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {label}
                      </p>
                      {description && (
                        <p className="mt-1 text-xs text-slate-600">
                          {description}
                        </p>
                      )}
                    </div>

                    <span
                      className={`inline-flex shrink-0 items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                        service.status
                      )}`}
                    >
                      <span
                        className={`h-2 w-2 rounded-full ${getStatusDotColor(
                          service.status
                        )}`}
                        aria-hidden="true"
                      />
                      {getStatusLabel(service.status)}
                    </span>
                  </div>

                  {(service.service_date || service.notes || service.proof_document) && (
                    <div className="mt-4 space-y-2">
                      {service.service_date && (
                        <p className="text-xs text-slate-500">
                          {service.status === "completed" ? "Completed" : "Updated"}: {formatDate(service.service_date)}
                        </p>
                      )}

                      {service.notes && (
                        <p className="text-xs text-slate-600">
                          <span className="font-medium">Note:</span> {service.notes}
                        </p>
                      )}

                      {service.proof_document && (
                        <a
                          href={service.proof_document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center justify-center rounded-xl border border-slate-200/70 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                        >
                          View proof
                        </a>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Column - Agency Selection & Checklist (1/3 width) */}
      <div className="lg:col-span-1 space-y-6">
        {/* Integration Agency Selection / Info Card */}
        {caseData.integrationAgency ? (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Building2 className="h-4 w-4 text-blue-600" />
              Your Integration Agency
            </h3>
            <div className="mt-4 border-t border-slate-100" />
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <p className="text-xs font-medium text-slate-500">Agency Name</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {caseData.integrationAgency.name}
                </p>
              </div>
              {caseData.integrationAgency.email && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500">Email</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {caseData.integrationAgency.email}
                    </p>
                  </div>
                </div>
              )}
              {caseData.integrationAgency.phone && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500">Phone</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {caseData.integrationAgency.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Building2 className="h-4 w-4 text-blue-600" />
              Your Integration Agency
            </h3>
            <div className="mt-4 border-t border-slate-100" />
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
              <Building2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                Agency details not available yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Refresh this page in a moment to see contact info.
              </p>
            </div>
          </div>
        )}

        {/* Integration Checklist Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Checklist</h3>
          <div className="mt-4 border-t border-slate-100" />

          <ul className="mt-4 space-y-3">
            {Object.entries(serviceLabels).map(([type, label]) => {
              const service = services.find((s) => s.service_type === type);
              const isCompleted = service?.status === "completed";

              return (
                <li key={type} className="flex items-center gap-2 text-sm">
                  {isCompleted ? (
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
                  )}
                  <span
                    className={
                      isCompleted
                        ? "font-medium text-slate-700"
                        : "text-slate-500"
                    }
                  >
                    {label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </motion.div>
  );
}
