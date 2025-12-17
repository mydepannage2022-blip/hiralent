"use client";

import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, AlertTriangle, X } from "lucide-react";

type JobApplicant = {
  application_id: string;
  candidate_name: string;
  candidate_email?: string;
  status?: string;
  score?: number | null;
  applied_at?: string | null;
};

interface JobApplicantsModalProps {
  open: boolean;
  job: {
    job_id: string;
    title: string;
    applications_count?: number;
  } | null;
  token: string | null;
  onClose: () => void;
}

const JobApplicantsModal: React.FC<JobApplicantsModalProps> = ({
  open,
  job,
  token,
  onClose,
}) => {
  const [loading, setLoading] = useState(false);
  const [applicants, setApplicants] = useState<JobApplicant[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !job || !token) return;

    const loadApplicants = async () => {
      setLoading(true);
      setError(null);

      try {
        const API_BASE =
          process.env.NEXT_PUBLIC_BASE_URL ||
          "http://localhost:5000/api/v1";

        // 🔁 Adapt this endpoint to match your backend if needed
        const res = await fetch(
          `${API_BASE}/jobs/${job.job_id}/applicants`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
          }
        );

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`HTTP ${res.status}: ${text}`);
        }

        const data = await res.json();

        const raw = Array.isArray(data?.data)
          ? data.data
          : Array.isArray(data)
          ? data
          : data?.results || [];

        const mapped: JobApplicant[] = raw.map((a: any) => ({
          application_id: a.application_id ?? a.id ?? String(a.candidate_id),
candidate_name:
  (a.candidate_name ??
    `${(a.first_name ?? "").trim()} ${(a.last_name ?? "").trim()}`.trim()) ||
  "Unnamed candidate",

          candidate_email: a.candidate_email ?? a.email ?? "",
          status: a.status ?? a.stage ?? "RECEIVED",
          score: a.score ?? a.match_score ?? null,
          applied_at: a.applied_at ?? a.created_at ?? null,
        }));

        setApplicants(mapped);
      } catch (err) {
        console.error("Failed to load applicants:", err);
        setError("Failed to load applicants for this job.");
      } finally {
        setLoading(false);
      }
    };

    loadApplicants();
  }, [open, job?.job_id, token]);

  if (!open || !job) return null;

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
            className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Card */}
          <motion.div
            initial={{ scale: 0.9, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, y: 24, opacity: 0 }}
            transition={{ type: "spring", damping: 22 }}
            className="relative w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-3xl bg-white shadow-[0_24px_80px_rgba(15,23,42,0.55)] border border-slate-200/80"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-[#1B73E8] via-[#1557B0] to-[#0D47A1] px-6 py-4 text-white">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 shadow-inner">
                    <Users className="h-4 w-4" />
                  </div>
                  <div>
                    <h2 className="text-sm font-semibold tracking-wide">
                      Applicants for {job.title}
                    </h2>
                    <p className="text-[11px] text-blue-100/90">
                      {(job.applications_count ?? applicants.length) || 0}{" "}
                      candidate
                      {(job.applications_count ?? applicants.length) === 1
                        ? ""
                        : "s"}{" "}
                      applied
                    </p>
                  </div>
                </div>

                <button
                  onClick={onClose}
                  className="rounded-full p-2 hover:bg-white/15 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="bg-slate-50/60 px-5 py-4 max-h-[72vh] overflow-y-auto custom-scrollbar">
              {loading ? (
                <div className="flex items-center justify-center py-10 text-sm text-gray-600 gap-3">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="h-5 w-5 rounded-full border-2 border-blue-500 border-t-transparent"
                  />
                  Loading applicants...
                </div>
              ) : error ? (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700 flex items-start gap-2">
                  <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              ) : applicants.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-8 text-center text-sm text-slate-600">
                  No applicants yet for this job.
                </div>
              ) : (
                <div className="space-y-3">
                  {applicants.map((a) => (
                    <motion.div
                      key={a.application_id}
                      whileHover={{ y: -2, scale: 1.01 }}
                      className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm flex flex-col sm:flex-row sm:items-center gap-3"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-slate-900">
                            {a.candidate_name}
                          </span>
                          {a.status && (
                            <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 text-[11px] px-2 py-0.5 text-blue-700 font-semibold">
                              {a.status}
                            </span>
                          )}
                        </div>
                        {a.candidate_email && (
                          <div className="text-xs text-slate-600 mt-0.5">
                            {a.candidate_email}
                          </div>
                        )}
                        {a.applied_at && (
                          <div className="text-[11px] text-slate-500 mt-1">
                            Applied on{" "}
                            {new Date(a.applied_at).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      {a.score != null && (
                        <div className="text-xs text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1 font-semibold">
                          Score: {Math.round(a.score)}%
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default JobApplicantsModal;
