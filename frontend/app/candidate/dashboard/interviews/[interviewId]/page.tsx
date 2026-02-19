'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import {
  Calendar,
  Clock,
  Briefcase,
  Building2,
  ArrowLeft,
  PlayCircle,
  CheckCircle,
  AlertCircle,
  Loader2,
} from 'lucide-react';
import { getInterview } from '@/src/lib/interview/interview.api';
import InterviewStatusBadge from '@/src/components/candidate/dashboard/interviews/InterviewStatusBadge';
import type { CandidateInterviewListItem } from '@/src/types/interview.types';

export default function InterviewDetailPage() {
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
        setInterview(data);
      } catch (err: any) {
        setError(err.message || 'Failed to load interview details');
      } finally {
        setIsLoading(false);
      }
    };

    if (interviewId) {
      fetchInterview();
    }
  }, [interviewId]);

  const handleStartInterview = () => {
    router.push(`/candidate/dashboard/interviews/${interviewId}/setup`);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Not scheduled';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const canStartInterview = interview?.status === 'PENDING' || interview?.status === 'IN_PROGRESS';

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-[#005DDC]" />
      </div>
    );
  }

  if (error || !interview) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
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
    <div className="max-w-4xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => router.push('/candidate/dashboard/interviews')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Interviews
      </button>

      {/* Interview Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden"
      >
        {/* Header */}
        <div className="bg-linear-to-r from-[#005DDC] to-[#0047AB] p-6 text-white">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-2xl font-bold mb-2">{interview.jobTitle}</h1>
              {interview.companyName && (
                <div className="flex items-center gap-2 text-blue-100">
                  <Building2 className="w-4 h-4" />
                  <span>{interview.companyName}</span>
                </div>
              )}
            </div>
            <InterviewStatusBadge status={interview.status} size="lg" />
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Interview Details */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Calendar className="w-5 h-5 text-[#005DDC]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Scheduled Date</p>
                <p className="font-medium text-gray-900">{formatDate(interview.scheduledDate)}</p>
              </div>
            </div>

            {interview.scheduledDate && (
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <Clock className="w-5 h-5 text-[#005DDC]" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Time</p>
                  <p className="font-medium text-gray-900">{formatTime(interview.scheduledDate)}</p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-[#005DDC]" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Interview Type</p>
                <p className="font-medium text-gray-900 capitalize">{interview.interviewType}</p>
              </div>
            </div>
          </div>

          {/* Status-specific content */}
          {interview.status === 'COMPLETED' && (
            <div className="bg-green-50 border border-green-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-6 h-6 text-green-600" />
                <div>
                  <h3 className="font-medium text-green-900">Interview Completed</h3>
                  <p className="text-sm text-green-700">
                    Your interview was completed on {formatDate(interview.completedAt)}.
                    The recruiter will review your responses and get back to you.
                  </p>
                </div>
              </div>
            </div>
          )}

          {interview.status === 'EXPIRED' && (
            <div className="bg-orange-50 border border-orange-100 rounded-xl p-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600" />
                <div>
                  <h3 className="font-medium text-orange-900">Interview Expired</h3>
                  <p className="text-sm text-orange-700">
                    This interview has expired. Please contact the recruiter if you need to reschedule.
                  </p>
                </div>
              </div>
            </div>
          )}

          {canStartInterview && (
            <>
              {/* Instructions */}
              <div className="bg-gray-50 rounded-xl p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Before You Begin</h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#005DDC] text-white flex items-center justify-center text-xs shrink-0 mt-0.5">1</span>
                    Find a quiet, well-lit space with a neutral background
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#005DDC] text-white flex items-center justify-center text-xs shrink-0 mt-0.5">2</span>
                    Ensure your webcam and microphone are working properly
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#005DDC] text-white flex items-center justify-center text-xs shrink-0 mt-0.5">3</span>
                    Use a stable internet connection
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#005DDC] text-white flex items-center justify-center text-xs shrink-0 mt-0.5">4</span>
                    The AI interviewer will ask you questions verbally - speak clearly when responding
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="w-5 h-5 rounded-full bg-[#005DDC] text-white flex items-center justify-center text-xs shrink-0 mt-0.5">5</span>
                    The interview typically takes 15-20 minutes
                  </li>
                </ul>
              </div>

              {/* Start Button */}
              <div className="flex justify-center pt-4">
                <button
                  onClick={handleStartInterview}
                  className="flex items-center gap-3 px-8 py-4 bg-[#005DDC] text-white rounded-xl font-semibold hover:bg-[#004EB7] transition-colors shadow-lg shadow-blue-200"
                >
                  <PlayCircle className="w-6 h-6" />
                  {interview.status === 'IN_PROGRESS' ? 'Continue Interview' : 'Start Interview'}
                </button>
              </div>
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
