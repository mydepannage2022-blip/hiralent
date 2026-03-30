"use client";

import React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FlaskConical, Loader2, ArrowLeft } from "lucide-react";

import {
  useSimpleTestInvites,
  useStartSimpleTestAttempt,
  useSimpleTestAttempt,
} from "@/src/lib/simpleTest/simpleTest.queries";

import type { UiSimpleTestInvite } from "@/src/lib/simpleTest/simpleTest.api";
import SimpleTestInviteCard from "@/src/components/candidate/dashboard/simple-tests/SimpleTestInviteCard";

export default function SimpleTestsPage() {
  const router = useRouter();

  const spRaw = useSearchParams();
  const sp = React.useMemo(() => spRaw ?? new URLSearchParams(), [spRaw]);

  const invitesQ = useSimpleTestInvites();
  const startAttemptM = useStartSimpleTestAttempt();

  const invites: UiSimpleTestInvite[] = invitesQ.data ?? [];

  const submitted = sp.get("submitted") === "1";
  const submittedAttemptId = (sp.get("attemptId") || "").trim();

  // ✅ Only fetch attempt if we really have an attemptId
  const attemptQ = useSimpleTestAttempt(submittedAttemptId);
  const submittedScore = attemptQ.data?.score;

  async function onStart(inviteId: string) {
    const out = await startAttemptM.mutateAsync({ inviteId });

    const attemptId =
      String((out as any)?.attempt_id || "") ||
      String((out as any)?.data?.attempt_id || "") ||
      "";

    if (attemptId) {
      router.push(`/simple-test/attempt/${attemptId}`);
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <FlaskConical className="h-5 w-5 text-emerald-600" />
              <h1 className="text-xl font-semibold text-slate-900">
                Simple Tests
              </h1>
            </div>

            <p className="mt-1 text-sm text-slate-600">
              Optional practice tests. Unlimited attempts. They never affect your real assessment.
            </p>

            {submitted && (
              <div className="mt-3 rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
                <div>Attempt submitted. Your score is visible to you only.</div>

                {!submittedAttemptId ? (
                  <div className="mt-1 text-emerald-900/80">
                    (No attemptId found in URL — redirect after submit to:
                    <span className="font-mono"> ?submitted=1&amp;attemptId=...</span>)
                  </div>
                ) : attemptQ.isLoading ? (
                  <div className="mt-1 text-emerald-800/80">Loading score...</div>
                ) : attemptQ.isError ? (
                  <div className="mt-1 text-red-700">
                    Could not load score. Please refresh.
                  </div>
                ) : typeof submittedScore === "number" ? (
                  <div className="mt-1 font-semibold">
                    Score: {Math.round(submittedScore)}%
                  </div>
                ) : (
                  <div className="mt-1 text-emerald-900/80">
                    Score not available yet.
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ✅ Force go to Skills Assessment */}
          <button
            type="button"
            onClick={() => router.push("/candidate/dashboard/skills-assessment")}
            className="inline-flex items-center gap-2 text-sm text-[#005DDC] hover:underline"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Skills Assessment
          </button>
        </div>
      </div>

      {invitesQ.isLoading ? (
        <div className="flex items-center justify-center py-14 text-slate-600">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Loading invites...
        </div>
      ) : invites.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-600">
          No simple tests available right now.
        </div>
      ) : (
        <div className="grid gap-4">
          {invites.map((inv) => (
            <SimpleTestInviteCard
              key={inv.inviteId}
              invite={inv}
              loading={startAttemptM.isPending}
              onStart={() => onStart(inv.inviteId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
