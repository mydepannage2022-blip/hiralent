"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Country, City } from "country-state-city";
import { useRouter } from "next/navigation";
import { Button } from "@/src/components/agency/ui/button";
import { API_V1_BASE } from "@/src/lib/config/api";
import { useAgencyProfile } from "@/src/context/AgencyProfileContext";
import {
  Search,
  RefreshCw,
  Eye,
  Clock,
  FileText,
  MapPin,
  Calendar,
  DollarSign,
  User,
  X,
  Edit2,
  ExternalLink,
} from "lucide-react";

import type { Case, Document, AgencyType, UpdateEditedCase } from "./_components/types";
import { getAssignedAndUpdated } from "./_components/types";
import {
  GenericCardMeta,
  HousingCardMeta,
  IntegrationCardMeta,
  VisaCardMeta,
} from "./_components/CaseCardMeta";
import {
  AgencyQuickViewAfterLocationSections,
  AgencyQuickViewIntroSections,
} from "./_components/QuickViewSections";

type FilterTab = "all" | "active" | "completed";

export default function CasesPage() {
  const router = useRouter();
  const { agencyType: viewerAgencyType } = useAgencyProfile();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [editedCase, setEditedCase] = useState<Case | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const toStatusKey = (status?: string) =>
    (status ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");

  const getDisplayStatus = (c: Pick<Case, "status" | "statusForAgency">) =>
    c.statusForAgency ?? c.status;

  const getDisplayServiceType = (c: Pick<Case, "service_type" | "serviceTypeForAgency">) =>
    c.serviceTypeForAgency ?? c.service_type;

  const effectiveAgencyType: AgencyType | null = viewerAgencyType;
  const isVisaView = effectiveAgencyType === "VISA";
  const isHousingView = effectiveAgencyType === "RELOCATION";
  const isIntegrationView = effectiveAgencyType === "INTEGRATION";

  const updateEditedCase: UpdateEditedCase = (patch) => {
    setEditedCase((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const renderCardMeta = (caseItem: Case, statusLabel: string) => {
    if (!effectiveAgencyType) return <GenericCardMeta caseItem={caseItem} statusLabel={statusLabel} />;
    if (effectiveAgencyType === "VISA") return <VisaCardMeta caseItem={caseItem} />;
    if (effectiveAgencyType === "INTEGRATION") {
      return <IntegrationCardMeta caseItem={caseItem} statusLabel={statusLabel} />;
    }
    return <HousingCardMeta caseItem={caseItem} statusLabel={statusLabel} />;
  };

  const fetchCases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${API_V1_BASE}/agency/cases`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setCases(data.data || []);
        setFilteredCases(data.data || []);
      }
    } catch (error) {
      console.error("Fetch cases error:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  useEffect(() => {
    let filtered = cases;

    if (activeTab === "active") {
      filtered = filtered.filter((c) => {
        const key = toStatusKey(getDisplayStatus(c));
        return key !== "completed" && key !== "cancelled";
      });
    } else if (activeTab === "completed") {
      filtered = filtered.filter((c) => toStatusKey(getDisplayStatus(c)) === "completed");
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (c) =>
          c.case_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.candidate.full_name
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          c.candidate.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredCases(filtered);
  }, [activeTab, searchQuery, cases]);

  const handleOpenModal = async (caseItem: Case) => {
    // Fetch full case details including documents
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(
        `${API_V1_BASE}/agency/cases/${caseItem.case_id}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setSelectedCase(data.data);
        setEditedCase(data.data);
        setShowDetailModal(true);
      }
    } catch (error) {
      console.error("Fetch case details error:", error);
      // Fallback to basic case data
      setSelectedCase(caseItem);
      setEditedCase(caseItem);
      setShowDetailModal(true);
    }
  };

  const handleSaveChanges = async () => {
    if (!editedCase || !selectedCase) return;

    try {
      setIsSaving(true);
      const token = localStorage.getItem("authToken");

      const updates: any = {};

      if (editedCase.status !== selectedCase.status) {
        updates.status = editedCase.status;
      }

      if (editedCase.priority_level !== selectedCase.priority_level) {
        updates.priority_level = editedCase.priority_level;
      }

      const newCity = editedCase.destination_city || null;
      const oldCity = selectedCase.destination_city || null;
      if (newCity !== oldCity) {
        updates.destination_city = newCity;
      }

      if (editedCase.estimated_cost !== selectedCase.estimated_cost) {
        updates.estimated_cost = editedCase.estimated_cost;
      }

      if (
        editedCase.estimated_completion !== selectedCase.estimated_completion
      ) {
        updates.estimated_completion = editedCase.estimated_completion;
      }

      if (editedCase.notes !== selectedCase.notes) {
        updates.notes = editedCase.notes;
      }

      if (Object.keys(updates).length === 0) {
        setShowDetailModal(false);
        return;
      }

      const response = await fetch(
        `${API_V1_BASE}/agency/cases/${editedCase.case_id}`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(updates),
        }
      );

      if (response.ok) {
        const data = await response.json();

        const updatedCase = {
          ...editedCase,
          updated_at: data.data.updated_at,
        };

        setCases((prevCases) =>
          prevCases.map((c) =>
            c.case_id === updatedCase.case_id ? updatedCase : c
          )
        );

        setSelectedCase(updatedCase);
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error("Save changes error:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelChanges = () => {
    setEditedCase(selectedCase);
    setShowDetailModal(false);
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> =
      {
        initiated: {
          bg: "bg-blue-100",
          text: "text-blue-700",
          label: "Initiated",
        },
        in_progress: {
          bg: "bg-yellow-100",
          text: "text-yellow-700",
          label: "In Progress",
        },
        pending_documents: {
          bg: "bg-orange-100",
          text: "text-orange-700",
          label: "Pending Docs",
        },
        completed: {
          bg: "bg-green-100",
          text: "text-green-700",
          label: "Completed",
        },
        cancelled: {
          bg: "bg-red-100",
          text: "text-red-700",
          label: "Cancelled",
        },
      };

    const key = toStatusKey(status);
    return badges[key] || badges.initiated;
  };

  const getPriorityBadge = (priority: string) => {
    const badges: Record<string, { bg: string; text: string }> = {
      low: { bg: "bg-slate-100", text: "text-slate-700" },
      medium: { bg: "bg-blue-100", text: "text-blue-700" },
      high: { bg: "bg-orange-100", text: "text-orange-700" },
      urgent: { bg: "bg-red-100", text: "text-red-700" },
    };
    return badges[priority] || badges.medium;
  };

  const getCounts = () => ({
    all: cases.length,
    active: cases.filter((c) => {
      const key = toStatusKey(getDisplayStatus(c));
      return key !== "completed" && key !== "cancelled";
    }).length,
    completed: cases.filter((c) => toStatusKey(getDisplayStatus(c)) === "completed").length,
  });

  const counts = getCounts();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-slate-600">Loading cases...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header: search + filters (single cohesive control) */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by case number, candidate name, or email"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <button
              onClick={fetchCases}
              className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50 lg:w-auto"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          </div>

          <div className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {[
              { key: "all", label: "All", count: counts.all },
              { key: "active", label: "Active", count: counts.active },
              { key: "completed", label: "Completed", count: counts.completed },
            ].map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key as FilterTab)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    isActive
                      ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {tab.label}
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ${
                      isActive
                        ? "bg-blue-50 text-blue-700"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-slate-100 pt-3">
            <p className="text-sm text-slate-600">
              Showing <span className="font-semibold text-slate-900">{filteredCases.length}</span> of{" "}
              <span className="font-semibold text-slate-900">{cases.length}</span> cases
            </p>
          </div>
        </div>
      </div>

      {filteredCases.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-sm">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 ring-1 ring-slate-200">
            {searchQuery ? (
              <Search className="h-7 w-7 text-slate-400" />
            ) : (
              <FileText className="h-7 w-7 text-slate-400" />
            )}
          </div>

          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            {searchQuery ? "No matches" : "No cases yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            {searchQuery
              ? "Try a different keyword or clear your search."
              : "Cases will appear here once they’re assigned to your agency."}
          </p>

          {searchQuery && (
            <div className="mt-6 flex items-center justify-center">
              <button
                onClick={() => setSearchQuery("")}
                className="inline-flex h-11 items-center justify-center rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
              >
                Clear search
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredCases.map((caseItem, index) => {
            const statusBadge = getStatusBadge(getDisplayStatus(caseItem));
            const priorityBadge = getPriorityBadge(caseItem.priority_level);

            return (
              <motion.div
                key={caseItem.case_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm transition-all hover:border-blue-200 hover:shadow-md"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-base font-semibold text-slate-900">
                          {caseItem.case_number}
                        </h3>
                        <span
                          className={`inline-flex items-center rounded-full border border-slate-200/70 px-2.5 py-1 text-xs font-semibold ${statusBadge.bg} ${statusBadge.text}`}
                        >
                          {statusBadge.label}
                        </span>
                        <span
                          className={`inline-flex items-center rounded-full border border-slate-200/70 px-2.5 py-1 text-xs font-semibold ${priorityBadge.bg} ${priorityBadge.text}`}
                        >
                          {caseItem.priority_level.toUpperCase()}
                        </span>
                      </div>
                      <p className="mt-1 text-sm text-slate-600">
                        {getDisplayServiceType(caseItem).replace(/_/g, " ")}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => handleOpenModal(caseItem)}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
                        title="Quick View"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <Button
                        onClick={() =>
                          router.push(
                            `/agency/dashboard/cases/${caseItem.case_id}`
                          )
                        }
                        variant="soft"
                        size="md"
                        className="gap-2"
                        title="View Full Details"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Candidate</p>
                      <p className="truncate text-sm font-medium text-slate-900">
                        {caseItem.candidate.full_name}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {caseItem.candidate.email}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Route</p>
                      <p className="truncate text-sm font-medium text-slate-900">
                        {caseItem.origin_country} → {caseItem.destination_country}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {caseItem.destination_city || "—"}
                      </p>
                    </div>

                    {renderCardMeta(caseItem, statusBadge.label)}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showDetailModal && selectedCase && editedCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {selectedCase.case_number}
                    </h3>
                    {(() => {
                      const badge = getStatusBadge(getDisplayStatus(editedCase));
                      return (
                        <span
                          className={`inline-flex items-center rounded-full border border-slate-200/70 px-2.5 py-1 text-xs font-semibold ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                    {(() => {
                      const priority = getPriorityBadge(editedCase.priority_level);
                      return (
                        <span
                          className={`inline-flex items-center rounded-full border border-slate-200/70 px-2.5 py-1 text-xs font-semibold ${priority.bg} ${priority.text}`}
                        >
                          {editedCase.priority_level.toUpperCase()}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {getDisplayServiceType(selectedCase).replace(/_/g, " ").toUpperCase()}
                  </p>
                </div>
                <Button
                  onClick={handleCancelChanges}
                  variant="outline"
                  size="icon"
                  className="h-10 w-10"
                  title="Close"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              <div className="max-h-[calc(90vh-156px)] overflow-y-auto bg-slate-50/40 px-6 py-6">
                <div className="space-y-4">
                  <AgencyQuickViewIntroSections
                    agencyType={effectiveAgencyType}
                    selectedCase={selectedCase}
                    onOpenCase={() => router.push(`/agency/dashboard/cases/${selectedCase.case_id}`)}
                  />

                  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Case settings
                    </h4>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Status
                        </label>
                        <div className="relative">
                          {(() => {
                            const isCompletedIntegrationCase =
                              isIntegrationView &&
                              toStatusKey(getDisplayStatus(editedCase)) === "completed";
                            const isCompletedHousingCase =
                              isHousingView &&
                              toStatusKey(getDisplayStatus(editedCase)) === "completed";
                            const statusDisabled =
                              editedCase.completedForAgency === true ||
                              isCompletedIntegrationCase ||
                              isCompletedHousingCase;

                            return (
                          <select
                            value={getDisplayStatus(editedCase)}
                            disabled={statusDisabled}
                            onChange={(e) =>
                              setEditedCase({
                                ...editedCase,
                                status: e.target.value,
                              })
                            }
                            className={`h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20 ${
                              statusDisabled
                                ? "cursor-not-allowed bg-slate-100 text-slate-500"
                                : ""
                            }`}
                          >
                            <option value="initiated">Initiated</option>
                            <option value="in_progress">In Progress</option>
                            <option value="pending_documents">
                              Pending Documents
                            </option>
                            <option value="completed">Completed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                            );
                          })()}
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg
                              className="h-5 w-5 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>

                        {editedCase.completedForAgency === true && (
                          <p className="mt-2 text-xs text-slate-500">
                            Visa phase is completed (embassy approved). Status updates are disabled for this case.
                          </p>
                        )}

                        {editedCase.completedForAgency !== true &&
                          isIntegrationView &&
                          toStatusKey(getDisplayStatus(editedCase)) === "completed" && (
                            <p className="mt-2 text-xs text-slate-500">
                              This integration case is completed. Status updates are disabled.
                            </p>
                          )}

                        {editedCase.completedForAgency !== true &&
                          isHousingView &&
                          toStatusKey(getDisplayStatus(editedCase)) === "completed" && (
                            <p className="mt-2 text-xs text-slate-500">
                              This housing case is completed. Status updates are disabled.
                            </p>
                          )}
                      </div>

                      <div>
                        <label className="mb-2 block text-sm font-medium text-slate-700">
                          Priority
                        </label>
                        <div className="relative">
                          <select
                            value={editedCase.priority_level}
                            onChange={(e) =>
                              setEditedCase({
                                ...editedCase,
                                priority_level: e.target.value,
                              })
                            }
                            className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                            <option value="urgent">Urgent</option>
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg
                              className="h-5 w-5 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Candidate
                    </h4>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Full name</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {selectedCase.candidate.full_name}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Email</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {selectedCase.candidate.email}
                        </p>
                      </div>
                      {selectedCase.candidate.phone_number && (
                        <div>
                          <p className="text-xs font-medium text-slate-500">Phone</p>
                          <p className="mt-1 text-sm font-medium text-slate-900">
                            {selectedCase.candidate.phone_number}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Location
                    </h4>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Origin country</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {selectedCase.origin_country}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Destination country</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {selectedCase.destination_country}
                        </p>
                      </div>
                      <div>
                        <label className="mb-2 block text-xs font-medium text-slate-500">
                          Destination city
                        </label>
                        <div className="relative">
                          <select
                            value={editedCase.destination_city || ""}
                            onChange={(e) =>
                              setEditedCase({
                                ...editedCase,
                                destination_city: e.target.value || null,
                              })
                            }
                            className="h-11 w-full appearance-none rounded-xl border border-slate-200 bg-white px-4 pr-10 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
                          >
                            <option value="">Select city</option>
                            {City.getCitiesOfCountry(
                              Country.getAllCountries().find(
                                (c) => c.name === selectedCase.destination_country
                              )?.isoCode || ""
                            )?.map((city, index) => (
                              <option
                                key={`${city.name}-${index}`}
                                value={city.name}
                              >
                                {city.name}
                              </option>
                            ))}
                          </select>
                          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                            <svg
                              className="h-5 w-5 text-slate-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <AgencyQuickViewAfterLocationSections
                    agencyType={effectiveAgencyType}
                    editedCase={editedCase}
                    updateEditedCase={updateEditedCase}
                  />

                  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Edit2 className="h-4 w-4 text-blue-600" />
                      Notes
                    </h4>
                    <textarea
                      value={editedCase.notes || ""}
                      onChange={(e) =>
                        setEditedCase({ ...editedCase, notes: e.target.value })
                      }
                      className="mt-4 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
                      rows={4}
                      placeholder="Add internal notes about this case..."
                    />
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <h4 className="text-sm font-semibold text-slate-900">
                      Case history
                    </h4>
                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Assigned</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {new Date(selectedCase.created_at).toLocaleString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Updated</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {getAssignedAndUpdated(selectedCase.created_at, selectedCase.updated_at).updated.toLocaleString(
                            "en-US",
                            {
                              year: "numeric",
                              month: "long",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 bg-white px-6 py-4">
                <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                  <Button
                    onClick={handleCancelChanges}
                    disabled={isSaving}
                    variant="outline"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    variant="soft"
                    size="lg"
                    className="w-full sm:w-auto"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save changes"
                    )}
                  </Button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
