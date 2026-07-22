"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Wand2, Sparkles, AlertTriangle } from "lucide-react";

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

export type JobType = "full_time" | "part_time" | "contract" | "internship" | "freelance";

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
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* Reset / prefill when modal opens */
  useEffect(() => {
    if (!open) {
      setJobDescription("");
      setIsGenerating(false);
      setError(null);
      return;
    }

    if (open && job) {
      setJobDescription(job.description || "");
    }
  }, [open, job?.job_id]);

  if (!open || !job) return null;

  const handleUseJobPosting = () => {
    setJobDescription(job.description || "");
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);

    if (!jobDescription.trim()) {
      setError("Please paste or edit a job description before continuing.");
      return;
    }

    setIsGenerating(true);

    try {
      const payload = {
        job_id: job.job_id,
        title: `${job.title} Assessment`,
        description:
          "Assessment auto-generated from the job description. Please review and customize as needed.",
        job_title: job.title,
        job_description: jobDescription,
        // Only tell the backend what *type* of assessment we want.
        assessment_type: "QUICK_CHECK",
        // backend + AI service decide everything else
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
        // ignore JSON parse errors
      }

      if (!response.ok) {
        const message =
          data?.message ||
          data?.error ||
          "Failed to generate assessment from job description.";
        setError(message);
        return;
      }

      onAssessmentCreated?.();
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
          className="fixed inset-0 z-[11000] flex items-center justify-center px-4 py-6"
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

          {/* Modal card – same shell as AI Assessment Designer */}
          <motion.div
            initial={{ scale: 0.95, y: 12, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 12, opacity: 0 }}
            transition={{ type: "spring", damping: 24 }}
            className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-white rounded-lg shadow-2xl overflow-hidden"
          >
            {/* Gradient header */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] text-white flex-shrink-0">
              <div className="relative px-5 py-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div>
                      <h2 className="text-base font-medium tracking-tight">
                        Generate assessment from job description
                      </h2>
                      <p className="text-blue-100 text-xs">
                        Paste or edit the JD; the AI will analyze it and create
                        a tailored assessment draft for this job.
                      </p>
                    </div>
                  </div>

                  <motion.button
                    onClick={onClose}
                    whileHover={{ scale: 1.1, rotate: 90 }}
                    whileTap={{ scale: 0.9 }}
                    className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                </div>
              </div>
            </div>

            {/* Body content (scrollable) */}
            <div className="flex-1 flex flex-col px-6 pb-4 pt-3 overflow-y-auto bg-gradient-to-br from-slate-50 via-white to-slate-50">
              <div className="grid gap-6 md:grid-cols-2">
                {/* LEFT: What AI will do */}
                <div className="rounded-sm border border-violet-100 bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 p-4 md:p-5 shadow-[0_10px_40px_rgba(15,23,42,0.03)]">
                  <div className="flex items-center gap-2 mb-3">
                    <p className="text-sm text-slate-900">
                      What the AI will do
                    </p>
                  </div>

                  <ul className="space-y-1.5 text-xs text-slate-600 mb-4">
                    <li>
                      • Identify technical skills, tools, platforms, and soft
                      skills mentioned or implied in the JD.
                    </li>
                    <li>
                      • Detect domains, seniority level, and overall job
                      complexity.
                    </li>
                    <li>
                      • Generate key technologies and question recommendations
                      tailored to the role.
                    </li>
                    <li>
                      • Align assessment difficulty and structure with the job's
                      responsibilities and requirements.
                    </li>
                  </ul>

                  <p className="text-[11px] text-slate-400">
                    You keep full control — this just creates a starting point
                    you can refine.
                  </p>
                </div>

                {/* RIGHT: JD textarea */}
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-sm text-slate-900">
                        Job description to parse
                      </p>
                      <p className="text-[11px] text-slate-400">
                        3–6 clear bullet-point sections work best (role, tech
                        stack, requirements).
                      </p>
                    </div>

                    <motion.button
                      type="button"
                      whileHover={{ scale: 1.03 }}
                      whileTap={{ scale: 0.97 }}
                      onClick={handleUseJobPosting}
                      className="inline-flex items-center gap-1.5 rounded-sm border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-medium text-slate-700 shadow-sm hover:border-[#1B73E8]/60 hover:text-[#1B73E8]"
                    >
                      Use job posting text
                    </motion.button>
                  </div>

                  <div className="flex-1 rounded-sm border border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm">
                    <textarea
                      value={jobDescription}
                      onChange={(e) => setJobDescription(e.target.value)}
                      rows={14}
                      className="w-full h-full min-h-[260px] bg-transparent px-4 py-3 text-sm text-slate-800 outline-none resize-none custom-scrollbar"
                      placeholder="Paste or edit the job description that will be used to generate the assessment..."
                    />
                  </div>

                  {error && (
                    <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer (gradient visible, same spirit as other modal) */}
            <div
              className="
                border-t border-slate-100
                bg-white/80 backdrop-blur-xl
                px-6 py-3
                flex flex-col md:flex-row md:items-center md:justify-between gap-3
              "
            >
              <p className="text-[11px] text-slate-700">
                After generation, the assessment draft will appear in{" "}
                <span className="font-medium text-[#1B73E8]">
                  My Assessments
                </span>{" "}
                for this job.
              </p>

              <div className="flex justify-end gap-3">
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={onClose}
                  className="
                    px-4 py-2 rounded-sm border border-slate-200
                    bg-white text-sm font-medium text-slate-700
                    hover:bg-slate-50
                  "
                >
                  Cancel
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: isGenerating ? 1 : 1.02 }}
                  whileTap={{ scale: isGenerating ? 1 : 0.98 }}
                  disabled={isGenerating}
                  onClick={() => handleGenerate()}
                  className="
                    inline-flex items-center gap-2 rounded-sm
                    bg-gradient-to-r from-[#1B73E8] to-[#4F46E5]
                    px-5 py-2 text-sm font-semibold text-white
                    shadow-md disabled:opacity-60 disabled:cursor-not-allowed
                  "
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
                      Generating…
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-4 h-4" />
                      Generate assessment
                    </>
                  )}
                </motion.button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JDParsingModal;
