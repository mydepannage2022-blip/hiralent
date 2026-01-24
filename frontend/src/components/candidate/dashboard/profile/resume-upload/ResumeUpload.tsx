// src/components/candidate/dashboard/profile/resume-upload/ResumeUpload.tsx

"use client";

import React, { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/src/components/ui/card";
import Button from "@/src/components/layout/Button";
import { DropZone } from "./DropZone";
import { FileText, CheckCircle, AlertCircle, Loader, Download, Sparkles } from "lucide-react";
import { useUploadApplicationResume } from "@/src/lib/profile/profile.queries";
import { useProfile } from "@/src/context/ProfileContext";
import AutofillPreviewModal from "../AutofillPreviewModal"; // ✅ IMPORT MODAL

interface ResumeUploadProps {
  className?: string;
  onAutofillApplied?: () => Promise<void> | void; 

}

export const ResumeUpload: React.FC<ResumeUploadProps> = ({ className = "", onAutofillApplied }) => {

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [showUploadForm, setShowUploadForm] = useState(false);
  
  // ✅ MODAL STATE
  const [showAutofillModal, setShowAutofillModal] = useState(false);
  const [uploadedDocumentId, setUploadedDocumentId] = useState<string | null>(null);

  const uploadMutation = useUploadApplicationResume();
  const { profileData, refetchProfile } = useProfile() as any;

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
    if (uploadMutation.isPending) return <Loader className="h-5 w-5 text-blue-500 animate-spin" />;
    if (uploadMutation.isSuccess) return <CheckCircle className="h-5 w-5 text-green-500" />;
    if (uploadMutation.isError) return <AlertCircle className="h-5 w-5 text-red-500" />;
    return null;
  };

  const getStatusMessage = () => {
    if (uploadMutation.isPending) return "Uploading resume...";
    if (uploadMutation.isSuccess) return "Resume uploaded successfully!";
    if (uploadMutation.isError) return "Upload failed. Please try again.";
    return "";
  };

  const getStatusColor = () => {
    if (uploadMutation.isPending) return "text-blue-600";
    if (uploadMutation.isSuccess) return "text-green-600";
    if (uploadMutation.isError) return "text-red-600";
    return "";
  };

  return (
    <>
    <Card className={`w-full max-w-sm ${className}`}>  
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-lg font-semibold text-gray-900">Upload your resume</CardTitle>
          <p className="text-sm text-gray-600 mt-1">Upload resume for job applications.</p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Existing Resume */}
          {existingResumeUrl && !showUploadForm && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <FileText className="h-8 w-8 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{existingFileName}</p>
                  <p className="text-xs text-green-600">Current application resume</p>
                </div>
                <a  

                
                  href={existingResumeUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 hover:bg-green-100 rounded-full transition-colors"
                  title="Download resume"
                >
                  <Download className="h-4 w-4 text-green-600" />
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

          {/* Drop Zone */}
          {(!existingResumeUrl || showUploadForm) && !selectedFile && (
            <div className="space-y-4">
              <DropZone onFileSelect={handleFileSelect} acceptedTypes={[".pdf", ".doc", ".docx"]} maxSizeMB={10} />

              {existingResumeUrl && showUploadForm && (
                <Button text="Cancel" onClick={cancelUpload} variant="outline" className="w-full" />
              )}
            </div>
          )}

          {/* Selected File */}
          {selectedFile && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <FileText className="h-8 w-8 text-blue-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>

                {!uploadMutation.isPending && (
                  <button
                    onClick={removeSelectedFile}
                    className="p-1 hover:bg-gray-200 rounded-full transition-colors"
                    title="Remove file"
                  >
                    <span className="sr-only">Remove file</span>✕
                  </button>
                )}
              </div>

              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Uploading...</span>
                    <span className="text-gray-900 font-medium">{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
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
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-200 rounded-lg">
              <Sparkles className="h-5 w-5 text-purple-600 shrink-0" />
              <p className="text-sm text-purple-800">
                AI autofill preview will open automatically!
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/*  AUTOFILL MODAL */}
      <AutofillPreviewModal
        isOpen={showAutofillModal}
        onClose={() => {
          setShowAutofillModal(false);
          setUploadedDocumentId(null);
        }}
        documentId={uploadedDocumentId}
        onApplySuccess={async () => {
          console.log(" Autofill applied -> calling onAutofillApplied()");
          await onAutofillApplied?.();   //  THIS is the missing link
        }}
      />


    </>
  );
};