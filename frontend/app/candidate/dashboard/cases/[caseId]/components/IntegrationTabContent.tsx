"use client";

import { motion } from "framer-motion";
import {
  Heart,
  DollarSign,
  FileText,
  Wifi,
  Bus,
  Users,
  CheckCircle,
  Clock,
  Download,
  Building2,
  Sparkles,
  Mail,
  Phone,
} from "lucide-react";

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
  // Service icons mapping
  const serviceIcons: Record<string, any> = {
    healthcare: Heart,
    banking: DollarSign,
    tax_id: FileText,
    telecom: Wifi,
    transport: Bus,
    integration_program: Users,
  };

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

  // Calculate completion
  const services = caseData.integrationServices || [];
  const completedServices = services.filter((s) => s.status === "completed");
  const completionPercentage =
    services.length > 0
      ? Math.round((completedServices.length / services.length) * 100)
      : 0;
  const allServicesComplete =
    completedServices.length === services.length && services.length > 0;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="grid grid-cols-1 lg:grid-cols-3 gap-6"
    >
      {/* Left Column - Integration Services (2/3 width) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Integration Services Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
            Integration Services
          </h2>

          {services.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-xl">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-1">No services available yet</p>
              <p className="text-sm text-slate-500">
                Integration services will be created when an agency is assigned
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {services.map((service, index) => {
                const Icon = serviceIcons[service.service_type] || FileText;
                const label =
                  serviceLabels[service.service_type] || service.service_type;

                const descriptions: Record<string, string> = {
                  healthcare: "Register with national health insurance system",
                  banking:
                    "Open local bank account for salary and transactions",
                  tax_id:
                    "Obtain tax identification and social security number",
                  telecom: "Set up mobile phone and internet connection",
                  transport:
                    "Register for public transport and driver's license",
                  integration_program:
                    "Enroll in language and cultural integration program",
                };
                const description = descriptions[service.service_type];

                const getStatusBadge = (status: string) => {
                  switch (status) {
                    case "completed":
                      return {
                        color: "bg-green-100 text-green-700 border-green-200",
                        icon: <CheckCircle className="w-4 h-4" />,
                        label: "Completed",
                      };
                    case "in_progress":
                      return {
                        color:
                          "bg-yellow-100 text-yellow-700 border-yellow-200",
                        icon: <Clock className="w-4 h-4" />,
                        label: "In Progress",
                      };
                    default:
                      return {
                        color: "bg-slate-100 text-slate-600 border-slate-200",
                        icon: <Clock className="w-4 h-4" />,
                        label: "Pending",
                      };
                  }
                };

                const statusBadge = getStatusBadge(service.status);

                return (
                  <div
                    key={service.service_id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <div
                        className={`p-2 rounded-lg ${
                          service.status === "completed"
                            ? "bg-green-100"
                            : service.status === "in_progress"
                            ? "bg-yellow-100"
                            : "bg-slate-200"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            service.status === "completed"
                              ? "text-green-600"
                              : service.status === "in_progress"
                              ? "text-yellow-600"
                              : "text-slate-600"
                          }`}
                        />
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">
                          {label}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5">
                          {description}
                        </p>
                        {service.service_date && (
                          <p className="text-xs text-slate-500 mt-1">
                            Completed: {formatDate(service.service_date)}
                          </p>
                        )}
                        {service.notes && (
                          <p className="text-xs text-slate-600 mt-1 italic">
                            Note: {service.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${statusBadge.color}`}
                      >
                        {statusBadge.icon}
                        {statusBadge.label}
                      </span>

                      {service.proof_document && (
                        <a
                          href={service.proof_document}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                          title="View Proof"
                        >
                          <Download className="w-4 h-4 text-slate-600" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Agency Selection & Checklist (1/3 width) */}
      <div className="lg:col-span-1 space-y-6">
        {/* Integration Agency Info Card */}
        {caseData.integrationAgency && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              Your Integration Agency
            </h2>
            <div className="space-y-3">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p className="text-xs text-blue-700 font-medium mb-1">
                  Agency Name
                </p>
                <p className="text-sm font-semibold text-blue-900">
                  {caseData.integrationAgency.name}
                </p>
              </div>
              {caseData.integrationAgency.email && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">
                      Contact Email
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {caseData.integrationAgency.email}
                    </p>
                  </div>
                </div>
              )}
              {caseData.integrationAgency.phone && (
                <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">
                      Phone Number
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {caseData.integrationAgency.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Integration Checklist Card */}
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-3">
            Integration Checklist
          </h3>

          <ul className="space-y-2">
            {Object.entries(serviceLabels).map(([type, label]) => {
              const service = services.find((s) => s.service_type === type);
              const isCompleted = service?.status === "completed";

              return (
                <li key={type} className="flex items-center gap-2 text-sm">
                  {isCompleted ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />
                  )}
                  <span
                    className={
                      isCompleted
                        ? "text-slate-700 font-medium"
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
