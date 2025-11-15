import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Shield, Upload, CheckCircle, Clock, AlertCircle, RefreshCw } from "lucide-react";
import { useAuth } from "@/src/context/AuthContext";

export default function VerificationSection() {
  const { user, token } = useAuth();
  const [companyProfile, setCompanyProfile] = useState<any>(null);
  const [companyId, setCompanyId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCompanyId, setIsLoadingCompanyId] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  useEffect(() => {
    const fetchCompanyProfile = async () => {
      if (!user || user.role !== "company_admin" || !token) {
        setIsLoading(false);
        setIsLoadingCompanyId(false);
        return;
      }

      try {
        const response = await fetch("http://localhost:5000/api/v1/company/profile", {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          const err = await response.text().catch(() => "");
          console.error("profile error:", response.status, err);
          setIsLoading(false);
          setIsLoadingCompanyId(false);
          return;
        }

        const data = await response.json();
        const profile = data?.data?.profile || null;
        setCompanyProfile(profile);

        // ✅ FIXED: In your backend, company_id = user_id
        // The profile.company_id should be the same as user.user_id
        const derivedCompanyId = user.user_id; // Use the user ID directly

        setCompanyId(derivedCompanyId);
        console.log("✅ Using companyId (user_id):", derivedCompanyId);
        console.log("✅ Profile data:", profile);
      } catch (error) {
        console.error("Network error:", error);
      } finally {
        setIsLoading(false);
        setIsLoadingCompanyId(false);
      }
    };

    fetchCompanyProfile();
  }, [user, token]);

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
      const validTypes = ["application/pdf", "image/jpeg", "image/jpg", "image/png"];
      if (!validTypes.includes(selectedFile.type)) {
        alert("Please upload a PDF, JPG, or PNG file");
        return;
      }
      if (selectedFile.size > 15 * 1024 * 1024) {
        alert("File size must be ≤ 15MB");
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleVerification = async () => {
    if (isLoadingCompanyId) {
      alert("⏳ Loading company information... Please wait.");
      return;
    }

    if (!token) {
      alert("❌ Session expired. Please login again.");
      return;
    }
    if (!file) {
      alert("Please upload a company registration document");
      return;
    }
    if (!companyId) {
      console.error("Current companyId state:", companyId);
      console.error("Current user:", user);
      console.error("Current companyProfile:", companyProfile);
      alert("❌ Company ID not found. Please complete your company profile setup first.");
      return;
    }
    if (!companyProfile?.registration_number || !companyProfile?.full_address) {
      alert("Please complete your company profile (registration number & address) first");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      setUploadProgress(10);
      const runRes = await fetch("http://localhost:5000/api/v1/verification/run/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          subject_type: "COMPANY",
          subject_id: companyId,
        }),
      });

      if (!runRes.ok) {
        const txt = await runRes.text().catch(() => "");
        console.error("Run create failed:", runRes.status, txt);
        handleHttpError(runRes.status, txt);
        return;
      }
      const runData = await runRes.json();
      const run_id = runData.run_id;
      setUploadProgress(20);

      const form = new FormData();
      form.append("file", file);
      form.append("document_type", "registration_cert");
      form.append("perform_ocr", "true");
      form.append("force_type", "company_doc");
      form.append("run_id", run_id);
      setUploadProgress(30);

      const uploadRes = await fetch(`http://localhost:5000/api/v1/uploads/company/${companyId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });

      if (!uploadRes.ok) {
        const txt = await uploadRes.text().catch(() => "");
        console.error("Upload failed:", uploadRes.status, txt);
        handleHttpError(uploadRes.status, txt);
        return;
      }
      const uploadData = await uploadRes.json();
      console.log("Uploaded:", uploadData);
      setUploadProgress(70);

      const finalizeRes = await fetch("http://localhost:5000/api/v1/verification/run/finalize", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          run_id,
          subject_type: "COMPANY",
          subject_id: companyId,
        }),
      });

      if (!finalizeRes.ok) {
        const txt = await finalizeRes.text().catch(() => "");
        console.error("Finalize failed:", finalizeRes.status, txt);
        handleHttpError(finalizeRes.status, txt);
        return;
      }

      setUploadProgress(100);
      alert("✅ Verification submitted! Document uploaded to MinIO and processed with OCR.");
      setTimeout(() => window.location.reload(), 1200);
    } catch (e: any) {
      console.error("Verification error:", e);
      alert(`❌ ${e?.message || "Verification failed. Please try again."}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  function handleHttpError(status: number, text: string) {
    const msg = (safeParse(text)?.error || text || "").toLowerCase();
    if (status === 401) {
      if (msg.includes("expired") || msg.includes("signature") || msg.includes("invalid")) {
        alert("❌ Session invalid/expired. Please login again.");
        window.location.href = "/company/login";
      } else {
        alert("❌ Unauthorized. Check you're logged in with the correct company account.");
      }
    } else if (status === 403) {
      alert("❌ Forbidden. You don't have access to this company. Use the correct company account.");
    } else {
      alert(`❌ ${safeParse(text)?.error || "Request failed"}`);
    }
  }

  function safeParse(s: string) {
    try { return JSON.parse(s); } catch { return {}; }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="animate-pulse flex space-x-4">
          <div className="rounded-full bg-gray-200 h-12 w-12" />
          <div className="flex-1 space-y-2 py-1">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  {/* Debug display */}
  {process.env.NODE_ENV === 'development' && (
    <div className="text-xs bg-yellow-50 p-3 rounded-lg mb-4 border border-yellow-200">
      <p className="font-semibold text-yellow-800 mb-2">🔍 Debug Company Info:</p>
      <div className="space-y-1">
        <p>Company ID: <span className={companyId ? "text-green-600 font-medium" : "text-red-600 font-medium"}>"{companyId}" {!companyId && "❌ EMPTY"}</span></p>
        <p>User ID: "{user?.user_id}"</p>
        <p>Loading Company ID: <span className={isLoadingCompanyId ? "text-yellow-600" : "text-green-600"}>{isLoadingCompanyId ? "⏳ Yes" : "✅ No"}</span></p>
        <p>Profile Loaded: <span className={companyProfile ? "text-green-600" : "text-red-600"}>{companyProfile ? "✅ Yes" : "❌ No"}</span></p>
        <p>Profile company_id: "{companyProfile?.company_id}"</p>
        <p>Has Registration: <span className={companyProfile?.registration_number ? "text-green-600" : "text-red-600"}>{companyProfile?.registration_number ? "✅ Yes" : "❌ No"}</span></p>
        <p>Has Address: <span className={companyProfile?.full_address ? "text-green-600" : "text-red-600"}>{companyProfile?.full_address ? "✅ Yes" : "❌ No"}</span></p>
      </div>
    </div>
  )}

  // VERIFIED STATE
  if (verified || verificationStatus === "verified") {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
        className="relative overflow-hidden bg-gradient-to-br from-white via-green-50/30 to-emerald-50/40 
                   border border-green-200/60 rounded-2xl shadow-lg shadow-green-100/50 p-6"
      >
        {/* ... verified state JSX ... */}
      </motion.div>
    );
  }

  // PENDING STATE
  if (verificationStatus === "pending") {
    return (
      <div className="bg-white rounded-lg border border-yellow-200 p-6">
        {/* ... pending state JSX ... */}
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
            Upload your company registration certificate to verify your company profile. The document will be stored securely in MinIO and processed with OCR.
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
                disabled={isUploading || isLoadingCompanyId}
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
              <div className="space-y-2">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <motion.div
                    className="bg-blue-600 h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-gray-600 text-center">
                  {uploadProgress < 20 && "Creating verification run..."}
                  {uploadProgress >= 20 && uploadProgress < 70 && "Uploading to MinIO & processing OCR..."}
                  {uploadProgress >= 70 && uploadProgress < 100 && "Finalizing verification..."}
                  {uploadProgress === 100 && "Complete!"}
                </p>
              </div>
            )}

            <motion.button
              onClick={handleVerification}
              disabled={!file || isUploading || isLoadingCompanyId}
              className="w-full bg-[#1B73E8] text-white py-2.5 px-4 rounded-lg font-medium
                hover:bg-[#1557B0] disabled:opacity-50 disabled:cursor-not-allowed
                flex items-center justify-center gap-2 text-sm transition-colors"
              whileHover={{ scale: !isUploading && file && !isLoadingCompanyId ? 1.02 : 1 }}
              whileTap={{ scale: !isUploading && file && !isLoadingCompanyId ? 0.98 : 1 }}
            >
              <Upload className={`w-4 h-4 ${isUploading ? 'animate-bounce' : ''}`} />
              {isUploading ? "Verifying..." : "Submit for Verification"}
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );
}