"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";
import { motion, AnimatePresence } from "framer-motion";
import { API_V1_BASE } from "@/src/lib/config/api";
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Upload,
  X,
  XCircle,
} from "lucide-react";

import { REQUIRED_DOCUMENT_TYPES } from "@/src/constants/documentTypes";
import { AIValidationPanel } from "@/src/components/agency/AIValidationPanel";
import { Button } from "@/src/components/agency/ui/button";
import type { Case, Document } from "./types";

type VisaProps = {
  caseData: Case;
  caseId: string;
  token: string;
  onRefresh: () => void;
};

export default function VisaCaseDetail({
  caseData,
  caseId,
  token,
  onRefresh,
}: VisaProps) {
  const router = useRouter();

  const getDisplayServiceType = (
    c: Pick<Case, "service_type" | "serviceTypeForAgency">
  ) => c.serviceTypeForAgency ?? c.service_type;

  const [reviewing, setReviewing] = useState(false);

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [reviewAction, setReviewAction] = useState<
    "approved" | "rejected" | "needs_revision"
  >("approved");
  const [reviewNotes, setReviewNotes] = useState("");

  const [showEmbassyModal, setShowEmbassyModal] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showInterviewModal, setShowInterviewModal] = useState(false);

  const handleReviewDocument = async () => {
    if (!selectedDocument) return;

    try {
      setReviewing(true);

      const response = await fetch(
        `${API_V1_BASE}/agency/cases/${caseId}/documents/${selectedDocument.document_id}/review`,
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
      onRefresh();
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
      case "inactive":
        return "bg-gray-100 text-gray-600 border-gray-300";
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
      case "inactive":
        return <XCircle className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  const activeDocuments = caseData.documents.filter((d) => d.is_active === true);
  const pendingDocuments = activeDocuments.filter((d) => d.status === "pending").length;
  const approvedDocuments = activeDocuments.filter((d) => d.status === "approved").length;
  const uniqueDocumentTypes = new Set(activeDocuments.map((d) => d.document_type));
  const totalDocuments = uniqueDocumentTypes.size;

  const approvedDocumentTypes = new Set(
    activeDocuments
      .filter((d) => d.status === "approved")
      .map((d) => d.document_type)
  );

  const allRequiredTypesApproved = REQUIRED_DOCUMENT_TYPES.every((type) =>
    approvedDocumentTypes.has(type)
  );

  const isVisaCaseCompleted = caseData.completedForAgency === true;

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
          <div className="flex items-center justify-between">
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
                  {getDisplayServiceType(caseData).replace(/_/g, " ")}
                </p>
              </div>
            </div>
            <button
              onClick={onRefresh}
              className="p-3 bg-slate-100 hover:bg-indigo-100 rounded-xl transition-colors group"
              title="Refresh case data"
            >
              <RefreshCw className="w-5 h-5 text-slate-600 group-hover:text-indigo-600" />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="rounded-2xl border-2 border-blue-200/70 bg-linear-to-br from-blue-50/70 to-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Total Documents
              </p>
              <p className="mt-2 text-3xl font-bold text-slate-900">
                {totalDocuments}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-blue-200/70 bg-white p-2.5 shadow-sm">
              <FileText className="h-5 w-5 text-blue-700" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-amber-200/70 bg-linear-to-br from-amber-50/70 to-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Pending Review
              </p>
              <p className="mt-2 text-3xl font-bold text-amber-700">
                {pendingDocuments}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-amber-200/70 bg-white p-2.5 shadow-sm">
              <Clock className="h-5 w-5 text-amber-700" />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border-2 border-emerald-200/70 bg-linear-to-br from-emerald-50/70 to-white p-6 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Approved
              </p>
              <p className="mt-2 text-3xl font-bold text-emerald-700">
                {approvedDocuments}
              </p>
            </div>
            <div className="shrink-0 rounded-xl border border-emerald-200/70 bg-white p-2.5 shadow-sm">
              <CheckCircle className="h-5 w-5 text-emerald-700" />
            </div>
          </div>
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
                    className="bg-white rounded-lg p-5 border border-slate-200 hover:border-indigo-200 transition-all hover:shadow-md"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2.5 bg-indigo-50 rounded-lg">
                        <FileText className="w-5 h-5 text-indigo-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {doc.file_name}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          <span className="font-medium">
                            {doc.document_type.replace("_", " ")}
                          </span>
                          <span>•</span>
                          <span>{formatFileSize(doc.file_size)}</span>
                          <span>•</span>
                          <span>{formatDate(doc.created_at)}</span>
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border-2 flex items-center gap-1.5 ${!doc.is_active ? getStatusColor("inactive") : getStatusColor(doc.status)}`}
                      >
                        {!doc.is_active ? (
                          <>
                            {getStatusIcon("inactive")}
                            Inactive
                          </>
                        ) : (
                          <>
                            {getStatusIcon(doc.status)}
                            {doc.status
                              .replace("_", " ")
                              .charAt(0)
                              .toUpperCase() +
                              doc.status.replace("_", " ").slice(1)}
                          </>
                        )}
                      </span>
                    </div>

                    {doc.notes && (
                      <div className="mb-3 p-3 bg-amber-50 border-l-4 border-amber-400 rounded-r">
                        <p className="text-xs text-amber-900">
                          <span className="font-semibold">Note:</span> {doc.notes}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                      {doc.is_active && (
                        <AIValidationPanel
                          caseId={caseId}
                          documentId={doc.document_id}
                          extractedData={doc.ai_extracted_data}
                          validationSignals={doc.ai_validation_signals}
                          validationIssues={doc.ai_validation_issues}
                          validatedAt={doc.ai_validated_at}
                        />
                      )}

                      <div className="flex items-center gap-2 ml-auto">
                        <a
                          href={doc.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-medium text-slate-700"
                          title="View/Download"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View
                        </a>

                        {doc.status === "pending" && doc.is_active && (
                          <>
                            <button
                              onClick={() => openReviewModal(doc, "approved")}
                              disabled={reviewing || isVisaCaseCompleted}
                              className="px-3 py-1.5 bg-green-100 hover:bg-green-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold text-green-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-100"
                              title="Approve"
                            >
                              <ThumbsUp className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => openReviewModal(doc, "needs_revision")}
                              disabled={reviewing || isVisaCaseCompleted}
                              className="px-3 py-1.5 bg-orange-100 hover:bg-orange-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold text-orange-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-orange-100"
                              title="Request Revision"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              Revise
                            </button>
                            <button
                              onClick={() => openReviewModal(doc, "rejected")}
                              disabled={reviewing || isVisaCaseCompleted}
                              className="px-3 py-1.5 bg-red-100 hover:bg-red-200 rounded-lg transition-colors flex items-center gap-1.5 text-xs font-semibold text-red-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-100"
                              title="Reject"
                            >
                              <ThumbsDown className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}
                      </div>
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

        {caseData.embassy_submission ? (
          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200 bg-slate-50/60 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Embassy submission
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Track embassy details and update status.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(caseData.embassy_submission.status)}`}
                >
                  {getStatusIcon(caseData.embassy_submission.status)}
                  {caseData.embassy_submission.status.replace("_", " ")}
                </span>

                <Button
                  onClick={() => setShowStatusModal(true)}
                  variant="soft"
                  size="sm"
                  disabled={isVisaCaseCompleted}
                >
                  Update status
                </Button>
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">Embassy</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {caseData.embassy_submission.embassy_name}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600">
                    {caseData.embassy_submission.embassy_location}
                  </p>
                </div>

                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <p className="text-xs font-semibold text-slate-500">Submission date</p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(caseData.embassy_submission.submission_date)}
                  </p>
                </div>
              </div>

              {caseData.embassy_submission.interview_date && (
                <div className="mt-4 rounded-2xl border border-orange-200/70 bg-orange-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-orange-200/70 bg-white">
                        <Calendar className="h-5 w-5 text-orange-700" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">
                          Interview scheduled
                        </p>
                        <p className="mt-0.5 text-sm text-slate-700">
                          {new Date(caseData.embassy_submission.interview_date).toLocaleString(
                            "en-US",
                            {
                              weekday: "short",
                              year: "numeric",
                              month: "short",
                              day: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            }
                          )}
                        </p>
                        <p className="mt-0.5 text-sm text-slate-600">
                          {caseData.embassy_submission.interview_location ||
                            "Location: —"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {caseData.embassy_submission.interview_notes && (
                    <div className="mt-3 rounded-xl border border-orange-200/70 bg-white/60 p-3">
                      <p className="text-xs font-semibold text-slate-700">
                        Notes
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {caseData.embassy_submission.interview_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {caseData.embassy_submission.decision_date && (
              <div
                className={`mt-4 p-4 rounded-lg border ${caseData.embassy_submission.status === "approved" ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}
              >
                <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-2">
                  {caseData.embassy_submission.status === "approved" ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                  Embassy Decision
                </h3>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Decision Date</p>
                  <p className="text-sm font-medium text-slate-700 mb-3">
                    {formatDate(caseData.embassy_submission.decision_date)}
                  </p>
                </div>
                {caseData.embassy_submission.decision_notes && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">Notes</p>
                    <p className="text-sm text-slate-700">
                      {caseData.embassy_submission.decision_notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {!isVisaCaseCompleted &&
              caseData.embassy_submission.status !== "interview_scheduled" &&
              caseData.embassy_submission.status !== "approved" &&
              caseData.embassy_submission.status !== "rejected" && (
                <div className="mt-6">
                  <Button
                    onClick={() => setShowInterviewModal(true)}
                    variant="warning"
                  >
                    Schedule Interview
                  </Button>
                </div>
              )}
          </div>
        ) : allRequiredTypesApproved && pendingDocuments === 0 ? (
          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200 mt-6">
            <div className="flex items-start gap-3 mb-4">
              <CheckCircle className="w-6 h-6 text-blue-600 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">
                  Ready for Embassy Submission
                </h3>
                <p className="text-sm text-slate-600 mb-4">
                  All documents have been approved. You can now submit this case
                  to the embassy.
                </p>
              </div>
            </div>
            <Button onClick={() => setShowEmbassyModal(true)} variant="soft">
              Submit to Embassy
            </Button>
          </div>
        ) : null}
      </div>

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
                  className={`p-3 rounded-full ${reviewAction === "approved" ? "bg-green-100" : reviewAction === "rejected" ? "bg-red-100" : "bg-orange-100"}`}
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
                <Button
                  onClick={() => {
                    setShowReviewModal(false);
                    setSelectedDocument(null);
                    setReviewNotes("");
                  }}
                  variant="outline"
                  className="flex-1"
                  disabled={reviewing}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleReviewDocument}
                  variant={
                    reviewAction === "approved"
                      ? "success"
                      : reviewAction === "rejected"
                        ? "danger"
                        : "warning"
                  }
                  className="flex-1"
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
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showEmbassyModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                <div>
                  <h3 className="text-2xl font-bold text-slate-800">
                    Submit to Embassy
                  </h3>
                  <p className="text-sm text-slate-600 mt-1">
                    Case {caseData.case_number}
                  </p>
                </div>
                <Button
                  onClick={() => setShowEmbassyModal(false)}
                  variant="outline"
                  size="icon"
                  disabled={reviewing}
                  aria-label="Close"
                >
                  <X className="w-5 h-5" />
                </Button>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);
                  const data = {
                    embassy_name: formData.get("embassy_name"),
                    embassy_location: formData.get("embassy_location"),
                    submission_date: formData.get("submission_date"),
                    receipt_url: formData.get("receipt_url") || undefined,
                  };

                  try {
                    setReviewing(true);

                    const response = await fetch(
                      `${API_V1_BASE}/agency/cases/${caseId}/embassy/submit`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(data),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.message || "Failed to submit to embassy"
                      );
                    }

                    toast.success("Case submitted to embassy successfully!");
                    setShowEmbassyModal(false);
                    onRefresh();
                  } catch (err) {
                    console.error("Submit error:", err);
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to submit to embassy"
                    );
                  } finally {
                    setReviewing(false);
                  }
                }}
                className="p-6 space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Embassy Name *
                  </label>
                  <input
                    type="text"
                    name="embassy_name"
                    required
                    placeholder="e.g., US Embassy Morocco"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Embassy Location *
                  </label>
                  <input
                    type="text"
                    name="embassy_location"
                    required
                    placeholder="e.g., Casablanca, Morocco"
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Submission Date *
                  </label>
                  <input
                    type="date"
                    name="submission_date"
                    required
                    defaultValue={new Date().toISOString().split("T")[0]}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Receipt URL (Optional)
                  </label>
                  <input
                    type="url"
                    name="receipt_url"
                    placeholder="https://..."
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={reviewing}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Link to submission receipt or confirmation
                  </p>
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <Button
                    type="button"
                    onClick={() => setShowEmbassyModal(false)}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    disabled={reviewing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Submitting...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        <span>Submit to Embassy</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showStatusModal && caseData?.embassy_submission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-slate-200 p-6">
                <h3 className="text-2xl font-bold text-slate-800">
                  Update Embassy Status
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Case {caseData.case_number}
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);
                  const data = {
                    status: formData.get("status"),
                    decision_date: formData.get("decision_date") || undefined,
                    decision_notes: formData.get("decision_notes") || undefined,
                  };

                  try {
                    setReviewing(true);

                    const response = await fetch(
                      `${API_V1_BASE}/agency/cases/${caseId}/embassy/status`,
                      {
                        method: "PUT",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(data),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.message || "Failed to update status"
                      );
                    }

                    toast.success("Status updated successfully!");
                    setShowStatusModal(false);
                    onRefresh();
                  } catch (err) {
                    console.error("Update status error:", err);
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to update status"
                    );
                  } finally {
                    setReviewing(false);
                  }
                }}
                className="p-6 space-y-5"
              >
                <div className="rounded-xl border border-slate-200/70 bg-slate-50 p-4">
                  <p className="text-xs text-slate-500 mb-1">Current Status</p>
                  <span
                    className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(caseData.embassy_submission.status)}`}
                  >
                    {caseData.embassy_submission.status.replace(/_/g, " ")}
                  </span>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    New Status *
                  </label>
                  <select
                    name="status"
                    required
                    defaultValue={caseData.embassy_submission.status}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    disabled={reviewing}
                  >
                    <option value="submitted">Submitted</option>
                    <option value="under_review">Under Review</option>
                    <option value="interview_scheduled">Interview Scheduled</option>
                    <option value="approved">Approved</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Decision Date (Optional)
                  </label>
                  <input
                    type="date"
                    name="decision_date"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    disabled={reviewing}
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    For approved/rejected status
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="decision_notes"
                    rows={3}
                    placeholder="Add any notes about this status change..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-500/20"
                    disabled={reviewing}
                  />
                </div>

                <div className="flex gap-3 pt-5 border-t border-slate-200">
                  <Button
                    type="button"
                    onClick={() => setShowStatusModal(false)}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    disabled={reviewing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="flex-1"
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Updating...</span>
                      </>
                    ) : (
                      <span>Update Status</span>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showInterviewModal && caseData?.embassy_submission && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl"
            >
              <div className="border-b border-slate-200 p-6">
                <h3 className="text-2xl font-bold text-slate-800">
                  Schedule Embassy Interview
                </h3>
                <p className="text-sm text-slate-600 mt-1">
                  Case {caseData.case_number}
                </p>
              </div>

              <form
                onSubmit={async (e) => {
                  e.preventDefault();

                  const formData = new FormData(e.currentTarget);

                  const date = formData.get("interview_date");
                  const time = formData.get("interview_time");
                  const interview_date = `${date}T${time}:00`;

                  const data = {
                    interview_date,
                    interview_location: formData.get("interview_location"),
                    interview_notes: formData.get("interview_notes") || undefined,
                  };

                  try {
                    setReviewing(true);

                    const response = await fetch(
                      `${API_V1_BASE}/agency/cases/${caseId}/embassy/interview`,
                      {
                        method: "POST",
                        headers: {
                          Authorization: `Bearer ${token}`,
                          "Content-Type": "application/json",
                        },
                        body: JSON.stringify(data),
                      }
                    );

                    if (!response.ok) {
                      const errorData = await response.json();
                      throw new Error(
                        errorData.message || "Failed to schedule interview"
                      );
                    }

                    toast.success("Interview scheduled successfully!");
                    setShowInterviewModal(false);
                    onRefresh();
                  } catch (err) {
                    console.error("Schedule interview error:", err);
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Failed to schedule interview"
                    );
                  } finally {
                    setReviewing(false);
                  }
                }}
                className="p-6 space-y-5"
              >
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Interview Date *
                  </label>
                  <input
                    type="date"
                    name="interview_date"
                    required
                    min={new Date().toISOString().split("T")[0]}
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                    disabled={reviewing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Interview Time *
                  </label>
                  <input
                    type="time"
                    name="interview_time"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                    disabled={reviewing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Interview Location *
                  </label>
                  <input
                    type="text"
                    name="interview_location"
                    required
                    placeholder="e.g., US Embassy - Room 305"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                    disabled={reviewing}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Preparation Notes (Optional)
                  </label>
                  <textarea
                    name="interview_notes"
                    rows={3}
                    placeholder="e.g., Bring original documents, arrive 30 minutes early..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                    disabled={reviewing}
                  />
                </div>

                <div className="rounded-xl border border-orange-200/70 bg-orange-50 p-4">
                  <p className="text-sm text-orange-900">
                    The candidate will receive an email with interview details
                    and preparation checklist.
                  </p>
                </div>

                <div className="flex gap-3 pt-5 border-t border-slate-200">
                  <Button
                    type="button"
                    onClick={() => setShowInterviewModal(false)}
                    variant="outline"
                    size="lg"
                    className="flex-1"
                    disabled={reviewing}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    className="flex-1 bg-orange-600 hover:bg-orange-700 focus-visible:ring-orange-500/20"
                    disabled={reviewing}
                  >
                    {reviewing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Scheduling...</span>
                      </>
                    ) : (
                      <>
                        <Calendar className="w-4 h-4" />
                        <span>Schedule Interview</span>
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
