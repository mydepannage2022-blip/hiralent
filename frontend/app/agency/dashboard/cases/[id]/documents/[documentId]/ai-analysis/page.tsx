"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useAuth } from "@/src/context/AuthContext";
import {
  ArrowLeft,
  Brain,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  Calendar,
  FileText,
} from "lucide-react";
import toast from "react-hot-toast";

interface ValidationSignal {
  signal_type: string;
  passed: boolean;
  score: number;
  details: string;
}

interface ValidationIssue {
  type: string;
  severity: "warning" | "error";
  message: string;
}

interface DocumentData {
  document_id: string;
  document_type: string;
  file_name: string;
  ai_confidence_score?: number | null;
  ai_validation_status?: "valid" | "invalid" | "needs_review" | null;
  ai_extracted_data?: Record<string, any> | null;
  ai_validation_signals?: ValidationSignal[] | null;
  ai_validation_issues?: ValidationIssue[] | null;
  ai_validated_at?: string | null;
}

// Helper to format field labels
function formatLabel(key: string): string {
  return key
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Helper to format values
function formatValue(value: any): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default function AIAnalysisPage() {
  const router = useRouter();
  const params = useParams();
  const { token } = useAuth();
  const [document, setDocument] = useState<DocumentData | null>(null);
  const [loading, setLoading] = useState(true);

  const caseId = params?.id as string;
  const documentId = params?.documentId as string;

  useEffect(() => {
    if (documentId && token) {
      fetchDocumentData();
    }
  }, [documentId, token]);

  const fetchDocumentData = async () => {
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_BASE_URL}/agency/cases/${caseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to fetch case data");
      }

      const data = await res.json();
      const doc = data.data.documents.find(
        (d: any) => d.document_id === documentId
      );

      if (!doc) throw new Error("Document not found");

      setDocument(doc);
    } catch (error: any) {
      console.error("Fetch document error:", error);
      toast.error(error.message || "Failed to load document");
      router.back();
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Brain className="w-12 h-12 text-indigo-600 animate-pulse mx-auto mb-4" />
          <p className="text-slate-600">Loading AI analysis...</p>
        </div>
      </div>
    );
  }

  if (!document) {
    return null;
  }

  const passedCount =
    document.ai_validation_signals?.filter((s) => s.passed).length || 0;
  const totalChecks = document.ai_validation_signals?.length || 0;
  const overallPassed = passedCount === totalChecks && totalChecks > 0;
  const hasIssues =
    document.ai_validation_issues && document.ai_validation_issues.length > 0;

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-slate-600 hover:text-slate-900 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="text-sm font-medium">Back to case</span>
          </button>

          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-indigo-100 rounded-xl">
                  <Brain className="w-8 h-8 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900 mb-1">
                    AI Document Analysis
                  </h1>
                  <p className="text-sm text-slate-600 mb-2">
                    {formatLabel(document.document_type)} • {document.file_name}
                  </p>
                  {document.ai_validated_at && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      Analyzed {new Date(document.ai_validated_at).toLocaleString()}
                    </div>
                  )}
                </div>
              </div>

              {document.ai_confidence_score !== null && document.ai_confidence_score !== undefined && (
                <div className="text-right">
                  <div className="text-3xl font-bold text-slate-900">
                    {Math.round(document.ai_confidence_score * 100)}%
                  </div>
                  <div className="text-xs text-slate-500 uppercase tracking-wider">
                    Confidence
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Overall Status */}
        {hasIssues && document.ai_validation_issues ? (
          <div className="bg-red-50 border-l-4 border-red-500 rounded-r-xl p-5 mb-6 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-bold text-red-900 mb-2">
                  {document.ai_validation_issues.length} Issue
                  {document.ai_validation_issues.length !== 1 ? "s" : ""} Detected
                </h3>
                <ul className="space-y-2">
                  {document.ai_validation_issues.map((issue, i) => (
                    <li key={i} className="text-sm text-red-800 flex items-start gap-2">
                      <span className="text-red-500 mt-1">•</span>
                      <span>{issue.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ) : overallPassed ? (
          <div className="bg-green-50 border-l-4 border-green-500 rounded-r-xl p-5 mb-6 shadow-sm">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-600" />
              <div>
                <h3 className="text-lg font-bold text-green-900">
                  All Validation Checks Passed
                </h3>
                <p className="text-sm text-green-700 mt-1">
                  Document appears to be valid and complete
                </p>
              </div>
            </div>
          </div>
        ) : null}

        {/* Validation Checks */}
        {document.ai_validation_signals && document.ai_validation_signals.length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-slate-900">Validation Checks</h2>
              <span className="text-sm font-semibold text-slate-600">
                {passedCount}/{totalChecks} passed
              </span>
            </div>
            <div className="space-y-3">
              {document.ai_validation_signals.map((signal, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-3 p-4 rounded-lg border ${
                    signal.passed
                      ? "bg-green-50 border-green-200"
                      : "bg-red-50 border-red-200"
                  }`}
                >
                  {signal.passed ? (
                    <CheckCircle className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        signal.passed ? "text-green-900" : "text-red-900"
                      }`}
                    >
                      {signal.details}
                    </p>
                    {signal.score > 0 && signal.score < 1 && (
                      <p className="text-xs text-slate-500 mt-1">
                        Confidence: {Math.round(signal.score * 100)}%
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Extracted Data */}
        {document.ai_extracted_data && Object.keys(document.ai_extracted_data).length > 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Info className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-bold text-slate-900">Extracted Information</h2>
            </div>
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(document.ai_extracted_data)
                .filter(([_, value]) => value !== null && value !== undefined)
                .map(([key, value]) => (
                  <div
                    key={key}
                    className="bg-slate-50 rounded-lg p-4 border border-slate-200"
                  >
                    <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                      {formatLabel(key)}
                    </dt>
                    <dd className="text-sm font-bold text-slate-900 wrap-break-word">
                      {formatValue(value)}
                    </dd>
                  </div>
                ))}
            </dl>
          </div>
        )}
      </div>
    </div>
  );
}
