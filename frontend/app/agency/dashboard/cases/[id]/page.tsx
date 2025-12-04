"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  User,
  FileText,
  Download,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle,
  Eye,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Candidate {
  user_id: string;
  email: string;
  full_name: string;
  phone_number?: string;
}

interface Document {
  document_id: string;
  document_type: string;
  file_name: string;
  file_path: string;
  file_type: string;
  file_size: number;
  status: string;
  notes?: string;
  review_feedback?: string;
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
  notes?: string;
  created_at: string;
  candidate: Candidate;
  documents: Document[];
}

export default function AgencyCaseDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const caseId = params?.id as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [reviewAction, setReviewAction] = useState<"approved" | "rejected" | "needs_revision">("approved");
  const [reviewNotes, setReviewNotes] = useState("");

  const fetchCase = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}`,
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

  const handleReviewDocument = async () => {
    if (!selectedDocument) return;

    try {
      setReviewing(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}/documents/${selectedDocument.document_id}/review`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            status: reviewAction,
            notes: reviewNotes || null,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to review document");
      }

      toast.success(`Document ${reviewAction}!`);
      setShowReviewModal(false);
      setSelectedDocument(null);
      setReviewNotes("");
      fetchCase();
    } catch (err) {
      console.error("Review error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to review document"
      );
    } finally {
      setReviewing(false);
    }
  };

  const openReviewModal = (doc: Document, action: typeof reviewAction) => {
    setSelectedDocument(doc);
    setReviewAction(action);
    setReviewNotes("");
    setShowReviewModal(true);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return "bg-green-100 text-green-700 border-green-200";
      case "pending":
        return "bg-yellow-100 text-yellow-700 border-yellow-200";
      case "rejected":
        return "bg-red-100 text-red-700 border-red-200";
      case "needs_revision":
        return "bg-orange-100 text-orange-700 border-orange-200";
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "approved":
        return <CheckCircle className="w-4 h-4" />;
      case "pending":
        return <Clock className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      case "needs_revision":
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  if (loading) {
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
          <button
            onClick={() => router.push("/agency/dashboard/cases")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  const pendingDocuments = caseData.documents.filter(d => d.status === "pending").length;
  const approvedDocuments = caseData.documents.filter(d => d.status === "approved").length;
  const totalDocuments = caseData.documents.length;

  return (
    <div className="w-full">
      <div className="mb-6">
        <button
          onClick={() => router.push("/agency/dashboard/cases")}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Cases
        </button>

        <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                {caseData.case_number}
              </h1>
              <p className="text-slate-600">
                {caseData.service_type.replace("_", " ")}
              </p>
            </div>
            <button
              onClick={fetchCase}
              className="p-3 bg-white hover:bg-blue-50 rounded-xl transition-colors border border-slate-200 hover:border-blue-300 shadow-sm"
            >
              <RefreshCw className="w-5 h-5 text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <FileText className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-slate-700">Total Documents</h3>
          </div>
          <p className="text-3xl font-bold text-slate-800">{totalDocuments}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <Clock className="w-5 h-5 text-yellow-600" />
            <h3 className="font-semibold text-slate-700">Pending Review</h3>
          </div>
          <p className="text-3xl font-bold text-yellow-600">{pendingDocuments}</p>
        </div>

        <div className="bg-white rounded-2xl p-6 border border-slate-200">
          <div className="flex items-center gap-3 mb-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            <h3 className="font-semibold text-slate-700">Approved</h3>
          </div>
          <p className="text-3xl font-bold text-green-600">{approvedDocuments}</p>
        </div>
      </div>

      <div className="w-full max-w-5xl mx-auto">
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Uploaded Documents
            </h2>

            {caseData.documents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-1">No documents uploaded yet</p>
                <p className="text-sm text-slate-500">
                  Waiting for candidate to upload documents
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {caseData.documents.map((doc) => (
                  <div
                    key={doc.document_id}
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors border border-slate-200"
                  >
                    <div className="flex items-center gap-3 flex-1">
                      <FileText className="w-5 h-5 text-slate-400" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">
                          {doc.file_name}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-slate-500">
                            {doc.document_type.replace("_", " ")}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {formatFileSize(doc.file_size)}
                          </span>
                          <span className="text-xs text-slate-400">•</span>
                          <span className="text-xs text-slate-500">
                            {formatDate(doc.created_at)}
                          </span>
                        </div>
                        {doc.notes && (
                          <p className="text-xs text-slate-500 mt-1 italic">
                            Note: {doc.notes}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${getStatusColor(
                          doc.status
                        )}`}
                      >
                        {getStatusIcon(doc.status)}
                        {doc.status.replace("_", " ")}
                      </span>

                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        title="View/Download"
                      >
                        <Eye className="w-4 h-4 text-slate-600" />
                      </a>

                      {doc.status === "pending" && (
                        <>
                          <button
                            onClick={() => openReviewModal(doc, "approved")}
                            className="p-2 hover:bg-green-100 rounded-lg transition-colors"
                            title="Approve"
                          >
                            <ThumbsUp className="w-4 h-4 text-green-600" />
                          </button>
                          <button
                            onClick={() => openReviewModal(doc, "needs_revision")}
                            className="p-2 hover:bg-orange-100 rounded-lg transition-colors"
                            title="Request Revision"
                          >
                            <AlertTriangle className="w-4 h-4 text-orange-600" />
                          </button>
                          <button
                            onClick={() => openReviewModal(doc, "rejected")}
                            className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                            title="Reject"
                          >
                            <ThumbsDown className="w-4 h-4 text-red-600" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {pendingDocuments > 0 && (
          <div className="bg-yellow-50 rounded-2xl p-6 border border-yellow-200 mt-6">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Action Required
                </h3>
                <p className="text-sm text-slate-600">
                  {pendingDocuments} document{pendingDocuments > 1 ? "s" : ""} waiting for your review
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Review Modal */}
      <AnimatePresence>
        {showReviewModal && selectedDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-start gap-4 mb-6">
                <div
                  className={`p-3 rounded-full ${
                    reviewAction === "approved"
                      ? "bg-green-100"
                      : reviewAction === "rejected"
                      ? "bg-red-100"
                      : "bg-orange-100"
                  }`}
                >
                  {reviewAction === "approved" ? (
                    <ThumbsUp className="w-6 h-6 text-green-600" />
                  ) : reviewAction === "rejected" ? (
                    <ThumbsDown className="w-6 h-6 text-red-600" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-orange-600" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    {reviewAction === "approved"
                      ? "Approve Document"
                      : reviewAction === "rejected"
                      ? "Reject Document"
                      : "Request Revision"}
                  </h3>
                  <p className="text-sm text-slate-600 mb-1">
                    <strong>{selectedDocument.file_name}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedDocument.document_type.replace("_", " ")}
                  </p>
                </div>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  {reviewAction === "approved"
                    ? "Notes (Optional)"
                    : reviewAction === "rejected"
                    ? "Reason for Rejection *"
                    : "Changes Required *"}
                </label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={4}
                  placeholder={
                    reviewAction === "approved"
                      ? "Add any notes about this approval..."
                      : reviewAction === "rejected"
                      ? "Explain why this document is rejected..."
                      : "Describe what changes are needed..."
                  }
                  required={reviewAction !== "approved"}
                  disabled={reviewing}
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedDocument(null);
                    setReviewNotes("");
                  }}
                  className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-all"
                  disabled={reviewing}
                >
                  Cancel
                </button>
                <button
                  onClick={handleReviewDocument}
                  className={`flex-1 px-6 py-3 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                    reviewAction === "approved"
                      ? "bg-green-600 hover:bg-green-700"
                      : reviewAction === "rejected"
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-orange-600 hover:bg-orange-700"
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                  disabled={
                    reviewing ||
                    (reviewAction !== "approved" && !reviewNotes.trim())
                  }
                >
                  {reviewing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      {reviewAction === "approved" ? (
                        <ThumbsUp className="w-4 h-4" />
                      ) : reviewAction === "rejected" ? (
                        <ThumbsDown className="w-4 h-4" />
                      ) : (
                        <AlertTriangle className="w-4 h-4" />
                      )}
                      <span>Confirm</span>
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}