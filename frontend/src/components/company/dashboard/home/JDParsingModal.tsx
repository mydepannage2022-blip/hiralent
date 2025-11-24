"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Upload,
  FileText,
  Wand2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { useAuth } from "../../../../context/AuthContext";

/* =============================
   Types (match CompanyJob)
============================= */
export type JobStatus =
  | "ACTIVE"
  | "DRAFT"
  | "PAUSED"
  | "CLOSED"
  | "CANCELLED"
  | "ARCHIVED";

export type JobType = "full_time" | "part_time" | "contract" | "internship";

export interface CompanyJob {
  job_id: string;
  company_id?: string;
  title: string;
  location: string;
  description: string;
  salary_range: string | null;
  required_skills: string[];
  status: JobStatus;
  job_type: JobType | null;
  department: string | null;
  experience_level?: string | null;
  education_level?: string | null;
  remote_option?: string | null;
  urgency_level?: string | null;
  visa_sponsored?: boolean | null;
  relocation_assistance?: boolean | null;
  application_deadline?: string | null;
  max_applications?: number | null;
  auto_reject_after?: number | null;
  screening_questions?: string[];
  created_at: string;
  updated_at: string;
  applications_count?: number;
}

interface JDParsingModalProps {
  open: boolean;
  job: CompanyJob | null;
  onClose: () => void;
  // parent page can use this to refresh the assessment list
  onAssessmentCreated?: () => void;
}

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000/api/v1";

const JDParsingModal: React.FC<JDParsingModalProps> = ({
  open,
  job,
  onClose,
  onAssessmentCreated,
}) => {
  const { token } = useAuth();

  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Reset / prefill when modal opens */
  useEffect(() => {
    if (!open) {
      setJobDescription("");
      setFileName(null);
      setIsGenerating(false);
      setError(null);
      return;
    }

    if (open && job) {
      setJobDescription(job.description || "");
    }
  }, [open, job?.job_id]);

  if (!open || !job) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    // For now we don't send the file yet – backend uses the text JD.
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!jobDescription.trim()) {
      setError("Please provide a job description or upload a JD file.");
      return;
    }

    setIsGenerating(true);

    try {
      // Build payload expected by your backend
      const payload = {
        job_id: job.job_id,
        title: `${job.title} Assessment`,
        description: "Generated from Job Description",
        job_title: job.title,
        job_description: jobDescription,
        assessment_type: "QUICK_CHECK",
        difficulty: "INTERMEDIATE",
        auto_generate: true,
        total_questions: 12,
        time_limit: 40,
      };

      const headers: HeadersInit = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(
        `${API_BASE_URL}/employer-assessments/from-jd`,
        {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
        }
      );

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        // ignore JSON parse errors – we'll handle with generic message
      }

      if (!response.ok) {
        const message =
          data?.message ||
          data?.error ||
          "Failed to generate assessment from job description.";
        setError(message);
        return;
      }

      // Assessment created successfully in DB
      if (onAssessmentCreated) {
        onAssessmentCreated();
      }

      onClose();
    } catch (err) {
      console.error("Error generating assessment from JD:", err);
      setError(
        "Something went wrong while generating the assessment. Please try again."
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[11000] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.9, y: 20, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 20, opacity: 0 }}
            transition={{ type: "spring", damping: 25 }}
            className="relative w-full max-w-3xl max-h-[90vh] overflow-hidden bg-white rounded-2xl shadow-2xl"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1B73E8] to-[#1557B0] p-6 text-white">
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <motion.div
                    className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center"
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.6 }}
                  >
                    <Upload className="w-5 h-5" />
                  </motion.div>
                  <div>
                    <h2 className="text-xl font-bold">
                      Generate Assessment from Job Description
                    </h2>
                    <p className="text-blue-100 text-xs md:text-sm">
                      Job: <span className="font-semibold">{job.title}</span>
                    </p>
                  </div>
                </div>
                <motion.button
                  whileHover={{ scale: 1.1, rotate: 90 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={onClose}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto custom-scrollbar">
              {/* Upload / Info */}
              <div className="grid grid-cols-1 md:grid-cols-[1.2fr_0.9fr] gap-4">
                <div className="border border-dashed border-gray-300 rounded-xl p-4 flex flex-col gap-3 bg-gray-50/60">
                  <div className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-[#1B73E8]" />
                    <p className="text-sm font-semibold text-gray-800">
                      Use existing JD or upload a file
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    You can keep the current job description, edit it, or upload
                    a PDF / DOCX to be parsed by the AI engine later.
                  </p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-gray-200 text-xs font-medium text-gray-700 cursor-pointer hover:border-[#1B73E8] hover:text-[#1B73E8] transition-all">
                      <Upload className="w-4 h-4" />
                      <span>Upload JD file</span>
                      <input
                        type="file"
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt"
                        onChange={handleFileChange}
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() =>
                        setJobDescription(job.description || "")
                      }
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-blue-50 border border-blue-200 text-xs font-semibold text-[#1B73E8] hover:bg-blue-100 transition-all"
                    >
                      <Sparkles className="w-4 h-4" />
                      Use job posting description
                    </button>
                  </div>
                  {fileName && (
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-600">
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      <span className="truncate max-w-[220px]">
                        {fileName}
                      </span>
                    </div>
                  )}
                </div>

                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 flex flex-col gap-2 text-xs text-[#12305d]">
                  <div className="flex items-center gap-2 mb-1">
                    <Wand2 className="w-4 h-4 text-[#1B73E8]" />
                    <p className="font-semibold text-[13px]">
                      What the AI will do
                    </p>
                  </div>
                  <ul className="space-y-1 list-disc list-inside">
                    <li>Detect core skills &amp; knowledge areas</li>
                    <li>Propose question types and difficulty mix</li>
                    <li>Align assessment structure with the JD</li>
                    <li>Generate a first draft you can review &amp; edit</li>
                  </ul>
                </div>
              </div>

              {/* Description textarea */}
              <form onSubmit={handleGenerate} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    Job Description to parse
                  </label>
                  <textarea
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                    rows={10}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm resize-none"
                    placeholder="Paste or edit the job description that will be used to generate the assessment..."
                  />
                </div>

                {error && (
                  <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span>{error}</span>
                  </div>
                )}

                <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                  <motion.button
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={onClose}
                    className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl text-sm font-semibold hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </motion.button>

                  <motion.button
                    type="submit"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    disabled={isGenerating}
                    className="px-5 py-2.5 bg-gradient-to-r from-[#1B73E8] to-[#1557B0] text-white rounded-xl text-sm font-semibold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isGenerating ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{
                            duration: 1,
                            repeat: Infinity,
                            ease: "linear",
                          }}
                          className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                        />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Wand2 className="w-4 h-4" />
                        Generate Assessment Draft
                      </>
                    )}
                  </motion.button>
                </div>
              </form>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JDParsingModal;
