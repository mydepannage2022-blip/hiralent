"use client";
import React, { useState, useEffect } from "react";
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
  Droplets,
  Zap,
  Wifi,
  Plane,
  Home,
  Users,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { DOCUMENT_TYPES } from "@/src/constants/documentTypes";
import AgencyBrowserModal from "./components/AgencyBrowserModal";
import { JSX } from "react/jsx-runtime";
import IntegrationTabContent from "./components/IntegrationTabContent";

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

interface IntegrationService {
  service_id: string;
  case_id: string;
  service_type: string; // healthcare, banking, tax_id, telecom, transport, integration_program
  status: string; // pending, in_progress, completed
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

  // Housing fields
  housing_type?: string;
  housing_address?: string;
  monthly_rent_mad?: number;
  agency_fee_amount?: number;
  lease_start_date?: string;
  lease_end_date?: string;
  housing_contract_url?: string;

  // Utility fields
  utility_water?: string;
  utility_electricity?: string;
  utility_internet?: string;

  // Arrival fields
  arrival_date?: string;
  flight_number?: string;
  airport_pickup_required?: boolean;
  arrival_notes?: string;

  integration_agency_id?: string;
  integrationAgency?: IntegrationAgency;
  integrationServices?: IntegrationService[];
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

type TabType = "overview" | "visa" | "housing" | "integration";

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
  const [showIntegrationAgencyBrowser, setShowIntegrationAgencyBrowser] =
    useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>("overview");

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

      setShowDuplicateWarning(false);
      setExistingDocument(null);
      setNewDocumentId(null);
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

  // Calculate which tabs to show
  // Housing tab only shows after visa is approved
  const visaApproved = caseData?.embassy_submission?.status === "approved";
  const showHousingTab =
    (caseData?.service_type === "housing" && visaApproved) ||
    Boolean(caseData?.housing_address);

  const showIntegrationTab = Boolean(caseData?.integration_agency_id);

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

        <div className="bg-linear-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-800 mb-2">
                {caseData.case_number}
              </h1>
              <p className="text-slate-600 capitalize">
                {caseData.service_type.replace("_", " ")} Service
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

      {/* Tab Navigation */}
      <div className="border-b border-slate-200 mb-6 bg-white rounded-t-xl">
        <div className="flex gap-1 px-2">
          {/* Overview Tab */}
          <button
            onClick={() => setActiveTab("overview")}
            className={`px-6 py-3 font-medium text-sm transition-all relative rounded-t-lg ${
              activeTab === "overview"
                ? "bg-linear-to-b from-blue-50 to-transparent text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            Overview
          </button>

          {/* Visa Tab */}
          <button
            onClick={() => setActiveTab("visa")}
            className={`px-6 py-3 font-medium text-sm transition-all relative rounded-t-lg ${
              activeTab === "visa"
                ? "bg-linear-to-b from-blue-50 to-transparent text-blue-600 border-b-2 border-blue-600"
                : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
            }`}
          >
            <div className="flex items-center gap-2">
              Visa
              {caseData.embassy_submission?.status === "approved" && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
            </div>
          </button>

          {/* Housing Tab - Conditional */}
          {showHousingTab && (
            <button
              onClick={() => setActiveTab("housing")}
              className={`px-6 py-3 font-medium text-sm transition-all relative rounded-t-lg ${
                activeTab === "housing"
                  ? "bg-linear-to-b from-green-50 to-transparent text-green-600 border-b-2 border-green-600"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                Housing
                {(caseData.status === "ready_for_arrival" ||
                  caseData.status === "integration_assigned" ||
                  caseData.status === "integration_in_progress" ||
                  caseData.status === "integration_complete" ||
                  caseData.status === "fully_integrated") && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
            </button>
          )}

          {/* Integration Tab */}
          {showIntegrationTab && (
            <button
              onClick={() => setActiveTab("integration")}
              className={`px-6 py-3 font-medium text-sm transition-all relative rounded-t-lg ${
                activeTab === "integration"
                  ? "bg-linear-to-b from-blue-50 to-transparent text-blue-600 border-b-2 border-blue-600"
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-50"
              }`}
            >
              <div className="flex items-center gap-2">
                Integration
                {(caseData.status === "integration_complete" ||
                  caseData.status === "fully_integrated") && (
                  <CheckCircle className="w-4 h-4 text-green-600" />
                )}
              </div>
            </button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === "overview" && (
            <OverviewTabContent
              caseData={caseData}
              showHousingTab={showHousingTab}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
            />
          )}

          {activeTab === "visa" && (
            <VisaTabContent
              caseData={caseData}
              formatDate={formatDate}
              getStatusColor={getStatusColor}
              getStatusIcon={getStatusIcon}
              formatFileSize={formatFileSize}
              setShowUploadModal={setShowUploadModal}
              setDocumentToDelete={setDocumentToDelete}
              setShowDeleteModal={setShowDeleteModal}
              showAgencyBrowser={showAgencyBrowser}
              setShowAgencyBrowser={setShowAgencyBrowser}
              fetchCase={fetchCase}
            />
          )}

          {activeTab === "housing" && showHousingTab && (
            <HousingTabContent
              caseData={caseData}
              formatDate={formatDate}
              setShowIntegrationAgencyBrowser={setShowIntegrationAgencyBrowser}
            />
          )}

          {/* Integration Tab Content */}
          {activeTab === "integration" && showIntegrationTab && (
            <IntegrationTabContent
              caseData={caseData}
              formatDate={formatDate}
              setShowIntegrationAgencyBrowser={setShowIntegrationAgencyBrowser}
              fetchCase={fetchCase}
            />
          )}
        </motion.div>
      </AnimatePresence>

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
        isOpen={showAgencyBrowser || showIntegrationAgencyBrowser}
        onClose={() => {
          setShowAgencyBrowser(false);
          setShowIntegrationAgencyBrowser(false);
        }}
        caseId={caseId}
        destinationCountry={caseData?.destination_country || ""}
        onSuccess={fetchCase}
        agencyType={showIntegrationAgencyBrowser ? "INTEGRATION" : "RELOCATION"}
      />
    </div>
  );
}

// ==========================================
// OVERVIEW TAB COMPONENT
// ==========================================
function OverviewTabContent({
  caseData,
  showHousingTab,
  formatDate,
  getStatusColor,
}: {
  caseData: Case;
  showHousingTab: boolean;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
}) {
  const visaComplete = caseData.embassy_submission?.status === "approved";
  const housingComplete =
    caseData.status === "ready_for_arrival" ||
    caseData.status === "integration_assigned" ||
    caseData.status === "integration_in_progress" ||
    caseData.status === "integration_complete" ||
    caseData.status === "fully_integrated";
  const housingInProgress = Boolean(caseData.housing_address);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Case Information Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            Case Information
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <MapPin className="w-5 h-5 text-blue-600" />
              </div>
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
              <div className="p-2 bg-blue-50 rounded-lg">
                <Building2 className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">
                  {caseData.service_type === "housing"
                    ? "Housing Agency"
                    : "Primary Agency"}
                </p>
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
              <div className="p-2 bg-blue-50 rounded-lg">
                <Calendar className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 mb-1">Created</p>
                <p className="text-sm font-medium text-slate-700">
                  {formatDate(caseData.created_at)}
                </p>
              </div>
            </div>

            {caseData.estimated_completion && (
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 rounded-lg">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 mb-1">Est. Completion</p>
                  <p className="text-sm font-medium text-slate-700">
                    {formatDate(caseData.estimated_completion)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {caseData.notes && (
            <div className="mt-4 p-4 bg-slate-50 rounded-lg border border-slate-200">
              <p className="text-xs text-slate-500 mb-1 font-medium">Notes</p>
              <p className="text-sm text-slate-700">{caseData.notes}</p>
            </div>
          )}
        </div>

        {/* Progress Timeline */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4">
            Your Journey
          </h2>

          <div className="space-y-4">
            {/* Visa Step */}
            <div
              className={`flex items-start gap-4 p-4 rounded-xl border-l-4 ${
                visaComplete
                  ? "bg-linear-to-r from-blue-50 to-transparent border-blue-500"
                  : "bg-linear-to-r from-yellow-50 to-transparent border-yellow-500"
              }`}
            >
              <div
                className={`p-2 rounded-lg ${
                  visaComplete ? "bg-green-100" : "bg-yellow-100"
                }`}
              >
                {visaComplete ? (
                  <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                ) : (
                  <Clock className="w-6 h-6 text-yellow-600 shrink-0" />
                )}
              </div>
              <div className="flex-1">
                <p className="font-semibold text-slate-800 mb-1">
                  Visa Processing
                </p>
                <p className="text-sm text-slate-600">
                  {visaComplete
                    ? "Visa approved - Ready for next steps"
                    : caseData.embassy_submission
                    ? `In progress - ${caseData.embassy_submission.status.replace(
                        "_",
                        " "
                      )}`
                    : "Documents being reviewed"}
                </p>
                {caseData.embassy_submission?.decision_date && (
                  <p className="text-xs text-slate-500 mt-1">
                    Decided on{" "}
                    {formatDate(caseData.embassy_submission.decision_date)}
                  </p>
                )}
              </div>
            </div>

            {/* Housing Step - Conditional */}
            {showHousingTab && (
              <div
                className={`flex items-start gap-4 p-4 rounded-xl border-l-4 ${
                  housingComplete
                    ? "bg-linear-to-r from-green-50 to-transparent border-green-500"
                    : housingInProgress
                    ? "bg-linear-to-r from-yellow-50 to-transparent border-yellow-500"
                    : "bg-linear-to-r from-slate-50 to-transparent border-slate-300"
                }`}
              >
                <div
                  className={`p-2 rounded-lg ${
                    housingComplete
                      ? "bg-green-100"
                      : housingInProgress
                      ? "bg-yellow-100"
                      : "bg-slate-100"
                  }`}
                >
                  {housingComplete ? (
                    <CheckCircle className="w-6 h-6 text-green-600 shrink-0" />
                  ) : housingInProgress ? (
                    <Clock className="w-6 h-6 text-yellow-600 shrink-0" />
                  ) : (
                    <Home className="w-6 h-6 text-slate-400 shrink-0" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className={`font-semibold mb-1 ${
                      housingComplete || housingInProgress
                        ? "text-slate-800"
                        : "text-slate-500"
                    }`}
                  >
                    Housing Arrangement
                  </p>
                  <p
                    className={`text-sm ${
                      housingComplete || housingInProgress
                        ? "text-slate-600"
                        : "text-slate-500"
                    }`}
                  >
                    {housingComplete
                      ? "All set - Your housing is ready for arrival"
                      : housingInProgress
                      ? "Housing being arranged by agency"
                      : "Waiting for visa approval"}
                  </p>
                  {caseData.arrival_date && (
                    <p className="text-xs text-slate-500 mt-1">
                      Expected arrival: {formatDate(caseData.arrival_date)}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-1 space-y-6">
        {/* Status Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">Status</h3>
          <div className="space-y-3">
            <div>
              <p className="text-xs text-slate-500 mb-2 font-medium">
                Current Status
              </p>
              <span
                className={`inline-block px-4 py-2 rounded-lg text-sm font-medium border ${getStatusColor(
                  caseData.status
                )}`}
              >
                {caseData.status.replace("_", " ")}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-1 font-medium">
                Priority
              </p>
              <span className="text-sm font-semibold text-slate-700 capitalize">
                {caseData.priority_level}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="bg-linear-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-4">
            Progress Summary
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
              <span className="text-sm font-medium text-slate-700">Visa</span>
              <span
                className={`text-sm font-bold ${
                  visaComplete ? "text-green-600" : "text-yellow-600"
                }`}
              >
                {visaComplete ? "Complete" : "In Progress"}
              </span>
            </div>
            {showHousingTab && (
              <div className="flex items-center justify-between p-3 bg-white rounded-lg shadow-sm">
                <span className="text-sm font-medium text-slate-700">
                  Housing
                </span>
                <span
                  className={`text-sm font-bold ${
                    housingComplete
                      ? "text-green-600"
                      : housingInProgress
                      ? "text-yellow-600"
                      : "text-slate-400"
                  }`}
                >
                  {housingComplete
                    ? "Complete"
                    : housingInProgress
                    ? "In Progress"
                    : "Pending"}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ==========================================
// VISA TAB COMPONENT
// ==========================================
function VisaTabContent({
  caseData,
  formatDate,
  getStatusColor,
  getStatusIcon,
  formatFileSize,
  setShowUploadModal,
  setDocumentToDelete,
  setShowDeleteModal,
  showAgencyBrowser,
  setShowAgencyBrowser,
  fetchCase,
}: {
  caseData: Case;
  formatDate: (date: string) => string;
  getStatusColor: (status: string) => string;
  getStatusIcon: (status: string) => JSX.Element;
  formatFileSize: (bytes: number) => string;
  setShowUploadModal: (show: boolean) => void;
  setDocumentToDelete: (id: string | null) => void;
  setShowDeleteModal: (show: boolean) => void;
  showAgencyBrowser: boolean;
  setShowAgencyBrowser: (show: boolean) => void;
  fetchCase: () => void;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Documents Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-blue-600" />
              Documents
            </h2>
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
                Click "Upload" to add files
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
                          ? "bg-gray-100 text-gray-600 border-gray-300"
                          : getStatusColor(doc.status)
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

      {/* Right Column */}
      <div className="lg:col-span-1 space-y-6">
        {/* Visa Approved - Housing Agency Selection */}
        {caseData.embassy_submission?.status === "approved" && (
          <div className="bg-linear-to-br from-green-50 to-emerald-50 rounded-xl p-5 border-2 border-green-300 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-green-100 rounded-lg shrink-0">
                <CheckCircle className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                {caseData.status === "ready_for_arrival" ? (
                  <>
                    <h3 className="text-sm font-bold text-green-900 mb-1 flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Housing Complete!
                    </h3>
                    <p className="text-xs text-green-800 leading-relaxed">
                      Your housing is all set and ready. Check the Housing tab
                      for full details!
                    </p>
                  </>
                ) : caseData.status === "housing_assigned" ||
                  caseData.status === "housing_in_progress" ||
                  caseData.status === "housing_complete" ? (
                  <>
                    <h3 className="text-sm font-bold text-green-900 mb-1 flex items-center gap-2">
                      <Home className="w-4 h-4" />
                      Housing Agency Working
                    </h3>
                    <p className="text-xs text-green-800 leading-relaxed">
                      {caseData.agency.name} is arranging your accommodation.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-green-900 mb-1 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Visa Approved!
                    </h3>
                    <p className="text-xs text-green-800 leading-relaxed">
                      Select a housing agency to help you find accommodation in{" "}
                      {caseData.destination_country}.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Button - Always visible but disabled when housing already chosen */}
            <button
              onClick={() => setShowAgencyBrowser(true)}
              disabled={
                caseData.status === "housing_assigned" ||
                caseData.status === "housing_in_progress" ||
                caseData.status === "housing_complete" ||
                caseData.status === "ready_for_arrival" ||
                caseData.status === "integration_assigned" ||
                caseData.status === "integration_in_progress" ||
                caseData.status === "integration_complete" ||
                caseData.status === "fully_integrated"
              }
              className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                caseData.status === "housing_assigned" ||
                caseData.status === "housing_in_progress" ||
                caseData.status === "housing_complete" ||
                caseData.status === "ready_for_arrival" ||
                caseData.status === "integration_assigned" ||
                caseData.status === "integration_in_progress" ||
                caseData.status === "integration_complete" ||
                caseData.status === "fully_integrated"
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-green-600 hover:bg-green-700 text-white hover:shadow-lg"
              }`}
            >
              <Building2 className="w-4 h-4" />
              {caseData.status === "housing_assigned" ||
              caseData.status === "housing_in_progress" ||
              caseData.status === "housing_complete" ||
              caseData.status === "ready_for_arrival" ||
              caseData.status === "integration_assigned" ||
              caseData.status === "integration_in_progress" ||
              caseData.status === "integration_complete" ||
              caseData.status === "fully_integrated"
                ? "Housing Agency Already Selected"
                : "Choose Housing Agency"}
            </button>
          </div>
        )}

        {/* Required Documents Checklist */}
        <div className="bg-blue-50 rounded-2xl p-6 border border-blue-100 shadow-sm">
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
                    className={
                      hasDoc ? "text-slate-700 font-medium" : "text-slate-500"
                    }
                  >
                    {type.label}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Embassy Status */}
        {caseData.embassy_submission && (
          <div className="bg-green-50 rounded-2xl p-6 border border-green-100 shadow-sm">
            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-green-600" />
              Embassy Status
            </h3>

            <div className="space-y-3">
              <div>
                <p className="text-xs text-slate-500 mb-1 font-medium">
                  Current Status
                </p>
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
                <p className="text-xs text-slate-500 mb-1 font-medium">
                  Embassy
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {caseData.embassy_submission.embassy_name}
                </p>
                <p className="text-xs text-slate-500">
                  {caseData.embassy_submission.embassy_location}
                </p>
              </div>

              <div>
                <p className="text-xs text-slate-500 mb-1 font-medium">
                  Submitted On
                </p>
                <p className="text-sm font-medium text-slate-700">
                  {formatDate(caseData.embassy_submission.submission_date)}
                </p>
              </div>

              {caseData.embassy_submission.tracking_number && (
                <div>
                  <p className="text-xs text-slate-500 mb-1 font-medium">
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
                      <p className="text-xs font-bold text-orange-900 mb-2 flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Interview Scheduled
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
                        <p className="text-xs text-slate-600 flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {caseData.embassy_submission.interview_location}
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
                        className={`text-xs font-bold mb-2 flex items-center gap-1 ${
                          caseData.embassy_submission.status === "approved"
                            ? "text-green-900"
                            : "text-red-900"
                        }`}
                      >
                        {caseData.embassy_submission.status === "approved" ? (
                          <>
                            <CheckCircle className="w-3 h-3" />
                            Application Approved!
                          </>
                        ) : (
                          "Application Decision"
                        )}
                      </p>
                      <p className="text-xs text-slate-600 mb-1">
                        Decision Date:{" "}
                        {formatDate(caseData.embassy_submission.decision_date)}
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
  );
}

// ==========================================
// HOUSING TAB COMPONENT
// ==========================================
function HousingTabContent({
  caseData,
  formatDate,
  setShowIntegrationAgencyBrowser,
}: {
  caseData: Case;
  formatDate: (date: string) => string;
  setShowIntegrationAgencyBrowser: (show: boolean) => void;
}) {
  const hasHousingData = Boolean(caseData.housing_address);

  if (!hasHousingData) {
    return (
      <div className="text-center py-20 bg-white rounded-xl border border-slate-200 shadow-sm">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <Home className="w-10 h-10 text-green-600" />
        </div>
        <h3 className="text-xl font-bold text-slate-800 mb-2">
          Housing Arrangement in Progress
        </h3>
        <p className="text-slate-600 mb-1">
          Your housing agency is working on finding accommodation for you.
        </p>
        <p className="text-sm text-slate-500 mt-2">
          You'll be notified once details are available.
        </p>
      </div>
    );
  }

  const allUtilitiesConnected =
    caseData.utility_water === "completed" &&
    caseData.utility_electricity === "completed" &&
    caseData.utility_internet === "completed";

  const arrivalPlanned = Boolean(
    caseData.arrival_date && caseData.flight_number
  );

  const getUtilityStatus = (status?: string) => {
    if (status === "completed") {
      return {
        label: "Completed",
        color: "bg-green-100 text-green-700",
        icon: <CheckCircle className="w-4 h-4" />,
      };
    } else if (status === "in_progress") {
      return {
        label: "In Progress",
        color: "bg-yellow-100 text-yellow-700",
        icon: <Clock className="w-4 h-4" />,
      };
    } else {
      return {
        label: "Pending",
        color: "bg-slate-100 text-slate-600",
        icon: <Clock className="w-4 h-4" />,
      };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Housing Details Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Home className="w-5 h-5 text-green-600" />
            </div>
            Your Housing
          </h2>

          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-xs text-green-700 font-medium mb-1">Address</p>
              <p className="text-sm font-semibold text-green-900">
                {caseData.housing_address}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {caseData.housing_type && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1 font-medium">
                    Housing Type
                  </p>
                  <p className="text-sm font-semibold text-slate-700 capitalize">
                    {caseData.housing_type.replace("_", " ")}
                  </p>
                </div>
              )}

              {caseData.monthly_rent_mad && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1 font-medium">
                    Monthly Rent
                  </p>
                  <p className="text-sm font-semibold text-slate-700 flex items-center gap-1">
                    {caseData.monthly_rent_mad} MAD
                  </p>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {caseData.lease_start_date && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1 font-medium">
                    Move-in Date
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatDate(caseData.lease_start_date)}
                  </p>
                </div>
              )}

              {caseData.lease_end_date && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1 font-medium">
                    Lease End Date
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {formatDate(caseData.lease_end_date)}
                  </p>
                </div>
              )}
            </div>

            {caseData.agency_fee_amount && (
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-slate-500 font-medium">
                    Agency Fee
                  </p>
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1">
                    {caseData.agency_fee_amount} MAD
                  </p>
                </div>
              </div>
            )}

            {caseData.housing_contract_url && (
              <div className="pt-4 border-t border-slate-200">
                <a
                  href={caseData.housing_contract_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors shadow-sm font-medium"
                >
                  <Download className="w-4 h-4" />
                  Download Lease Contract
                </a>
              </div>
            )}
          </div>
        </div>

        {/* Utilities Status Card */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
            <div className="p-2 bg-green-100 rounded-lg">
              <Zap className="w-5 h-5 text-green-600" />
            </div>
            Utilities Status
          </h2>

          <div className="space-y-3">
            {/* Water */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Droplets className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  Water
                </span>
              </div>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  getUtilityStatus(caseData.utility_water).color
                }`}
              >
                {getUtilityStatus(caseData.utility_water).icon}
                {getUtilityStatus(caseData.utility_water).label}
              </span>
            </div>

            {/* Electricity */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Zap className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  Electricity
                </span>
              </div>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  getUtilityStatus(caseData.utility_electricity).color
                }`}
              >
                {getUtilityStatus(caseData.utility_electricity).icon}
                {getUtilityStatus(caseData.utility_electricity).label}
              </span>
            </div>

            {/* Internet */}
            <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-100 rounded-lg">
                  <Wifi className="w-5 h-5 text-slate-600" />
                </div>
                <span className="text-sm font-semibold text-slate-700">
                  Internet
                </span>
              </div>
              <span
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 ${
                  getUtilityStatus(caseData.utility_internet).color
                }`}
              >
                {getUtilityStatus(caseData.utility_internet).icon}
                {getUtilityStatus(caseData.utility_internet).label}
              </span>
            </div>
          </div>
        </div>

        {/* Arrival Details Card */}
        {(caseData.arrival_date || caseData.flight_number) && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
            <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <Plane className="w-5 h-5 text-green-600" />
              </div>
              Your Arrival
            </h2>

            <div className="space-y-4">
              {caseData.arrival_date && (
                <div className="p-4 bg-sky-50 rounded-lg border border-sky-200">
                  <p className="text-xs text-sky-700 mb-1 font-medium">
                    Arrival Date
                  </p>
                  <p className="text-sm font-semibold text-sky-900">
                    {new Date(caseData.arrival_date).toLocaleDateString(
                      "en-US",
                      {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }
                    )}
                  </p>
                </div>
              )}

              {caseData.flight_number && (
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs text-slate-500 mb-1 font-medium">
                    Flight Number
                  </p>
                  <p className="text-sm font-semibold text-slate-700">
                    {caseData.flight_number}
                  </p>
                </div>
              )}

              {caseData.airport_pickup_required !== undefined && (
                <div
                  className={`p-4 rounded-lg border ${
                    caseData.airport_pickup_required
                      ? "bg-green-50 border-green-200"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <p
                    className="text-xs mb-1 font-medium"
                    style={{
                      color: caseData.airport_pickup_required
                        ? "#15803d"
                        : "#64748b",
                    }}
                  >
                    Airport Pickup
                  </p>
                  <p
                    className="text-sm font-semibold flex items-center gap-2"
                    style={{
                      color: caseData.airport_pickup_required
                        ? "#166534"
                        : "#475569",
                    }}
                  >
                    {caseData.airport_pickup_required ? (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Arranged - We'll meet you at the airport
                      </>
                    ) : (
                      <>
                        <XCircle className="w-4 h-4" />
                        Not included
                      </>
                    )}
                  </p>
                </div>
              )}

              {caseData.arrival_notes && (
                <div className="pt-4 border-t border-slate-200">
                  <p className="text-xs text-slate-500 mb-2 font-medium">
                    Additional Notes
                  </p>
                  <p className="text-sm text-slate-700 italic p-3 bg-slate-50 rounded-lg border border-slate-200">
                    {caseData.arrival_notes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Checklist */}
      <div className="lg:col-span-1 space-y-6">
        {/* Integration Agency Selection Card - MOVED TO TOP */}
        {(caseData.status === "ready_for_arrival" ||
          caseData.status === "integration_assigned" ||
          caseData.status === "integration_in_progress" ||
          Boolean(caseData.integration_agency_id)) && (
          <div className="bg-linear-to-br from-blue-50 to-sky-50 rounded-xl p-5 border-2 border-blue-300 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="p-2 bg-blue-100 rounded-lg shrink-0">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                {caseData.integration_agency_id ? (
                  <>
                    <h3 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4" />
                      Integration Services Ready!
                    </h3>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Your integration agency has been assigned. Check the
                      Integration tab for details!
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-bold text-blue-900 mb-1 flex items-center gap-2">
                      <Users className="w-4 h-4" />
                      Next Step: Integration Services
                    </h3>
                    <p className="text-xs text-blue-800 leading-relaxed">
                      Select an agency to help with post-arrival services in{" "}
                      {caseData.destination_country}.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Button - Always visible but disabled when integration already chosen */}
            <button
              onClick={() => setShowIntegrationAgencyBrowser(true)}
              disabled={Boolean(caseData.integration_agency_id)}
              className={`w-full px-4 py-2.5 rounded-lg font-medium text-sm shadow-md transition-all flex items-center justify-center gap-2 ${
                caseData.integration_agency_id
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-blue-600 hover:bg-blue-700 text-white hover:shadow-lg"
              }`}
            >
              <Building2 className="w-4 h-4" />
              {caseData.integration_agency_id
                ? "Integration Agency Already Selected"
                : "Choose Integration Agency"}
            </button>
          </div>
        )}

        {/* Housing Checklist Card */}
        <div className="bg-green-50 rounded-2xl p-6 border border-green-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-3">
            Housing Checklist
          </h3>

          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="w-4 h-4 text-green-600" />
              <span className="text-slate-700 font-medium">
                Housing secured
              </span>
            </li>

            <li className="flex items-center gap-2 text-sm">
              {allUtilitiesConnected ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />
              )}
              <span
                className={
                  allUtilitiesConnected
                    ? "text-slate-700 font-medium"
                    : "text-slate-500"
                }
              >
                Utilities connected
              </span>
            </li>

            <li className="flex items-center gap-2 text-sm">
              {arrivalPlanned ? (
                <CheckCircle className="w-4 h-4 text-green-600" />
              ) : (
                <div className="w-4 h-4 border-2 border-slate-300 rounded-full" />
              )}
              <span
                className={
                  arrivalPlanned
                    ? "text-slate-700 font-medium"
                    : "text-slate-500"
                }
              >
                Arrival planned
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
