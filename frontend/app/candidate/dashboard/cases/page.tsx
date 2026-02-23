"use client";
import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { Button } from "@/src/components/agency/ui/button";
import {
  Briefcase,
  FileText,
  RefreshCw,
  AlertCircle,
  Building2,
  Search,
  Eye,
  ExternalLink,
  MapPin,
  Calendar,
  Clock,
  Mail,
  Phone,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Agency {
  agency_id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Document {
  document_id: string;
  document_type: string;
  file_name: string;
  status: string;
  created_at: string;
}

interface Case {
  case_id: string;
  case_number: string;
  service_type: string;
  priority_level: string;
  status: string;
  origin_country: string;
  destination_country: string;
  destination_city?: string;
  estimated_completion?: string;
  estimated_cost?: number;
  created_at: string;
  agency: Agency;
  documents: Document[];
}

type FilterTab = "all" | "active" | "completed";

export default function CasesPage() {
  const { token } = useAuth();
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const toStatusKey = (status?: string) =>
    (status ?? "").toLowerCase().trim().replace(/[\s-]+/g, "_");

  const fetchCases = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch cases');
      }

      const data = await response.json();
      setCases(data.data || []);
      setFilteredCases(data.data || []);
    } catch (err) {
      console.error("Fetch cases error:", err);
      setError(err instanceof Error ? err.message : "Failed to load cases");
      toast.error("Failed to load cases");
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
        const key = toStatusKey(c.status);
        return key !== "completed" && key !== "cancelled";
      });
    } else if (activeTab === "completed") {
      filtered = filtered.filter((c) => toStatusKey(c.status) === "completed");
    }

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((c) => {
        const route = `${c.origin_country} ${c.destination_country} ${c.destination_city ?? ""}`;
        return (
          c.case_number.toLowerCase().includes(q) ||
          c.service_type.toLowerCase().includes(q) ||
          c.agency?.name?.toLowerCase().includes(q) ||
          route.toLowerCase().includes(q)
        );
      });
    }

    setFilteredCases(filtered);
  }, [activeTab, cases, searchQuery]);

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> =
      {
        initiated: { bg: "bg-blue-100", text: "text-blue-700", label: "Initiated" },
        in_progress: { bg: "bg-yellow-100", text: "text-yellow-700", label: "In Progress" },
        pending_documents: { bg: "bg-orange-100", text: "text-orange-700", label: "Pending Docs" },
        completed: { bg: "bg-green-100", text: "text-green-700", label: "Completed" },
        cancelled: { bg: "bg-red-100", text: "text-red-700", label: "Cancelled" },
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
    return badges[toStatusKey(priority)] || badges.medium;
  };

  const counts = useMemo(
    () => ({
      all: cases.length,
      active: cases.filter((c) => {
        const key = toStatusKey(c.status);
        return key !== "completed" && key !== "cancelled";
      }).length,
      completed: cases.filter((c) => toStatusKey(c.status) === "completed").length,
    }),
    [cases]
  );

  const handleOpenModal = (caseItem: Case) => {
    setSelectedCase(caseItem);
    setShowDetailModal(true);
  };

  const formatDate = (dateString: string) =>
    new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

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

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 mb-4">{error}</p>
          <Button onClick={fetchCases} variant="soft">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Header: search + filters */}
      <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xl">
              <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search by case number, agency name, or destination"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-12 pr-4 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm outline-none transition-colors focus:border-blue-300 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <Button
              onClick={fetchCases}
              variant="outline"
              className="h-11 w-full justify-center gap-2 lg:w-auto"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
            {([
              { key: "all", label: "All", count: counts.all },
              { key: "active", label: "Active", count: counts.active },
              { key: "completed", label: "Completed", count: counts.completed },
            ] as const).map((tab) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
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
              <Briefcase className="h-7 w-7 text-slate-400" />
            )}
          </div>

          <h3 className="mt-5 text-lg font-semibold text-slate-900">
            {searchQuery ? "No matches" : "No cases yet"}
          </h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-600">
            {searchQuery
              ? "Try a different keyword or clear your search."
              : "Cases will appear here once they’re created or assigned by an agency."}
          </p>

          {searchQuery && (
            <div className="mt-6 flex items-center justify-center">
              <Button onClick={() => setSearchQuery("")} variant="outline">
                Clear search
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5">
          {filteredCases.map((caseItem, index) => {
            const statusBadge = getStatusBadge(caseItem.status);
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
                        {caseItem.service_type.replace(/_/g, " ")}
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
                            `/candidate/dashboard/cases/${caseItem.case_id}`
                          )
                        }
                        variant="soft"
                        size="md"
                        className="gap-2"
                        title="View Details"
                      >
                        <ExternalLink className="h-4 w-4" />
                        Open
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">Agency</p>
                      <p className="truncate text-sm font-medium text-slate-900">
                        {caseItem.agency?.name || "—"}
                      </p>
                      <p className="truncate text-xs text-slate-600">
                        {caseItem.agency?.email || "—"}
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

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        Est. completion
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {caseItem.estimated_completion
                          ? formatDate(caseItem.estimated_completion)
                          : "Not set"}
                      </p>
                      <p className="text-xs text-slate-600">
                        Created {formatDate(caseItem.created_at)}
                      </p>
                    </div>

                    <div className="min-w-0">
                      <p className="text-xs font-medium text-slate-500">
                        Documents
                      </p>
                      <p className="text-sm font-medium text-slate-900">
                        {caseItem.documents.length}
                      </p>
                      <p className="text-xs text-slate-600">Uploaded</p>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showDetailModal && selectedCase && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xl"
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-slate-900">
                      {selectedCase.case_number}
                    </h3>
                    {(() => {
                      const badge = getStatusBadge(selectedCase.status);
                      return (
                        <span
                          className={`inline-flex items-center rounded-full border border-slate-200/70 px-2.5 py-1 text-xs font-semibold ${badge.bg} ${badge.text}`}
                        >
                          {badge.label}
                        </span>
                      );
                    })()}
                    {(() => {
                      const priority = getPriorityBadge(
                        selectedCase.priority_level
                      );
                      return (
                        <span
                          className={`inline-flex items-center rounded-full border border-slate-200/70 px-2.5 py-1 text-xs font-semibold ${priority.bg} ${priority.text}`}
                        >
                          {selectedCase.priority_level.toUpperCase()}
                        </span>
                      );
                    })()}
                  </div>
                  <p className="mt-1 text-sm text-slate-600">
                    {selectedCase.service_type.replace(/_/g, " ")}
                  </p>
                </div>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                  title="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="max-h-[calc(90vh-110px)] overflow-y-auto bg-slate-50/40 px-6 py-6">
                <div className="space-y-4">
                  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <Building2 className="h-4 w-4 text-blue-600" />
                      Agency
                    </h4>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Name</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {selectedCase.agency?.name || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Contact</p>
                        <div className="mt-1 space-y-1">
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Mail className="h-4 w-4 text-slate-400" />
                            <span className="truncate">
                              {selectedCase.agency?.email || "—"}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-slate-700">
                            <Phone className="h-4 w-4 text-slate-400" />
                            <span className="truncate">
                              {selectedCase.agency?.phone || "—"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                      <MapPin className="h-4 w-4 text-blue-600" />
                      Route & timeline
                    </h4>

                    <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">Origin</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {selectedCase.origin_country}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Destination</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {selectedCase.destination_country}
                        </p>
                        <p className="text-xs text-slate-600">
                          {selectedCase.destination_city || "—"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-slate-500">Created</p>
                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {formatDate(selectedCase.created_at)}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/70 bg-white p-5 shadow-sm">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <h4 className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <FileText className="h-4 w-4 text-blue-600" />
                        Documents
                        <span className="text-slate-500">
                          ({selectedCase.documents?.length || 0})
                        </span>
                      </h4>
                      <Button
                        onClick={() =>
                          router.push(
                            `/candidate/dashboard/cases/${selectedCase.case_id}`
                          )
                        }
                        variant="outline"
                        className="gap-2"
                      >
                        <ExternalLink className="h-4 w-4" />
                        View details
                      </Button>
                    </div>

                    <div className="mt-4">
                      {selectedCase.documents && selectedCase.documents.length > 0 ? (
                        <div className="space-y-2">
                          {selectedCase.documents.slice(0, 3).map((doc) => (
                            <div
                              key={doc.document_id}
                              className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-slate-900">
                                  {doc.file_name}
                                </p>
                                <p className="text-xs text-slate-500">
                                  {doc.document_type.replace(/_/g, " ")}
                                </p>
                              </div>
                              <span
                                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${
                                  doc.status === "approved"
                                    ? "border-green-200 bg-green-50 text-green-700"
                                    : doc.status === "rejected"
                                    ? "border-red-200 bg-red-50 text-red-700"
                                    : doc.status === "needs_revision"
                                    ? "border-orange-200 bg-orange-50 text-orange-700"
                                    : "border-yellow-200 bg-yellow-50 text-yellow-700"
                                }`}
                              >
                                {doc.status.replace(/_/g, " ")}
                              </span>
                            </div>
                          ))}
                          {selectedCase.documents.length > 3 && (
                            <p className="pt-2 text-center text-xs text-slate-500">
                              +{selectedCase.documents.length - 3} more documents
                            </p>
                          )}
                        </div>
                      ) : (
                        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
                          <FileText className="mx-auto mb-2 h-10 w-10 text-slate-300" />
                          <p className="text-sm text-slate-600">
                            No documents uploaded yet
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}