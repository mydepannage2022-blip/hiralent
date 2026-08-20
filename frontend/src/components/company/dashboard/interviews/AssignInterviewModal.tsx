"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Video,
  X,
  Briefcase,
  User,
  Calendar,
  AlertTriangle,
  Check,
} from "lucide-react";
import { useAssignInterview } from "@/src/lib/interview/interview.queries";
import { parseEntitlementError, type EntitlementBlock } from "@/src/lib/subscription/entitlementError";
import UpgradePrompt from "@/src/components/subscription/UpgradePrompt";
import { AssignInterviewRequest } from "@/src/types/interview.types";
import { API_V1_BASE } from "@/src/lib/config/api";

const API_BASE = API_V1_BASE;

interface Job {
  job_id: string;
  title: string;
  applications_count?: number;
}

interface Applicant {
  application_id: string;
  candidate_id: string;
  candidate_name: string;
  candidate_email?: string;
  status?: string;
}

interface AssignInterviewModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function AssignInterviewModal({
  open,
  onClose,
  onSuccess,
}: AssignInterviewModalProps) {
  // Form state
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [scheduledDate, setScheduledDate] = useState<string>("");
  const [softSkillWeight, setSoftSkillWeight] = useState(70);

  // Data state
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [loadingApplicants, setLoadingApplicants] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // AI interviews are metered by the plan; a quota refusal gets an upgrade panel, not a retry.
  const [quotaBlock, setQuotaBlock] = useState<EntitlementBlock | null>(null);

  // Mutation
  const { mutate: assignInterview, isLoading: isAssigning, error: assignError } = useAssignInterview();

  // Load jobs when modal opens
  useEffect(() => {
    if (!open) return;

    const loadJobs = async () => {
      setLoadingJobs(true);
      setError(null);

      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_BASE}/jobs/company/my-jobs`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load jobs");
        }

        const data = await response.json();
        const jobsList = Array.isArray(data?.data) ? data.data : [];
        setJobs(jobsList.filter((j: Job) => j.applications_count && j.applications_count > 0));
      } catch (err) {
        console.error("Error loading jobs:", err);
        setError("Failed to load jobs");
      } finally {
        setLoadingJobs(false);
      }
    };

    loadJobs();
  }, [open]);

  // Load applicants when job is selected
  useEffect(() => {
    if (!selectedJobId) {
      setApplicants([]);
      setSelectedApplicant(null);
      return;
    }

    const loadApplicants = async () => {
      setLoadingApplicants(true);
      setSelectedApplicant(null);

      try {
        const token = localStorage.getItem("authToken");
        const response = await fetch(`${API_BASE}/jobs/${selectedJobId}/applicants`, {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          throw new Error("Failed to load applicants");
        }

        const data = await response.json();
        const raw: any[] = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : [];

        const mapped: Applicant[] = raw.map((a: any) => ({
          application_id: String(a.application_id ?? a.id ?? ""),
          candidate_id: String(
            a.candidate_id ?? a.candidate?.user_id ?? a.user_id ?? ""
          ),
          candidate_name: String(
            a.candidate_name ??
              a.candidate?.full_name ??
              a.full_name ??
              "Unnamed candidate"
          ),
          candidate_email:
            a.candidate_email ?? a.candidate?.email ?? a.email ?? undefined,
          status: a.status ?? "applied",
        }));

        setApplicants(mapped);
      } catch (err) {
        console.error("Error loading applicants:", err);
        setApplicants([]);
      } finally {
        setLoadingApplicants(false);
      }
    };

    loadApplicants();
  }, [selectedJobId]);

  // Reset form when modal closes
  useEffect(() => {
    if (!open) {
      setSelectedJobId("");
      setSelectedApplicant(null);
      setScheduledDate("");
      setSoftSkillWeight(70);
      setError(null);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedJobId || !selectedApplicant || !scheduledDate) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setQuotaBlock(null);

      const payload: AssignInterviewRequest = {
        candidateId: selectedApplicant.candidate_id,
        applicationId: selectedApplicant.application_id,
        jobId: selectedJobId,
        scheduledDate: new Date(scheduledDate).toISOString(),
        softSkillWeight,
      };

      await assignInterview(payload);
      onSuccess?.();
      onClose();
    } catch (err: any) {
      const block = parseEntitlementError(err);
      if (block) {
        setQuotaBlock(block);
        return;
      }

      const status = err?.response?.status;
      const message = err?.response?.data?.error || err?.message || '';
      if (status === 409 || message.includes('already assigned')) {
        setError('This candidate already has an interview assigned for this job.');
      } else if (status === 404 || message.includes('not found')) {
        setError('Application or candidate not found. Please refresh and try again.');
      } else if (message.includes('does not match') || message.includes('does not belong')) {
        setError('The selected candidate does not match this job.');
      } else {
        setError('Failed to assign interview. Please try again.');
      }
    }
  };

  const selectedJob = jobs.find((j) => j.job_id === selectedJobId);

  // Get minimum date (today)
  const getMinDate = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    return now.toISOString().slice(0, 16);
  };

  if (!open) return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-11000 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Backdrop */}
          <motion.div
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ scale: 0.95, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.96, y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 22 }}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.55)] border border-slate-200/80"
          >
            {/* Header */}
            <div className="bg-[#005DDC] px-6 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
                    <Video className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-sm font-semibold tracking-wide">
                      Assign AI Interview
                    </h2>
                    <p className="text-[11px] text-blue-100/90">
                      Schedule an AI interview for a candidate
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-white/15 transition-colors"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {quotaBlock && <UpgradePrompt block={quotaBlock} action="AI interview" compact />}

              {/* Error */}
              {!quotaBlock && (error || assignError) && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error || assignError?.message || "An error occurred"}</span>
                </div>
              )}

              {/* Job Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Briefcase className="inline w-4 h-4 mr-1.5 text-gray-500" />
                  Select Job
                </label>
                <select
                  value={selectedJobId}
                  onChange={(e) => setSelectedJobId(e.target.value)}
                  disabled={loadingJobs}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC] transition-colors disabled:bg-gray-50"
                >
                  <option value="">
                    {loadingJobs ? "Loading jobs..." : "Select a job..."}
                  </option>
                  {jobs.map((job) => (
                    <option key={job.job_id} value={job.job_id}>
                      {job.title} ({job.applications_count} applicant
                      {job.applications_count !== 1 ? "s" : ""})
                    </option>
                  ))}
                </select>
                {!loadingJobs && jobs.length === 0 && (
                  <p className="mt-1.5 text-xs text-amber-600">
                    No jobs with applicants found. Post a job and get applications first.
                  </p>
                )}
              </div>

              {/* Candidate Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <User className="inline w-4 h-4 mr-1.5 text-gray-500" />
                  Select Candidate
                </label>
                <select
                  value={selectedApplicant?.candidate_id || ""}
                  onChange={(e) => {
                    const applicant = applicants.find(
                      (a) => a.candidate_id === e.target.value
                    );
                    setSelectedApplicant(applicant || null);
                  }}
                  disabled={!selectedJobId || loadingApplicants}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC] transition-colors disabled:bg-gray-50"
                >
                  <option value="">
                    {!selectedJobId
                      ? "Select a job first..."
                      : loadingApplicants
                      ? "Loading applicants..."
                      : "Select a candidate..."}
                  </option>
                  {applicants.map((applicant) => (
                    <option
                      key={applicant.candidate_id}
                      value={applicant.candidate_id}
                    >
                      {applicant.candidate_name}
                      {applicant.candidate_email && ` (${applicant.candidate_email})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Scheduled Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Calendar className="inline w-4 h-4 mr-1.5 text-gray-500" />
                  Scheduled Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                  min={getMinDate()}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-[#005DDC] focus:ring-1 focus:ring-[#005DDC] transition-colors"
                />
                <p className="mt-1.5 text-xs text-gray-500">
                  The candidate will be notified about this interview time.
                </p>
              </div>

              {/* Question Distribution */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Distribution
                </label>
                <div className="flex items-center justify-between text-xs font-semibold mb-1.5">
                  <span className="text-blue-600">Soft Skills {softSkillWeight}%</span>
                  <span className="text-gray-500">Technical {100 - softSkillWeight}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={5}
                  value={softSkillWeight}
                  onChange={(e) => setSoftSkillWeight(Number(e.target.value))}
                  className="w-full accent-[#005DDC] cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-gray-400 mt-1">
                  <span>0%</span>
                  <span>50%</span>
                  <span>100%</span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={
                    isAssigning ||
                    !selectedJobId ||
                    !selectedApplicant ||
                    !scheduledDate
                  }
                  className="px-5 py-2.5 text-sm font-medium text-white bg-[#005DDC] rounded-xl hover:bg-[#004EB7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isAssigning ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{
                          duration: 1,
                          repeat: Infinity,
                          ease: "linear",
                        }}
                        className="h-4 w-4 rounded-full border-2 border-white border-t-transparent"
                      />
                      Assigning...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4" />
                      Assign Interview
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}
