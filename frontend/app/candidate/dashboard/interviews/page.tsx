'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Info } from 'lucide-react';
import InterviewList from '@/src/components/candidate/dashboard/interviews/InterviewList';
import { useMyInterviews } from '@/src/lib/interview/interview.queries';

export default function CandidateInterviewsPage() {
  const router = useRouter();
  const { data: interviews, isLoading, error } = useMyInterviews();

  const handleStartInterview = (interviewId: string) => {
    router.push(`/candidate/dashboard/interviews/${interviewId}`);
  };

  const handleViewInterview = (interviewId: string) => {
    router.push(`/candidate/dashboard/interviews/${interviewId}/complete`);
  };

  return (
    <div className="space-y-6">
      {/* Info Card */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <Info className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-medium text-blue-900">About AI Interviews</h3>
            <p className="text-sm text-blue-700 mt-1">
              Complete your AI interviews to showcase your skills to employers.
              The AI interviewer will ask you questions about your experience and
              qualifications. Make sure you have a working camera and microphone
              before starting.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Interview List */}
      <InterviewList
        interviews={interviews || []}
        isLoading={isLoading}
        error={error ? String(error) : null}
        onStartInterview={handleStartInterview}
        onViewInterview={handleViewInterview}
      />
    </div>
  );
}
