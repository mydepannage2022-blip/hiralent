'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2 } from 'lucide-react';
import { getAssessmentResults } from '@/src/lib/profile/assessment.api';

// Honest post-submit bridge. The actual completion (AI evaluation + summary) is kicked off
// by the completeAssessment mutation on the test page. This screen does NOT run a fake
// countdown — it POLLS the results endpoint and only forwards once results are genuinely
// ready, so a slow evaluation can't dump the user onto a "not completed yet" results error.
const POLL_MS = 2500;
const MAX_POLLS = 48; // ~2 min ceiling; the manual button is always available.

export default function AssessmentCompletePage() {
  const params = useParams();
  const router = useRouter();
  const assessmentId = params?.assessmentId as string;
  const [pollExhausted, setPollExhausted] = useState(false);
  const navigated = useRef(false);

  const goToResults = () => {
    if (navigated.current) return;
    navigated.current = true;
    router.push(`/candidate/dashboard/skills-assessment/results/${assessmentId}`);
  };

  useEffect(() => {
    if (!assessmentId) {
      router.push('/candidate/dashboard/skills-assessment');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    let timer: ReturnType<typeof setTimeout>;

    const poll = async () => {
      attempts += 1;
      try {
        await getAssessmentResults(assessmentId); // resolves only once completion has landed
        if (!cancelled) goToResults();
        return;
      } catch (err: any) {
        const msg = String(err?.message || '');
        // Still processing → keep waiting. Any other error (auth/etc.) → stop polling and
        // let the user click through; we never fake a "ready" state.
        if (!msg.toLowerCase().includes('not completed')) {
          if (!cancelled) setPollExhausted(true);
          return;
        }
      }
      if (cancelled) return;
      if (attempts >= MAX_POLLS) { setPollExhausted(true); return; }
      timer = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [assessmentId, router]);

  return (
    <div className="flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-2xl w-full"
      >
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 text-center">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.15, type: 'spring', stiffness: 200 }}
            className="flex justify-center mb-6"
          >
            <CheckCircle className="w-16 h-16 text-green-500" />
          </motion.div>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
            Assessment Submitted!
          </h1>

          <p className="text-gray-600 text-sm mb-8">
            {pollExhausted
              ? 'Your responses are recorded. Your results are taking a little longer than usual to prepare.'
              : "Your responses have been recorded. We're preparing your results."}
          </p>

          {!pollExhausted && (
            <div className="inline-flex items-center gap-2 text-blue-600">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-sm font-medium">Preparing your results…</span>
            </div>
          )}

          <div className="mt-8">
            <button
              onClick={goToResults}
              className="text-sm text-blue-600 hover:text-blue-700 underline"
            >
              View results now
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
