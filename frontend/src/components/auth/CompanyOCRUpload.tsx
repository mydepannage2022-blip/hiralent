"use client";

import React, { useRef, useState } from "react";
import { useUploadCompanyDocument } from "@/src/lib/auth/auth.queries";
import { useAuth } from "@/src/context/AuthContext";

type Status = "idle" | "hover" | "uploading" | "done" | "error";

export default function CompanyOCRUpload() {
  const { user } = useAuth();
  const uploadMutation = useUploadCompanyDocument();
  
  const [status, setStatus] = useState<Status>("idle");
  const [text, setText] = useState("");
  const [parsed, setParsed] = useState<any>(null);
  const [signal, setSignal] = useState<any>(null);
  const [fileName, setFileName] = useState("");
  const [progress, setProgress] = useState(0);
  const [apiResponse, setApiResponse] = useState<any>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const upload = async (file: File) => {
    console.log('🚀 Starting upload process');
    setText("");
    setParsed(null);
    setSignal(null);
    setApiResponse(null);
    setFileName(file.name);
    setStatus("uploading");
    setProgress(12);

    try {
      setProgress(55);
      
      // Use React Query mutation
      const data = await uploadMutation.mutateAsync(file);
      console.log('📦 Full API Response:', data);
      
      // Store complete response
      setApiResponse(data);
      
      if (!data.ok) {
        throw new Error(data.error || "OCR processing failed");
      }

      setProgress(92);
      setText(data.ocrText || "");
      setParsed(data.parsed || null);
      setSignal(data.signal || null);
      setStatus("done");
      setProgress(100);
      
      console.log('✅ Upload completed successfully');
    } catch (e: any) {
      console.error('❌ Upload failed:', e);
      setStatus("error");
      setProgress(0);
    }
  };

  const onInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) upload(f);
  };

  const onDrop = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setStatus("idle");
    const f = e.dataTransfer.files?.[0];
    if (f) upload(f);
  };

  const onDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    setStatus("hover");
  };

  const onDragLeave = () => setStatus("idle");

  const reset = () => {
    setStatus("idle");
    setText("");
    setParsed(null);
    setSignal(null);
    setApiResponse(null);
    setFileName("");
    setProgress(0);
    if (inputRef.current) inputRef.current.value = "";
  };

  const proceedToDashboard = () => {
    console.log('🎯 Proceeding to dashboard');
    window.location.href = '/company/dashboard';
  };

  // Get error from mutation
  const error = uploadMutation.error as any;
  const errorMessage = error?.response?.data?.error || error?.message || "Something went wrong";

  return (
    <div className="w-full space-y-4">
      {/* Upload Area */}
      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`
          flex cursor-pointer flex-col items-center justify-center 
          rounded-xl border-2 border-dashed p-8 transition-all duration-200
          ${status === "hover" 
            ? "border-blue-500 bg-blue-50" 
            : "border-gray-300 hover:border-gray-400 hover:bg-gray-50"
          }
          ${uploadMutation.isPending ? "pointer-events-none opacity-50" : ""}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={onInput}
          className="hidden"
          disabled={uploadMutation.isPending}
        />
        
        <div className="flex items-center gap-3 text-gray-700">
          {uploadMutation.isPending ? (
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
          ) : (
            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5v-9m0 0-3 3m3-3 3 3M6.75 19.5h10.5A2.25 2.25 0 0 0 19.5 17.25V8.1A2.25 2.25 0 0 0 18.84 6.5l-3.34-3.34A2.25 2.25 0 0 0 13.26 2.5H8.25A2.25 2.25 0 0 0 6 4.75V17.25A2.25 2.25 0 0 0 8.25 19.5z" />
            </svg>
          )}
          <div className="text-center">
            <p className="font-medium text-sm">
              {uploadMutation.isPending ? "Processing document..." : "Click to upload your registration document"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {uploadMutation.isPending ? "Please wait..." : "or drag & drop here"}
            </p>
          </div>
        </div>
        <p className="mt-3 text-xs text-gray-500">Accepted: PDF, PNG, JPG</p>
      </label>

      {/* File Status */}
      {(uploadMutation.isPending || fileName) && (
        <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm">
          <div className="flex items-center gap-2">
            <div className={`h-2 w-2 rounded-full ${
              uploadMutation.isPending ? "bg-blue-500 animate-pulse" : "bg-green-500"
            }`} />
            <span className="truncate max-w-[16rem]">{fileName || "Processing..."}</span>
          </div>
          {uploadMutation.isPending ? (
            <span className="text-gray-500">{progress}%</span>
          ) : (
            <button 
              onClick={reset} 
              className="rounded-md px-2 py-1 text-gray-600 hover:bg-gray-200 text-xs"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {/* Progress Bar */}
      {uploadMutation.isPending && (
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Error - From React Query */}
      {uploadMutation.isError && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <div className="flex items-center gap-2 mb-1">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <strong>Upload Failed</strong>
          </div>
          <p>{errorMessage}</p>
          <button 
            onClick={reset}
            className="mt-2 text-xs bg-red-100 hover:bg-red-200 px-2 py-1 rounded"
          >
            Try Again
          </button>
        </div>
      )}

      {/* Success Results - Show Real API Response */}
      {uploadMutation.isSuccess && apiResponse && (
        <div className="space-y-4">
          {/* Main Status */}
          <div className={`rounded-lg border p-4 ${
            apiResponse.ok 
              ? 'border-green-200 bg-green-50' 
              : 'border-yellow-200 bg-yellow-50'
          }`}>
            <div className="flex items-center gap-2 mb-2">
              <svg className="h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="font-medium text-green-800">
                {apiResponse.ok ? 'Document Processed Successfully!' : 'Processing Complete'}
              </h3>
            </div>
            <p className="text-sm text-green-700 mb-2">
              Document type detected: <strong>{apiResponse.type || 'Unknown'}</strong>
            </p>
          </div>

          {/* Extracted Information */}
          {parsed && (
            <div className="rounded-lg border border-gray-200 bg-white p-4">
              <h4 className="font-medium text-gray-800 mb-3">Extracted Information:</h4>
              <div className="space-y-2 text-sm text-gray-600">
                {parsed.company_name && (
                  <div className="flex justify-between">
                    <strong>Company Name:</strong> 
                    <span>{parsed.company_name}</span>
                  </div>
                )}
                {parsed.registration_number && (
                  <div className="flex justify-between">
                    <strong>Registration Number:</strong> 
                    <span>{parsed.registration_number}</span>
                  </div>
                )}
                {parsed.address && (
                  <div className="flex justify-between">
                    <strong>Address:</strong> 
                    <span className="text-right max-w-[200px]">{parsed.address}</span>
                  </div>
                )}
                {parsed.confidence_score && (
                  <div className="flex justify-between">
                    <strong>Confidence Score:</strong> 
                    <span>{parsed.confidence_score}%</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Verification Signal */}
          {signal && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
              <h4 className="font-medium text-blue-800 mb-2">Verification Status:</h4>
              <div className="text-sm text-blue-700">
                <p><strong>Status:</strong> {signal.verification_status || 'Processed'}</p>
                {signal.match_score && (
                  <p><strong>Match Score:</strong> {signal.match_score}%</p>
                )}
                {signal.notes && (
                  <p><strong>Notes:</strong> {signal.notes}</p>
                )}
              </div>
            </div>
          )}

          {/* Raw OCR Text */}
          {text && (
            <details className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <summary className="font-medium text-gray-700 cursor-pointer">
                View Raw Extracted Text
              </summary>
              <pre className="mt-2 text-xs text-gray-600 whitespace-pre-wrap max-h-40 overflow-y-auto">
                {text}
              </pre>
            </details>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={proceedToDashboard}
              className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
            >
              Proceed to Dashboard
            </button>
            <button
              onClick={reset}
              className="bg-gray-200 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-300 transition-colors text-sm"
            >
              Upload Another
            </button>
          </div>
        </div>
      )}

      {/* Debug Info (Only in development)
      {process.env.NODE_ENV === 'development' && apiResponse && (
        <details className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <summary className="font-medium text-purple-700 cursor-pointer">
            Debug: Full API Response
          </summary>
          <pre className="mt-2 text-xs text-purple-600 whitespace-pre-wrap max-h-60 overflow-y-auto">
            {JSON.stringify(apiResponse, null, 2)}
          </pre>
        </details>
      )} */}
    
    </div>
  );
}