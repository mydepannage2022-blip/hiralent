"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2, CheckCircle2, AlertTriangle, Send, FileText } from "lucide-react";
import { useApplyToJob } from "@/src/lib/candidate/applications.queries";
import type { EligibilityResult } from "../../../../types/candidate.jobs.types";

export default function ApplyModal(props: {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle?: string | null;
  eligibility?: EligibilityResult;
  onApplied?: () => void;
}) {
  const { open, onClose, jobId, jobTitle, eligibility, onApplied } = props;
  const [coverLetter, setCoverLetter] = useState("");
  const { mutateAsync, isPending } = useApplyToJob();

  const canApply = useMemo(() => {
    if (!eligibility) return true;
    return eligibility.eligible;
  }, [eligibility]);

  if (!open) return null;

  const handleSubmit = async () => {
    const res: any = await mutateAsync({ job_id: jobId, cover_letter: coverLetter });
    if (res?.error) {
      alert(res.error);
      return;
    }
    onApplied?.();
    onClose();
  };

  const charCount = coverLetter.length;
  const maxChars = 1000;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-gray-900/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg rounded-2xl bg-white shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in-95 duration-200">

        {/* Blue accent bar */}
        <div className="h-1 w-full bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700" />

        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Send className="w-4.5 h-4.5 text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900 leading-snug">
                Apply to position
              </h3>
              <p className="text-sm text-blue-600 font-medium mt-0.5 truncate max-w-xs">
                {jobTitle ?? "this job"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Eligibility banner */}
        {canApply ? (
          <div className="mx-6 mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-50 border border-emerald-100">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <p className="text-sm text-emerald-800 font-medium">
              You meet all requirements for this position.
            </p>
          </div>
        ) : (
          <div className="mx-6 mb-4 px-4 py-3 rounded-xl bg-amber-50 border border-amber-100">
            <div className="flex items-center gap-2.5 mb-1">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <p className="text-sm font-semibold text-amber-900">Requirements not met</p>
            </div>
            <p className="text-sm text-amber-700 ml-6.5">
              Complete your profile and skills to qualify for this role.
            </p>
          </div>
        )}

        {/* Cover letter */}
        <div className="px-6 pb-5">
          <div className="flex items-center justify-between mb-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              Cover letter
              <span className="text-xs text-gray-400 font-normal">(optional)</span>
            </label>
            <span className={`text-xs font-medium ${charCount > maxChars * 0.9 ? "text-amber-600" : "text-gray-400"}`}>
              {charCount}/{maxChars}
            </span>
          </div>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value.slice(0, maxChars))}
            rows={6}
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none placeholder:text-gray-400 bg-gray-50/40 leading-relaxed"
            placeholder="Introduce yourself and explain why you're a great fit for this role…"
          />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 px-6 py-4 bg-gray-50/60 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium rounded-xl border border-gray-200 text-gray-600 hover:bg-white hover:border-gray-300 transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canApply || isPending}
            className={`px-5 py-2.5 text-sm font-semibold rounded-xl inline-flex items-center gap-2 transition-all shadow-sm ${
              canApply && !isPending
                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-100 hover:shadow-blue-200 hover:shadow-md"
                : "bg-gray-100 text-gray-400 cursor-not-allowed shadow-none"
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                Submit Application
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}