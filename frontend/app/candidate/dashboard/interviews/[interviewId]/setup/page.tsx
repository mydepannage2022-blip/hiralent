'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, AlertCircle } from 'lucide-react';
import { getInterview } from '@/src/lib/interview/interview.api';
import InterviewSetup from '@/src/components/candidate/dashboard/interviews/InterviewSetup';
import type { CandidateInterviewListItem } from '@/src/types/interview.types';

export default function InterviewSetupPage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params?.interviewId as string;

  const [interview, setInterview] = useState<CandidateInterviewListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        setIsLoading(true);
        const data = await getInterview(interviewId);

        // Check if interview can be started
        if (data.status === 'COMPLETED') {
          router.push(`/candidate/dashboard/interviews/${interviewId}/complete`);
          return;
        }

        if (data.status !== 'PENDING' && data.status !== 'IN_PROGRESS') {
          setError('This interview is not available to start');
          return;
        }

        setInterview(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load interview');
      } finally {
        setIsLoading(false);
      }
    };

    if (interviewId) {
      fetchInterview();
    }
  }, [interviewId, router]);

  const handleReady = () => {
    // Navigate to the interview room
    router.push(`/candidate/dashboard/interviews/${interviewId}/room`);
  };

  const handleCancel = () => {
    // Go back to interview detail page
    router.push(`/candidate/dashboard/interviews/${interviewId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-100">
        <Loader2 className="w-8 h-8 animate-spin text-[#005DDC]" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-100 gap-4">
        <AlertCircle className="w-12 h-12 text-red-500" />
        <p className="text-gray-600">{error || 'Interview not found'}</p>
        <button
          onClick={() => router.push('/candidate/dashboard/interviews')}
          className="text-[#005DDC] hover:underline flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Interviews
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Back Button */}
      <button
        onClick={handleCancel}
        className="flex items-center gap-2 text-gray-500 hover:text-gray-900 text-sm transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </button>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#005DDC] rounded-2xl px-6 py-5 text-white"
      >
        <h1 className="text-xl font-bold leading-tight">Camera & Microphone Setup</h1>
        <p className="text-blue-100 text-sm mt-1">
          Make sure everything is working before starting your interview with {interview.companyName || 'the company'}
        </p>
      </motion.div>

      {/* Setup Component */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="bg-white border border-gray-200 rounded-2xl p-6"
      >
        <InterviewSetup onReady={handleReady} onCancel={handleCancel} />
      </motion.div>
    </div>
  );
}
