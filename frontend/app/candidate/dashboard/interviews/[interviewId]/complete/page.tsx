'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getInterview } from '@/src/lib/interview/interview.api';
import InterviewComplete from '@/src/components/candidate/dashboard/interviews/InterviewComplete';
import InterviewDetails from '@/src/components/candidate/dashboard/interviews/InterviewDetails';
import type { CandidateInterviewListItem } from '@/src/types/interview.types';

export default function InterviewCompletePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const interviewId = params?.interviewId as string;

  // Check if this is a "just completed" scenario (coming from the room)
  const justCompleted = searchParams?.get('completed') === 'true';

  const [interview, setInterview] = useState<CandidateInterviewListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const data = await getInterview(interviewId);
        setInterview(data);
      } catch (err) {
        console.error('Failed to fetch interview:', err);
        setError('Failed to load interview details');
      } finally {
        setIsLoading(false);
      }
    };

    if (interviewId) {
      fetchInterview();
    }
  }, [interviewId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[500px]">
        <Loader2 className="w-10 h-10 animate-spin text-[#005DDC]" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[500px]">
        <p className="text-gray-500 mb-4">{error || 'Interview not found'}</p>
        <a
          href="/candidate/dashboard/interviews"
          className="text-[#005DDC] hover:underline"
        >
          Back to Interviews
        </a>
      </div>
    );
  }

  // Show celebration animation if just completed, otherwise show details view
  if (justCompleted) {
    return (
      <div className="max-w-4xl mx-auto relative">
        <InterviewComplete
          jobTitle={interview.jobTitle}
          companyName={interview.companyName}
        />
      </div>
    );
  }

  return (
    <div className="py-6 px-4">
      <InterviewDetails interview={interview} />
    </div>
  );
}
