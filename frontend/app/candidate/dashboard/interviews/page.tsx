'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, Clock, ListChecks } from 'lucide-react';
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

  const total = interviews?.length ?? 0;
  const pending = interviews?.filter((i) => i.status === 'PENDING' || i.status === 'IN_PROGRESS').length ?? 0;
  const completed = interviews?.filter((i) => i.status === 'COMPLETED').length ?? 0;

  return (
    <div className="space-y-6">
      {/* Hero Banner */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-[#005DDC] rounded-2xl px-6 py-5 text-white"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          {/* Left */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-lg font-bold tracking-tight">AI Interviews</h1>
              <p className="text-sm text-blue-200 mt-0.5">
                Complete your interviews to showcase your skills to employers
              </p>
            </div>
          </div>

          {/* Stats */}
          {!isLoading && (
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
                <ListChecks className="w-4 h-4 text-blue-200" />
                <div className="text-center">
                  <p className="text-lg font-bold leading-none">{total}</p>
                  <p className="text-[10px] text-blue-300 mt-0.5">Total</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
                <Clock className="w-4 h-4 text-amber-300" />
                <div className="text-center">
                  <p className="text-lg font-bold leading-none">{pending}</p>
                  <p className="text-[10px] text-blue-300 mt-0.5">Pending</p>
                </div>
              </div>
              <div className="flex items-center gap-2 bg-white/10 rounded-xl px-4 py-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                <div className="text-center">
                  <p className="text-lg font-bold leading-none">{completed}</p>
                  <p className="text-[10px] text-blue-300 mt-0.5">Done</p>
                </div>
              </div>
            </div>
          )}
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
