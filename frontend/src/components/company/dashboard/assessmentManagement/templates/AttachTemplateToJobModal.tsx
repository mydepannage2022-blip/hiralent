"use client";

import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Building, Save, AlertTriangle } from "lucide-react";

type CompanyJob = { job_id: string; title: string; department: string | null };

export default function AttachTemplateToJobModal({
  open,
  jobs,
  templateTitle,
  onClose,
  onConfirm,
}: {
  open: boolean;
  jobs: CompanyJob[];
  templateTitle: string;
  onClose: () => void;
  onConfirm: (job_id: string) => Promise<void> | void;
}) {
  const [jobId, setJobId] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const canSubmit = useMemo(() => !!jobId && !loading, [jobId, loading]);

  const handleConfirm = async () => {
    if (!jobId) return setErr("Please select a job.");
    setErr(null);
    setLoading(true);
    try {
      await onConfirm(jobId);
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed to create from template");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[12000] flex items-center justify-center px-4 py-6"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

        <motion.div
          initial={{ scale: 0.96, y: 10, opacity: 0 }}
          animate={{ scale: 1, y: 0, opacity: 1 }}
          exit={{ scale: 0.96, y: 10, opacity: 0 }}
          transition={{ type: "spring", damping: 24 }}
          className="relative w-full max-w-xl bg-white rounded-lg shadow-2xl border border-slate-100 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
            <div>
              <div className="text-xs font-semibold text-slate-500">Attach template to a job</div>
              <div className="text-lg font-black text-slate-900">{templateTitle}</div>
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-50"
              title="Close"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="p-5">
            {err && (
              <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5" />
                <div className="font-semibold">{err}</div>
              </div>
            )}

            <label className="block text-sm font-semibold text-slate-700 mb-2">Select job *</label>
            <div className="relative">
              <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <select
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Choose a job</option>
                {jobs.map((j) => (
                  <option key={j.job_id} value={j.job_id}>
                    {j.title}{j.department ? ` — ${j.department}` : ""}
                  </option>
                ))}
              </select>
            </div>

            <p className="mt-3 text-xs text-slate-500">
              This will create a company-owned assessment instance you can customize.
            </p>
          </div>

          <div className="px-5 py-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-white font-semibold text-slate-800 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              disabled={!canSubmit}
              onClick={handleConfirm}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 text-white font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="w-5 h-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Use Template
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
