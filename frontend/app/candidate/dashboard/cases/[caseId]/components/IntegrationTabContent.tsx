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
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-r from-blue-600 to-indigo-600 text-white p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-white/20 rounded-lg">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Post-Arrival Integration</h2>
                <p className="text-blue-100 text-sm">
                  Essential services to help you settle in
                </p>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-blue-100">Overall Progress</span>
                <span className="font-semibold">{completionPercentage}%</span>
              </div>
              <div className="w-full bg-blue-900/30 rounded-full h-2.5">
                <div
                  className="bg-white h-2.5 rounded-full transition-all duration-500"
                  style={{ width: `${completionPercentage}%` }}
                />
              </div>
            </div>
          </div>

          {/* Services List */}
<div className="p-6 space-y-3">
  {services.length === 0 ? (
    <div className="text-center py-16 px-4">
      <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
        <Users className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-semibold text-slate-800 mb-2">
        No Services Available
      </h3>
      <p className="text-sm text-slate-600 max-w-sm mx-auto">
        Integration services will be created automatically when an
        integration agency is assigned to your case.
      </p>
    </div>
  ) : (
    services.map((service, index) => {
      const Icon = serviceIcons[service.service_type] || FileText;
      const label =
        serviceLabels[service.service_type] || service.service_type;

      // Service descriptions
      const descriptions: Record<string, string> = {
        healthcare: "Register with national health insurance system",
        banking: "Open local bank account for salary and transactions",
        tax_id: "Obtain tax identification and social security number",
        telecom: "Set up mobile phone and internet connection",
        transport: "Register for public transport and driver's license",
        integration_program: "Enroll in language and cultural integration program",
      };
      const description = descriptions[service.service_type];

      // Status badge
      const getStatusBadge = (status: string) => {
        switch (status) {
          case "completed":
            return {
              bg: "bg-green-50",
              text: "text-green-700",
              border: "border-green-200",
              icon: <CheckCircle className="w-4 h-4" />,
              label: "Completed",
            };
          case "in_progress":
            return {
              bg: "bg-blue-50",
              text: "text-blue-700",
              border: "border-blue-200",
              icon: <Clock className="w-4 h-4" />,
              label: "In Progress",
            };
          default:
            return {
              bg: "bg-slate-50",
              text: "text-slate-600",
              border: "border-slate-200",
              icon: <Clock className="w-4 h-4" />,
              label: "Pending",
            };
        }
      };

      const statusBadge = getStatusBadge(service.status);

      return (
        <motion.div
          key={service.service_id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.05 }}
          className="bg-white rounded-xl p-5 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all"
        >
          {/* Service Header */}
          <div className="flex items-start gap-4 mb-3">
            {/* Icon */}
            <div
              className={`p-3 rounded-lg shrink-0 ${
                service.status === "completed"
                  ? "bg-green-100 text-green-600"
                  : service.status === "in_progress"
                  ? "bg-yellow-100 text-yellow-600"
                  : "bg-slate-200 text-slate-600"
              }`}
            >
              <Icon className="w-5 h-5" />
            </div>

            {/* Title & Description */}
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-slate-900 mb-1">
                {label}
              </h3>
              <p className="text-sm text-slate-600 leading-relaxed">
                {description}
              </p>
            </div>

            {/* Status Badge */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border shrink-0 ${statusBadge.bg} ${statusBadge.text} ${statusBadge.border}`}
            >
              {statusBadge.icon}
              <span className="text-xs font-medium whitespace-nowrap">
                {statusBadge.label}
              </span>
            </div>
          </div>

          {/* Service Footer (Date, Notes, Proof) */}
          {(service.service_date || service.notes || service.proof_document) && (
            <div className="flex items-center gap-4 pt-3 mt-3 border-t border-slate-100">
              {/* Completion Date */}
              {service.service_date && (
                <div className="text-sm text-slate-600">
                  <span className="font-medium">Completed:</span>{" "}
                  {formatDate(service.service_date)}
                </div>
              )}

              {/* Notes */}
              {service.notes && (
                <div className="flex-1 text-sm text-slate-600 truncate">
                  <span className="font-medium">Note:</span> {service.notes}
                </div>
              )}

              {/* Proof Document */}
              {service.proof_document && (
                <a
                  href={service.proof_document}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shrink-0"
                >
                  <Download className="w-4 h-4" />
                  Proof
                </a>
              )}
            </div>
          )}
        </motion.div>
      );
    })
  )}
</div>
        </div>
      </div>

      {/* Right Column - Agency Selection & Checklist (1/3 width) */}
      <div className="lg:col-span-1 space-y-6">
        {/* Agency Info Card (show if agency assigned) */}
        {caseData.integrationAgency && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-slate-800">Integration Agency</h3>
            </div>

            <div className="space-y-3">
              <div>
                <p className="text-sm text-slate-500">Agency Name</p>
                <p className="font-semibold text-slate-800">
                  {caseData.integrationAgency.name}
                </p>
              </div>

              {caseData.integrationAgency.email && (
                <div>
                  <p className="text-sm text-slate-500">Email</p>
                  <p className="text-sm text-slate-700">
                    {caseData.integrationAgency.email}
                  </p>
                </div>
              )}

              {caseData.integrationAgency.phone && (
                <div>
                  <p className="text-sm text-slate-500">Phone</p>
                  <p className="text-sm text-slate-700">
                    {caseData.integrationAgency.phone}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Integration Checklist Card (sticky, always visible) */}
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm sticky top-6">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Integration Checklist
          </h3>

          {/* Checklist Items */}
          <div className="space-y-2 mb-4">
            {Object.entries(serviceLabels).map(([type, label]) => {
              const service = services.find((s) => s.service_type === type);
              const isCompleted = service?.status === "completed";

              return (
                <div key={type} className="flex items-center gap-3 text-sm">
                  {isCompleted ? (
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  ) : (
                    <Clock className="w-5 h-5 text-slate-400 shrink-0" />
                  )}
                  <span
                    className={
                      isCompleted
                        ? "text-slate-700 line-through"
                        : "text-slate-600"
                    }
                  >
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Progress Summary */}
          <div className="pt-4 border-t border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-700">
                Progress
              </span>
              <span className="text-sm font-bold text-blue-600">
                {completedServices.length} / {services.length} completed
              </span>
            </div>
            <div className="w-full bg-blue-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Celebration Banner */}
          {allServicesComplete && (
            <div className="mt-4 bg-green-100 border border-green-300 rounded-lg p-3">
              <div className="flex items-center gap-2 text-green-700">
                <Sparkles className="w-5 h-5" />
                <p className="font-semibold text-sm">Fully Integrated! 🎉</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
