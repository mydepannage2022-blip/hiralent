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
  Mail,
  Phone,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/src/components/agency/ui/button";
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
  housing_agency_id?: string;
  housingAgency?: Agency;

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
      case "embassy_approved":
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
      case "embassy_approved":
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
  // Housing tab shows after visa is approved OR housing agency is assigned
  const visaApproved =
    caseData?.embassy_submission?.status?.toLowerCase() === "approved" ||
    caseData?.status?.toLowerCase() === "embassy_approved";
  const housingAgencyAssigned = Boolean(caseData?.housing_agency_id); // Check housing_agency_id
  const showHousingTab =
    visaApproved || housingAgencyAssigned || Boolean(caseData?.housing_address);

  const caseStatus = (caseData?.status || "").toLowerCase();

  const showIntegrationTab =
    caseStatus === "ready_for_arrival" ||
    caseStatus === "integration_assigned" ||
    caseStatus === "integration_in_progress" ||
    caseStatus === "integration_complete" ||
    caseStatus === "fully_integrated" ||
    caseStatus === "completed" ||
    Boolean(caseData?.integration_agency_id);

  const housingTabComplete =
    caseStatus === "ready_for_arrival" ||
    caseStatus === "integration_assigned" ||
    caseStatus === "integration_in_progress" ||
    caseStatus === "integration_complete" ||
    caseStatus === "fully_integrated" ||
    caseStatus === "completed";

  const integrationServicesComplete =
    Array.isArray(caseData?.integrationServices) &&
    caseData.integrationServices.length > 0 &&
    caseData.integrationServices.every(
      (service) => (service.status || "").toLowerCase() === "completed"
    );

  const integrationTabComplete =
    caseStatus === "integration_complete" ||
    caseStatus === "fully_integrated" ||
    caseStatus === "completed" ||
    integrationServicesComplete;

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
          <Button
            onClick={() => router.push("/candidate/dashboard/cases")}
            variant="soft"
          >
            Back to Cases
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="mb-6">
        <Button
          onClick={() => router.push("/candidate/dashboard/cases")}
          variant="outline"
          size="sm"
          className="mb-4 gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Cases
        </Button>

        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                {caseData.case_number}
              </h1>
              <p className="text-sm text-slate-600 capitalize">
                {caseData.service_type.replace(/_/g, " ")} Service
              </p>
            </div>

            <Button
              onClick={fetchCase}
              variant="outline"
              className="h-11 w-full justify-center gap-2 sm:w-auto"
              title="Refresh"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6 rounded-2xl border border-slate-200/70 bg-white p-4 shadow-sm">
        <div className="inline-flex w-full flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
          <button
            type="button"
            onClick={() => setActiveTab("overview")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "overview"
                ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Overview
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("visa")}
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "visa"
                ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                : "text-slate-700 hover:text-slate-900"
            }`}
          >
            Visa
            {visaApproved && (
              <CheckCircle className="w-4 h-4 text-green-600" />
            )}
          </button>

          {showHousingTab && (
            <button
              type="button"
              onClick={() => setActiveTab("housing")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "housing"
                  ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Housing
              {housingTabComplete && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
            </button>
          )}

          {showIntegrationTab && (
            <button
              type="button"
              onClick={() => setActiveTab("integration")}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                activeTab === "integration"
                  ? "border border-slate-200 bg-white text-slate-900 shadow-sm"
                  : "text-slate-700 hover:text-slate-900"
              }`}
            >
              Integration
              {integrationTabComplete && (
                <CheckCircle className="w-4 h-4 text-green-600" />
              )}
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
              setShowAgencyBrowser={setShowAgencyBrowser}
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
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xl"
            >
              <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-200 bg-white px-6 py-5">
                <h3 className="text-base font-semibold text-slate-900">
                  Upload Document
                </h3>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowUploadModal(false)}
                  disabled={uploading}
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="max-h-[calc(90vh-84px)] overflow-y-auto bg-slate-50/40 px-6 py-6">
                <form onSubmit={handleUpload} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Document Type *
                  </label>
                  <select
                    required
                    value={documentType}
                    onChange={(e) => setDocumentType(e.target.value)}
                    className="w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
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
                    className={
                      "relative flex w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-6 text-center shadow-sm transition-colors " +
                      (selectedFile
                        ? "border-emerald-300 bg-emerald-50/60"
                        : "border-slate-200/70 bg-white hover:bg-slate-50") +
                      (uploading ? " cursor-not-allowed opacity-60" : "")
                    }
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
                          <CheckCircle className="mx-auto mb-2 h-10 w-10 text-emerald-600" />
                          <p className="mb-1 text-sm font-semibold text-slate-900">
                            {selectedFile.name}
                          </p>
                          <p className="text-xs text-slate-600">
                            {formatFileSize(selectedFile.size)}
                          </p>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="mt-2"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setSelectedFile(null);
                            }}
                            disabled={uploading}
                          >
                            Choose different file
                          </Button>
                        </>
                      ) : (
                        <>
                          <Upload className="mx-auto mb-2 h-10 w-10 text-slate-400" />
                          <p className="mb-1 text-sm font-semibold text-slate-900">
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
                    className="w-full rounded-xl border border-slate-200/70 bg-white px-4 py-3 text-sm text-slate-900 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:bg-slate-100"
                    rows={3}
                    placeholder="Add any notes about this document..."
                    disabled={uploading}
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-slate-200">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowUploadModal(false)}
                    disabled={uploading}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="soft"
                    className="flex-1"
                    disabled={uploading || !selectedFile || !documentType}
                  >
                    {uploading ? (
                      <>
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        Upload
                      </>
                    )}
                  </Button>
                </div>
                </form>
              </div>
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCancelReplacement}
                  disabled={uploading}
                >
                  Cancel
                </Button>
                <Button
                  variant="warning"
                  className="flex-1"
                  onClick={handleConfirmReplacement}
                  disabled={uploading}
                >
                  {uploading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Processing...</span>
                    </>
                  ) : (
                    <span>Upload Anyway</span>
                  )}
                </Button>
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
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDocumentToDelete(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={handleDelete}
                >
                  Delete
                </Button>
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
  const caseStatus = (caseData.status || "").toLowerCase();

  const visaComplete =
    caseData.embassy_submission?.status?.toLowerCase() === "approved" ||
    caseStatus === "embassy_approved";

  const housingComplete =
    caseStatus === "ready_for_arrival" ||
    caseStatus === "integration_assigned" ||
    caseStatus === "integration_in_progress" ||
    caseStatus === "integration_complete" ||
    caseStatus === "fully_integrated" ||
    caseStatus === "completed";

  const integrationServicesComplete =
    Array.isArray(caseData.integrationServices) &&
    caseData.integrationServices.length > 0 &&
    caseData.integrationServices.every(
      (service) => (service.status || "").toLowerCase() === "completed"
    );

  const integrationComplete =
    caseStatus === "integration_complete" ||
    caseStatus === "fully_integrated" ||
    caseStatus === "completed" ||
    integrationServicesComplete;

  // Replace the housingInProgress check with:
  const housingInProgress =
    caseData.status === "housing_assigned" ||
    caseData.status === "housing_in_progress" ||
    Boolean(caseData.housing_address);

  const showIntegrationTab =
    caseStatus === "ready_for_arrival" ||
    caseStatus === "integration_assigned" ||
    caseStatus === "integration_in_progress" ||
    caseStatus === "integration_complete" ||
    caseStatus === "fully_integrated" ||
    caseStatus === "completed" ||
    Boolean(caseData.integration_agency_id);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Case Information Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <FileText className="h-4 w-4 text-blue-600" />
            Case Information
          </h2>
          <div className="mt-4 border-t border-slate-100" />

          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
                <MapPin className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Route</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {caseData.origin_country} to {caseData.destination_country}
                  {caseData.destination_city &&
                    ` (${caseData.destination_city})`}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
                <Calendar className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">Created</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(caseData.created_at)}
                </p>
              </div>
            </div>

            {caseData.estimated_completion && (
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 ring-1 ring-blue-100">
                  <Clock className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500">
                    Est. Completion
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(caseData.estimated_completion)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {caseData.notes && (
            <div className="mt-5 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <p className="text-xs font-medium text-slate-500">Notes</p>
              <p className="mt-1 text-sm text-slate-700">{caseData.notes}</p>
            </div>
          )}
        </div>

        {/* Progress Timeline */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-slate-900">
            Your Journey
          </h2>
          <div className="mt-4 border-t border-slate-100" />

          <div className="mt-4 space-y-4">
            {/* Visa Step */}
            <div
              className={`flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 border-l-4 ${
                visaComplete ? "border-l-blue-500" : "border-l-amber-500"
              }`}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                {visaComplete ? (
                  <CheckCircle className="h-6 w-6 text-green-600" />
                ) : (
                  <Clock className="h-6 w-6 text-amber-600" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-900">
                  Visa Processing
                </p>
                <p className="mt-1 text-sm text-slate-600">
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
                  <p className="mt-2 text-xs text-slate-500">
                    Decided on{" "}
                    {formatDate(caseData.embassy_submission.decision_date)}
                  </p>
                )}
              </div>
            </div>

            {/* Housing Step - Conditional */}
            {showHousingTab && (
              <div
                className={`flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 border-l-4 ${
                  housingComplete
                    ? "border-l-green-500"
                    : housingInProgress
                    ? "border-l-amber-500"
                    : "border-l-slate-300"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                  {housingComplete ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : housingInProgress ? (
                    <Clock className="h-6 w-6 text-amber-600" />
                  ) : (
                    <Home className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p
                    className="text-sm font-semibold text-slate-900"
                  >
                    Housing Arrangement
                  </p>
                  <p className="mt-1 text-sm text-slate-600">
                    {housingComplete
                      ? "All set - Your housing is ready for arrival"
                      : housingInProgress
                      ? "Housing being arranged by agency"
                      : visaComplete
                      ? "Choose a housing agency to start arranging your accommodation"
                      : "Waiting for visa approval"}
                  </p>
                </div>
              </div>
            )}

            {/* ADD INTEGRATION STEP HERE */}
            {showIntegrationTab && (
              <div
                className={`flex items-start gap-4 rounded-2xl border border-slate-200/70 bg-white p-4 border-l-4 ${
                  integrationComplete
                    ? "border-l-blue-500"
                    : caseData.integration_agency_id
                    ? "border-l-amber-500"
                    : "border-l-slate-300"
                }`}
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                  {integrationComplete ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : caseData.integration_agency_id ? (
                    <Clock className="h-6 w-6 text-amber-600" />
                  ) : (
                    <Users className="h-6 w-6 text-slate-400" />
                  )}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-slate-900">
                    Integration Services
                  </p>
                  {(() => {
                    const subtitle =
                      integrationComplete
                        ? "All set - Fully integrated and settled"
                        : caseData.integration_agency_id
                        ? "Integration services in progress"
                        : caseStatus === "ready_for_arrival"
                        ? "Choose an integration agency to get started"
                        : null;

                    return subtitle ? (
                      <p className="mt-1 text-sm text-slate-600">{subtitle}</p>
                    ) : null;
                  })()}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Right Column */}
      <div className="lg:col-span-1 space-y-6">
        {/* Status Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Status</h3>
          <div className="mt-4 border-t border-slate-100" />
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-slate-500">Current Status</p>
              <span
                className={`mt-2 inline-flex items-center rounded-full border border-slate-200/70 px-3 py-1 text-xs font-semibold ${getStatusColor(
                  caseData.status
                )}`}
              >
                {caseData.status.replace(/_/g, " ")}
              </span>
            </div>
            <div className="pt-3 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500">Priority</p>
              <span className="mt-1 block text-sm font-semibold text-slate-900 capitalize">
                {caseData.priority_level}
              </span>
            </div>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Progress</h3>
          <div className="mt-4 border-t border-slate-100" />
          <div className="mt-4 space-y-3">
            <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white p-3">
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
              <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white p-3">
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
            {/* ✅ ADD INTEGRATION HERE */}
            {showIntegrationTab && (
              <div className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-white p-3">
                <span className="text-sm font-medium text-slate-700">
                  Integration
                </span>
                <span
                  className={`text-sm font-bold ${
                    integrationComplete
                      ? "text-green-600"
                      : caseData.integration_agency_id
                      ? "text-yellow-600"
                      : "text-slate-400"
                  }`}
                >
                  {integrationComplete
                    ? "Complete"
                    : caseData.integration_agency_id
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
  const visaApproved =
    caseData.embassy_submission?.status?.toLowerCase() === "approved" ||
    caseData.embassy_submission?.status?.toLowerCase() === "embassy_approved" ||
    caseData.status?.toLowerCase() === "embassy_approved";

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Documents Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <FileText className="h-4 w-4 text-blue-600" />
              Documents
            </h2>
            <Button
              type="button"
              onClick={() => setShowUploadModal(true)}
              variant="soft"
              className="w-full justify-center gap-2 sm:w-auto"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Button>
          </div>

          <div className="mt-4 border-t border-slate-100" />

          {caseData.documents.length === 0 ? (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-10 text-center">
              <FileText className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                No documents uploaded yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Use “Upload” to add files for review.
              </p>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              {caseData.documents.map((doc) => (
                <div
                  key={doc.document_id}
                  className="flex flex-col gap-3 rounded-2xl border border-slate-200/70 bg-white p-4 transition-colors hover:bg-slate-50/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                      <FileText className="h-5 w-5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-900 truncate">
                        {doc.file_name}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-slate-600">
                          {doc.document_type.replace(/_/g, " ")}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600">
                          {formatFileSize(doc.file_size)}
                        </span>
                        <span className="text-xs text-slate-400">•</span>
                        <span className="text-xs text-slate-600">
                          {formatDate(doc.created_at)}
                        </span>
                      </div>
                      {doc.review_feedback && (
                        <p className="mt-2 text-xs font-medium text-orange-700">
                          Agency feedback: {doc.review_feedback}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold border ${
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
                          {doc.status.replace(/_/g, " ")}
                        </>
                      )}
                    </span>

                    <a
                      href={doc.file_path}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-blue-200 hover:bg-blue-50"
                      title="View/Download"
                    >
                      <Eye className="w-4 h-4 text-slate-600" />
                    </a>

                    {doc.status === "pending" && (
                      <button
                        type="button"
                        onClick={() => {
                          setDocumentToDelete(doc.document_id);
                          setShowDeleteModal(true);
                        }}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition-colors hover:border-red-200 hover:bg-red-50"
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
        {/* Embassy Status */}
        {caseData.embassy_submission && (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Building2 className="h-4 w-4 text-blue-600" />
              Embassy Status
            </h3>
            <div className="mt-4 border-t border-slate-100" />

            <div className="mt-4 space-y-3">
              <div>
                <p className="text-xs font-medium text-slate-500">Current Status</p>
                <span
                  className={`mt-2 inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${getStatusColor(
                    caseData.embassy_submission.status
                  )}`}
                >
                  {getStatusIcon(caseData.embassy_submission.status)}
                  {caseData.embassy_submission.status.replace(/_/g, " ")}
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
                <div className="mt-4 rounded-2xl border border-orange-200/70 bg-orange-50 p-4">
                  <h3 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-orange-200/70 bg-white">
                      <Calendar className="w-4 h-4 text-orange-700" />
                    </span>
                    Interview scheduled
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500 mb-1">Date & Time</p>
                      <p className="text-sm font-medium text-slate-900">
                        {new Date(
                          caseData.embassy_submission.interview_date
                        ).toLocaleString("en-US", {
                          weekday: "long",
                          year: "numeric",
                          month: "long",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>

                    {caseData.embassy_submission.interview_location && (
                      <div>
                        <p className="text-xs text-slate-500 mb-1">Location</p>
                        <p className="text-sm font-medium text-slate-900">
                          {caseData.embassy_submission.interview_location}
                        </p>
                      </div>
                    )}
                  </div>

                  {caseData.embassy_submission.interview_notes && (
                    <div className="mt-3">
                      <p className="text-xs text-slate-500 mb-1">Notes</p>
                      <p className="text-sm text-slate-700">
                        {caseData.embassy_submission.interview_notes}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Decision */}
              {caseData.embassy_submission.decision_date && (
                <div
                  className={`mt-4 rounded-2xl border p-4 ${
                    caseData.embassy_submission.status?.toLowerCase() ===
                      "approved" ||
                    caseData.embassy_submission.status?.toLowerCase() ===
                      "embassy_approved"
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {caseData.embassy_submission.status?.toLowerCase() ===
                      "approved" ||
                    caseData.embassy_submission.status?.toLowerCase() ===
                      "embassy_approved" ? (
                      <CheckCircle className="w-5 h-5 text-green-600 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-600 mt-0.5" />
                    )}
                    <div className="flex-1">
                      <p
                        className={`text-xs font-bold mb-2 flex items-center gap-1 ${
                          caseData.embassy_submission.status?.toLowerCase() ===
                            "approved" ||
                          caseData.embassy_submission.status?.toLowerCase() ===
                            "embassy_approved"
                            ? "text-green-900"
                            : "text-red-900"
                        }`}
                      >
                        {caseData.embassy_submission.status?.toLowerCase() ===
                          "approved" ||
                        caseData.embassy_submission.status?.toLowerCase() ===
                          "embassy_approved" ? (
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

      {/* Right Column */}
      <div className="lg:col-span-1 space-y-6">
        {/* Visa Approved - Housing Agency Selection */}
        {visaApproved && (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <div className="flex items-start gap-3 mb-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 ring-1 ring-green-200">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div className="flex-1">
                {caseData.status === "ready_for_arrival" ? (
                  <>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                      <Home className="h-4 w-4 text-green-600" />
                      Housing Complete!
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Your housing is all set and ready. Check the Housing tab
                      for full details!
                    </p>
                  </>
                ) : caseData.status === "housing_assigned" ||
                  caseData.status === "housing_in_progress" ||
                  caseData.status === "housing_complete" ? (
                  <>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                      <Home className="h-4 w-4 text-green-600" />
                      Housing Agency Working
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Housing arrangements are in progress. Check the Housing tab
                      for updates.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-sm font-semibold text-slate-900 mb-1 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Visa Approved!
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Select a housing agency to help you find accommodation in{" "}
                      {caseData.destination_country}.
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Button - Always visible but disabled when housing already chosen */}
            <Button
              type="button"
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
              variant="soft"
              className="w-full justify-center gap-2"
            >
              <Building2 className="h-4 w-4" />
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
            </Button>
          </div>
        )}

        {/* VISA AGENCY CARD */}
        {caseData.agency && (
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Building2 className="h-4 w-4 text-blue-600" />
              Your Visa Agency
            </h2>
            <div className="mt-4 border-t border-slate-100" />
            <div className="space-y-3">
              <div className="mt-4 rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <p className="text-xs font-medium text-slate-500">Agency Name</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {caseData.agency.name}
                </p>
              </div>
              {caseData.agency.email && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3">
                  <Mail className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">
                      Contact Email
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {caseData.agency.email}
                    </p>
                  </div>
                </div>
              )}
              {caseData.agency.phone && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3">
                  <Phone className="w-4 h-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs text-slate-500 mb-0.5">
                      Phone Number
                    </p>
                    <p className="text-sm font-medium text-slate-900">
                      {caseData.agency.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Required Documents Checklist */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Required Documents</h3>
          <div className="mt-4 border-t border-slate-100" />
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
                  className="mt-3 flex items-center gap-2 text-sm"
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
  setShowAgencyBrowser,
  setShowIntegrationAgencyBrowser,
}: {
  caseData: Case;
  formatDate: (date: string) => string;
  setShowAgencyBrowser: (show: boolean) => void;
  setShowIntegrationAgencyBrowser: (show: boolean) => void;
}) {
  const housingAgencyAssigned = Boolean(
    caseData.housing_agency_id || caseData.housingAgency
  );
  const hasHousingBasics = Boolean(
    caseData.housing_address &&
      caseData.housing_type &&
      caseData.monthly_rent_mad !== null &&
      caseData.monthly_rent_mad !== undefined &&
      `${caseData.monthly_rent_mad}`.trim() !== ""
  );
  const requiresMoveInDate = caseData.housing_type !== "temporary";
  const hasMoveInDate = Boolean(caseData.lease_start_date);
  const hasHousingDetails = hasHousingBasics && (!requiresMoveInDate || hasMoveInDate);

  if (!housingAgencyAssigned) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <Building2 className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Choose a Housing Agency
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          Select a housing agency to start your accommodation arrangements. Once
          selected, you’ll see progress and details here.
        </p>

        <div className="mt-6 flex justify-center">
          <Button
            type="button"
            variant="soft"
            className="justify-center gap-2"
            onClick={() => setShowAgencyBrowser(true)}
          >
            <Building2 className="h-4 w-4" />
            Choose Housing Agency
          </Button>
        </div>
      </div>
    );
  }

  if (!hasHousingDetails) {
    return (
      <div className="rounded-2xl border border-slate-200/70 bg-white p-10 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
          <Home className="h-6 w-6 text-blue-600" />
        </div>
        <h3 className="text-base font-semibold text-slate-900">
          Housing in progress
        </h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-600">
          {caseData.housingAgency?.name
            ? `${caseData.housingAgency.name} is preparing your housing details.`
            : "Your housing agency is preparing your housing details."}
        </p>
        <p className="mx-auto mt-2 max-w-xl text-sm text-slate-500">
          This tab updates once your address, housing type, and monthly rent are confirmed.
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
        color: "border-emerald-200/70 bg-emerald-50 text-emerald-800",
        icon: <CheckCircle className="w-4 h-4" />,
      };
    } else if (status === "in_progress") {
      return {
        label: "In Progress",
        color: "border-amber-200/70 bg-amber-50 text-amber-800",
        icon: <Clock className="w-4 h-4" />,
      };
    } else {
      return {
        label: "Pending",
        color: "border-slate-200 bg-slate-50 text-slate-700",
        icon: <Clock className="w-4 h-4" />,
      };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="lg:col-span-2 space-y-6">
        {/* Housing Details Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Home className="h-4 w-4 text-blue-600" />
            Housing Details
          </h2>
          <div className="mt-4 border-t border-slate-100" />

          <div className="mt-4 space-y-4">
            <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
              <p className="text-xs font-medium text-slate-500">Address</p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {caseData.housing_address}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {caseData.housing_type && (
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Housing Type
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900 capitalize">
                    {caseData.housing_type.replace("_", " ")}
                  </p>
                </div>
              )}

              {caseData.monthly_rent_mad && (
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Monthly Rent
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {caseData.monthly_rent_mad} MAD
                  </p>
                </div>
              )}

              {caseData.lease_start_date && (
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Move-in Date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(caseData.lease_start_date)}
                  </p>
                </div>
              )}

              {caseData.lease_end_date && (
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Lease End Date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {formatDate(caseData.lease_end_date)}
                  </p>
                </div>
              )}
            </div>

            {caseData.agency_fee_amount && (
              <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-medium text-slate-600">
                    Agency Fee
                  </p>
                  <p className="text-sm font-semibold text-slate-900">
                    {caseData.agency_fee_amount} MAD
                  </p>
                </div>
              </div>
            )}

            {caseData.housing_contract_url && (
              <div className="pt-1">
                <Button asChild variant="soft" className="w-full justify-center gap-2">
                  <a
                    href={caseData.housing_contract_url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Download Lease Contract
                  </a>
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Utilities Status Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Zap className="h-4 w-4 text-blue-600" />
            Utilities
          </h2>
          <div className="mt-4 border-t border-slate-100" />

          <div className="mt-4 space-y-3">
            {[
              {
                key: "utility_water" as const,
                label: "Water",
                Icon: Droplets,
                value: caseData.utility_water,
              },
              {
                key: "utility_electricity" as const,
                label: "Electricity",
                Icon: Zap,
                value: caseData.utility_electricity,
              },
              {
                key: "utility_internet" as const,
                label: "Internet",
                Icon: Wifi,
                value: caseData.utility_internet,
              },
            ].map(({ key, label, Icon, value }) => {
              const status = getUtilityStatus(value);
              return (
                <div
                  key={key}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/70 bg-white p-4"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 ring-1 ring-slate-200">
                      <Icon className="h-5 w-5 text-slate-600" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900">
                      {label}
                    </span>
                  </div>

                  <span
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-semibold ${status.color}`}
                  >
                    {status.icon}
                    {status.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Arrival Details Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Plane className="h-4 w-4 text-blue-600" />
            Arrival
          </h2>
          <div className="mt-4 border-t border-slate-100" />

          {caseData.arrival_date ||
          caseData.flight_number ||
          caseData.arrival_notes ||
          typeof caseData.airport_pickup_required === "boolean" ? (
            <div className="mt-4 space-y-3">
              {caseData.arrival_date && (
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Arrival Date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
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
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Flight Number
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {caseData.flight_number}
                  </p>
                </div>
              )}

              {typeof caseData.airport_pickup_required === "boolean" && (
                <div className="rounded-2xl border border-slate-200/70 bg-white p-4">
                  <p className="text-xs font-medium text-slate-500">
                    Airport Pickup
                  </p>
                  <p className="mt-2 inline-flex items-center gap-2 text-sm font-semibold text-slate-900">
                    {caseData.airport_pickup_required ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-emerald-600" />
                        Arranged
                      </>
                    ) : (
                      <>
                        <XCircle className="h-4 w-4 text-slate-400" />
                        Not included
                      </>
                    )}
                  </p>
                </div>
              )}

              {caseData.arrival_notes && (
                <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                  <p className="text-xs font-medium text-slate-500">Notes</p>
                  <p className="mt-1 text-sm text-slate-700">
                    {caseData.arrival_notes}
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-8 text-center">
              <Plane className="mx-auto mb-3 h-10 w-10 text-slate-300" />
              <p className="text-sm font-medium text-slate-700">
                Arrival details not shared yet
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Your housing agency will add your flight/date and pickup info when available.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Checklist */}
      <div className="lg:col-span-1 space-y-6">
        {/* Integration Agency Selection Card - MOVED TO TOP */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Users className="h-4 w-4 text-blue-600" />
            Integration Services
          </h3>
          <div className="mt-4 border-t border-slate-100" />

          {(() => {
            const integrationChosen = Boolean(caseData.integration_agency_id);
            const integrationEligible = caseData.status === "ready_for_arrival";

            const message = integrationChosen
              ? "Your integration agency has been assigned. Check the Integration tab for details."
              : integrationEligible
                ? `Select an agency to help with post-arrival services in ${caseData.destination_country}.`
                : "Integration becomes available after your housing is ready for arrival.";

            return (
              <div className="mt-4 space-y-4">
                <p className="text-sm text-slate-600">{message}</p>

                <Button
                  type="button"
                  onClick={() => setShowIntegrationAgencyBrowser(true)}
                  disabled={integrationChosen || !integrationEligible}
                  variant="soft"
                  className="w-full justify-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  {integrationChosen
                    ? "Integration Agency Already Selected"
                    : "Choose Integration Agency"}
                </Button>

                {!integrationEligible && !integrationChosen && (
                  <p className="text-xs text-slate-500">
                    Tip: once arrival readiness is confirmed, you can select an integration agency here.
                  </p>
                )}
              </div>
            );
          })()}
        </div>

        {/* Housing agency info */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <Building2 className="h-4 w-4 text-blue-600" />
            Housing Agency
          </h3>
          <div className="mt-4 border-t border-slate-100" />

          {caseData.housingAgency ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl border border-slate-200/70 bg-slate-50/60 p-4">
                <p className="text-xs font-medium text-slate-500">Agency Name</p>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {caseData.housingAgency.name}
                </p>
              </div>

              {caseData.housingAgency.email && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3">
                  <Mail className="h-4 w-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500">Email</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {caseData.housingAgency.email}
                    </p>
                  </div>
                </div>
              )}

              {caseData.housingAgency.phone && (
                <div className="flex items-center gap-3 rounded-2xl border border-slate-200/70 bg-white p-3">
                  <Phone className="h-4 w-4 text-slate-500" />
                  <div className="flex-1">
                    <p className="text-xs font-medium text-slate-500">Phone</p>
                    <p className="mt-0.5 text-sm font-medium text-slate-900">
                      {caseData.housingAgency.phone}
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <p className="text-sm text-slate-600">
                Housing agency information isn’t available yet.
              </p>
              <Button
                type="button"
                variant="soft"
                className="w-full justify-center gap-2"
                onClick={() => setShowAgencyBrowser(true)}
              >
                <Building2 className="h-4 w-4" />
                View housing agency
              </Button>
            </div>
          )}
        </div>

        {/* Housing Checklist Card */}
        <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-sm">
          <h3 className="text-base font-semibold text-slate-900">Checklist</h3>
          <div className="mt-4 border-t border-slate-100" />

          <ul className="mt-4 space-y-3">
            <li className="flex items-center gap-2 text-sm">
              <CheckCircle className="h-4 w-4 text-emerald-600" />
              <span className="font-medium text-slate-700">Housing details shared</span>
            </li>

            <li className="flex items-center gap-2 text-sm">
              {allUtilitiesConnected ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
              )}
              <span className={allUtilitiesConnected ? "font-medium text-slate-700" : "text-slate-500"}>
                Utilities connected
              </span>
            </li>

            <li className="flex items-center gap-2 text-sm">
              {arrivalPlanned ? (
                <CheckCircle className="h-4 w-4 text-emerald-600" />
              ) : (
                <div className="h-4 w-4 rounded-full border-2 border-slate-300" />
              )}
              <span className={arrivalPlanned ? "font-medium text-slate-700" : "text-slate-500"}>
                Arrival planned
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
