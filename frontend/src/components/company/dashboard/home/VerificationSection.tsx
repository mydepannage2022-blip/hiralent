"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Upload, CheckCircle, Clock, XCircle, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";

export default function VerificationSection() {
  const { user } = useAuth();
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      const role = (user?.role || '').toString().toLowerCase();
      if (!user || (role !== 'company' && role !== 'company_admin')) {
        setIsLoading(false);
        return;
      }

      try {
        const token = localStorage.getItem('authToken');
        if (!token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('http://localhost:5000/api/v1/company/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          setCompanyProfile(data.data.profile);
        }
      } catch (error) {
        console.error("Network error:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyProfile();
  }, [user]);

  const companyId = user?.user_id || "";
  const verificationStatus = companyProfile?.verification_status || "unverified";
  const verified = companyProfile?.verified || false;
  const verificationNotes = companyProfile?.verification_notes || "";

  const StatusBadge = () => {
    if (verified || verificationStatus === "verified") {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-full">
          <CheckCircle className="w-4 h-4 text-green-600" />
          <span className="text-xs font-medium text-green-700">Verified</span>
        </div>
      );
    }

    if (verificationStatus === "pending") {
      return (
        <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-full">
          <Clock className="w-4 h-4 text-yellow-600" />
          <span className="text-xs font-medium text-yellow-700">Pending Review</span>
        </div>
      );
    }

    return (
      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-full">
        <AlertCircle className="w-4 h-4 text-gray-600" />
        <span className="text-xs font-medium text-gray-700">Unverified</span>
      </div>
    );
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const validTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
      if (!validTypes.includes(selectedFile.type)) {
        alert("Please upload a PDF, JPG, or PNG file");
        return;
      }
      if (selectedFile.size > 10 * 1024 * 1024) {
        alert("File size must be less than 10MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleVerification = async () => {
    if (!file) {
      alert("Please upload a company registration document");
      return;
    }

    if (!companyProfile?.registration_number || !companyProfile?.full_address) {
      alert("Please complete your company profile with registration number and address first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      const token = localStorage.getItem('authToken');

      setUploadProgress(10);
      const runRes = await fetch("http://localhost:5000/api/v1/verification/run/create", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ subject_type: "COMPANY", subject_id: companyId }),
      });

      if (!runRes.ok) throw new Error("Failed to create verification run");

      const { run_id } = await runRes.json();
      setUploadProgress(20);

      const formData = new FormData();
      formData.append("document", file);
      formData.append("runId", run_id);
      formData.append("expected_company_name", companyProfile.company_name || "");
      formData.append("expected_registration_number", companyProfile.registration_number || "");
      formData.append("expected_address", companyProfile.full_address || "");

      setUploadProgress(40);
      const ocrRes = await fetch("http://localhost:5000/api/ocr", {
        method: "POST",
        headers: { "Authorization": `Bearer ${token}` },
        body: formData
      });

      if (!ocrRes.ok) throw new Error("OCR processing failed");
      setUploadProgress(70);

      const finalizeRes = await fetch("http://localhost:5000/api/v1/verification/run/finalize", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ run_id, subject_type: "COMPANY", subject_id: companyId }),
      });

      if (!finalizeRes.ok) throw new Error("Failed to finalize verification");

      setUploadProgress(100);
      alert("Verification submitted successfully!");
      setTimeout(() => window.location.reload(), 1500);

    } catch (error: any) {
      console.error("Verification error:", error);
      alert(error.message || "Verification failed. Please try again.");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12"></div>
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  // VERIFIED STATE
// VERIFIED STATE - Premium Professional Badge
if (verified || verificationStatus === "verified") {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="relative overflow-hidden bg-gradient-to-br from-white via-green-50/30 to-emerald-50/40 
                 border border-green-200/60 rounded-2xl shadow-lg shadow-green-100/50 p-6"
    >
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <div className="absolute inset-0" style={{
          backgroundImage: `radial-gradient(circle at 2px 2px, rgb(34 197 94) 1px, transparent 0)`,
          backgroundSize: '32px 32px'
        }} />
      </div>

      {/* Content */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Icon with glow effect */}
          <div className="relative">
            <div className="absolute inset-0 bg-green-400/20 blur-xl rounded-full" />
            <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-600 
                          flex items-center justify-center shadow-lg shadow-green-500/25
                          ring-4 ring-green-100/50">
              <Shield className="w-7 h-7 text-white" strokeWidth={2.5} />
            </div>
            {/* Checkmark badge */}
            <div className="absolute -bottom-1.5 -right-1.5 w-6 h-6 bg-gradient-to-br from-emerald-500 to-green-600 
                          rounded-full flex items-center justify-center shadow-lg shadow-emerald-500/30
                          ring-3 ring-white">
              <CheckCircle className="w-4 h-4 text-white" strokeWidth={3} />
            </div>
          </div>

          {/* Text content */}
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-gray-900 tracking-tight">
                Verified Business
              </h3>
              <div className="px-2 py-0.5 bg-green-100 rounded-md">
                <span className="text-[10px] font-semibold text-green-700 uppercase tracking-wider">
                  Official
                </span>
              </div>
            </div>
            <p className="text-sm text-gray-600 leading-tight">
              Identity authenticated • Trusted by candidates
            </p>
          </div>
        </div>

        {/* Status badge */}
        <motion.div
          initial={{ x: 10, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm 
                   border border-green-200 rounded-xl shadow-sm"
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold text-green-700">Active</span>
        </motion.div>
      </div>

      {/* Bottom accent line */}
      <motion.div
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-500 via-emerald-500 to-green-500 origin-left"
      />
    </motion.div>
  );
}

  // PENDING STATE
  if (verificationStatus === "pending") {
    return (
      <div className="bg-white rounded-lg border border-yellow-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-yellow-100 flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-gray-900">Verification Pending</h3>
              <StatusBadge />
            </div>
            
            {verificationNotes && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-1">Why is this pending?</p>
                <p className="text-sm text-yellow-700">{verificationNotes}</p>
              </div>
            )}

            <p className="text-sm text-gray-600 mb-4">
              You can re-upload a clearer document to trigger automatic re-verification.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Re-upload Document
                </label>
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileChange}
                  className="block w-full text-sm text-gray-600
                    file:mr-4 file:py-2 file:px-4
                    file:rounded-lg file:border-0
                    file:text-sm file:font-medium
                    file:bg-yellow-50 file:text-yellow-700
                    hover:file:bg-yellow-100
                    cursor-pointer border border-gray-300 rounded-lg"
                  disabled={isUploading}
                />
                {file && (
                  <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" />
                    {file.name}
                  </p>
                )}
              </div>

              {isUploading && uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-yellow-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}

              <motion.button
                onClick={handleVerification}
                disabled={!file || isUploading}
                className="w-full bg-yellow-600 text-white py-2.5 px-4 rounded-lg font-medium
                  hover:bg-yellow-700 disabled:opacity-50 disabled:cursor-not-allowed
                  flex items-center justify-center gap-2 text-sm transition-colors"
                whileHover={{ scale: !isUploading && file ? 1.02 : 1 }}
                whileTap={{ scale: !isUploading && file ? 0.98 : 1 }}
              >
                <RefreshCw className="w-4 h-4" />
                {isUploading ? "Re-verifying..." : "Re-submit for Verification"}
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // UNVERIFIED STATE (Initial upload)
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="flex items-start gap-4">
        <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
          <Shield className="w-6 h-6 text-blue-600" />
        </div>
        <div className="flex-1">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold text-gray-900">Verify Your Company</h3>
            <StatusBadge />
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Upload your company registration certificate to verify your company profile.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Registration Certificate (RC)
              </label>
              <input
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-600
                  file:mr-4 file:py-2 file:px-4
                  file:rounded-lg file:border-0
                  file:text-sm file:font-medium
                  file:bg-blue-50 file:text-blue-700
                  hover:file:bg-blue-100
                  cursor-pointer border border-gray-300 rounded-lg"
                disabled={isUploading}
              />
              {file && (
                <p className="mt-2 text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  {file.name}
                </p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Accepted formats: PDF, JPG, PNG (Max 10MB)
              </p>
            </div>

            {isUploading && uploadProgress > 0 && (
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div
                  className="bg-blue-600 h-2 rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${uploadProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            )}

            <motion.button
              onClick={handleVerification}
              disabled={!file || isUploading}
              className="w-full bg-[#1B73E8] text-white py-2.5 px-4 rounded-lg font-medium
                hover:bg-[#1557B0] disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 text-sm transition-colors"
              whileHover={{ scale: !isUploading && file ? 1.02 : 1 }}
              whileTap={{ scale: !isUploading && file ? 0.98 : 1 }}
            >
              <Upload className="w-4 h-4" />
              {isUploading ? "Verifying..." : "Submit for Verification"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}