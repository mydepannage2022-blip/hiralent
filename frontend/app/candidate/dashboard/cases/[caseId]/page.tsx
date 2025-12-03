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
  file_path: string;
  file_type: string;
  file_size: number;
  status: string;
  notes?: string;
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

  const documentTypes = [
    { value: "passport", label: "Passport Copy" },
    { value: "visa_application", label: "Visa Application Form" },
    { value: "bank_statement", label: "Bank Statement" },
    { value: "employment_letter", label: "Employment Letter" },
    { value: "proof_of_accommodation", label: "Proof of Accommodation" },
    { value: "other", label: "Other Document" },
  ];

  const fetchCase = async () => {
    try {
      setLoading(true);

      console.log("🔍 Fetching case:", caseId);
      console.log(
        "🔍 API URL:",
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases/${caseId}`
      );

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases/${caseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      console.log("📡 Response status:", response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error("❌ API Error:", errorData);
        throw new Error(errorData.message || "Failed to fetch case");
      }

      const data = await response.json();
      console.log("✅ Case data:", data);
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

      console.log(
        "📤 Uploading to:",
        `${process.env.NEXT_PUBLIC_BASE_URL}/candidates/cases/${caseId}/documents`
      );

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
      default:
        return "bg-gray-100 text-gray-700 border-gray-200";
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
                className="flex items-center gap-2 px-5 py-2.5 bg-linear-to-r from-blue-600 to-blue-500 text-white rounded-xl hover:from-blue-700 hover:to-blue-600 transition-all shadow-lg shadow-blue-500/30 font-medium"
              >
                <Upload className="w-4 h-4" />
                <span>Upload Document</span>
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
                    className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors"
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
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium border ${getStatusColor(
                          doc.status
                        )}`}
                      >
                        {doc.status}
                      </span>
                      <a
                        href={doc.file_path}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 hover:bg-slate-200 rounded-lg transition-colors"
                        title="Download"
                      >
                        <Download className="w-4 h-4 text-slate-600" />
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
              {documentTypes.map((type) => {
                const hasDoc = caseData.documents.some(
                  (d) => d.document_type === type.value
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
        </div>
      </div>

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
                    {documentTypes.map((type) => (
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
    </div>
  );
}
