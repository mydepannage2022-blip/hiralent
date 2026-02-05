'use client';

import React from 'react';
import { motion } from 'framer-motion';
import {
  CheckCircle,
  Clock,
  Calendar,
  Briefcase,
  Building2,
  ArrowLeft,
  ClipboardList,
} from 'lucide-react';
import Link from 'next/link';
import type { CandidateInterviewListItem } from '@/src/types/interview.types';
import InterviewStatusBadge from './InterviewStatusBadge';

interface InterviewDetailsProps {
  interview: CandidateInterviewListItem;
}

const InterviewDetails: React.FC<InterviewDetailsProps> = ({ interview }) => {
  const formatDate = (date: string | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (date: string | undefined) => {
    if (!date) return '';
    return new Date(date).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const calculateDuration = () => {
    if (!interview.startedAt || !interview.completedAt) return null;
    const start = new Date(interview.startedAt).getTime();
    const end = new Date(interview.completedAt).getTime();
    const durationMs = end - start;
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    if (minutes > 0) {
      return `${minutes} min ${seconds} sec`;
    }
    return `${seconds} seconds`;
  };

  const duration = calculateDuration();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Back Button */}
      <Link
        href="/candidate/dashboard/interviews"
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Interviews
      </Link>

      {/* Main Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden"
      >
        {/* Header */}
        <div className="bg-linear-to-r from-green-500 to-emerald-600 px-6 py-8 text-white">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Interview Completed</h1>
              <p className="text-green-100">Your responses have been submitted</p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Job Info */}
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                <Briefcase className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Position</p>
                <p className="font-semibold text-gray-900">{interview.jobTitle}</p>
              </div>
            </div>

            {interview.companyName && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Company</p>
                  <p className="font-semibold text-gray-900">{interview.companyName}</p>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Interview Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <ClipboardList className="w-4 h-4" />
                <span className="text-sm">Interview Type</span>
              </div>
              <p className="font-medium text-gray-900 capitalize">
                {interview.interviewType || 'AI Interview'}
              </p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 text-gray-500 mb-1">
                <span className="text-sm">Status</span>
              </div>
              <InterviewStatusBadge status={interview.status} size="lg" />
            </div>

            {interview.completedAt && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Calendar className="w-4 h-4" />
                  <span className="text-sm">Completed On</span>
                </div>
                <p className="font-medium text-gray-900">
                  {formatDate(interview.completedAt)}
                </p>
                <p className="text-sm text-gray-500">
                  {formatTime(interview.completedAt)}
                </p>
              </div>
            )}

            {duration && (
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-2 text-gray-500 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">Duration</span>
                </div>
                <p className="font-medium text-gray-900">{duration}</p>
              </div>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-5">
            <h3 className="font-medium text-blue-900 mb-2">What happens next?</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                Your interview recording and responses are being reviewed
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                The recruiter will evaluate your performance
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500 mt-1.5 shrink-0" />
                You'll receive an update on next steps via email
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default InterviewDetails;
