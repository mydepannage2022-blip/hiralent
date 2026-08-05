"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import Button from "@/src/components/layout/Button";
import { DropZone } from "./DropZone";
import { API_HOST } from "@/src/lib/config/api";
import {
  FileText,
  AlertCircle,
  Loader,
  Download,
  Sparkles,
  UploadCloud,
  ShieldCheck,
  X,
} from "lucide-react";
import { useUploadApplicationResume } from "@/src/lib/profile/profile.queries";
import { useProfile } from "@/src/context/ProfileContext";
import AutofillPreviewModal from "../AutofillPreviewModal";

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

  const [showAutofillModal, setShowAutofillModal] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);

  const uploadMutation = useUploadApplicationResume();
  const { profileData } = useProfile() as any;

  const rawResumeUrl = profileData?.resume_application_url as string | undefined;

  const existingResumeUrl = useMemo(() => {
    if (!rawResumeUrl) return null;
    if (rawResumeUrl.startsWith("http://") || rawResumeUrl.startsWith("https://")) return rawResumeUrl;

    const apiUrl = API_HOST.replace(/\/+$/, "");
    const path = rawResumeUrl.startsWith("/") ? rawResumeUrl : `/${rawResumeUrl}`;
    return `${apiUrl}${path}`;
  }, [rawResumeUrl]);

  const existingFileName = useMemo(() => {
    if (!existingResumeUrl) return null;
    try {
      const pathname = new URL(existingResumeUrl).pathname;
      return decodeURIComponent(pathname.split("/").pop() || "Resume");
    } catch {
      return decodeURIComponent(existingResumeUrl.split("/").pop() || "Resume");
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

  const handleUpload = async () => {
    if (!selectedFile) return;

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => (prev >= 90 ? prev : prev + 10));
    }, 200);

    try {
      const response = await uploadMutation.mutateAsync(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);

      const documentId = response?.data?.document_id;
      if (documentId) {
        setUploadedDocumentId(documentId);
        setShowAutofillModal(true);
      }

      setTimeout(() => {
        setSelectedFile(null);
        setShowUploadForm(false);
        setUploadProgress(0);
      }, 700);
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

  const statusRow = () => {
    if (uploadMutation.isPending)
      return (
        <div className="flex items-center gap-2 text-sm text-blue-700">
          <Loader className="h-4 w-4 animate-spin" />
          Uploading resume...
        </div>
      );

    if (uploadMutation.isError)
      return (
        <div className="flex items-center gap-2 text-sm text-rose-700">
          <AlertCircle className="h-4 w-4" />
          Upload failed. Please try again.
        </div>
      );

    if (uploadMutation.isSuccess)
      return (
        <div className="flex items-center gap-2 text-sm text-violet-700">
          <Sparkles className="h-4 w-4" />
          Resume uploaded. Opening preview...
        </div>
      );

    return null;
  };

  //  FIXED WIDTH CARD (won't grow on long names/urls)
  const fixedCard =
    "w-full max-w-[360px] lg:max-w-[360px] shrink-0 " +
    "rounded-2xl border border-slate-200 bg-white shadow-[0_1px_0_rgba(15,23,42,0.04)] overflow-hidden";


  return (
    <>
      <Card className={`${fixedCard} ${className}`}>
        <CardHeader className="pb-3">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700">
            <ShieldCheck className="h-4 w-4 text-blue-600" />
            ATS-friendly • PDF/DOCX
          </div>

          <CardTitle className="mt-3 text-base font-semibold text-slate-900">
            Resume
          </CardTitle>
          <p className="text-sm text-slate-600">
            Upload to apply faster. You’ll get an autofill preview.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* EXISTING RESUME */}
          {existingResumeUrl && !showUploadForm && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <FileText className="h-5 w-5 text-blue-700" />
                </div>

                {/* ✅ min-w-0 prevents flex overflow pushing width */}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {existingFileName}
                  </p>
                  <p className="text-xs text-slate-600 truncate">
                    Current application resume
                  </p>
                </div>

                <a
                  href={existingResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
                  title="Download"
                >
                  <Download className="h-4 w-4 text-slate-700" />
                </a>
              </div>

              <Button
                text="Upload new resume"
                onClick={() => setShowUploadForm(true)}
                variant="dark"
                className="w-full"
              />
            </div>
          )}

          {/* DROPZONE */}
          {(!existingResumeUrl || showUploadForm) && !selectedFile && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                  <UploadCloud className="h-4 w-4 text-slate-700" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900">Drop your resume</p>
                  <p className="text-xs text-slate-600">PDF/DOC/DOCX • up to 10MB</p>
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

          {/* SELECTED FILE */}
          {selectedFile && (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white">
                  <FileText className="h-5 w-5 text-blue-700" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {selectedFile.name}
                  </p>
                  <p className="text-xs text-slate-600">{formatFileSize(selectedFile.size)}</p>
                </div>

                {!uploadMutation.isPending && (
                  <button
                    onClick={removeSelectedFile}
                    className="shrink-0 rounded-lg border border-slate-200 bg-white p-2 hover:bg-slate-50"
                    title="Remove"
                  >
                    <X className="h-4 w-4 text-slate-700" />
                  </button>
                )}
              </div>

              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>Uploading</span>
                    <span className="font-semibold tabular-nums text-slate-900">
                      {uploadProgress}%
                    </span>
                  </div>

                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className="h-full rounded-full bg-blue-600 transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              {statusRow()}

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
        </CardContent>
      </Card>

      <AutofillPreviewModal
        isOpen={showAutofillModal}
        onClose={() => {
          setShowAutofillModal(false);
          setUploadedDocumentId(null);
        }}
        documentId={uploadedDocumentId}
        onApplySuccess={async () => {
          await onAutofillApplied?.();
        }}
      />
    </>
  );
};
