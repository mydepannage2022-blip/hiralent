"use client";
import { useState, useEffect } from "react";
import { useAuth } from "@/src/context/AuthContext";
import { useRouter, useParams } from "next/navigation";
import toast from "react-hot-toast";
import {
  ArrowLeft,
  MapPin,
  Calendar,
  Building2,
  FileText,
  Upload,
  Download,
  Trash2,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Clock,
  X,
  XCircle,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DOCUMENT_TYPES } from "@/src/constants/documentTypes";
import AgencyBrowserModal from "./components/AgencyBrowserModal";

interface Agency {
  agency_id: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Document {
  is_active: boolean;
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
  agency: Agency;
  documents: Document[];
  embassy_submission?: EmbassySubmission;
}

interface EmbassySubmission {
  submission_id: string;
  embassy_name: string;
  embassy_location: string;
  submission_date: string;
  tracking_number?: string;
  expected_response?: string;
  status: string;
  interview_date?: string;
  interview_location?: string;
  interview_notes?: string;
  decision_date?: string;
  decision_notes?: string;
}

export default function CaseDetailPage() {
  const { token } = useAuth();
  const router = useRouter();
  const params = useParams();
  const caseId = params?.caseId as string;

  const [caseData, setCaseData] = useState<Case | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [documentType, setDocumentType] = useState("");
  const [uploadNotes, setUploadNotes] = useState("");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [documentToDelete, setDocumentToDelete] = useState<string | null>(null);

  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [existingDocument, setExistingDocument] = useState<{
    document_id: string;
    file_name: string;
    status: string;
  } | null>(null);
  const [newDocumentId, setNewDocumentId] = useState<string | null>(null);
  const [showAgencyBrowser, setShowAgencyBrowser] = useState(false);

  const fetchCase = async () => {
    try {
      setLoading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases/${caseId}`,
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
      console.error("❌ Fetch case error:", err);
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

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("File too large. Maximum size is 10MB.");
        return;
      }

      const allowedTypes = [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error("Invalid file type. Allowed: PDF, JPG, PNG, DOC, DOCX");
        return;
      }

      setSelectedFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedFile || !documentType) {
      toast.error("Please select a file and document type");
      return;
    }

    try {
      setUploading(true);

      const formData = new FormData();
      formData.append("document", selectedFile);
      formData.append("document_type", documentType);
      if (uploadNotes) {
        formData.append("notes", uploadNotes);
      }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases/${caseId}/documents`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || "Failed to upload document");
      }

      const data = await response.json();

      // Check if replacement confirmation is required
      if (data.requiresConfirmation && data.existingDocument) {
        setExistingDocument(data.existingDocument);
        setNewDocumentId(data.data.document_id);
        setShowDuplicateWarning(true);
        setUploading(false);
        return;
      }

      toast.success("Document uploaded successfully!");

      setSelectedFile(null);
      setDocumentType("");
      setUploadNotes("");
      setShowUploadModal(false);

      fetchCase();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error(
        err instanceof Error ? err.message : "Failed to upload document"
      );
    } finally {
      setUploading(false);
    }
  };

  // ✅ NEW: Confirm replacement
  const handleConfirmReplacement = async () => {
    if (!existingDocument || !newDocumentId) return;

    try {
      setUploading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases/${caseId}/documents/confirm-replacement`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            oldDocumentId: existingDocument.document_id,
            newDocumentId: newDocumentId,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to confirm replacement");
      }

      toast.success("Document replaced successfully!");

      // Reset states
      setShowDuplicateWarning(false);
      setExistingDocument(null);
      setNewDocumentId(null);
      setSelectedFile(null);
      setDocumentType("");
      setUploadNotes("");
      setShowUploadModal(false);

      fetchCase();
    } catch (err) {
      console.error("Confirm replacement error:", err);
      toast.error("Failed to confirm replacement");
    } finally {
      setUploading(false);
    }
  };

  // ✅ NEW: Cancel replacement
  const handleCancelReplacement = async () => {
    if (!newDocumentId) return;

    try {
      setUploading(true);

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases/${caseId}/documents/${newDocumentId}/cancel`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to cancel upload");
      }

      toast.success("Upload cancelled");

      // Reset states
      setShowDuplicateWarning(false);
      setExistingDocument(null);
      setNewDocumentId(null);

      // Keep the upload modal open with file selected
      // so user can try again with different type
    } catch (err) {
      console.error("Cancel replacement error:", err);
      toast.error("Failed to cancel upload");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!documentToDelete) return;

    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases/${caseId}/documents/${documentToDelete}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to delete document");
      }

      toast.success("Document deleted successfully");
      setShowDeleteModal(false);
      setDocumentToDelete(null);
      fetchCase();
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Failed to delete document");
    }
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
            onClick={() => router.push("/candidate/dashboard/cases")}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Back to Cases
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <button
          onClick={() => router.push("/candidate/dashboard/cases")}
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h2 className="text-xl font-bold text-slate-800 mb-4">
              Case Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 mb-1">Route</p>
                  <p className="text-sm font-medium text-slate-700">
                    {caseData.origin_country} to {caseData.destination_country}
                    {caseData.destination_city &&
                      ` (${caseData.destination_city})`}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 mb-1">Agency</p>
                  <p className="text-sm font-medium text-slate-700">
                    {caseData.agency.name}
                  </p>
                  {caseData.agency.email && (
                    <p className="text-xs text-slate-500">
                      {caseData.agency.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar className="w-5 h-5 text-slate-400 mt-0.5" />
                <div>
                  <p className="text-xs text-slate-500 mb-1">Created</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(caseData.created_at)}
                  </p>
                </div>
              </div>

              {caseData.estimated_completion && (
                <div className="flex items-start gap-3">
                  <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Est. Completion
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {formatDate(caseData.estimated_completion)}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {caseData.notes && (
              <div className="mt-4 p-4 bg-slate-50 rounded-lg">
                <p className="text-xs text-slate-500 mb-1">Notes</p>
                <p className="text-sm text-slate-700">{caseData.notes}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-slate-800">Documents</h2>
              <button
                onClick={() => setShowUploadModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-linear-to-r from-blue-600 to-blue-500 text-white rounded-lg hover:from-blue-700 hover:to-blue-600 transition-all shadow-md hover:shadow-lg font-medium text-sm"
              >
                <Upload className="w-4 h-4" />
                <span>Upload</span>
              </button>
            </div>

            {caseData.documents.length === 0 ? (
              <div className="text-center py-12 bg-slate-50 rounded-xl">
                <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-600 mb-1">No documents uploaded yet</p>
                <p className="text-sm text-slate-500">
                  Click "Upload Document" to add files
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
                        {doc.review_feedback && (
                          <p className="text-xs text-orange-600 mt-1 font-medium italic">
                            Agency feedback: {doc.review_feedback}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border flex items-center gap-1 ${
                          !doc.is_active
                            ? "bg-gray-100 text-gray-600 border-gray-300" // Inactive style
                            : getStatusColor(doc.status) // Normal style
                        }`}
                      >
                        {!doc.is_active ? (
                          <>
                            <XCircle className="w-4 h-4" />
                            inactive
                          </>
                        ) : (
                          <>
                            {getStatusIcon(doc.status)}
                            {doc.status.replace("_", " ")}
                          </>
                        )}
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
                        <button
                          onClick={() => {
                            setDocumentToDelete(doc.document_id);
                            setShowDeleteModal(true);
                          }}
                          className="p-2 hover:bg-red-100 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4 text-red-600" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-1 space-y-6">
          {/* 🎉 VISA APPROVED - CHOOSE HOUSING AGENCY */}
          {caseData.embassy_submission?.status === "approved" &&
            caseData.status !== "housing_assigned" &&
            caseData.status !== "housing_in_progress" &&
            caseData.status !== "housing_complete" && (
              <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-300 shadow-sm">
                <div className="flex items-start gap-3 mb-3">
                  <div className="p-2 bg-green-100 rounded-lg shrink-0">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-bold text-green-900 mb-1">
                      🎉 Visa Approved!
                    </h3>
                    <p className="text-xs text-green-800 leading-relaxed">
                      Select a housing agency to help you find accommodation in{" "}
                      {caseData.destination_country}.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowAgencyBrowser(true)}
                  className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2"
                >
                  <Building2 className="w-4 h-4" />
                  Choose Housing Agency
                </button>
              </div>
            )}
          <div className="bg-white rounded-2xl p-6 border border-slate-200">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Status</h3>
            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1">Current Status</p>
                <span
                  className={`inline-block px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(
                    caseData.status
                  )}`}
                >
                  {caseData.status.replace("_", " ")}
                </span>
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Priority</p>
                <span className="text-sm font-medium text-slate-700 capitalize">
                  {caseData.priority_level}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100">
            <h3 className="text-lg font-bold text-slate-800 mb-3">
              Required Documents
            </h3>
            <ul className="space-y-2">
              {DOCUMENT_TYPES.map((type) => {
                const hasDoc = caseData.documents.some(
                  (d) =>
                    d.document_type === type.value &&
                    d.status === "approved" &&
                    d.is_active === true
                );
                return (
                  <li
                    key={type.value}
                    className="flex items-center gap-2 text-sm"
                  >
                    {hasDoc ? (
                      <CheckCircle className="w-4 h-4 text-green-600" />
                    ) : (
                      <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />
                    )}
                    <span
                      className={hasDoc ? "text-slate-700" : "text-slate-500"}
                    >
                      {type.label}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          {caseData.embassy_submission && (
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-green-600" />
                Embassy Status
              </h3>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-500 mb-1">Current Status</p>
                  <span
                    className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                      caseData.embassy_submission.status
                    )}`}
                  >
                    {getStatusIcon(caseData.embassy_submission.status)}
                    {caseData.embassy_submission.status.replace("_", " ")}
                  </span>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Embassy</p>
                  <p className="text-sm font-medium text-slate-700">
                    {caseData.embassy_submission.embassy_name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {caseData.embassy_submission.embassy_location}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-slate-500 mb-1">Submitted On</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(caseData.embassy_submission.submission_date)}
                  </p>
                </div>

                {caseData.embassy_submission.tracking_number && (
                  <div>
                    <p className="text-xs text-slate-500 mb-1">
                      Tracking Number
                    </p>
                    <p className="text-sm font-medium text-slate-700">
                      {caseData.embassy_submission.tracking_number}
                    </p>
                  </div>
                )}

                {/* Interview Alert */}
                {caseData.embassy_submission.interview_date && (
                  <div className="mt-4 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-xs font-bold text-orange-900 mb-2">
                          📅 Interview Scheduled
                        </p>
                        <p className="text-sm font-medium text-slate-700 mb-1">
                          {new Date(
                            caseData.embassy_submission.interview_date
                          ).toLocaleString("en-US", {
                            weekday: "long",
                            month: "long",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                        {caseData.embassy_submission.interview_location && (
                          <p className="text-xs text-slate-600">
                            📍 {caseData.embassy_submission.interview_location}
                          </p>
                        )}
                        {caseData.embassy_submission.interview_notes && (
                          <p className="text-xs text-slate-600 mt-2 italic">
                            {caseData.embassy_submission.interview_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Decision */}
                {caseData.embassy_submission.decision_date && (
                  <div
                    className={`mt-4 p-4 rounded-lg border ${
                      caseData.embassy_submission.status === "approved"
                        ? "bg-green-50 border-green-200"
                        : "bg-red-50 border-red-200"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      {caseData.embassy_submission.status === "approved" ? (
                        <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <p
                          className={`text-xs font-bold mb-2 ${
                            caseData.embassy_submission.status === "approved"
                              ? "text-green-900"
                              : "text-red-900"
                          }`}
                        >
                          {caseData.embassy_submission.status === "approved"
                            ? "🎉 Application Approved!"
                            : "Application Decision"}
                        </p>
                        <p className="text-xs text-slate-600 mb-1">
                          Decision Date:{" "}
                          {formatDate(
                            caseData.embassy_submission.decision_date
                          )}
                        </p>
                        {caseData.embassy_submission.decision_notes && (
                          <p className="text-xs text-slate-600 mt-2 italic">
                            {caseData.embassy_submission.decision_notes}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <AnimatePresence>
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="sticky top-0 bg-white border-b border-slate-200 p-6 flex items-center justify-between">
                <h3 className="text-2xl font-bold text-slate-800">
                  Upload Document
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                  disabled={uploading}
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleUpload} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Type *
                  </label>
                  <select
                    required
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    disabled={uploading}
                  >
                    <option value="">Select document type</option>
                    {DOCUMENT_TYPES.map((type) => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Select File *
                  </label>

                  <label
                    htmlFor="file-upload"
                    className={`
      relative flex items-center justify-center w-full px-4 py-8 
      border-2 border-dashed rounded-xl cursor-pointer transition-all
      ${
        selectedFile
          ? "border-green-300 bg-green-50"
          : "border-slate-300 bg-slate-50 hover:border-blue-400 hover:bg-blue-50"
      }
      ${uploading ? "opacity-50 cursor-not-allowed" : ""}
    `}
                  >
                    <input
                      id="file-upload"
                      type="file"
                      onChange={handleFileSelect}
                      accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                      className="hidden"
                      required
                      disabled={uploading}
                    />

                    <div className="text-center">
                      {selectedFile ? (
                        <>
                          <CheckCircle className="w-10 h-10 text-green-600 mx-auto mb-2" />
                          <p className="text-sm font-medium text-green-700 mb-1">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-green-600">
                            {formatFileSize(selectedFile.size)}
                          </p>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              setSelectedFile(null);
                            }}
                            className="mt-2 text-xs text-blue-600 hover:text-blue-700 underline"
                            disabled={uploading}
                          >
                            Choose different file
                          </button>
                        </>
                      ) : (
                        <>
                          <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                          <p className="text-sm font-medium text-slate-700 mb-1">
                            Click to upload or drag and drop
                          </p>
                          <p className="text-xs text-slate-500">
                            PDF, JPG, PNG, DOC, DOCX (Max 10MB)
                          </p>
                        </>
                      )}
                    </div>
                  </label>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    value={uploadNotes}
                    onChange={(e) => setUploadNotes(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Add any notes about this document..."
                    disabled={uploading}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <button
                    type="button"
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium transition-colors"
                    disabled={uploading}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-medium transition-colors disabled:bg-slate-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    disabled={uploading || !selectedFile || !documentType}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Upload
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Duplicate Warning Modal */}
      <AnimatePresence>
        {showDuplicateWarning && existingDocument && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-orange-100 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-orange-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    Document Already Approved
                  </h3>
                  <p className="text-sm text-slate-600">
                    You already have an approved document of this type.
                  </p>
                </div>
              </div>

              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-green-900 truncate">
                      {existingDocument.file_name}
                    </p>
                    <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      {existingDocument.status}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 mb-6">
                <p className="text-sm font-medium text-orange-900 mb-2">
                  Uploading a new document will:
                </p>
                <ul className="space-y-2 text-sm text-orange-800">
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>Mark the current document as replaced</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>Reset status to pending review</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-orange-600 mt-0.5">•</span>
                    <span>Require agency to review the new document again</span>
                  </li>
                </ul>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleCancelReplacement}
                  className="flex-1 px-6 py-3 border-2 border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-all"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReplacement}
                  className="flex-1 px-6 py-3 bg-orange-600 hover:bg-orange-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Upload Anyway</span>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md p-6"
            >
              <div className="flex items-start gap-4 mb-6">
                <div className="p-3 bg-red-100 rounded-full">
                  <AlertCircle className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-800 mb-2">
                    Delete Document?
                  </h3>
                  <p className="text-slate-600">
                    Are you sure you want to delete this document? This action
                    cannot be undone.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDocumentToDelete(null);
                  }}
                  className="flex-1 px-6 py-3 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium transition-colors"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Agency Browser Modal */}
      <AgencyBrowserModal
        isOpen={showAgencyBrowser}
        onClose={() => setShowAgencyBrowser(false)}
        caseId={caseId}
        destinationCountry={caseData?.destination_country || ""}
        onSuccess={fetchCase}
      />
    </div>
  );
}
