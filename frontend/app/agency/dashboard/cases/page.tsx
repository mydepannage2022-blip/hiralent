"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Country, City } from "country-state-city";
import { useRouter } from "next/navigation";
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

interface Document {
  document_id: string;
  file_name: string;
  document_type: string;
  status: string;
  created_at: string;
}

interface Case {
  case_id: string;
  case_number: string;
  candidate_id: string;
  service_type: string;
  status: string;
  priority_level: string;
  origin_country: string;
  destination_country: string;
  destination_city: string | null;
  estimated_completion: string | null;
  estimated_cost: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  candidate: {
    user_id: string;
    email: string;
    full_name: string;
    phone_number: string | null;
  };
  documents?: Document[];
}

type FilterTab = "all" | "active" | "completed" | "pending_documents";

export default function CasesPage() {
  const router = useRouter();
  const [cases, setCases] = useState<Case[]>([]);
  const [filteredCases, setFilteredCases] = useState<Case[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCase, setSelectedCase] = useState<Case | null>(null);
  const [editedCase, setEditedCase] = useState<Case | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fetchCases = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("authToken");

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases`,
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
      filtered = filtered.filter((c) =>
        ["initiated", "in_progress"].includes(c.status)
      );
    } else if (activeTab === "completed") {
      filtered = filtered.filter((c) => c.status === "completed");
    } else if (activeTab === "pending_documents") {
      filtered = filtered.filter((c) => c.status === "pending_documents");
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseItem.case_id}`,
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
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${editedCase.case_id}`,
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
    return badges[status] || badges.initiated;
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
    active: cases.filter((c) => ["initiated", "in_progress"].includes(c.status))
      .length,
    completed: cases.filter((c) => c.status === "completed").length,
    pending_documents: cases.filter((c) => c.status === "pending_documents")
      .length,
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
      {/* Filter Tabs */}
      <div className="flex items-center gap-3 overflow-x-auto pb-2">
        {[
          { key: "all", label: "All Cases", count: counts.all },
          { key: "active", label: "Active", count: counts.active },
          { key: "completed", label: "Completed", count: counts.completed },
          {
            key: "pending_documents",
            label: "Pending Docs",
            count: counts.pending_documents,
          },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as FilterTab)}
            className={`px-5 py-2.5 rounded-xl font-semibold transition-all whitespace-nowrap border-2 ${
              activeTab === tab.key
                ? "bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-200"
                : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-indigo-50"
            }`}
          >
            {tab.label} <span className={`font-bold ${activeTab === tab.key ? 'text-indigo-100' : 'text-slate-400'}`}>({tab.count})</span>
          </button>
        ))}
      </div>

      {/* Search Bar Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by case number, candidate name, or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all text-sm"
            />
          </div>
          <button
            onClick={fetchCases}
            className="p-3.5 bg-slate-100 hover:bg-indigo-100 rounded-xl transition-colors group"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5 text-slate-600 group-hover:text-indigo-600 transition-colors" />
          </button>
        </div>
        <div className="mt-3 pt-3 border-t border-slate-100">
          <p className="text-sm text-slate-500 font-medium">
            Showing <span className="text-slate-700 font-semibold">{filteredCases.length}</span> of <span className="text-slate-700 font-semibold">{cases.length}</span> cases
          </p>
        </div>
      </div>

      {filteredCases.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-12 text-center">
          <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <h3 className="text-xl font-bold text-slate-800 mb-2">
            {searchQuery ? "No cases found" : "No cases yet"}
          </h3>
          <p className="text-slate-500">
            {searchQuery
              ? "Try adjusting your search or filters"
              : "Cases will appear here once you create or are assigned them"}
          </p>
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
                className="bg-white rounded-2xl p-6 border-2 border-slate-200 hover:border-indigo-300 hover:shadow-lg transition-all group"
              >
                {/* Header Section */}
                <div className="flex items-start justify-between mb-5 pb-5 border-b border-slate-100">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-xl font-bold text-slate-900">
                        {caseItem.case_number}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wide ${statusBadge.bg} ${statusBadge.text} border-2 ${statusBadge.bg.replace('bg-', 'border-')}`}
                      >
                        {statusBadge.label}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-sm font-medium text-slate-600 uppercase tracking-wide">
                        {caseItem.service_type.replace(/_/g, " ")}
                      </p>
                      <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                      <span
                        className={`px-2.5 py-0.5 rounded-md text-xs font-semibold ${priorityBadge.bg} ${priorityBadge.text}`}
                      >
                        {caseItem.priority_level.toUpperCase()} PRIORITY
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenModal(caseItem)}
                      className="p-2.5 bg-slate-100 hover:bg-indigo-100 rounded-xl transition-colors group/btn"
                      title="Quick View"
                    >
                      <Eye className="w-5 h-5 text-slate-600 group-hover/btn:text-indigo-600" />
                    </button>
                    <button
                      onClick={() =>
                        router.push(
                          `/agency/dashboard/cases/${caseItem.case_id}`
                        )
                      }
                      className="p-2.5 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition-colors group/btn"
                      title="View Full Details"
                    >
                      <ExternalLink className="w-5 h-5 text-indigo-600 group-hover/btn:text-indigo-700" />
                    </button>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-lg">
                      <User className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Candidate</p>
                      <p className="font-bold text-slate-900 truncate">
                        {caseItem.candidate.full_name}
                      </p>
                      <p className="text-xs text-slate-600 truncate">
                        {caseItem.candidate.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-lg">
                      <MapPin className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Route</p>
                      <p className="font-bold text-slate-900 truncate">
                        {caseItem.origin_country} → {caseItem.destination_country}
                      </p>
                      {caseItem.destination_city && (
                        <p className="text-xs text-slate-600 truncate">
                          {caseItem.destination_city}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-lg">
                      <Calendar className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Est. Completion
                      </p>
                      <p className="font-bold text-slate-900">
                        {caseItem.estimated_completion
                          ? new Date(caseItem.estimated_completion).toLocaleDateString()
                          : "Not set"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-slate-100 rounded-lg">
                      <DollarSign className="w-5 h-5 text-slate-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                        Estimated Cost
                      </p>
                      <p className="font-bold text-slate-900">
                        {caseItem.estimated_cost
                          ? `$${caseItem.estimated_cost.toLocaleString()}`
                          : "Not set"}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100">
                  <div className="flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <p className="text-xs text-slate-500 font-medium">
                      Created {new Date(caseItem.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <p className="text-xs text-slate-400">
                    Updated {new Date(caseItem.updated_at).toLocaleDateString()}
                  </p>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {showDetailModal && selectedCase && editedCase && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between z-10">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    {selectedCase.case_number}
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    {selectedCase.service_type.replace(/_/g, " ").toUpperCase()}
                  </p>
                </div>
                <button
                  onClick={handleCancelChanges}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                {/* DOCUMENTS SECTION - ADDED HERE */}
                <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-bold text-slate-800 flex items-center gap-2 text-lg">
                      <FileText className="w-6 h-6 text-blue-600" />
                      Documents ({selectedCase.documents?.length || 0})
                    </h4>
                    <button
                      onClick={() =>
                        router.push(
                          `/agency/dashboard/cases/${selectedCase.case_id}`
                        )
                      }
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Review Documents
                    </button>
                  </div>

                  {selectedCase.documents &&
                  selectedCase.documents.length > 0 ? (
                    <div className="space-y-2">
                      {selectedCase.documents
                        .slice(0, 3)
                        .map((doc: Document) => (
                          <div
                            key={doc.document_id}
                            className="flex items-center justify-between p-3 bg-white rounded-lg border border-blue-100"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">
                                {doc.file_name}
                              </p>
                              <p className="text-xs text-slate-500">
                                {doc.document_type.replace(/_/g, " ")}
                              </p>
                            </div>
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ml-3 ${
                                doc.status === "approved"
                                  ? "bg-green-100 text-green-700 border border-green-200"
                                  : doc.status === "rejected"
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : doc.status === "needs_revision"
                                  ? "bg-orange-100 text-orange-700 border border-orange-200"
                                  : "bg-yellow-100 text-yellow-700 border border-yellow-200"
                              }`}
                            >
                              {doc.status.replace(/_/g, " ")}
                            </span>
                          </div>
                        ))}
                      {selectedCase.documents.length > 3 && (
                        <p className="text-xs text-slate-500 text-center pt-2">
                          +{selectedCase.documents.length - 3} more documents
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 bg-white rounded-lg border-2 border-dashed border-blue-200">
                      <FileText className="w-12 h-12 text-blue-300 mx-auto mb-2" />
                      <p className="text-sm text-slate-500">
                        No documents uploaded yet
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Waiting for candidate to upload documents
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Status
                    </label>
                    <div className="relative">
                      <select
                        value={editedCase.status}
                        onChange={(e) =>
                          setEditedCase({
                            ...editedCase,
                            status: e.target.value,
                          })
                        }
                        className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="initiated">Initiated</option>
                        <option value="in_progress">In Progress</option>
                        <option value="pending_documents">
                          Pending Documents
                        </option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-slate-400"
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

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Priority Level
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
                        className="w-full px-4 py-3 pr-10 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
                      >
                        <option value="low">Low</option>
                        <option value="medium">Medium</option>
                        <option value="high">High</option>
                        <option value="urgent">Urgent</option>
                      </select>
                      <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                        <svg
                          className="w-5 h-5 text-slate-400"
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

                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Candidate Information
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Full Name</p>
                      <p className="font-medium text-slate-800">
                        {selectedCase.candidate.full_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Email</p>
                      <p className="font-medium text-slate-800">
                        {selectedCase.candidate.email}
                      </p>
                    </div>
                    {selectedCase.candidate.phone_number && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Phone</p>
                        <p className="font-medium text-slate-800">
                          {selectedCase.candidate.phone_number}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-blue-50 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    Location Details
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        Origin Country
                      </p>
                      <p className="font-medium text-slate-800">
                        {selectedCase.origin_country}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 mb-1">
                        Destination Country
                      </p>
                      <p className="font-medium text-slate-800">
                        {selectedCase.destination_country}
                      </p>
                    </div>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        Destination City
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
                          className="w-full px-3 py-2 pr-8 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
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
                        <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                          <svg
                            className="w-4 h-4 text-slate-400"
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-green-50 rounded-xl p-4">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      Financial
                    </h4>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        Estimated Cost ($)
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={editedCase.estimated_cost || ""}
                        onChange={(e) =>
                          setEditedCase({
                            ...editedCase,
                            estimated_cost: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-2xl font-bold text-green-600"
                        placeholder="0.00"
                      />
                    </div>
                  </div>

                  <div className="bg-purple-50 rounded-xl p-4">
                    <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                      <Calendar className="w-5 h-5" />
                      Timeline
                    </h4>
                    <div>
                      <label className="block text-xs text-slate-500 mb-1">
                        Estimated Completion
                      </label>
                      <input
                        type="date"
                        value={
                          editedCase.estimated_completion
                            ? new Date(editedCase.estimated_completion)
                                .toISOString()
                                .split("T")[0]
                            : ""
                        }
                        onChange={(e) =>
                          setEditedCase({
                            ...editedCase,
                            estimated_completion: e.target.value,
                          })
                        }
                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Edit2 className="w-5 h-5" />
                    Notes
                  </h4>
                  <textarea
                    value={editedCase.notes || ""}
                    onChange={(e) =>
                      setEditedCase({ ...editedCase, notes: e.target.value })
                    }
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Add internal notes about this case..."
                  />
                </div>

                <div className="bg-slate-50 rounded-xl p-4">
                  <h4 className="font-bold text-slate-800 mb-3 flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Case History
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Created</p>
                      <p className="font-medium text-slate-800">
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
                      <p className="text-xs text-slate-500 mb-1">
                        Last Updated
                      </p>
                      <p className="font-medium text-slate-800">
                        {new Date(selectedCase.updated_at).toLocaleString(
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

              <div className="sticky bottom-0 bg-slate-50 border-t border-slate-200 p-6">
                <div className="flex gap-3">
                  <button
                    onClick={handleCancelChanges}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-100 font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    disabled={isSaving}
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSaving ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Changes"
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
