'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { AlertCircle, Loader2 } from 'lucide-react';
import { getInterview } from '@/src/lib/interview/interview.api';
import InterviewRoom from '@/src/components/candidate/dashboard/interviews/InterviewRoom';
import type { CandidateInterviewListItem } from '@/src/types/interview.types';

export default function InterviewRoomPage() {
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

        // Validate interview can be conducted
        if (data.status === 'COMPLETED') {
          router.push(`/candidate/dashboard/interviews/${interviewId}/complete`);
          return;
        }

        if (data.status !== 'PENDING' && data.status !== 'IN_PROGRESS') {
          setError('This interview is not available');
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

  const handleComplete = () => {
    router.push(`/candidate/dashboard/interviews/${interviewId}/complete?completed=true`);
  };

  const handleError = (errorMsg: string) => {
    setError(errorMsg);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-10 h-10 animate-spin text-[#005DDC]" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px] gap-4">
        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
          <AlertCircle className="w-8 h-8 text-red-600" />
        </div>
        <h3 className="font-semibold text-gray-900">Unable to Start Interview</h3>
        <p className="text-gray-600 text-center max-w-md">{error || 'Interview not found'}</p>
        <button
          onClick={() => router.push('/candidate/dashboard/interviews')}
          className="px-6 py-2 bg-[#005DDC] text-white rounded-lg hover:bg-[#004EB7]"
        >
          Back to Interviews
        </button>
      </div>
    );
  }

  return (
    <InterviewRoom
      interviewId={interviewId}
      jobTitle={interview.jobTitle}
      onComplete={handleComplete}
      onError={handleError}
    />
  );
}
