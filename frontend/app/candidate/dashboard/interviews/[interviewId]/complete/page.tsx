'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { getInterview } from '@/src/lib/interview/interview.api';
import InterviewComplete from '@/src/components/candidate/dashboard/interviews/InterviewComplete';
import type { CandidateInterviewListItem } from '@/src/types/interview.types';

export default function InterviewCompletePage() {
  const params = useParams();
  const router = useRouter();
  const interviewId = params?.interviewId as string;

  const [interview, setInterview] = useState<CandidateInterviewListItem | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchInterview = async () => {
      try {
        setIsLoading(true);
        const data = await getInterview(interviewId);
        setInterview(data);
      } catch (err) {
        // If we can't fetch, just show generic completion
        console.error('Failed to fetch interview:', err);
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

  return (
    <div className="max-w-4xl mx-auto relative">
      <InterviewComplete
        jobTitle={interview?.jobTitle}
        companyName={interview?.companyName}
      />
    </div>
  );
}
