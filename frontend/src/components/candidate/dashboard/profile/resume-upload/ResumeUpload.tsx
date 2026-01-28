// src/components/candidate/dashboard/profile/resume-upload/ResumeUpload.tsx

"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import Button from "@/src/components/layout/Button";
import { DropZone } from "./DropZone";
import {
  FileText,
  CheckCircle,
  AlertCircle,
  Loader,
  Download,
  Sparkles,
  UploadCloud,
  ShieldCheck,
} from "lucide-react";
import { useUploadApplicationResume } from "@/src/lib/profile/profile.queries";
import { useProfile } from "@/src/context/ProfileContext";
import AutofillPreviewModal from "../AutofillPreviewModal"; // ✅ IMPORT MODAL

interface ResumeUploadProps {
  className?: string;
  onAutofillApplied?: () => Promise<void> | void;
}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({
  className = "",
  onAutofillApplied,
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showUploadForm, setShowUploadForm] = useState(false);

  // ✅ MODAL STATE
  const [showAutofillModal, setShowAutofillModal] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);

  const uploadMutation = useUploadApplicationResume();
  const { profileData } = useProfile() as any;

  const rawResumeUrl = profileData?.resume_application_url as string | undefined;

  const existingResumeUrl = useMemo(() => {
    if (!rawResumeUrl) return null;
    if (rawResumeUrl.startsWith("http://") || rawResumeUrl.startsWith("https://")) {
      return rawResumeUrl;
    }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
    return `${apiUrl}${rawResumeUrl.startsWith("/") ? "" : "/"}${rawResumeUrl}`;
  }, [rawResumeUrl]);

  const existingFileName = useMemo(() => {
    if (!existingResumeUrl) return null;
    try {
      const pathname = new URL(existingResumeUrl).pathname;
      const name = pathname.split("/").pop() || "Resume";
      return decodeURIComponent(name);
    } catch {
      const name = existingResumeUrl.split("/").pop() || "Resume";
      return decodeURIComponent(name);
    }
  }, [existingResumeUrl]);

  const handleFileSelect = (file: File) => {
    setSelectedFile(file);
    setUploadProgress(0);
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadProgress(0);
  };

  const cancelUpload = () => {
    setSelectedFile(null);
    setUploadProgress(0);
    setShowUploadForm(false);
  };

  // ✅ FIXED handleUpload with modal trigger
  const handleUpload = async () => {
    if (!selectedFile) return;

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 10));
    }, 200);

    try {
      const response = await uploadMutation.mutateAsync(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log("📥 Upload response:", response);

      const documentId = response?.data?.document_id;
      console.log("🔑 Document ID:", documentId);

      if (documentId) {
        console.log("✨ Opening autofill modal");
        setUploadedDocumentId(documentId);
        setShowAutofillModal(true);
      } else {
        console.warn("⚠️ No document_id in response");
      }

      setTimeout(() => {
        setSelectedFile(null);
        setShowUploadForm(false);
        setUploadProgress(0);
      }, 800);
    } catch (error) {
      console.error("❌ Upload error:", error);
      clearInterval(progressInterval);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getStatusIcon = () => {
    if (uploadMutation.isPending) return <Loader className="h-5 w-5 text-blue-600 animate-spin" />;
    if (uploadMutation.isSuccess) return <CheckCircle className="h-5 w-5 text-emerald-600" />;
    if (uploadMutation.isError) return <AlertCircle className="h-5 w-5 text-rose-600" />;
    return null;
  };

  const getStatusMessage = () => {
    if (uploadMutation.isPending) return "Uploading resume...";
    if (uploadMutation.isSuccess) return "Resume uploaded successfully!";
    if (uploadMutation.isError) return "Upload failed. Please try again.";
    return "";
  };

  const getStatusColor = () => {
    if (uploadMutation.isPending) return "text-blue-700";
    if (uploadMutation.isSuccess) return "text-emerald-700";
    if (uploadMutation.isError) return "text-rose-700";
    return "";
  };

  const subtleCardRing =
    "relative overflow-hidden border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] rounded-xl";
  const topGlow =
    "pointer-events-none absolute -top-24 left-1/2 h-40 w-96 -translate-x-1/2 rounded-full bg-gradient-to-r from-indigo-100/60 via-sky-100/40 to-fuchsia-100/50 blur-3xl";

  return (
    <>
      {/* ✅ keep width EXACTLY the same */}
      <Card className={`w-full max-w-sm ${subtleCardRing} ${className}`}>
        <div className={topGlow} />

        <CardHeader className="text-center pb-4 relative">
          {/* Badge line */}
          <div className="mx-auto mb-3 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/70 px-3 py-1 text-xs text-slate-700 shadow-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            ATS-friendly • PDF/DOCX
          </div>

          <CardTitle className="text-lg font-semibold text-slate-900">
            Upload your resume
          </CardTitle>
          <p className="text-sm text-slate-600 mt-1">
            Upload resume for job applications.
          </p>
        </CardHeader>

        <CardContent className="space-y-4 relative">
          {/* Existing Resume */}
          {existingResumeUrl && !showUploadForm && (
            <div className="space-y-4">
              <div className="group flex items-center gap-3 p-3 rounded-xl border border-emerald-200/70 bg-gradient-to-r from-emerald-50 to-white">
                <div className="h-10 w-10 rounded-xl border border-emerald-200 bg-white flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-emerald-700" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {existingFileName}
                  </p>
                  <p className="text-xs text-emerald-700">Current application resume</p>
                </div>

                <a
                  href={existingResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-lg border border-emerald-200 bg-white hover:bg-emerald-50 transition-colors"
                  title="Download resume"
                >
                  <Download className="h-4 w-4 text-emerald-700" />
                </a>
              </div>

              <Button
                text="Upload new resume"
                onClick={() => setShowUploadForm(true)}
                variant="dark"
                className="w-full"
              />

              {/* small hint */}
              <div className="flex items-start gap-2 text-xs text-slate-600">
                <Sparkles className="h-4 w-4 text-violet-600 mt-0.5" />
                <span>
                  After upload, you’ll get an <span className="font-semibold">AI autofill preview</span>.
                </span>
              </div>
            </div>
          )}

          {/* Drop Zone */}
          {(!existingResumeUrl || showUploadForm) && !selectedFile && (
            <div className="space-y-4">
              {/* fancy helper above dropzone without changing width */}
              <div className="rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white p-3">
                <div className="flex items-center gap-2">
                  <div className="h-9 w-9 rounded-xl border border-slate-200 bg-white flex items-center justify-center">
                    <UploadCloud className="h-4 w-4 text-slate-700" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">
                      Drop it here
                    </p>
                    <p className="text-xs text-slate-600">
                      PDF/DOC/DOCX • Up to 10MB
                    </p>
                  </div>
                </div>
              </div>

              <DropZone
                onFileSelect={handleFileSelect}
                acceptedTypes={[".pdf", ".doc", ".docx"]}
                maxSizeMB={10}
              />

              {existingResumeUrl && showUploadForm && (
                <Button
                  text="Cancel"
                  onClick={cancelUpload}
                  variant="outline"
                  className="w-full"
                />
              )}
            </div>
          )}

          {/* Selected File */}
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white">
                <div className="h-10 w-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center shrink-0">
                  <FileText className="h-5 w-5 text-blue-700" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-600">{formatFileSize(selectedFile.size)}</p>
                </div>

                {!uploadMutation.isPending && (
                  <button
                    onClick={removeSelectedFile}
                    className="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    title="Remove file"
                  >
                    <span className="sr-only">Remove file</span>
                    ✕
                  </button>
                )}
              </div>

              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Uploading...</span>
                    <span className="text-slate-900 font-semibold tabular-nums">
                      {uploadProgress}%
                    </span>
                  </div>

                  {/* upgraded progress bar */}
                  <div className="w-full rounded-full border border-slate-200 bg-white p-1">
                    <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {(uploadMutation.isPending || uploadMutation.isSuccess || uploadMutation.isError) && (
                <div className="flex items-center gap-2 text-sm">
                  {getStatusIcon()}
                  <span className={getStatusColor()}>{getStatusMessage()}</span>
                </div>
              )}

              {!uploadMutation.isSuccess && (
                <Button
                  text={uploadMutation.isPending ? "Uploading..." : "Upload resume"}
                  onClick={handleUpload}
                  variant="dark"
                  animation={false}
                  className="w-full"
                  disabled={uploadMutation.isPending}
                />
              )}
            </div>
          )}

          {uploadMutation.isSuccess && (
            <div className="flex items-start gap-2 p-3 rounded-xl border border-violet-200 bg-gradient-to-r from-violet-50 to-white">
              <Sparkles className="h-5 w-5 text-violet-700 shrink-0 mt-0.5" />
              <p className="text-sm text-violet-900">
                AI autofill preview will open automatically!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* AUTOFILL MODAL */}
      <AutofillPreviewModal
        isOpen={showAutofillModal}
        onClose={() => {
          setShowAutofillModal(false);
          setUploadedDocumentId(null);
        }}
        documentId={uploadedDocumentId}
        onApplySuccess={async () => {
          console.log("Autofill applied -> calling onAutofillApplied()");
          await onAutofillApplied?.();
        }}
      />
    </>
  );
};
