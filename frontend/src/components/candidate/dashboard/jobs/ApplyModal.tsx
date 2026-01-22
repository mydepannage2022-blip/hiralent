// frontend/src/components/candidate/dashboard/jobs/ApplyModal.tsx
"use client";

import React, { useMemo, useState } from "react";
import { X, Loader2 } from "lucide-react";
import { useApplyToJob } from "@/src/lib/candidate/applications.queries";
import type { EligibilityResult } from "../../../../types/candidate.jobs.types";

export default function ApplyModal(props: {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle?: string | null;
  eligibility?: EligibilityResult;
}) {
  const { open, onClose, jobId, jobTitle, eligibility } = props;
  const [coverLetter, setCoverLetter] = useState("");
  const { mutateAsync, isPending } = useApplyToJob();

  const canApply = useMemo(() => {
    if (!eligibility) return true; // if not provided, allow and let backend validate
    return eligibility.eligible;
  }, [eligibility]);

  if (!open) return null;

  const handleSubmit = async () => {
    const res: any = await mutateAsync({ job_id: jobId, cover_letter: coverLetter });

    if (res?.error) {
      alert(res.error);
      return;
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="w-full max-w-xl rounded-xl bg-white shadow-lg border border-gray-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Apply to {jobTitle ?? "this job"}</h3>
            <p className="text-sm text-gray-600">Your application will be validated by the eligibility rules.</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-50">
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-5">
          <label className="block text-sm font-medium text-gray-700 mb-2">Cover letter (optional)</label>
          <textarea
            value={coverLetter}
            onChange={(e) => setCoverLetter(e.target.value)}
            rows={7}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Write a short message..."
          />

          {!canApply && (
            <div className="mt-3 rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <p className="text-sm font-semibold text-yellow-900 mb-1">You can’t apply yet</p>
              <p className="text-sm text-yellow-800">
                Complete your profile / skills to meet the requirements, then retry.
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 px-5 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!canApply || isPending}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-700 inline-flex items-center gap-2"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
