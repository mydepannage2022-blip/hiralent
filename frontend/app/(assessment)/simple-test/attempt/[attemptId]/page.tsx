"use client";

import React from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2 } from "lucide-react";

import {
  useSimpleTestAttempt,
  useSubmitSimpleTestAttempt,
} from "@/src/lib/simpleTest/simpleTest.queries";

import SimpleTestRunner from "@/src/components/candidate/dashboard/simple-tests/SimpleTestRunner";
import type { SubmitAnswersPayload } from "@/src/types/simpleTest.types";

import {
  runSimpleTestCode,
  getSimpleTestSubmission,
} from "@/src/lib/simpleTest/simpleTest.api";

export default function SimpleTestAttemptStandalonePage() {
  const router = useRouter();
  const params = useParams<{ attemptId: string | string[] }>();

  const attemptId = React.useMemo(() => {
    const raw = params?.attemptId;
    return Array.isArray(raw) ? raw[0] : String(raw || "");
  }, [params]);

  if (!attemptId) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          Missing attemptId in URL.
        </div>

        <button
          onClick={() => router.push("/candidate/dashboard/simple-tests")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Simple Tests
        </button>
      </div>
    );
  }

  const attemptQuery = useSimpleTestAttempt(attemptId);
  const submitMutation = useSubmitSimpleTestAttempt(attemptId);

  if (attemptQuery.isLoading) {
    return (
      <div className="h-screen w-full flex items-center justify-center text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin mr-2" />
        Loading attempt...
      </div>
    );
  }

  if (attemptQuery.isError || !attemptQuery.data) {
    return (
      <div className="max-w-6xl mx-auto p-6">
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-800">
          Unable to load simple test (attemptId: {attemptId})
        </div>

        <button
          onClick={() => router.push("/candidate/dashboard/simple-tests")}
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
      </div>
    );
  }

  return (
    <div className="h-screen w-full">
      <SimpleTestRunner
        attemptId={attemptId}
        payload={attemptQuery.data}
        isSubmitting={submitMutation.isPending}
        onSubmit={async (answers: SubmitAnswersPayload) => {
          await submitMutation.mutateAsync({ answers });

          router.push(
            `/candidate/dashboard/simple-tests?submitted=1&attemptId=${encodeURIComponent(
              attemptId
            )}`
          );
        }}
        onRunCoding={async ({ questionId, language, code }) => {
          return runSimpleTestCode({
            attemptId,
            questionId,
            language,
            code,
          });
        }}
        onGetSubmission={async ({ submissionId }) => {
          return getSimpleTestSubmission(submissionId);
        }}
      />
    </div>
  );
}
